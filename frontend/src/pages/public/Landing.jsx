import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Seo from "../../components/common/Seo.jsx";

export default function LandingPage() {
  // Default stats to show even if API fails
  const defaultStats = {
    total_users: 0,
    validations_this_month: 0,
    total_validations: 0,
    average_score: 0,
  };
  
  const [usageStats, setUsageStats] = useState(defaultStats);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        const response = await fetch("/api/public/usage-stats");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            setUsageStats(data.stats);
          } else {
            // If API returns but no stats, keep defaults
            setUsageStats(defaultStats);
          }
        } else {
          // If API fails, keep defaults
          setUsageStats(defaultStats);
        }
      } catch (error) {
        console.error("Failed to load usage stats:", error);
        // On error, keep defaults so stats section still shows
        setUsageStats(defaultStats);
      } finally {
        setLoadingStats(false);
      }
    };

    loadUsageStats();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-4">
      <Seo
        title="Startup Idea Advisor | Get Investor-Ready Validation in Minutes"
        description="Save 10+ hours of research. Validate your startup idea or discover personalized opportunities in minutes. Get investor-ready analysis that would cost $500+ from a consultant—instantly and free to start."
        path="/"
      />

      {/* Usage Stats / Social Proof Section */}
      <div className="mb-8 rounded-3xl border-2 border-brand-200/80 dark:border-brand-700/80 bg-gradient-to-br from-brand-50 via-white to-brand-50/30 dark:from-brand-900/30 dark:via-slate-800/50 dark:to-brand-900/20 p-6 shadow-xl shadow-brand-500/10 dark:shadow-brand-500/5">
        <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          <div className="transition-transform hover:scale-105">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent">
              {usageStats?.total_users > 0 ? usageStats.total_users.toLocaleString() + "+" : "—"}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">Entrepreneurs</div>
          </div>
          <div className="transition-transform hover:scale-105">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent">
              {usageStats?.validations_this_month > 0 ? usageStats.validations_this_month.toLocaleString() + "+" : "—"}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">Ideas Validated This Month</div>
          </div>
          <div className="transition-transform hover:scale-105">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent">
              {usageStats?.total_validations > 0 ? usageStats.total_validations.toLocaleString() + "+" : "—"}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">Total Validations</div>
          </div>
          <div className="transition-transform hover:scale-105">
            <div className="text-3xl font-extrabold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent">
              {usageStats?.average_score > 0 ? `${usageStats.average_score}/10` : "—"}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">Average Score</div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-semantic-success-50 to-semantic-success-100/50 dark:from-semantic-success-900/30 dark:to-semantic-success-800/20 px-3 py-1.5 border border-semantic-success-200/60 dark:border-semantic-success-700/40 shadow-sm">
          <span className="text-semantic-success-600 dark:text-semantic-success-400 font-bold">✓</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">No credit card required</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-semantic-success-50 to-semantic-success-100/50 dark:from-semantic-success-900/30 dark:to-semantic-success-800/20 px-3 py-1.5 border border-semantic-success-200/60 dark:border-semantic-success-700/40 shadow-sm">
          <span className="text-semantic-success-600 dark:text-semantic-success-400 font-bold">✓</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">2 free validations</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-semantic-success-50 to-semantic-success-100/50 dark:from-semantic-success-900/30 dark:to-semantic-success-800/20 px-3 py-1.5 border border-semantic-success-200/60 dark:border-semantic-success-700/40 shadow-sm">
          <span className="text-semantic-success-600 dark:text-semantic-success-400 font-bold">✓</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">4 free discoveries</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-semantic-success-50 to-semantic-success-100/50 dark:from-semantic-success-900/30 dark:to-semantic-success-800/20 px-3 py-1.5 border border-semantic-success-200/60 dark:border-semantic-success-700/40 shadow-sm">
          <span className="text-semantic-success-600 dark:text-semantic-success-400 font-bold">✓</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Cancel anytime</span>
        </div>
      </div>

      {/* Hero Section */}
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-100 via-brand-50 to-brand-100 dark:from-brand-900/50 dark:via-brand-800/30 dark:to-brand-900/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 shadow-lg shadow-brand-500/20 dark:shadow-brand-500/10 border-2 border-brand-200/60 dark:border-brand-700/40">
          ✨ Startup Idea Advisor
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl lg:text-5xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent">
          Get investor-ready validation in minutes, not weeks
        </h1>
        {/* Value Highlights */}
        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-5 text-sm font-medium">
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 px-4 py-2 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
            <span className="text-lg">⚡</span>
            <span className="text-slate-700 dark:text-slate-300">Results in 30 to 90 seconds</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 px-4 py-2 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
            <span className="text-lg">💰</span>
            <span className="text-slate-700 dark:text-slate-300">Save $500+ vs. consultants</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 px-4 py-2 border border-emerald-200/60 dark:border-emerald-700/40 shadow-sm">
            <span className="text-lg">⏱️</span>
            <span className="text-slate-700 dark:text-slate-300">10+ hours of research saved</span>
          </div>
        </div>
      </header>

      {/* Founder Connect Feature Highlight */}
      <div className="mb-8 rounded-3xl border-2 border-brand-300/80 dark:border-brand-700/80 bg-gradient-to-br from-brand-50 via-white to-brand-50/30 dark:from-brand-900/30 dark:via-slate-800/50 dark:to-brand-900/20 p-6 shadow-xl shadow-brand-500/10 dark:shadow-brand-500/5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 text-2xl shadow-sm">
            🤝
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-50">Founder Connect - Find Your Co-Founder</h2>
            <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Connect with other founders, find co-founders, and collaborate on startup ideas. Browse anonymized profiles and listings, send connection requests, and reveal identities when both sides accept.
            </p>
            <ul className="mb-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Create your founder profile and list validated ideas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Browse anonymized founder profiles and idea listings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Privacy-first: identities only revealed after mutual acceptance</span>
              </li>
            </ul>
            <Link
              to="/founder-connect"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
            >
              Explore Founder Connect 🤝
            </Link>
          </div>
        </div>
      </div>

      {/* Two Options */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Validate Idea Option */}
        <div className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-coral-300/80 dark:border-coral-700/80 bg-gradient-to-br from-white via-coral-50/30 to-white dark:from-slate-800 dark:via-coral-900/20 dark:to-slate-800 p-6 shadow-2xl shadow-coral-500/20 dark:shadow-coral-500/10 transition-all duration-300 hover:shadow-2xl hover:shadow-coral-500/30 dark:hover:shadow-coral-500/20 hover:-translate-y-2 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-coral-100/40 via-transparent to-transparent dark:from-coral-900/20"></div>
          <div className="relative flex flex-col flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900/50 dark:to-coral-800/50 text-lg shadow-sm">
                🔍
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Validate Your Idea</h2>
            </div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Already have a startup idea? Get investor-ready validation in minutes. Our AI analyzes your idea across 10 key parameters—market fit, competition, feasibility, and more—saving you weeks of research. Think of us as your brutally honest startup friend (with AI superpowers).
            </p>
            <ul className="mb-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed"><strong>Investor-ready analysis</strong> in 30 to 90 seconds</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">10-parameter validation (market, competition, feasibility)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">Save 10+ hours of manual research</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">Actionable next steps & improvement roadmap</span>
              </li>
            </ul>
            <Link
              to="/validate-idea"
              className="mt-auto inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-coral-500/25 transition-all duration-200 hover:from-coral-600 hover:to-coral-700 hover:shadow-xl hover:shadow-coral-500/30 hover:-translate-y-0.5"
            >
              Validate My Idea 🚀
            </Link>
          </div>
        </div>

        {/* Search for Ideas Option */}
        <div className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-brand-300/80 dark:border-brand-700/80 bg-gradient-to-br from-white via-brand-50/30 to-white dark:from-slate-800 dark:via-brand-900/20 dark:to-slate-800 p-6 shadow-2xl shadow-brand-500/20 dark:shadow-brand-500/10 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/30 dark:hover:shadow-brand-500/20 hover:-translate-y-2 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-100/40 via-transparent to-transparent dark:from-brand-900/20"></div>
          <div className="relative flex flex-col flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 text-lg shadow-sm">
                💡
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Discover New Ideas</h2>
            </div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Don't have an idea yet? Get personalized startup opportunities matched to your profile in minutes. Our AI analyzes your goals, skills, budget, and time to surface ideas you can actually execute. Let's find your perfect match! ✨
            </p>
            <ul className="mb-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed"><strong>Top 3 ideas</strong> matched to your profile & constraints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">Financial projections & breakeven analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">30/60/90 day execution roadmap (ready to start)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">Complete PDF report (share with co-founders/investors)</span>
              </li>
            </ul>
            <Link
              to="/advisor"
              className="mt-auto inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
            >
              Discover Ideas 💡
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

