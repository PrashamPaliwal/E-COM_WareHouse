import React, { useEffect, useRef, useState } from "react";
import { Search, Barcode } from "lucide-react";
import { api } from "../api.js";

export default function SearchBar({ onSelectProduct }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api
        .search(query)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 150); // debounce for real-time feel
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleScan = async () => {
    const code = window.prompt("Enter/scan barcode:");
    if (!code) return;
    try {
      const product = await api.barcode(code.trim());
      onSelectProduct(product.product_code);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-lg aura-ring">
        <Search size={20} className="text-gray-400 shrink-0" />
        <input
          className="w-full outline-none bg-transparent text-black placeholder-gray-400"
          placeholder="Type product name or scan barcode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        <button
          type="button"
          onClick={handleScan}
          className="text-gray-500 hover:text-black transition shrink-0"
          title="Scan barcode"
        >
          <Barcode size={22} />
        </button>
      </div>

      {open && results.length > 0 && (
        <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-30 border border-gray-100">
          {results.map((r) => (
            <button
              key={r.product_code}
              onClick={() => {
                onSelectProduct(r.product_code);
                setOpen(false);
                setQuery("");
              }}
              className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center justify-between transition"
            >
              <div>
                <p className="font-medium text-black">{r.product_name}</p>
                <p className="text-xs text-gray-500">{r.product_code}</p>
              </div>
              <span className="text-xs text-gray-400">{r.total_quantity} units</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
