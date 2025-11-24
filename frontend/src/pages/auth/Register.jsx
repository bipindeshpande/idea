import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
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
    const result = await register(email, password);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error || "Registration failed");
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo
        title="Create Account | Startup Idea Advisor"
        description="Create your account to get 3 days free access to startup idea recommendations and validation."
        path="/register"
      />

      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Create Account</h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">Get 3 days free access to all features</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50 to-coral-100/50 dark:from-coral-900/30 dark:to-coral-800/20 p-4 text-sm font-semibold text-coral-800 dark:text-coral-300 shadow-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-500 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 p-4 text-center text-xs text-brand-700 dark:text-brand-300 shadow-sm">
          <p className="font-bold">✨ 3 Days Free Trial</p>
          <p className="mt-1.5 leading-relaxed">Access all features for free. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

