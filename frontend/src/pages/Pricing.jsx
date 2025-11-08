import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const tiers = [
  {
    name: "Explorer",
    price: "$0",
    description: "Ideal for testing the workflow and running a couple of experiments.",
    features: [
      "2 idea runs per month",
      "Profile-based insights",
      "Sample recommendation report",
      "Email support (72h response)",
    ],
    highlight: false,
    cta: "Start for free",
  },
  {
    name: "Builder",
    price: "$39/mo",
    description: "For operators actively validating side businesses or portfolio ideas.",
    features: [
      "Unlimited runs and saved sessions",
      "Downloadable PDF reports",
      "Financial & risk deep-dives",
      "Priority support (24h)",
    ],
    highlight: true,
    cta: "Start 14-day trial",
  },
  {
    name: "Advisor",
    price: "Custom",
    description: "For accelerators, advisors, or teams supporting multiple founders.",
    features: [
      "Team workspaces & shared dashboards",
      "White-labelled reports",
      "API access & automation",
      "Dedicated success manager",
    ],
    highlight: false,
    cta: "Book a demo",
  },
];

export default function PricingPage() {
  return (
    <section className="grid gap-8">
      <Seo
        title="Pricing | Startup Idea Advisor"
        description="Choose the plan that fits your ideation workflow—from free exploration to advisor-grade insights for teams."
        path="/pricing"
      />
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">Simple plans for every stage</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Run as many idea experiments as you need. Upgrade when you’re ready to unlock unlimited reports, deeper analysis, and team features.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          All plans include saved sessions, dashboards, and our privacy guarantee: we don’t store your inputs after a run finishes.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`rounded-3xl border ${
              tier.highlight
                ? "border-brand-300 bg-white p-[2px] shadow-soft"
                : "border-slate-200 bg-white/90 shadow"
            }`}
          >
            <div className="rounded-[calc(1.5rem-2px)] bg-white/95 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tier.name}
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{tier.price}</p>
              <p className="mt-2 text-sm text-slate-600">{tier.description}</p>
              <ul className="mt-4 grid gap-2 text-sm text-slate-600">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-brand-500">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={tier.name === "Advisor" ? "/contact" : "/"}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tier.highlight
                    ? "bg-brand-500 text-white shadow hover:bg-brand-600"
                    : "border border-slate-300 text-slate-700 hover:border-brand-300"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-600 shadow-soft">
        <p>
          Want a concierge run or a custom workflow? <Link to="/contact" className="text-brand-600 underline">Contact us</Link> and we’ll tailor a package for your team.
        </p>
      </section>
    </section>
  );
}

