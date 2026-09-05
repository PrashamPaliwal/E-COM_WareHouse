"""
main.py - FastAPI backend for the Multi-Warehouse Inventory & Location Tracking System.
Run with:  uvicorn main:app --reload --port 8000
"""

import random
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import auth_utils as au
import inventory_utils as iu

app = FastAPI(title="Multi-Warehouse Inventory & Location Tracking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in real production deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------- captcha

@app.get("/api/captcha")
def get_captcha():
    a, b = random.randint(1, 9), random.randint(1, 9)
    return {"a": a, "b": b}


# ------------------------------------------------------------------ auth

class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_a: int
    captcha_b: int
    captcha_answer: int


@app.post("/api/login")
def login(payload: LoginRequest):
    if payload.captcha_answer != payload.captcha_a + payload.captcha_b:
        raise HTTPException(status_code=400, detail="Incorrect CAPTCHA answer")

    if not au.verify_login(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if au.is_admin(payload.username):
        return {"role": "admin", "username": payload.username, "name": "Administrator"}

    record = au.read_employee(payload.username)
    if not record:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    return {
        "role": "staff",
        "username": payload.username,
        "name": record["name"],
        "dob": record["dob"],
        "contact": record["contact"],
    }


class ForgotVerifyRequest(BaseModel):
    username: str
    security_answer: str


@app.post("/api/forgot-password/verify")
def forgot_verify(payload: ForgotVerifyRequest):
    record = au.read_employee(payload.username)
    is_admin_user = au.is_admin(payload.username)
    if not record and not is_admin_user:
        raise HTTPException(status_code=404, detail="Username not found")
    if is_admin_user:
        # admin security answer is fixed for the default hackathon account
        correct = payload.security_answer.strip().lower() == "admin"
    else:
        correct = payload.security_answer.strip().lower() == record["security_answer"].strip().lower()
    if not correct:
        raise HTTPException(status_code=401, detail="Security answer incorrect")
    return {"verified": True}


class ForgotResetRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str


@app.post("/api/forgot-password/reset")
def forgot_reset(payload: ForgotResetRequest):
    forgot_verify(ForgotVerifyRequest(username=payload.username, security_answer=payload.security_answer))
    if not au.username_exists(payload.username):
        raise HTTPException(status_code=404, detail="Username not found")
    au.update_password(payload.username, payload.new_password)
    return {"success": True}


# ---------------------------------------------------------------- search

@app.get("/api/search")
def search(q: str = ""):
    return iu.prefix_search(q, limit=6)


@app.get("/api/barcode/{code}")
def barcode_lookup(code: str):
    product_code = iu.get_barcode_match(code)
    if not product_code:
        raise HTTPException(status_code=404, detail="Barcode not recognized")
    return iu.product_detail(product_code)


@app.get("/api/product/{product_code}")
def product_detail(product_code: str):
    detail = iu.product_detail(product_code)
    if not detail:
        raise HTTPException(status_code=404, detail="Product not found")
    return detail


@app.get("/api/warehouses")
def warehouses():
    return iu.list_warehouses()


# ---------------------------------------------------------------- alerts

@app.get("/api/alerts/pre-critical")
def pre_critical_alerts():
    return iu.stock_alerts(threshold=70.0)


@app.get("/api/alerts/critical")
def critical_alerts():
    return iu.stock_alerts(threshold=90.0)


# ------------------------------------------------------------------ pick

class PickRequest(BaseModel):
    product_code: str
    quantity: int


@app.post("/api/pick")
def pick_item(payload: PickRequest):
    try:
        plan = iu.smart_pick(payload.product_code, payload.quantity)
        return {"success": True, "plan": plan}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------- add stock

class AddStockRequest(BaseModel):
    product_code: str
    quantity: int
    warehouse: Optional[str] = None


@app.post("/api/stock/add")
def add_stock(payload: AddStockRequest):
    try:
        result = iu.add_stock_optimized(payload.product_code, payload.quantity, payload.warehouse)
        return {"success": True, "result": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ------------------------------------------------------------- transfer

class TransferRequest(BaseModel):
    product_code: str
    quantity: int
    src_warehouse: str
    src_row: str
    src_bin: str
    dst_warehouse: str
    dst_row: str
    dst_bin: str


@app.post("/api/stock/transfer")
def transfer_stock(payload: TransferRequest):
    try:
        result = iu.transfer_stock(
            payload.product_code, payload.quantity,
            payload.src_warehouse, payload.src_row, payload.src_bin,
            payload.dst_warehouse, payload.dst_row, payload.dst_bin,
        )
        return {"success": True, "result": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------- admin: employees

class AddEmployeeRequest(BaseModel):
    admin_password: str
    name: str
    user_id: str
    dob: str
    contact: str
    employee_password: str
    security_answer: str


@app.post("/api/admin/employees/add")
def add_employee(payload: AddEmployeeRequest):
    if not au.verify_login("admin1", payload.admin_password):
        raise HTTPException(status_code=401, detail="Admin password incorrect")
    if au.username_exists(payload.user_id):
        raise HTTPException(status_code=409, detail="User ID already exists")
    au.add_credential(payload.user_id, payload.employee_password)
    au.write_employee(payload.user_id, payload.name, payload.dob, payload.contact, payload.security_answer)
    return {"success": True}


class RemoveEmployeeRequest(BaseModel):
    admin_password: str
    user_id: str


@app.post("/api/admin/employees/remove")
def remove_employee(payload: RemoveEmployeeRequest):
    if not au.verify_login("admin1", payload.admin_password):
        raise HTTPException(status_code=401, detail="Admin password incorrect")
    if not au.remove_employee(payload.user_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"success": True}


@app.get("/api/admin/employees")
def list_employees(q: str = ""):
    return au.list_active_employees(q)


@app.get("/api/admin/employees/former")
def list_former_employees(q: str = ""):
    return au.list_former_employees(q)


@app.get("/")
def root():
    return {"status": "ok", "service": "Multi-Warehouse Inventory & Location Tracking System"}
