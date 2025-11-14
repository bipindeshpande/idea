import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    if (!password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } else {
      setError(result.error || "Password reset failed");
    }
  };

  if (!token) {
    return (
      <section className="mx-auto max-w-md px-6 py-12">
        <Seo
          title="Reset Password | Startup Idea Advisor"
          description="Reset your password."
          path="/reset-password"
        />
        <div className="rounded-3xl border border-coral-200 bg-coral-50/80 p-8 text-coral-800 shadow-soft">
          <h2 className="text-lg font-semibold">Invalid Reset Link</h2>
          <p className="mt-2 text-sm">Please request a new password reset link.</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block rounded-xl bg-coral-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-coral-700"
          >
            Request New Link
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo
        title="Reset Password | Startup Idea Advisor"
        description="Reset your password to regain access to your account."
        path="/reset-password"
      />

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Reset Password</h1>
        <p className="mb-6 text-slate-600">Enter your new password below.</p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Password reset successful!</p>
              <p className="mt-2">Redirecting to sign in...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm text-coral-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}

