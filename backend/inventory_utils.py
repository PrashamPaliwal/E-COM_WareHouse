"""
inventory_utils.py
-------------------
All inventory.xlsx read/write logic.

Sheet: "Inventory"
Columns:
    SKU            - unique id for this (product x bin) row, e.g. "SKU00001-A"
    PRODUCT_NAME
    PRODUCT_CODE   - shared across every bin that stocks the same product
    BARCODE
    WAREHOUSE      - capitalized, e.g. "WAREHOUSE A"
    ROW            - capitalized, e.g. "ROW 3"
    BIN            - capitalized, e.g. "BIN 12"
    QUANTITY       - current units in that bin
    LAQ            - Last Added Quantity (used as the depletion baseline)
"""

import os
import threading
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INVENTORY_FILE = os.path.join(BASE_DIR, "inventory.xlsx")
SHEET_NAME = "Inventory"

COLUMNS = [
    "SKU", "PRODUCT_NAME", "PRODUCT_CODE", "BARCODE",
    "WAREHOUSE", "ROW", "BIN", "QUANTITY", "LAQ",
]

_lock = threading.Lock()


# --------------------------------------------------------------------- I/O
def normalize_code(code: str) -> str:
    return str(code).strip().upper()

def _ensure_file():
    if not os.path.exists(INVENTORY_FILE):
        pd.DataFrame(columns=COLUMNS).to_excel(
            INVENTORY_FILE, sheet_name=SHEET_NAME, index=False, engine="openpyxl"
        )


def load_df() -> pd.DataFrame:
    _ensure_file()
    df = pd.read_excel(INVENTORY_FILE, sheet_name=SHEET_NAME, engine="openpyxl")
    for col in ["WAREHOUSE", "ROW", "BIN"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.upper()
    if "PRODUCT_CODE" in df.columns:
        df["PRODUCT_CODE"] = df["PRODUCT_CODE"].astype(str).str.strip().str.upper()
    for col in ["SKU", "PRODUCT_CODE", "BARCODE", "PRODUCT_NAME"]:
        if col in df.columns:
            df[col] = df[col].astype(str)
    df["QUANTITY"] = pd.to_numeric(df["QUANTITY"], errors="coerce").fillna(0).astype(int)
    df["LAQ"] = pd.to_numeric(df["LAQ"], errors="coerce").fillna(0).astype(int)
    return df

def save_df(df: pd.DataFrame):
    df.to_excel(INVENTORY_FILE, sheet_name=SHEET_NAME, index=False, engine="openpyxl")


def depletion_pct(quantity: int, laq: int) -> float:
    """((LAQ - quantity) / LAQ) * 100, guarded against LAQ == 0."""
    if not laq:
        return 0.0
    pct = ((laq - quantity) / laq) * 100
    return max(0.0, round(pct, 2))


# ------------------------------------------------------------------ search

def prefix_search(query: str, limit: int = 6):
    """Prefix match against PRODUCT_NAME or PRODUCT_CODE, grouped to unique products."""
    query = (query or "").strip().lower()
    df = load_df()
    if df.empty:
        return []
    if query:
        mask = (
            df["PRODUCT_NAME"].astype(str).str.lower().str.startswith(query)
            | df["PRODUCT_CODE"].astype(str).str.lower().str.startswith(query)
            | df["BARCODE"].astype(str).str.lower().str.startswith(query)
        )
        matches = df[mask]
    else:
        matches = df

    grouped = (
        matches.groupby(["PRODUCT_CODE", "PRODUCT_NAME"])
        .agg(TOTAL_QTY=("QUANTITY", "sum"))
        .reset_index()
        .sort_values("PRODUCT_NAME")
    )
    results = []
    for _, row in grouped.head(limit).iterrows():
        results.append({
            "product_code": row["PRODUCT_CODE"],
            "product_name": row["PRODUCT_NAME"],
            "total_quantity": int(row["TOTAL_QTY"]),
        })
    return results


def get_barcode_match(barcode: str):
    df = load_df()
    match = df[df["BARCODE"].astype(str) == str(barcode)]
    if match.empty:
        return None
    return match.iloc[0]["PRODUCT_CODE"]


# ------------------------------------------------------------- product view

def status_for(quantity: int, laq: int) -> str:
    pct = depletion_pct(quantity, laq)
    if pct >= 90:
        return "critical"   # red
    if pct >= 70:
        return "medium"     # yellow
    return "available"      # green


def product_detail(product_code: str):
    df = load_df()
    rows = df[df["PRODUCT_CODE"] == normalize_code(product_code)]
    if rows.empty:
        return None

    locations = []
    total_qty = 0
    for _, r in rows.iterrows():
        qty, laq = int(r["QUANTITY"]), int(r["LAQ"])
        total_qty += qty
        locations.append({
            "sku": r["SKU"],
            "warehouse": r["WAREHOUSE"],
            "row": r["ROW"],
            "bin": r["BIN"],
            "quantity": qty,
            "laq": laq,
            "depletion_pct": depletion_pct(qty, laq),
            "status": status_for(qty, laq),
        })

    worst_pct = max((l["depletion_pct"] for l in locations), default=0)
    overall_status = "critical" if worst_pct >= 90 else "medium" if worst_pct >= 70 else "available"

    return {
        "product_code": product_code,
        "product_name": rows.iloc[0]["PRODUCT_NAME"],
        "barcode": rows.iloc[0]["BARCODE"],
        "total_quantity": total_qty,
        "overall_status": overall_status,
        "locations": sorted(locations, key=lambda l: -l["quantity"]),
    }


# ------------------------------------------------------------------ alerts

def stock_alerts(threshold: float = 70.0):
    """Return every bin whose depletion% is >= threshold (used for pre-critical + bell alerts)."""
    df = load_df()
    alerts = []
    for _, r in df.iterrows():
        qty, laq = int(r["QUANTITY"]), int(r["LAQ"])
        pct = depletion_pct(qty, laq)
        if pct >= threshold:
            alerts.append({
                "sku": r["SKU"],
                "product_name": r["PRODUCT_NAME"],
                "product_code": r["PRODUCT_CODE"],
                "warehouse": r["WAREHOUSE"],
                "row": r["ROW"],
                "bin": r["BIN"],
                "quantity": qty,
                "laq": laq,
                "depletion_pct": pct,
                "level": "critical" if pct >= 90 else "warning",
            })
    return sorted(alerts, key=lambda a: -a["depletion_pct"])


# -------------------------------------------------------------- smart pick

def smart_pick(product_code: str, quantity: int):
    """
    Smart pick logic:
      1. If a single bin already holds >= requested quantity, pull entirely from
         that bin (prefer the smallest bin that still satisfies the request, so we
         don't fragment a large bin unnecessarily).
      2. Otherwise, drain bins starting with the LARGEST stock counts first, so that
         bins are emptied completely (freeing up bin space) rather than lightly
         skimmed across many bins.
    Returns a plan (and applies it) or raises ValueError if insufficient stock.
    """
    with _lock:
        df = load_df()
        rows = df[df["PRODUCT_CODE"] == normalize_code(product_code)].copy()
        if rows.empty:
            raise ValueError("Product not found")

        available_total = int(rows["QUANTITY"].sum())
        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero")
        if quantity > available_total:
            raise ValueError(f"Insufficient stock. Only {available_total} units available")

        rows = rows.sort_values("QUANTITY")
        single_bin_candidates = rows[rows["QUANTITY"] >= quantity]

        plan = []
        remaining = quantity

        if not single_bin_candidates.empty:
            # smallest bin that can still fulfill the whole request in one pull
            target_idx = single_bin_candidates.index[0]
            plan.append((target_idx, quantity))
            remaining = 0
        else:
            # drain largest bins first to empty them out
            for idx, r in rows.sort_values("QUANTITY", ascending=False).iterrows():
                if remaining <= 0:
                    break
                take = min(int(r["QUANTITY"]), remaining)
                if take > 0:
                    plan.append((idx, take))
                    remaining -= take

        for idx, take in plan:
            df.at[idx, "QUANTITY"] = int(df.at[idx, "QUANTITY"]) - take

        save_df(df)

        return [{
            "sku": df.at[idx, "SKU"],
            "warehouse": df.at[idx, "WAREHOUSE"],
            "row": df.at[idx, "ROW"],
            "bin": df.at[idx, "BIN"],
            "picked": take,
            "remaining_in_bin": int(df.at[idx, "QUANTITY"]),
        } for idx, take in plan]


# --------------------------------------------------------- optimized add

def add_stock_optimized(product_code: str, quantity: int, warehouse: str = None):
    """
    Add stock to the LEAST-FILLED existing bin for this product (optionally scoped to
    a warehouse) so that stock levels stay balanced across bins. If no existing bin
    exists for this product (or warehouse), creates a new bin record.
    Updates LAQ to reflect this addition (Last Added Quantity).
    """
    with _lock:
        df = load_df()
        rows = df[df["PRODUCT_CODE"] == normalize_code(product_code)].copy()
        if warehouse:
            rows = rows[rows["WAREHOUSE"] == warehouse.strip().upper()]

        if rows.empty:
            all_rows = df[df["PRODUCT_CODE"] == normalize_code(product_code)]
            if all_rows.empty:
                raise ValueError("Unknown product code. Use /api/product/new to register a new SKU.")
            template = all_rows.iloc[0]
            new_row = {
                "SKU": f"{product_code}-{len(df) + 1:04d}",
                "PRODUCT_NAME": template["PRODUCT_NAME"],
                "PRODUCT_CODE": product_code,
                "BARCODE": template["BARCODE"],
                "WAREHOUSE": (warehouse or template["WAREHOUSE"]).strip().upper(),
                "ROW": "ROW 1",
                "BIN": "BIN 1",
                "QUANTITY": quantity,
                "LAQ": quantity,
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            save_df(df)
            return new_row

        target_idx = rows["QUANTITY"].idxmin()
        df.at[target_idx, "QUANTITY"] = int(df.at[target_idx, "QUANTITY"]) + quantity
        df.at[target_idx, "LAQ"] = quantity
        save_df(df)
        return {
            "sku": df.at[target_idx, "SKU"],
            "warehouse": df.at[target_idx, "WAREHOUSE"],
            "row": df.at[target_idx, "ROW"],
            "bin": df.at[target_idx, "BIN"],
            "new_quantity": int(df.at[target_idx, "QUANTITY"]),
            "laq": int(df.at[target_idx, "LAQ"]),
        }


# -------------------------------------------------------------- transfer
    with _lock:
        df = load_df()
        print(f"DEBUG transfer_stock received: product_code={product_code!r} "
              f"src=({src_warehouse!r}, {src_row!r}, {src_bin!r})")
        src_mask = (
            (df["PRODUCT_CODE"] == normalize_code(product_code))
            & (df["WAREHOUSE"] == src_warehouse) & (df["ROW"] == src_row) & (df["BIN"] == src_bin)
        )
def transfer_stock(product_code: str, quantity: int,
                    src_warehouse: str, src_row: str, src_bin: str,
                    dst_warehouse: str, dst_row: str, dst_bin: str):
    src_warehouse, src_row, src_bin = src_warehouse.strip().upper(), src_row.strip().upper(), src_bin.strip().upper()
    dst_warehouse, dst_row, dst_bin = dst_warehouse.strip().upper(), dst_row.strip().upper(), dst_bin.strip().upper()

    if (src_warehouse, src_row, src_bin) == (dst_warehouse, dst_row, dst_bin):
        raise ValueError("Source and destination locations must be different")

    with _lock:
        df = load_df()
        src_mask = (
            (df["PRODUCT_CODE"] == normalize_code(product_code))
            & (df["WAREHOUSE"] == src_warehouse) & (df["ROW"] == src_row) & (df["BIN"] == src_bin)
        )
        if not src_mask.any():
            raise ValueError("Source location does not stock this product")
        src_idx = df[src_mask].index[0]

        if int(df.at[src_idx, "QUANTITY"]) < quantity:
            raise ValueError("Insufficient stock at source location")

        dst_mask = (
            (df["PRODUCT_CODE"] == normalize_code(product_code))
            & (df["WAREHOUSE"] == dst_warehouse) & (df["ROW"] == dst_row) & (df["BIN"] == dst_bin)
        )

        df.at[src_idx, "QUANTITY"] = int(df.at[src_idx, "QUANTITY"]) - quantity

        if dst_mask.any():
            dst_idx = df[dst_mask].index[0]
            df.at[dst_idx, "QUANTITY"] = int(df.at[dst_idx, "QUANTITY"]) + quantity
            df.at[dst_idx, "LAQ"] = quantity
        else:
            template = df.loc[src_idx]
            new_row = {
                "SKU": f"{product_code}-{len(df) + 1:04d}",
                "PRODUCT_NAME": template["PRODUCT_NAME"],
                "PRODUCT_CODE": product_code,
                "BARCODE": template["BARCODE"],
                "WAREHOUSE": dst_warehouse,
                "ROW": dst_row,
                "BIN": dst_bin,
                "QUANTITY": quantity,
                "LAQ": quantity,
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        save_df(df)
        return {"moved": quantity, "from": f"{src_warehouse}/{src_row}/{src_bin}", "to": f"{dst_warehouse}/{dst_row}/{dst_bin}"}


def list_warehouses():
    df = load_df()
    if df.empty:
        return []
    return sorted(df["WAREHOUSE"].dropna().unique().tolist())
