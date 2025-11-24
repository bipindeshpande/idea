import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";

export default function AdminForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo title="Admin Forgot Password | Startup Idea Advisor" description="Admin password reset" path="/admin/forgot-password" />
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Reset Admin Password</h1>
        
        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                If the email address exists in our system, we've sent a password reset link to <strong>{email}</strong>.
              </p>
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                Please check your email and click the link to reset your password. The link will expire in 1 hour.
              </p>
            </div>
            <Link
              to="/admin"
              className="block w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Admin Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-slate-800 dark:text-slate-100 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                placeholder="Enter your admin email"
                required
                autoFocus
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
              {loading ? "Sending..." : "Send Reset Link"}
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

