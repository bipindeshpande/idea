import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";

const valuePanels = [
  {
    title: "Personalized Profile Analysis",
    summary: "Deep insights into your motivations, constraints, strengths, and opportunity angles tailored to your unique profile.",
    icon: "🎯",
    color: "brand",
  },
  {
    title: "Ranked Startup Ideas",
    summary: "Top 3 ideas scored against your goals, time commitment, budget, and skills with detailed fit analysis.",
    icon: "💡",
    color: "aqua",
  },
  {
    title: "Financial Outlook",
    summary: "Realistic startup costs, revenue projections, and breakeven timelines that respect your budget constraints.",
    icon: "💰",
    color: "coral",
  },
  {
    title: "Risk Radar",
    summary: "Identified risks with severity ratings and actionable mitigation strategies for each recommendation.",
    icon: "⚠️",
    color: "sand",
  },
  {
    title: "Validation Questions",
    summary: "Customer discovery scripts with guidance on what to listen for and how to act on responses.",
    icon: "🔍",
    color: "brand",
  },
  {
    title: "30/60/90 Day Roadmap",
    summary: "Customized execution plan with specific milestones and checkpoints for your chosen idea.",
    icon: "🗺️",
    color: "aqua",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Tell us about you",
    detail: "Share your goals, time commitment, budget, interests, work style, and experience. Our intake form captures what matters.",
  },
  {
    step: "2",
    title: "AI analyzes your profile",
    detail: "Our AI system researches markets, analyzes financials, assesses risks, and validates ideas based on your profile.",
  },
  {
    step: "3",
    title: "Get your reports",
    detail: "Receive a comprehensive profile analysis, ranked recommendations, and a full report with actionable next steps.",
  },
];

const deliverables = [
  {
    title: "Profile Summary",
    description: "Structured analysis of your motivations, constraints, strengths, and strategic considerations.",
  },
  {
    title: "Recommendation Matrix",
    description: "Compare ideas across goal fit, time fit, budget fit, skill fit, and work style alignment.",
  },
  {
    title: "Complete PDF Report",
    description: "Download a comprehensive PDF combining profile analysis, recommendations, and full report sections.",
  },
];

export default function ProductPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Product Overview | Startup Idea Advisor"
        description="Transform your profile into validated startup ideas with AI-powered analysis, financial outlook, and actionable roadmaps."
        path="/product"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Product Overview
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Get AI-validated startup ideas tailored to your profile
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Our AI advisor analyzes your goals, constraints, and strengths to deliver ranked recommendations with financial outlook, risk assessment, and execution roadmaps.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/advisor"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
          >
            Start Run
          </Link>
          <Link
            to="/results/recommendations/full?sample=true"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-brand-300 bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
          >
            View Sample Report
          </Link>
        </div>
      </header>

      {/* Value Panels */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">What You Get</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {valuePanels.map((panel) => {
            const colorClasses = {
              brand: "border-brand-200 bg-brand-50",
              aqua: "border-aqua-200 bg-aqua-50",
              coral: "border-coral-200 bg-coral-50",
              sand: "border-sand-200 bg-sand-50",
            };
            return (
              <article
                key={panel.title}
                className={`rounded-2xl border ${colorClasses[panel.color]} p-6 shadow-sm`}
              >
                <div className="mb-4 text-3xl">{panel.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{panel.title}</h3>
                <p className="text-sm text-slate-600">{panel.summary}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-16 rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">How It Works</h2>
          <p className="mt-2 text-slate-600">
            Three simple steps from profile to actionable recommendations
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {howItWorks.map((item) => (
            <article key={item.step} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {item.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="mb-16 rounded-3xl border border-sand-200 bg-sand-50/80 p-8 shadow-soft">
        <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">Your Deliverables</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {deliverables.map((item) => (
            <article key={item.title} className="rounded-2xl border border-sand-200 bg-white/95 p-6">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <div className="rounded-3xl border border-coral-200 bg-gradient-to-br from-coral-50 to-aqua-50 p-8 shadow-soft">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Ready to get started?</h2>
          <p className="mt-2 text-slate-600">
            Generate your personalized startup idea recommendations in minutes. No credit card required.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/advisor"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-coral-600 hover:to-coral-700"
            >
              Start Free Run
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

