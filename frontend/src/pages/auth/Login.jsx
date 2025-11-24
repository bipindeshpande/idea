import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(from);
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <Seo
        title="Sign In | Startup Idea Advisor"
        description="Sign in to your account to access startup idea recommendations and validation."
        path="/login"
      />

      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Sign In</h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">Welcome back! Sign in to continue.</p>

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
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-slate-800 dark:text-slate-200 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600 dark:text-slate-300">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-500 transition-colors">
              Forgot password?
            </Link>
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-500 transition-colors">
            Create one
          </Link>
        </div>
      </div>
    </section>
  );
}

