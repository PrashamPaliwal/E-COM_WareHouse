"""
auth_utils.py
--------------
Handles all flat-file based authentication & employee record management.

Storage layout
--------------
user_data.txt        ->  one credential pair per line: "{username}-{password}"
usrdta/{username}.txt ->  4 lines: name / dob / contact / security answer (childhood friend)
bin/{username}.txt    ->  same format, moved here when an employee is removed
"""

import os
import shutil
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_FILE = os.path.join(BASE_DIR, "user_data.txt")
USRDTA_DIR = os.path.join(BASE_DIR, "usrdta")
BIN_DIR = os.path.join(BASE_DIR, "bin")

_lock = threading.Lock()  # simple file-write safety for a hackathon-scale app

os.makedirs(USRDTA_DIR, exist_ok=True)
os.makedirs(BIN_DIR, exist_ok=True)
if not os.path.exists(USER_DATA_FILE):
    with open(USER_DATA_FILE, "w") as f:
        f.write("admin1-admin123\n")


# ---------------------------------------------------------------- credentials

def _read_credentials():
    creds = {}
    if not os.path.exists(USER_DATA_FILE):
        return creds
    with open(USER_DATA_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line or "-" not in line:
                continue
            username, password = line.split("-", 1)
            creds[username] = password
    return creds


def _write_credentials(creds: dict):
    with open(USER_DATA_FILE, "w") as f:
        for username, password in creds.items():
            f.write(f"{username}-{password}\n")


def verify_login(username: str, password: str) -> bool:
    creds = _read_credentials()
    return creds.get(username) == password


def username_exists(username: str) -> bool:
    return username in _read_credentials()


def is_admin(username: str) -> bool:
    return username.strip().lower() == "admin1"


def update_password(username: str, new_password: str) -> bool:
    with _lock:
        creds = _read_credentials()
        if username not in creds:
            return False
        creds[username] = new_password
        _write_credentials(creds)
        return True


def add_credential(username: str, password: str):
    with _lock:
        creds = _read_credentials()
        creds[username] = password
        _write_credentials(creds)


def remove_credential(username: str) -> bool:
    with _lock:
        creds = _read_credentials()
        if username not in creds:
            return False
        del creds[username]
        _write_credentials(creds)
        return True


# ------------------------------------------------------------- employee files

def _employee_path(username: str, archived: bool = False) -> str:
    directory = BIN_DIR if archived else USRDTA_DIR
    return os.path.join(directory, f"{username}.txt")


def read_employee(username: str, archived: bool = False):
    path = _employee_path(username, archived)
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        lines = [l.rstrip("\n") for l in f.readlines()]
    while len(lines) < 4:
        lines.append("")
    return {
        "username": username,
        "name": lines[0],
        "dob": lines[1],
        "contact": lines[2],
        "security_answer": lines[3],
    }


def write_employee(username: str, name: str, dob: str, contact: str, security_answer: str):
    with _lock:
        path = _employee_path(username, archived=False)
        with open(path, "w") as f:
            f.write(f"{name}\n{dob}\n{contact}\n{security_answer}\n")


def list_active_employees(query: str = ""):
    query = (query or "").strip().lower()
    results = []
    for fname in os.listdir(USRDTA_DIR):
        if not fname.endswith(".txt"):
            continue
        username = fname[:-4]
        record = read_employee(username, archived=False)
        if not record:
            continue
        if query and query not in username.lower() and query not in record["name"].lower():
            continue
        results.append(record)
    return sorted(results, key=lambda r: r["name"].lower())


def list_former_employees(query: str = ""):
    query = (query or "").strip().lower()
    results = []
    for fname in os.listdir(BIN_DIR):
        if not fname.endswith(".txt"):
            continue
        username = fname[:-4]
        record = read_employee(username, archived=True)
        if not record:
            continue
        if query and query not in username.lower() and query not in record["name"].lower():
            continue
        results.append(record)
    return sorted(results, key=lambda r: r["name"].lower())


def remove_employee(username: str) -> bool:
    """Delete credential + move usrdta/{username}.txt -> bin/{username}.txt"""
    with _lock:
        if not remove_credential(username):
            return False
        src = _employee_path(username, archived=False)
        dst = _employee_path(username, archived=True)
        if os.path.exists(src):
            shutil.move(src, dst)
        return True
