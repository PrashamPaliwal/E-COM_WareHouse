import React, { useEffect, useState } from "react";
import { AlertCircle, X, AlertTriangle } from "lucide-react";
import { api } from "../api.js";

export default function PreCriticalAlertBox() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.preCriticalAlerts().then(setAlerts).catch(() => setAlerts([]));
  }, [open]);

  const warning = alerts.filter((a) => a.level === "warning");
  const critical = alerts.filter((a) => a.level === "critical");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white text-black rounded-2xl p-8 shadow-lg aura-ring aura-ring-yellow flex items-center gap-4 text-left"
      >
        <div className="p-4 rounded-xl bg-yellow-100 text-yellow-600 shrink-0">
          <AlertCircle size={28} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Pre-critical Alert</h3>
          <p className="text-sm text-gray-500">
            {warning.length + critical.length} bins at or above 70% depletion (vs. LAQ)
          </p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white text-black rounded-3xl p-8 w-full max-w-xl shadow-2xl relative aura-ring aura-ring-yellow max-h-[80vh] overflow-hidden flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-1">Pre-critical Alerts</h2>
            <p className="text-sm text-gray-500 mb-5">
              Depletion % = ((LAQ - Quantity) / LAQ) × 100
            </p>

            <div className="overflow-y-auto scrollbar-thin space-y-3 pr-1">
              <Section title="90%+ Critical" items={critical} color="red" />
              <Section title="70-89% Warning" items={warning} color="yellow" />
              {alerts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">No pre-critical bins right now.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, items, color }) {
  if (items.length === 0) return null;
  const colorClasses = color === "red" ? "text-red-600 bg-red-50" : "text-yellow-700 bg-yellow-50";
  return (
    <div>
      <p className={`text-xs font-bold uppercase mb-2 ${color === "red" ? "text-red-600" : "text-yellow-700"}`}>
        {title} ({items.length})
      </p>
      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.sku} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${colorClasses}`}>
            <AlertTriangle size={16} className="shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{a.product_name}</p>
              <p className="text-xs opacity-80">
                {a.warehouse} · {a.row} · {a.bin} &middot; {a.quantity}/{a.laq} units
              </p>
            </div>
            <span className="text-sm font-bold">{a.depletion_pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
