import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const tiers = [
  {
    name: "Explorer",
    price: "$0",
    period: "Free",
    description: "Ideal for testing the workflow and running a couple of experiments.",
    features: [
      "2 idea runs per month",
      "Profile-based insights",
      "Sample recommendation report",
      "Email support (72h response)",
    ],
    highlight: false,
    cta: "Start for free",
    color: "brand",
  },
  {
    name: "Builder",
    price: "$39",
    period: "per month",
    description: "For operators actively validating side businesses or portfolio ideas.",
    features: [
      "Unlimited runs and saved sessions",
      "Downloadable PDF reports",
      "Financial & risk deep-dives",
      "Priority support (24h)",
    ],
    highlight: true,
    cta: "Start 14-day trial",
    color: "coral",
  },
  {
    name: "Advisor",
    price: "Custom",
    period: "",
    description: "For accelerators, advisors, or teams supporting multiple founders.",
    features: [
      "Team workspaces & shared dashboards",
      "White-labelled reports",
      "API access & automation",
      "Dedicated success manager",
    ],
    highlight: false,
    cta: "Book a demo",
    color: "aqua",
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Pricing | Startup Idea Advisor"
        description="Choose the plan that fits your ideation workflow—from free exploration to advisor-grade insights for teams."
        path="/pricing"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Simple plans for every stage
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Run as many idea experiments as you need. Upgrade when you're ready to unlock unlimited reports, deeper analysis, and team features.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
          All plans include saved sessions, dashboards, and our privacy guarantee: we don't store your inputs after a run finishes.
        </p>
      </header>

      {/* Pricing Tiers */}
      <div className="mb-16 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const colorClasses = {
            brand: {
              border: tier.highlight ? "border-brand-300" : "border-brand-200",
              bg: tier.highlight ? "bg-brand-50" : "bg-white",
              button: "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700",
              buttonSecondary: "border-brand-300 hover:border-brand-400 hover:bg-brand-50",
            },
            coral: {
              border: tier.highlight ? "border-coral-300" : "border-coral-200",
              bg: tier.highlight ? "bg-coral-50" : "bg-white",
              button: "bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700",
              buttonSecondary: "border-coral-300 hover:border-coral-400 hover:bg-coral-50",
            },
            aqua: {
              border: tier.highlight ? "border-aqua-300" : "border-aqua-200",
              bg: tier.highlight ? "bg-aqua-50" : "bg-white",
              button: "bg-gradient-to-r from-aqua-500 to-aqua-600 hover:from-aqua-600 hover:to-aqua-700",
              buttonSecondary: "border-aqua-300 hover:border-aqua-400 hover:bg-aqua-50",
            },
          };
          const colors = colorClasses[tier.color];

          return (
            <article
              key={tier.name}
              className={`rounded-3xl border-2 ${colors.border} ${colors.bg} p-6 shadow-soft ${
                tier.highlight ? "ring-2 ring-offset-2 ring-brand-300" : ""
              }`}
            >
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {tier.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <p className="text-4xl font-bold text-slate-900">{tier.price}</p>
                  {tier.period && (
                    <p className="text-sm font-medium text-slate-500">{tier.period}</p>
                  )}
                </div>
              </div>
              <p className="mb-6 text-sm text-slate-600">{tier.description}</p>
              <ul className="mb-6 space-y-3 text-sm text-slate-600">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-brand-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={tier.name === "Advisor" ? "/contact" : "/"}
                className={`inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition ${
                  tier.highlight
                    ? colors.button
                    : `border ${colors.buttonSecondary} bg-white text-slate-700`
                }`}
              >
                {tier.cta}
              </Link>
            </article>
          );
        })}
      </div>

      {/* Additional Info */}
      <section className="rounded-3xl border border-sand-200 bg-sand-50/80 p-8 shadow-soft">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Need something custom?</h2>
          <p className="text-slate-600">
            Want a concierge run or a custom workflow?{" "}
            <Link to="/contact" className="font-semibold text-brand-600 underline hover:text-brand-700">
              Contact us
            </Link>{" "}
            and we'll tailor a package for your team.
          </p>
        </div>
      </section>
    </section>
  );
}

