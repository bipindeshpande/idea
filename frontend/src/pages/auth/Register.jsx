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

      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Create Account</h1>
        <p className="mb-6 text-slate-600">Get 3 days free access to all features</p>

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
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-center text-xs text-brand-700">
          <p className="font-semibold">✨ 3 Days Free Trial</p>
          <p className="mt-1">Access all features for free. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}

