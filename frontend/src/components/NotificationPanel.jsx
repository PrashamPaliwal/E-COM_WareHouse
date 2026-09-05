import React, { useEffect, useState } from "react";
import { Bell, X, AlertTriangle } from "lucide-react";
import { api } from "../api.js";

export default function NotificationPanel() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.criticalAlerts().then(setAlerts).catch(() => setAlerts([]));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000); // continuous tracking
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-3 rounded-full bg-white text-black aura-ring shadow"
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulseDot" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white text-black rounded-2xl shadow-2xl z-40 overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm">90% Depletion Alerts</h3>
            <button onClick={() => setOpen(false)}>
              <X size={16} className="text-gray-400" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">All stock levels healthy.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.sku} className="px-4 py-3 border-b border-gray-50 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.product_name}</p>
                    <p className="text-xs text-gray-500">
                      {a.warehouse} · {a.row} · {a.bin}
                    </p>
                    <p className="text-xs text-red-500 font-semibold mt-0.5">
                      {a.depletion_pct}% depleted &middot; {a.quantity} left
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
