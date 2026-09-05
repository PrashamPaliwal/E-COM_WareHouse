import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, PackageCheck } from "lucide-react";
import { api } from "../api.js";

const STATUS_COLOR = {
  available: "bg-green-500",
  medium: "bg-yellow-500",
  critical: "bg-red-500",
};

export default function ProductDetails({ productCode, onBack }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [loadError, setLoadError] = useState(null);

  const load = () => {
    api.product(productCode)
      .then((p) => { setProduct(p); setLoadError(null); })
      .catch((e) => setLoadError(e.message));
  };

  useEffect(() => {
    load();
  }, [productCode]);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto mt-10 text-center text-gray-500">
        {loadError ? <span className="text-red-500">{loadError}</span> : "Loading product…"}
        <div className="mt-4">
          <button onClick={onBack} className="text-blue-600 hover:underline text-sm">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const handlePick = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.pick({ product_code: productCode, quantity: Number(quantity) });
      const summary = res.plan
        .map((p) => `${p.picked} from ${p.warehouse}/${p.row}/${p.bin} (now ${p.remaining_in_bin} left)`)
        .join("; ");
      setMessage({ type: "success", text: `Picked successfully: ${summary}` });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 mb-16 px-2">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-black mb-4">
        <ArrowLeft size={16} /> Back to search
      </button>

      <div className="bg-white text-black rounded-3xl shadow-xl p-8 aura-ring">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Product Name</p>
            <h1 className="text-2xl font-bold">{product.product_name}</h1>
          </div>
          <span className={`w-4 h-4 rounded-full ${STATUS_COLOR[product.overall_status]} mt-2`} />
        </div>
        <p className="text-sm text-gray-500 mb-6">
          <span className="uppercase tracking-wide text-gray-400 font-semibold text-xs mr-1">Product Code</span>
          {product.product_code}
        </p>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Locations</p>
          <p className="text-sm font-semibold">{product.total_quantity} total units available</p>
        </div>

        <div className="space-y-3 mb-8">
          {product.locations.map((loc) => (
            <div
              key={loc.sku}
              className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${STATUS_COLOR[loc.status]}`} />
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400" />
                    {loc.warehouse} &middot; {loc.row} &middot; {loc.bin}
                  </p>
                  <p className="text-xs text-gray-500">{loc.depletion_pct}% depleted vs LAQ ({loc.laq})</p>
                </div>
              </div>
              <span className="text-lg font-bold">{loc.quantity}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max={product.total_quantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-28 py-3 px-4 rounded-xl border border-gray-200 aura-ring outline-none text-center font-semibold"
          />
          <button
            onClick={handlePick}
            disabled={loading || product.total_quantity === 0}
            className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <PackageCheck size={20} />
            {loading ? "Picking…" : "PICK ITEM"}
          </button>
        </div>

        {message && (
          <p className={`mt-4 text-sm ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
