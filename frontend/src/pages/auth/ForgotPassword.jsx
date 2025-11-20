import { useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      if (result.reset_link) {
        setResetLink(result.reset_link);
      }
    } else {
      setError(result.error || "Failed to send reset link");
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo
        title="Forgot Password | Startup Idea Advisor"
        description="Reset your password to regain access to your account."
        path="/forgot-password"
      />

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Forgot Password</h1>
        <p className="mb-6 text-slate-600">Enter your email and we'll send you a reset link.</p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Reset link sent!</p>
              <p className="mt-2">
                If an account exists with that email, we've sent a password reset link. Check your inbox.
              </p>
              {resetLink && (
                <div className="mt-4 rounded-lg border border-emerald-300 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold">Development Mode - Reset Link:</p>
                  <a
                    href={resetLink}
                    className="break-all text-xs text-emerald-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resetLink}
                  </a>
                </div>
              )}
            </div>
            <Link
              to="/login"
              className="block w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="your@email.com"
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
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

