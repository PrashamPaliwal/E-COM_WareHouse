import React, { useEffect, useState } from "react";
import { Moon, Sun, Warehouse, KeyRound, User, ShieldCheck } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { api } from "../api.js";
import ForgotPasswordModal from "./ForgotPasswordModal.jsx";

export default function Login({ onLogin }) {
  const { dark, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const loadCaptcha = () => {
    api.captcha().then(setCaptcha).catch(() => setCaptcha({ a: 3, b: 4 }));
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login({
        username,
        password,
        captcha_a: captcha.a,
        captcha_b: captcha.b,
        captcha_answer: Number(captchaAnswer),
      });
      onLogin(result);
    } catch (err) {
      setError(err.message);
      loadCaptcha();
      setCaptchaAnswer("");
    } finally {
      setLoading(false);
    }
  };

  const boxClass = `rounded-2xl px-4 py-3 w-full outline-none border transition-all aura-ring ${
    dark
      ? "bg-white text-black border-white/20 placeholder-gray-500"
      : "bg-white text-black border-gray-200 placeholder-gray-400"
  }`;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4">
      {/* theme toggle */}
      <button
        onClick={toggle}
        className={`absolute top-6 right-6 p-3 rounded-full aura-ring transition-colors ${
          dark ? "bg-white text-black" : "bg-black text-white"
        }`}
        title="Toggle theme"
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
            dark ? "bg-white text-black" : "bg-black text-white"
          }`}
        >
          <Warehouse size={38} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">StockGrid</h1>
        <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
          Multi-Warehouse Inventory & Location Tracking
        </p>
      </div>

      {/* login card */}
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl space-y-5 aura-ring bg-white text-black`}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 aura-ring">
          <User size={18} className="ml-4 text-gray-500 shrink-0" />
          <input
            className="w-full py-3 pr-4 rounded-2xl outline-none bg-transparent"
            placeholder="User ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 aura-ring">
          <KeyRound size={18} className="ml-4 text-gray-500 shrink-0" />
          <input
            type="password"
            className="w-full py-3 pr-4 rounded-2xl outline-none bg-transparent"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 aura-ring px-4 py-3">
          <ShieldCheck size={18} className="text-gray-500 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">
            {captcha.a} + {captcha.b} =
          </span>
          <input
            type="number"
            className="w-full outline-none bg-transparent"
            placeholder="?"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-black text-white font-semibold aura-ring hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-blue-600 text-sm hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </form>

      <p className={`mt-6 text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Demo: admin1 / admin123 &nbsp;|&nbsp; jdoe / pass123
      </p>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
