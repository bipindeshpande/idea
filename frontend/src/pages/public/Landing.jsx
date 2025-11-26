import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Seo from "../../components/common/Seo.jsx";

export default function LandingPage() {
  const [usageStats, setUsageStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        const response = await fetch("/api/public/usage-stats");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUsageStats(data.stats);
          }
        }
      } catch (error) {
        console.error("Failed to load usage stats:", error);
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
      {usageStats && (
        <div className="mb-6 rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/50 to-white dark:from-brand-900/20 dark:to-slate-800/50 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {usageStats.total_users > 0 && (
              <div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {usageStats.total_users.toLocaleString()}+
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Entrepreneurs</div>
              </div>
            )}
            {usageStats.validations_this_month > 0 && (
              <div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {usageStats.validations_this_month.toLocaleString()}+
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Ideas Validated This Month</div>
              </div>
            )}
            {usageStats.total_validations > 0 && (
              <div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {usageStats.total_validations.toLocaleString()}+
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total Validations</div>
              </div>
            )}
            {usageStats.average_score > 0 && (
              <div>
                <div className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                  {usageStats.average_score}/10
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Average Score</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>No credit card required</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>2 free validations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>4 free discoveries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
          <span>Cancel anytime</span>
        </div>
      </div>

      {/* Hero Section */}
      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-50 to-brand-100/50 dark:from-brand-900/40 dark:to-brand-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 shadow-sm border border-brand-200/50 dark:border-brand-700/30">
          Startup Idea Advisor
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
          Get investor-ready validation in minutes, not weeks
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Save 10+ hours of research. Validate your startup idea across 10 key parameters or discover personalized opportunities—all in minutes. What would cost $500+ from a consultant, you get instantly.
        </p>
        {/* Value Highlights */}
        <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">⚡</span>
            <span>Results in 30-60 seconds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">💰</span>
            <span>Save $500+ vs. consultants</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">⏱️</span>
            <span>10+ hours of research saved</span>
          </div>
        </div>
      </header>

      {/* Two Options */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Validate Idea Option */}
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-coral-200/60 dark:border-coral-800/60 bg-white dark:bg-slate-800/50 p-5 shadow-lg shadow-coral-100/50 dark:shadow-coral-900/20 transition-all duration-300 hover:shadow-xl hover:shadow-coral-200/50 dark:hover:shadow-coral-900/30 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-coral-50/50 via-transparent to-transparent dark:from-coral-900/10"></div>
          <div className="relative flex flex-col flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral-100 to-coral-200 dark:from-coral-900/50 dark:to-coral-800/50 text-lg shadow-sm">
                🔍
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Validate Your Idea</h2>
            </div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Already have a startup idea? Get investor-ready validation in minutes. Our AI analyzes your idea across 10 key parameters—market fit, competition, feasibility, and more—saving you weeks of research.
            </p>
            <ul className="mb-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed"><strong>Investor-ready analysis</strong> in 30-60 seconds</span>
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
              Validate My Idea
            </Link>
          </div>
        </div>

        {/* Search for Ideas Option */}
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-lg shadow-brand-100/50 dark:shadow-brand-900/20 transition-all duration-300 hover:shadow-xl hover:shadow-brand-200/50 dark:hover:shadow-brand-900/30 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-transparent dark:from-brand-900/10"></div>
          <div className="relative flex flex-col flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 text-lg shadow-sm">
                💡
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Discover New Ideas</h2>
            </div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Don't have an idea yet? Get personalized startup opportunities matched to your profile in minutes. Our AI analyzes your goals, skills, budget, and time to surface ideas you can actually execute.
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
              Discover Ideas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

