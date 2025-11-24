import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset token. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/admin");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <section className="mx-auto max-w-md px-6 py-12">
        <Seo title="Admin Reset Password | Startup Idea Advisor" description="Admin password reset" path="/admin/reset-password" />
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
          <div className="rounded-xl border border-coral-200 dark:border-coral-700 bg-coral-50 dark:bg-coral-900/30 p-4">
            <p className="text-sm text-coral-800 dark:text-coral-200">
              Invalid reset token. Please request a new password reset.
            </p>
          </div>
          <Link
            to="/admin/forgot-password"
            className="mt-4 block w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
          >
            Request New Reset Link
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo title="Admin Reset Password | Startup Idea Advisor" description="Admin password reset" path="/admin/reset-password" />
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Reset Admin Password</h1>
        
        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Password reset successfully! Redirecting to login page...
              </p>
            </div>
            <Link
              to="/admin"
              className="block w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-slate-800 dark:text-slate-100 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                placeholder="Enter new password (min 8 characters)"
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-slate-800 dark:text-slate-100 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>
            {error && (
              <div className="mb-4 rounded-xl border border-coral-200 dark:border-coral-700 bg-coral-50 dark:bg-coral-900/30 p-3 text-sm text-coral-800 dark:text-coral-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <div className="mt-4 text-center">
              <Link
                to="/admin"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

