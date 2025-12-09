import { Link } from "react-router-dom";
import { useState } from "react";
import Seo from "../../components/common/Seo.jsx";
import ExpandableDetails from "../../components/common/ExpandableDetails.jsx";

const valuePanels = [
  {
    title: "Personalized Profile Analysis",
    summary: "Deep insights into your motivations, constraints, strengths, and opportunity angles tailored to your unique profile.",
    icon: "🎯",
    color: "brand",
    details: [
      "Motivation analysis: Why you want to start",
      "Constraint mapping: Time, budget, skills assessed",
      "Strength identification: What you bring to the table",
      "Opportunity angles: Strategic considerations for your profile"
    ],
  },
  {
    title: "Ranked Startup Ideas",
    summary: "Top 3 ideas scored against your goals, time commitment, budget, and skills with detailed fit analysis.",
    icon: "💡",
    color: "aqua",
    details: [
      "Scored across 5 dimensions: Goal fit, time fit, budget fit, skill fit, work style",
      "Detailed fit analysis for each idea",
      "Clear ranking with rationale",
      "Comparison matrix to evaluate options"
    ],
  },
  {
    title: "Financial Outlook",
    summary: "Realistic startup costs, revenue projections, and breakeven timelines that respect your budget constraints.",
    icon: "💰",
    color: "coral",
    details: [
      "Startup costs breakdown (initial + monthly)",
      "Revenue projections (conservative, realistic, optimistic scenarios)",
      "Breakeven timeline analysis",
      "Unit economics (LTV, CAC, margins)",
      "Funding requirements if needed"
    ],
  },
  {
    title: "Risk Radar",
    summary: "Identified risks with severity ratings and actionable mitigation strategies for each recommendation.",
    icon: "⚠️",
    color: "sand",
    details: [
      "5-10 key risks identified per idea",
      "Severity ratings (Low, Medium, High)",
      "Impact analysis for each risk",
      "Actionable mitigation strategies",
      "Early warning signals to watch"
    ],
  },
  {
    title: "Validation Questions",
    summary: "Customer discovery scripts with guidance on what to listen for and how to act on responses.",
    icon: "🔍",
    color: "brand",
    details: [
      "Structured customer interview scripts",
      "What to listen for in responses",
      "How to interpret feedback",
      "Next steps based on validation results"
    ],
  },
  {
    title: "30/60/90 Day Roadmap",
    summary: "Customized execution plan with specific milestones and checkpoints for your chosen idea.",
    icon: "🗺️",
    color: "aqua",
    details: [
      "Days 0-30: Validation phase (customer interviews, MVP)",
      "Days 30-60: Building phase (development, early customers)",
      "Days 60-90: Launch phase (public launch, marketing, sales)",
      "Specific milestones and deliverables for each phase",
      "Success metrics and checkpoints"
    ],
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
    <section className="mx-auto max-w-6xl px-6 py-6">
      <Seo
        title="Product Overview | Startup Idea Advisor"
        description="Transform your profile into validated startup ideas with AI-powered analysis, financial outlook, and actionable roadmaps."
        path="/product"
      />

      {/* Hero Section */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
          Validate your idea or discover new opportunities
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Choose your path: validate an existing startup idea across 10 key parameters, or let our AI discover personalized opportunities tailored to your profile, goals, and constraints.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/validate-idea"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all duration-200 hover:from-coral-600 hover:to-coral-700 hover:shadow-xl hover:shadow-coral-500/30 hover:-translate-y-0.5"
          >
            Validate Idea 🚀
          </Link>
          <Link
            to="/advisor"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
          >
            Discover Ideas 💡
          </Link>
          <Link
            to="/results/recommendations/full?sample=true"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300 shadow-sm transition-all duration-200 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:-translate-y-0.5"
          >
            View Sample Report
          </Link>
        </div>
      </header>

      {/* Value Panels */}
      <section className="mb-8">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">What You Get</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {valuePanels.map((panel) => {
            const colorClasses = {
              brand: "border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/80 via-brand-50/40 to-white dark:from-brand-900/20 dark:via-brand-900/10 dark:to-slate-800/50",
              aqua: "border-aqua-200/60 dark:border-aqua-700/60 bg-gradient-to-br from-aqua-50/80 via-aqua-50/40 to-white dark:from-aqua-900/20 dark:via-aqua-900/10 dark:to-slate-800/50",
              coral: "border-coral-200/60 dark:border-coral-700/60 bg-gradient-to-br from-coral-50/80 via-coral-50/40 to-white dark:from-coral-900/20 dark:via-coral-900/10 dark:to-slate-800/50",
              sand: "border-sand-200/60 dark:border-sand-700/60 bg-gradient-to-br from-sand-50/80 via-sand-50/40 to-white dark:from-sand-900/20 dark:via-sand-900/10 dark:to-slate-800/50",
            };
            return (
              <article
                key={panel.title}
                className={`group relative overflow-hidden rounded-2xl border ${colorClasses[panel.color]} p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60 dark:bg-slate-800/60 text-xl shadow-sm">
                    {panel.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{panel.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{panel.summary}</p>
                {panel.details && (
                  <ExpandableDetails triggerText="What's included" icon="→">
                    <ul className="space-y-1.5">
                      {panel.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-0.5 text-brand-600 dark:text-brand-400">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </ExpandableDetails>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 10 Validation Parameters - Expandable Section */}
      <section className="mb-8">
        <details className="group rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/50 via-brand-50/30 to-white dark:from-brand-900/10 dark:via-brand-900/5 dark:to-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">10-Parameter Validation Framework</h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  See all parameters we analyze when validating your startup idea
                </p>
              </div>
              <span className="flex-shrink-0 text-xl text-brand-600 dark:text-brand-400 transition-transform group-open:rotate-180">▼</span>
            </div>
          </summary>
          <div className="mt-4 space-y-3 pt-4 border-t border-brand-200/60 dark:border-brand-700/60">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { name: "Market Opportunity", desc: "Market size, growth trends, addressable market (TAM, SAM, SOM)" },
                { name: "Problem-Solution Fit", desc: "Customer pain point validation, solution relevance, willingness to pay" },
                { name: "Competitive Landscape", desc: "Direct/indirect competitors, differentiation opportunities, barriers to entry" },
                { name: "Target Audience Clarity", desc: "Customer personas, market segmentation, acquisition channels, LTV" },
                { name: "Business Model Viability", desc: "Revenue streams, pricing strategy, unit economics, CAC" },
                { name: "Technical Feasibility", desc: "Build complexity, required resources, tech stack, time to market" },
                { name: "Financial Sustainability", desc: "Startup costs, operating expenses, revenue projections, breakeven" },
                { name: "Scalability Potential", desc: "Growth potential, expansion opportunities, operational scalability" },
                { name: "Risk Assessment", desc: "Key risks identified, severity ratings, mitigation strategies" },
                { name: "Go-to-Market Strategy", desc: "Launch plan, distribution channels, marketing & sales approach" },
              ].map((param, idx) => (
                <div key={idx} className="rounded-lg border border-brand-200/40 dark:border-brand-700/40 bg-white/60 dark:bg-slate-800/40 p-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{param.name}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{param.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center">
              <Link to="/validate-idea" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                Start validating your idea →
              </Link>
            </p>
          </div>
        </details>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mb-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">How It Works</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Three simple steps from profile to actionable recommendations
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.map((item) => (
            <article key={item.step} className="group relative overflow-hidden rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/80 via-brand-50/40 to-white dark:from-brand-900/20 dark:via-brand-900/10 dark:to-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-500/25">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{item.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="mb-8 rounded-2xl border border-sand-200/60 dark:border-sand-800/60 bg-gradient-to-br from-sand-50/80 via-sand-50/40 to-white dark:from-sand-900/20 dark:via-sand-900/10 dark:to-slate-800/50 p-6 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">Your Deliverables</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {deliverables.map((item) => (
            <article key={item.title} className="group relative overflow-hidden rounded-2xl border border-sand-200/60 dark:border-sand-800/60 bg-white/95 dark:bg-slate-800/95 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-slate-50">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Founder Connect Section */}
      <section className="mb-8 rounded-3xl border-2 border-brand-300/80 dark:border-brand-700/80 bg-gradient-to-br from-brand-50 via-white to-brand-50/30 dark:from-brand-900/30 dark:via-slate-800/50 dark:to-brand-900/20 p-6 shadow-xl shadow-brand-500/10 dark:shadow-brand-500/5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 text-2xl shadow-sm">
            🤝
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-50">Founder Connect - Find Your Co-Founder</h2>
            <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              After validating your idea or discovering new opportunities, connect with other founders to find co-founders, collaborators, and build your startup team. Browse anonymized profiles and listings, send connection requests, and reveal identities when both sides accept.
            </p>
            <ul className="mb-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Create your founder profile and list validated ideas for collaboration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Browse anonymized founder profiles and idea listings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Privacy-first: identities only revealed after mutual acceptance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-[10px] font-semibold text-brand-700 dark:text-brand-300">✓</span>
                <span>Credit-based limits: Free (3/month), Starter (15/month), Pro (unlimited)</span>
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
      </section>

      {/* CTA Section */}
      <div className="rounded-2xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50/80 via-aqua-50/40 to-white dark:from-coral-900/20 dark:via-aqua-900/10 dark:to-slate-800/50 p-6 shadow-lg">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 md:text-2xl">Ready to get started?</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Validate your existing idea or discover new opportunities tailored to your profile. No credit card required.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/validate-idea"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition-all duration-200 hover:from-coral-600 hover:to-coral-700 hover:shadow-xl hover:shadow-coral-500/30 hover:-translate-y-0.5"
            >
              Validate Idea
            </Link>
            <Link
              to="/advisor"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
            >
              Discover Ideas
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


