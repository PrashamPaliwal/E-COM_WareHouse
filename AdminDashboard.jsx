import React, { useState } from "react";
import { Moon, Sun, LogOut, Users, UserPlus, UserMinus, Archive, X, Search } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { api } from "../api.js";

export default function AdminDashboard({ onLogout }) {
  const { dark, toggle } = useTheme();
  const [panel, setPanel] = useState(null); // null | "employees" | "add" | "remove" | "former"

  return (
    <div className="min-h-screen px-4 py-6 relative">
      <div className="flex items-center justify-between max-w-5xl mx-auto mb-12">
        <div>
          <h1 className="text-xl font-bold">Admin Console</h1>
          <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>StockGrid Administration</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} className={`p-3 rounded-full aura-ring ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogout} className="p-3 rounded-full bg-white text-black aura-ring shadow" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        <AdminBox icon={<Users size={30} />} title="Employee Data" subtitle="Search active staff" onClick={() => setPanel("employees")} />
        <AdminBox icon={<UserPlus size={30} />} title="Add Employee" subtitle="Register a new staff member" onClick={() => setPanel("add")} />
        <AdminBox icon={<UserMinus size={30} />} title="Remove Employee" subtitle="Archive & revoke access" onClick={() => setPanel("remove")} />
      </div>

      <button
        onClick={() => setPanel("former")}
        className="fixed bottom-8 right-8 flex items-center gap-2 bg-white text-black px-5 py-3 rounded-full shadow-xl aura-ring text-sm font-semibold"
      >
        <Archive size={16} /> Former Employees
      </button>

      {panel === "employees" && <EmployeeDataPanel onClose={() => setPanel(null)} />}
      {panel === "add" && <AddEmployeePanel onClose={() => setPanel(null)} />}
      {panel === "remove" && <RemoveEmployeePanel onClose={() => setPanel(null)} />}
      {panel === "former" && <FormerEmployeesPanel onClose={() => setPanel(null)} />}
    </div>
  );
}

function AdminBox({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white text-black rounded-3xl p-10 shadow-lg aura-ring flex flex-col items-center text-center gap-4 min-h-[220px] justify-center"
    >
      <div className="p-4 rounded-2xl bg-gray-100">{icon}</div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </button>
  );
}

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className={`bg-white text-black rounded-3xl p-8 w-full ${wide ? "max-w-xl" : "max-w-md"} shadow-2xl relative aura-ring max-h-[85vh] overflow-y-auto scrollbar-thin`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function EmployeeDataPanel({ onClose }) {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const search = async (q) => {
    setQuery(q);
    const res = await api.listEmployees(q);
    setEmployees(res);
  };
  React.useEffect(() => {
    search("");
  }, []);

  return (
    <ModalShell title="Employee Data" onClose={onClose} wide>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 aura-ring px-4 py-2.5 mb-4">
        <Search size={16} className="text-gray-400" />
        <input
          className="w-full outline-none bg-transparent"
          placeholder="Search by name or user ID"
          value={query}
          onChange={(e) => search(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {employees.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No matching employees.</p>}
        {employees.map((e) => (
          <div key={e.username} className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="font-semibold">{e.name} <span className="text-xs text-gray-400 font-normal">({e.username})</span></p>
            <p className="text-xs text-gray-500">DOB: {e.dob} &middot; Contact: {e.contact}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function AddEmployeePanel({ onClose }) {
  const [form, setForm] = useState({
    name: "", user_id: "", dob: "", contact: "",
    employee_password: "", admin_password: "", security_answer: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.addEmployee(form);
      setSuccess(`Employee "${form.name}" created successfully.`);
      setForm({ name: "", user_id: "", dob: "", contact: "", employee_password: "", admin_password: "", security_answer: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Add Employee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field placeholder="Full Name" value={form.name} onChange={update("name")} required />
        <Field placeholder="User ID" value={form.user_id} onChange={update("user_id")} required />
        <Field type="date" placeholder="Date of Birth" value={form.dob} onChange={update("dob")} required />
        <Field placeholder="Contact Number" value={form.contact} onChange={update("contact")} required />
        <Field type="password" placeholder="Employee Password" value={form.employee_password} onChange={update("employee_password")} required />
        <Field placeholder="Security Answer (childhood friend's name)" value={form.security_answer} onChange={update("security_answer")} required />
        <hr className="my-2" />
        <Field type="password" placeholder="Admin Password (verification)" value={form.admin_password} onChange={update("admin_password")} required />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>
      </form>
    </ModalShell>
  );
}

function RemoveEmployeePanel({ onClose }) {
  const [userId, setUserId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.removeEmployee({ user_id: userId, admin_password: adminPassword });
      setSuccess(`Employee "${userId}" removed and archived to bin/.`);
      setUserId("");
      setAdminPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Remove Employee" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field placeholder="Employee User ID" value={userId} onChange={(e) => setUserId(e.target.value)} required />
        <Field type="password" placeholder="Admin Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Removing..." : "Remove Employee"}
        </button>
      </form>
    </ModalShell>
  );
}

function FormerEmployeesPanel({ onClose }) {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState([]);
  const search = async (q) => {
    setQuery(q);
    const res = await api.listFormerEmployees(q);
    setEmployees(res);
  };
  React.useEffect(() => {
    search("");
  }, []);

  return (
    <ModalShell title="Former Employees" onClose={onClose} wide>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 aura-ring px-4 py-2.5 mb-4">
        <Search size={16} className="text-gray-400" />
        <input
          className="w-full outline-none bg-transparent"
          placeholder="Search archived records"
          value={query}
          onChange={(e) => search(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {employees.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No archived employees found.</p>}
        {employees.map((e) => (
          <div key={e.username} className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50">
            <p className="font-semibold">{e.name} <span className="text-xs text-gray-400 font-normal">({e.username})</span></p>
            <p className="text-xs text-gray-500">DOB: {e.dob} &middot; Contact: {e.contact}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function Field(props) {
  return (
    <input
      {...props}
      className="w-full py-2.5 px-4 rounded-xl border border-gray-200 aura-ring outline-none bg-white"
    />
  );
}
