import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";

export default function LandingPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Startup Idea Advisor | Validate Ideas or Discover New Opportunities"
        description="Validate your startup idea or discover personalized startup opportunities tailored to your profile."
        path="/"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          Startup Idea Advisor
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 dark:text-slate-100 md:text-5xl">
          Validate your idea or discover new opportunities
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Choose your path: validate an existing startup idea or let our AI discover personalized opportunities tailored to your profile.
        </p>
      </header>

      {/* Two Options */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Validate Idea Option */}
        <div className="rounded-3xl border-2 border-coral-200 dark:border-coral-800 bg-gradient-to-br from-coral-50 dark:from-coral-900/20 to-white dark:to-slate-800 p-8 shadow-soft">
          <div className="mb-6 text-4xl">🔍</div>
          <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Validate Your Idea</h2>
          <p className="mb-6 text-slate-600 dark:text-slate-300">
            Already have a startup idea? Get it validated across 10 key parameters including market fit, competition, feasibility, and more.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-coral-500 dark:text-coral-400">✓</span>
              <span>10-parameter validation analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-coral-500 dark:text-coral-400">✓</span>
              <span>Market opportunity assessment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-coral-500 dark:text-coral-400">✓</span>
              <span>Competitive landscape analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-coral-500 dark:text-coral-400">✓</span>
              <span>Actionable recommendations</span>
            </li>
          </ul>
          <Link
            to="/validate-idea"
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-coral-600 hover:to-coral-700"
          >
            Validate My Idea
          </Link>
        </div>

        {/* Search for Ideas Option */}
        <div className="rounded-3xl border-2 border-brand-200 dark:border-brand-700 bg-gradient-to-br from-brand-50 dark:from-brand-900/20 to-white dark:to-slate-800 p-8 shadow-soft">
          <div className="mb-6 text-4xl">💡</div>
          <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Discover New Ideas</h2>
          <p className="mb-6 text-slate-600 dark:text-slate-300">
            Don't have an idea yet? Let our AI advisor analyze your profile and discover personalized startup opportunities that match your goals, skills, and constraints.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500 dark:text-brand-400">✓</span>
              <span>Personalized idea recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500 dark:text-brand-400">✓</span>
              <span>Financial outlook & risk analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500 dark:text-brand-400">✓</span>
              <span>30/60/90 day execution roadmap</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-brand-500 dark:text-brand-400">✓</span>
              <span>Complete PDF report download</span>
            </li>
          </ul>
          <Link
            to="/advisor"
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
          >
            Discover Ideas
          </Link>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-12 rounded-3xl border border-sand-200 dark:border-sand-800 bg-sand-50/80 dark:bg-sand-900/20 p-8 shadow-soft">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Not sure which path to take?</h2>
          <p className="text-slate-600 dark:text-slate-300">
            If you have a specific idea in mind, start with validation. If you're exploring opportunities, let our AI discover ideas tailored to your profile.
          </p>
        </div>
      </div>
    </section>
  );
}

