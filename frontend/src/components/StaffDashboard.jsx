import React, { useState } from "react";
import { Moon, Sun, UserCircle2, Warehouse, LogOut } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import SearchBar from "./SearchBar.jsx";
import NotificationPanel from "./NotificationPanel.jsx";
import EditWarehouseModal from "./EditWarehouseModal.jsx";
import PreCriticalAlertBox from "./PreCriticalAlertBox.jsx";
import ProductDetails from "./ProductDetails.jsx";

export default function StaffDashboard({ user, onLogout }) {
  const { dark, toggle } = useTheme();
  const [showEditWarehouse, setShowEditWarehouse] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  if (activeProduct) {
    return (
      <div className="min-h-screen px-4 py-6">
        <TopBar user={user} dark={dark} toggle={toggle} onLogout={onLogout} />
        <ProductDetails productCode={activeProduct} onBack={() => setActiveProduct(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <TopBar user={user} dark={dark} toggle={toggle} onLogout={onLogout} />

      <div className="mt-16 mb-10">
        <SearchBar onSelectProduct={setActiveProduct} />
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => setShowEditWarehouse(true)}
          className="bg-white text-black rounded-2xl p-8 shadow-lg aura-ring flex items-center gap-4 text-left"
        >
          <div className="p-4 rounded-xl bg-gray-100 shrink-0">
            <Warehouse size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg">EDIT WAREHOUSE</h3>
            <p className="text-sm text-gray-500">Add or transfer stock between bins</p>
          </div>
        </button>

        <PreCriticalAlertBox />
      </div>

      {showEditWarehouse && <EditWarehouseModal onClose={() => setShowEditWarehouse(false)} />}
    </div>
  );
}

function TopBar({ user, dark, toggle, onLogout }) {
  return (
    <div className="flex items-center justify-between max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-full ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
          <UserCircle2 size={28} />
        </div>
        <div>
          <p className="font-semibold leading-tight">{user.name}</p>
          <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Warehouse Staff</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`p-3 rounded-full aura-ring ${dark ? "bg-white text-black" : "bg-black text-white"}`}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationPanel />
        <button
          onClick={onLogout}
          className="p-3 rounded-full bg-white text-black aura-ring shadow"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
