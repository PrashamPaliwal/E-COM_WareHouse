const BASE = "/api";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export const api = {
  captcha: () => fetch(`${BASE}/captcha`).then(handle),

  login: (payload) =>
    fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  forgotVerify: (payload) =>
    fetch(`${BASE}/forgot-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  forgotReset: (payload) =>
    fetch(`${BASE}/forgot-password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  search: (q) => fetch(`${BASE}/search?q=${encodeURIComponent(q)}`).then(handle),

  barcode: (code) => fetch(`${BASE}/barcode/${encodeURIComponent(code)}`).then(handle),

  product: (code) => fetch(`${BASE}/product/${encodeURIComponent(code)}`).then(handle),

  warehouses: () => fetch(`${BASE}/warehouses`).then(handle),

  preCriticalAlerts: () => fetch(`${BASE}/alerts/pre-critical`).then(handle),
  criticalAlerts: () => fetch(`${BASE}/alerts/critical`).then(handle),

  pick: (payload) =>
    fetch(`${BASE}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  addStock: (payload) =>
    fetch(`${BASE}/stock/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  transferStock: (payload) =>
    fetch(`${BASE}/stock/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  addEmployee: (payload) =>
    fetch(`${BASE}/admin/employees/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  removeEmployee: (payload) =>
    fetch(`${BASE}/admin/employees/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  listEmployees: (q = "") => fetch(`${BASE}/admin/employees?q=${encodeURIComponent(q)}`).then(handle),

  listFormerEmployees: (q = "") =>
    fetch(`${BASE}/admin/employees/former?q=${encodeURIComponent(q)}`).then(handle),
};
