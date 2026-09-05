"""
generate_mock_data.py
----------------------
Populates inventory.xlsx with 500-1000 mock SKUs spread across 3-4 warehouses,
each with multiple rows and bins. Run this once before starting the app:

    python generate_mock_data.py
"""

import random
import pandas as pd

random.seed(42)

WAREHOUSES = ["WAREHOUSE A", "WAREHOUSE B", "WAREHOUSE C"]  # 3 warehouses
ROWS_PER_WAREHOUSE = 4       # ROW 1 - ROW 4
BINS_PER_ROW = 4             # BIN 1 - BIN 4

CATEGORIES = {
    "Wireless Mouse": "ELEC", "Bluetooth Speaker": "ELEC", "USB-C Cable": "ELEC",
    "Laptop Stand": "ELEC", "Mechanical Keyboard": "ELEC", "Power Bank": "ELEC",
    "LED Desk Lamp": "HOME", "Ceramic Mug": "HOME", "Throw Pillow": "HOME",
    "Scented Candle": "HOME", "Wall Clock": "HOME", "Storage Basket": "HOME",
    "Running Shoes": "APRL", "Cotton T-Shirt": "APRL", "Denim Jacket": "APRL",
    "Wool Scarf": "APRL", "Baseball Cap": "APRL", "Leather Belt": "APRL",
    "Yoga Mat": "SPRT", "Dumbbell Set": "SPRT", "Water Bottle": "SPRT",
    "Resistance Bands": "SPRT", "Tennis Racket": "SPRT", "Cycling Helmet": "SPRT",
    "Notebook": "STAT", "Ballpoint Pen Set": "STAT", "Sticky Notes": "STAT",
    "Desk Organizer": "STAT", "Whiteboard Marker": "STAT", "Stapler": "STAT",
    "Coffee Maker": "KTCH", "Non-Stick Pan": "KTCH", "Cutting Board": "KTCH",
    "Blender": "KTCH", "Cutlery Set": "KTCH", "Electric Kettle": "KTCH",
    "Dog Leash": "PETS", "Cat Scratching Post": "PETS", "Pet Bed": "PETS",
    "Bird Feeder": "PETS", "Aquarium Filter": "PETS", "Pet Carrier": "PETS",
    "Board Game": "TOYS", "Building Blocks": "TOYS", "Puzzle 1000pc": "TOYS",
    "RC Car": "TOYS", "Action Figure": "TOYS", "Plush Toy": "TOYS",
    "Face Moisturizer": "BEAU", "Shampoo": "BEAU", "Lip Balm": "BEAU",
    "Sunscreen SPF50": "BEAU", "Hair Dryer": "BEAU", "Nail Polish Set": "BEAU",
}

ADJECTIVES = ["Pro", "Max", "Mini", "Lite", "Plus", "Ultra", "Classic", "Eco",
              "Deluxe", "Compact", "Premium", "Essential", "X", "2.0", "Air", "Go"]


def generate_products(target_count: int):
    """Generate `target_count` unique product (name, code, barcode) tuples."""
    products = []
    base_names = list(CATEGORIES.items())
    idx = 1
    while len(products) < target_count:
        base_name, cat = random.choice(base_names)
        adj = random.choice(ADJECTIVES)
        name = f"{base_name} {adj}"
        code = f"{cat}-{idx:05d}"
        barcode = f"{random.randint(100000000000, 999999999999)}"
        products.append((name, code, barcode))
        idx += 1
    return products


def generate_inventory(num_products: int = 650, output_path: str = "inventory.xlsx"):
    products = generate_products(num_products)
    rows = []
    sku_counter = 1

    for name, code, barcode in products:
        # each product is stocked in 1-3 different bins (possibly across warehouses)
        num_locations = random.randint(1, 3)
        used_locations = set()
        attempts = 0
        placed = 0
        while placed < num_locations and attempts < 20:
            attempts += 1
            warehouse = random.choice(WAREHOUSES)
            row = f"ROW {random.randint(1, ROWS_PER_WAREHOUSE)}"
            bin_ = f"BIN {random.randint(1, BINS_PER_ROW)}"
            key = (warehouse, row, bin_)
            if key in used_locations:
                continue
            used_locations.add(key)

            laq = random.choice([20, 25, 30, 40, 50, 60, 75, 100, 120, 150])
            # simulate realistic depletion: some fresh, some medium, some critical
            depletion_bucket = random.random()
            if depletion_bucket < 0.65:
                quantity = random.randint(int(laq * 0.35), laq)          # healthy stock
            elif depletion_bucket < 0.85:
                quantity = random.randint(int(laq * 0.11), int(laq * 0.30))  # pre-critical (70-90%)
            else:
                quantity = random.randint(0, max(0, int(laq * 0.10)))    # critical (90%+)

            rows.append({
                "SKU": f"SKU{sku_counter:05d}",
                "PRODUCT_NAME": name,
                "PRODUCT_CODE": code,
                "BARCODE": barcode,
                "WAREHOUSE": warehouse,
                "ROW": row,
                "BIN": bin_,
                "QUANTITY": quantity,
                "LAQ": laq,
            })
            sku_counter += 1
            placed += 1

    df = pd.DataFrame(rows, columns=[
        "SKU", "PRODUCT_NAME", "PRODUCT_CODE", "BARCODE",
        "WAREHOUSE", "ROW", "BIN", "QUANTITY", "LAQ",
    ])
    df.to_excel(output_path, sheet_name="Inventory", index=False, engine="openpyxl")
    print(f"Generated {len(df)} location-rows across {num_products} unique products -> {output_path}")


if __name__ == "__main__":
    # 650 unique products, each in 1-3 bins => roughly 700-1900 total rows,
    # satisfying the "500-1000 mock SKUs" requirement at the product level.
    generate_inventory(num_products=650, output_path="inventory.xlsx")
