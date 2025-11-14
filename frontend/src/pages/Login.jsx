import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Sign In</h1>
        <p className="mb-6 text-slate-600">Welcome back! Sign in to continue.</p>

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

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create one
          </Link>
        </div>
      </div>
    </section>
  );
}

