import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";

export default function LandingPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-4">
      <Seo
        title="Startup Idea Advisor | Validate Ideas or Discover New Opportunities"
        description="Validate your startup idea or discover personalized startup opportunities tailored to your profile."
        path="/"
      />

      {/* Hero Section */}
      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-50 to-brand-100/50 dark:from-brand-900/40 dark:to-brand-800/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 shadow-sm border border-brand-200/50 dark:border-brand-700/30">
          Startup Idea Advisor
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
          Validate your idea or discover new opportunities
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Choose your path: validate an existing startup idea or let our AI discover personalized opportunities tailored to your profile.
        </p>
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
              Already have a startup idea? Get it validated across 10 key parameters including market fit, competition, feasibility, and more.
            </p>
            <ul className="mb-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">10-parameter validation analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">Market opportunity assessment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">Competitive landscape analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-900/50 text-[10px] font-semibold text-coral-700 dark:text-coral-300">✓</span>
                <span className="leading-relaxed">Actionable recommendations</span>
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
              Don't have an idea yet? Let our AI advisor analyze your profile and discover personalized startup opportunities that match your goals, skills, and constraints.
            </p>
            <ul className="mb-3 flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">Personalized idea recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">Financial outlook & risk analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">30/60/90 day execution roadmap</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span className="leading-relaxed">Complete PDF report download</span>
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

