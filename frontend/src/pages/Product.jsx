import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const steps = [
  {
    title: "1. Share your profile",
    body: "Tell us your goals, available time, industry interests, skills, and budget. The more context you give, the sharper the ideas become.",
  },
  {
    title: "2. AI crew researches & evaluates",
    body: "Specialized agents analyze markets, competition, financials, and risks. Each idea is vetted against your constraints and appetite for risk.",
  },
  {
    title: "3. Review your advisor-grade report",
    body: "Receive a structured report with top ideas, validation steps, 30/60/90 day plan, and exportable PDF. Rerun anytime as your goals evolve.",
  },
];

const deliverables = [
  "Tailored shortlist of startup ideas ranked by fit",
  "Market trends, customer segments, and competitor insights",
  "Financial outline: monetization, cost to launch, revenue potential",
  "Risk assessment and mitigation suggestions",
  "Validation playbook: interviews, landing page tests, success metrics",
  "Downloadable PDF and saved sessions for future reference",
];

export default function ProductPage() {
  return (
    <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
      <Seo
        title="Product Overview | Startup Idea Advisor"
        description="See how our AI crew transforms your profile into validated startup ideas with advisor-grade insights."
        path="/product"
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">How it works</p>
        <h1 className="text-3xl font-semibold text-slate-900">A co-pilot for founders validating their next venture</h1>
        <p className="text-slate-600">
          Startup Idea Advisor combines your background with multi-agent research to produce a curated report in minutes—not weeks of manual digging.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{step.body}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Every report includes</h2>
        <ul className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          {deliverables.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 text-brand-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-2xl bg-brand-50/70 p-5 text-sm text-brand-900">
        <p>
          Ready to test an idea? <Link to="/" className="font-semibold underline">Start a free beta run</Link> or <Link to="/pricing" className="font-semibold underline">upgrade for unlimited reports</Link>.
        </p>
      </div>
    </section>
  );
}

