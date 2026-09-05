import React, { useState } from "react";
import { X, PackagePlus, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { api } from "../api.js";

export default function EditWarehouseModal({ onClose }) {
  const [mode, setMode] = useState(null); // null | "add" | "transfer"
  const [status, setStatus] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 px-4">
      <div className="bg-white/90 backdrop-blur-xl text-black rounded-3xl p-8 w-full max-w-lg shadow-2xl relative aura-ring">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-6">Edit Warehouse</h2>

        {!mode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <button
              onClick={() => setMode("add")}
              className="group flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-white border border-gray-200 aura-ring transition-colors hover:bg-green-500 hover:text-white"
            >
              <PackagePlus size={32} />
              <span className="font-bold text-lg">ADD STOCK</span>
            </button>
            <button
              onClick={() => setMode("transfer")}
              className="group flex flex-col items-center justify-center gap-3 py-10 rounded-2xl bg-white border border-gray-200 aura-ring transition-colors hover:bg-blue-500 hover:text-white"
            >
              <ArrowLeftRight size={32} />
              <span className="font-bold text-lg">TRANSFER STOCK</span>
            </button>
          </div>
        )}

        {mode === "add" && <AddStockForm onBack={() => setMode(null)} setStatus={setStatus} />}
        {mode === "transfer" && <TransferStockForm onBack={() => setMode(null)} setStatus={setStatus} />}

        {status && (
          <div className="mt-5 flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 size={18} />
            {status}
          </div>
        )}
      </div>
    </div>
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

function AddStockForm({ onBack, setStatus }) {
  const [productCode, setProductCode] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStatus("");
    try {
      const res = await api.addStock({
        product_code: productCode.trim(),
        quantity: Number(quantity),
        warehouse: warehouse.trim() || undefined,
      });
      setStatus(
        `Added ${quantity} units to ${res.result.warehouse || res.result.WAREHOUSE || warehouse} / ${
          res.result.bin || res.result.BIN
        } (least-filled bin).`
      );
      setProductCode("");
      setQuantity("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-2">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-black">
        ← Back
      </button>
      <Field placeholder="Product Code (e.g. ELEC-00005)" value={productCode} onChange={(e) => setProductCode(e.target.value)} required />
      <Field placeholder="Warehouse (optional, e.g. WAREHOUSE A)" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
      <Field type="number" min="1" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Confirm Add Stock"}
      </button>
    </form>
  );
}

function TransferStockForm({ onBack, setStatus }) {
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [src, setSrc] = useState({ warehouse: "", row: "", bin: "" });
  const [dst, setDst] = useState({ warehouse: "", row: "", bin: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStatus("");
    try {
      const res = await api.transferStock({
        product_code: productCode.trim(),
        quantity: Number(quantity),
        src_warehouse: src.warehouse,
        src_row: src.row,
        src_bin: src.bin,
        dst_warehouse: dst.warehouse,
        dst_row: dst.row,
        dst_bin: dst.bin,
      });
      setStatus(`Moved ${res.result.moved} units from ${res.result.from} to ${res.result.to}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-2">
      <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-black">
        ← Back
      </button>
      <Field placeholder="Product Code" value={productCode} onChange={(e) => setProductCode(e.target.value)} required />
      <Field type="number" min="1" placeholder="Quantity to transfer" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />

      <p className="text-xs font-semibold text-gray-500 uppercase mt-3">From</p>
      <div className="grid grid-cols-3 gap-2">
        <Field placeholder="Warehouse" value={src.warehouse} onChange={(e) => setSrc({ ...src, warehouse: e.target.value })} required />
        <Field placeholder="Row" value={src.row} onChange={(e) => setSrc({ ...src, row: e.target.value })} required />
        <Field placeholder="Bin" value={src.bin} onChange={(e) => setSrc({ ...src, bin: e.target.value })} required />
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase mt-3">To</p>
      <div className="grid grid-cols-3 gap-2">
        <Field placeholder="Warehouse" value={dst.warehouse} onChange={(e) => setDst({ ...dst, warehouse: e.target.value })} required />
        <Field placeholder="Row" value={dst.row} onChange={(e) => setDst({ ...dst, row: e.target.value })} required />
        <Field placeholder="Bin" value={dst.bin} onChange={(e) => setDst({ ...dst, bin: e.target.value })} required />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition disabled:opacity-50"
      >
        {loading ? "Transferring..." : "Confirm Transfer"}
      </button>
    </form>
  );
}
