# StockGrid — Multi-Warehouse Inventory & Location Tracking System

A full-stack hackathon project: **FastAPI + Pandas/OpenPyxl** backend backed by flat
files and `inventory.xlsx`, and a **React + Tailwind + Lucide** frontend.

```
build/
├── backend/
│   ├── main.py                 FastAPI app (all REST endpoints)
│   ├── auth_utils.py           user_data.txt / usrdta/ / bin/ file I/O
│   ├── inventory_utils.py      inventory.xlsx logic: search, pick, transfer, add, alerts
│   ├── generate_mock_data.py   populates inventory.xlsx with 500-1000+ mock SKUs
│   ├── requirements.txt
│   ├── user_data.txt           credentials store  ("username-password" per line)
│   ├── usrdta/                 active employee records ({username}.txt)
│   └── bin/                    archived (removed) employee records
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js               fetch client for the backend
    │   ├── context/ThemeContext.jsx
    │   └── components/
    │       ├── Login.jsx
    │       ├── ForgotPasswordModal.jsx
    │       ├── SearchBar.jsx
    │       ├── NotificationPanel.jsx
    │       ├── EditWarehouseModal.jsx
    │       ├── PreCriticalAlertBox.jsx
    │       ├── ProductDetails.jsx
    │       ├── StaffDashboard.jsx
    │       └── AdminDashboard.jsx
    ├── package.json / vite.config.js / tailwind.config.js
    └── index.html
```

## 1. Backend setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate      # optional but recommended
pip install -r requirements.txt

# populate inventory.xlsx with 650 mock products (1,300+ location-rows across
# 3 warehouses × 4 rows × 4 bins) — already generated once, re-run any time to reset:
python generate_mock_data.py

# start the API on http://localhost:8000
uvicorn main:app --reload --port 8000
```

`user_data.txt` already ships with:
- `admin1-admin123` (default admin account)
- `jdoe-pass123` (demo staff account, profile in `usrdta/jdoe.txt`)

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api to localhost:8000
```

## 3. How the pieces map to the spec

- **Auth**: `auth_utils.py` reads/writes `user_data.txt` (`{username}-{password}` per
  line), employee profiles in `usrdta/{username}.txt` (name / DOB / contact / security
  answer on lines 1-4), and moves files into `bin/` on removal.
- **Login page**: logo, beige background, top-right moon/sun theme toggle (white boxes
  stay white, text flips black/white), CAPTCHA (`a + b = ?`), aura-ring hover/focus
  glow on every input, bottom-right blue "Forgot Password" link → security-question
  modal → `PATCH`-style update of `user_data.txt`.
- **Staff dashboard**: top-left profile silhouette + name, top-right bell with red dot
  → 90%-depletion notification panel, centered search bar with barcode icon and
  live top-6 prefix autocomplete (`/api/search`), "EDIT WAREHOUSE" (Add/Transfer
  stock popup) and "Pre-critical Alert" (70%/90% yellow-aura box) tiles.
- **Product details**: capitalized `WAREHOUSE / ROW / BIN`, green/yellow/red status
  dots, exact unit counts, quantity input, and a full-width green **PICK ITEM**
  button wired to the smart-pick algorithm in `inventory_utils.smart_pick`.
- **Admin dashboard** (`admin1`): three vertical boxes — Employee Data (search
  `usrdta/`), Add Employee (creates credentials + profile after admin-password
  check), Remove Employee (deletes credential + moves file to `bin/`) — plus a
  bottom-right "Former Employees" button that searches `bin/`.
- **Depletion tracking**: `((LAQ - QUANTITY) / LAQ) * 100`, computed live on every
  read in `inventory_utils.py` (`depletion_pct`, `status_for`, `stock_alerts`).
- **Smart pick**: pulls from a single bin if one bin alone satisfies the request
  (smallest sufficient bin, to avoid fragmenting large bins); otherwise drains bins
  largest-first to empty them out and free bin space.
- **Optimized add**: `add_stock_optimized` always tops up the **least-filled**
  existing bin for a product (optionally scoped to a warehouse), and updates LAQ.
- **Transfer**: `transfer_stock` verifies source ≠ destination, checks available
  quantity, and creates the destination bin record if it doesn't exist yet.

## 4. Notes for production hardening (out of scope for the hackathon build)

- Swap flat-file auth for hashed passwords + a real session/JWT layer.
- Add file locking / a real DB if concurrent writers are expected at scale.
- Restrict CORS origins in `main.py` instead of `"*"`.
