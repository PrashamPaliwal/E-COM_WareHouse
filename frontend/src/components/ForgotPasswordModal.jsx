import React, { useState } from "react";
import { X } from "lucide-react";
import { api } from "../api.js";

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1: enter user + answer, 2: set new password
  const [username, setUsername] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotVerify({ username, security_answer: securityAnswer });
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.forgotReset({ username, security_answer: securityAnswer, new_password: newPassword });
      setSuccess("Password updated successfully. You can now sign in.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white text-black rounded-3xl p-8 w-full max-w-sm shadow-2xl relative aura-ring">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold mb-1">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-5">
          {step === 1
            ? "Verify your identity with your security question."
            : "Choose a new password."}
        </p>

        {success ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">{success}</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-black text-white font-semibold">
              Close
            </button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 aura-ring outline-none"
              placeholder="User ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 aura-ring outline-none"
              placeholder="Childhood friend's name"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 aura-ring outline-none"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 aura-ring outline-none"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-black text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
