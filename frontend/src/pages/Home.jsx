import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReports } from "../context/ReportsContext.jsx";
import Seo from "../components/Seo.jsx";

const fieldClasses =
  "w-full rounded-xl border border-slate-200 bg-white/70 p-4 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const timeOptions = [
  "5-10 hours per week",
  "10-15 hours per week",
  "15-25 hours per week",
  "Full-time",
];

const budgetOptions = ["<$2k", "$2k - $5k", "$5k - $15k", "$15k+", "Undisclosed"];

const riskOptions = ["Conservative", "Moderate", "Aggressive"];

const modelOptions = [
  "Subscription SaaS",
  "Marketplace",
  "Digital products",
  "Services / Agency",
  "Community / Membership",
  "Other",
];

const TOTAL_STEPS = 3;

export default function HomePage() {
  const navigate = useNavigate();
  const { inputs, setInputs, loading, error, runCrew, reports } = useReports();
  const [localInputs, setLocalInputs] = useState(inputs);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocalInputs(inputs);
    setStep(0);
    setTouched(false);
  }, [inputs]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setLocalInputs((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    if (step === 0) {
      return localInputs.goals.trim().length > 0;
    }
    if (step === 1) {
      return localInputs.professional_background.trim().length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setTouched(false);
      setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    } else {
      setTouched(true);
    }
  };

  const handleBack = () => {
    setTouched(false);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep()) {
      setTouched(true);
      return;
    }
    setInputs(localInputs);
    const { success, runId } = await runCrew(localInputs);
    if (success) {
      navigate(runId ? `/results/profile?id=${runId}` : "/results/profile");
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-6">
            <div className="grid gap-2">
              <label htmlFor="goals" className="text-sm font-semibold text-slate-700">
                Goals
              </label>
              <textarea
                id="goals"
                name="goals"
                rows={3}
                className={fieldClasses}
                value={localInputs.goals}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500">
                What outcome are you aiming for (e.g. replace income, validate a concept, build passive revenue)?
              </p>
              {touched && localInputs.goals.trim().length === 0 && (
                <p className="text-xs text-red-500">Please describe your goals.</p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <label
                  htmlFor="time_commitment"
                  className="text-sm font-semibold text-slate-700"
                >
                  Time Commitment
                </label>
                <select
                  id="time_commitment"
                  name="time_commitment"
                  className={fieldClasses}
                  value={localInputs.time_commitment}
                  onChange={handleChange}
                >
                  {timeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  How many hours per week can you dedicate in the next 3-6 months?
                </p>
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="interests"
                  className="text-sm font-semibold text-slate-700"
                >
                  Interests & Expertise Areas
                </label>
                <input
                  id="interests"
                  name="interests"
                  type="text"
                  className={fieldClasses}
                  value={localInputs.interests}
                  onChange={handleChange}
                />
                <p className="text-xs text-slate-500">
                  Separate multiple interests with commas (e.g. climate tech, edtech, AI).
                </p>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid gap-6">
            <div className="grid gap-2">
              <label
                htmlFor="professional_background"
                className="text-sm font-semibold text-slate-700"
              >
                Professional Background
              </label>
              <textarea
                id="professional_background"
                name="professional_background"
                rows={3}
                className={fieldClasses}
                value={localInputs.professional_background}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500">
                Summarize recent roles, industries, and standout achievements.
              </p>
              {touched && localInputs.professional_background.trim().length === 0 && (
                <p className="text-xs text-red-500">Tell us about your background.</p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <label htmlFor="skills" className="text-sm font-semibold text-slate-700">
                  Key Skills & Strengths
                </label>
                <textarea
                  id="skills"
                  name="skills"
                  rows={2}
                  className={fieldClasses}
                  value={localInputs.skills}
                  onChange={handleChange}
                />
                <p className="text-xs text-slate-500">
                  List hard and soft skills you bring (e.g. sales, design, ops).
                </p>
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="resources"
                  className="text-sm font-semibold text-slate-700"
                >
                  Available Resources & Network
                </label>
                <textarea
                  id="resources"
                  name="resources"
                  rows={2}
                  className={fieldClasses}
                  value={localInputs.resources}
                  onChange={handleChange}
                />
                <p className="text-xs text-slate-500">
                  Mention advisors, potential partners, distribution channels, tools, etc.
                </p>
              </div>
            </div>
          </div>
        );
      case 2:
      default:
        return (
          <div className="grid gap-6">
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
              <div className="grid gap-2">
                <label
                  htmlFor="budget_range"
                  className="text-sm font-semibold text-slate-700"
                >
                  Launch Budget
                </label>
                <select
                  id="budget_range"
                  name="budget_range"
                  className={fieldClasses}
                  value={localInputs.budget_range}
                  onChange={handleChange}
                >
                  {budgetOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Estimated cash you can invest in the first 6 months.</p>
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="risk_tolerance"
                  className="text-sm font-semibold text-slate-700"
                >
                  Risk Tolerance
                </label>
                <select
                  id="risk_tolerance"
                  name="risk_tolerance"
                  className={fieldClasses}
                  value={localInputs.risk_tolerance}
                  onChange={handleChange}
                >
                  {riskOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Examples: Conservative, Moderate, Aggressive.</p>
              </div>
              <div className="grid gap-2">
                <label
                  htmlFor="preferred_model"
                  className="text-sm font-semibold text-slate-700"
                >
                  Preferred Business Models / Industries
                </label>
                <select
                  id="preferred_model"
                  name="preferred_model"
                  className={fieldClasses}
                  value={localInputs.preferred_model}
                  onChange={handleChange}
                >
                  {modelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">e.g. SaaS, marketplaces, services, climate, healthcare.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="learning_goals"
                className="text-sm font-semibold text-slate-700"
              >
                Learning Goals & Personal Priorities
              </label>
              <textarea
                id="learning_goals"
                name="learning_goals"
                rows={2}
                className={fieldClasses}
                value={localInputs.learning_goals}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500">
                Skills you want to develop or lifestyle criteria you care about.
              </p>
            </div>
          </div>
        );
    }
  };

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className="grid gap-12">
      <Seo
        title="AI Startup Idea Generator | Startup Idea Advisor"
        description="Provide your goals, availability, and expertise—our AI crew researches markets and delivers personalized startup recommendations."
        path="/"
        keywords="ai startup idea generator, business idea advisor, personalized startup recommendations"
      >
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Startup Idea Advisor",
            url: "https://startupideaadvisor.com",
            logo: "https://startupideaadvisor.com/logo.png",
            sameAs: [
              "https://www.linkedin.com/company/startup-idea-advisor",
              "https://twitter.com/startupideaAI",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              email: "hello@startupideaadvisor.com",
              contactType: "customer support",
            },
          })}
        </script>
      </Seo>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/90 via-brand-600 to-brand-800 p-[1px] shadow-soft">
        <div className="relative rounded-[calc(1.5rem-1px)] bg-white/95 px-6 py-12 sm:px-10">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-4 py-1 text-sm font-medium text-brand-700">
              AI co-pilot for side hustles & founders
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Turn your profile into vetted startup ideas
            </h1>
            <p className="text-lg text-slate-600">
              Share your goals, time, and strengths. Our multi-agent crew researches markets, evaluates risks, and hands you advisor-grade recommendations within minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#start"
                className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-600"
              >
                Start your free beta run
              </a>
              <Link
                to="/pricing"
                className="rounded-xl border border-white/70 bg-white/70 px-5 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-300"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-900">Why founders use Startup Idea Advisor</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Personalized insight",
              body: "Ideas are tailored to your skills, budget, time, and appetite for risk—no generic lists.",
            },
            {
              title: "Advisor-grade analysis",
              body: "Each report includes market research, financial outlook, and risk mitigation steps.",
            },
            {
              title: "Faster validation",
              body: "Iterate quickly with saved runs, PDF exports, and 30/60/90 day roadmaps.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <form
        id="start"
        onSubmit={handleSubmit}
        className="grid gap-8 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft backdrop-blur"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {renderStepContent()}

        <div className="flex flex-wrap items-center gap-4">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-300"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Continue
            </button>
          )}
          {step === TOTAL_STEPS - 1 && (
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:from-brand-300 disabled:to-brand-300"
            >
              {loading ? "Running crew..." : "Generate recommendations"}
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <p className="text-xs text-slate-500">
          We never store your inputs. <Link to="/privacy" className="text-brand-600 underline">Read our privacy promises.</Link>
        </p>
      </form>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-900">Trusted by builders at</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              quote: "It distilled my 12-year finance career into side-hustle ideas I can test on weekends.",
              name: "Priya S.",
              title: "VP Strategy, FinTech",
            },
            {
              quote: "The crew nailed ideas that fit my budget and network—without me spending weeks researching.",
              name: "Daniel M.",
              title: "Product Lead, HealthTech",
            },
            {
              quote: "Finally an advisor-grade ideation process I can rerun whenever my focus shifts.",
              name: "Lina R.",
              title: "Solo Founder",
            },
          ].map((item) => (
            <blockquote
              key={item.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm"
            >
              <p className="italic">“{item.quote}”</p>
              <p className="mt-3 font-semibold text-slate-800">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.title}</p>
            </blockquote>
          ))}
        </div>
      </section>

      {reports && (
        <section className="rounded-3xl border border-brand-200 bg-brand-50/80 p-6 text-brand-900 shadow-inner">
          <h2 className="text-lg font-semibold">Latest report saved</h2>
          <p className="mt-1 text-sm text-brand-700">
            Visit the dashboard or the tabs above to review your profile summary and recommendations anytime.
          </p>
        </section>
      )}
    </div>
  );
}
