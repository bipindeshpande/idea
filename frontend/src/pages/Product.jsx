import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const reportSlices = [
  {
    title: "Ranked shortlist with context",
    summary:
      "Each idea is scored against your goal, time commitment, budget, and strengths so trade-offs are immediate.",
    bullets: ["Fit badges for goal, time, budget, skill", "Narrative on where the leverage comes from"],
    accent: "from-brand-50 via-white to-aqua-100",
  },
  {
    title: "Financial guardrails",
    summary: "Startup costs, revenue levers, and breakeven watchpoints presented as a checklist you can act on.",
    bullets: ["Launch spend range with notes", "Pricing anchors + sensitivity cues"],
    accent: "from-coral-50 via-white to-sand-100",
  },
  {
    title: "Validation + execution runway",
    summary:
      "Discovery scripts, risk radar, and a 30/60/90 day roadmap so you know the first ten moves before committing budget.",
    bullets: ["Interview prompts with listen/act guidance", "Decision checklist before scaling"],
    accent: "from-aqua-50 via-white to-brand-100",
  },
];

const ideaTiles = [
  {
    title: "AI Compliance Companion",
    fit: "Strong fit",
    focus: "Healthcare operations automation",
    whyNow: "Your workflow background + appetite for regulated sectors make this a fast credibility win.",
    nextStep: "Line up 3 pilot clinics; validate legal review demand.",
    risk: "Regulatory shifts",
    mitigation: "Partner with pro-bono legal clinic for updates.",
  },
  {
    title: "Creator Finance OS",
    fit: "Selective fit",
    focus: "Digital creators & solo operators",
    whyNow: "Budget discipline and product marketing skill cover positioning and onboarding.",
    nextStep: "Interview 5 creators about tax prep fatigue; test pricing at $49/mo.",
    risk: "Feature creep",
    mitigation: "Ship only bookkeeping + cashflow alerts in first release.",
  },
];

const workflow = [
  {
    label: "Capture reality",
    detail: "Profile intake trims noise to your constraints: time, budget, strengths, industries.",
  },
  {
    label: "Agent collaboration",
    detail: "Research, financial, and customer agents exchange findings until a single report is ready.",
  },
  {
    label: "Advisor-grade delivery",
    detail: "You receive the same structure a growth advisor would hand over before day one of a project.",
  },
];

const decisionSignals = [
  {
    label: "Score breakdown",
    value: "Goal fit · Time fit · Budget window · Skill leverage",
  },
  {
    label: "Market conviction",
    value: "Demand signals, competitor map, differentiation story",
  },
  {
    label: "Execution clarity",
    value: "First 10 moves, risk plan, validation scripts, checkpoint metrics",
  },
];

export default function ProductPage() {
  return (
    <section className="rounded-[40px] bg-gradient-to-br from-brand-900/70 via-aqua-800/50 to-coral-800/60 p-[1px] shadow-[0_28px_80px_-42px_rgba(11,29,58,0.6)]">
      <Seo
        title="Product Overview | Startup Idea Advisor"
        description="See how our AI crew transforms your profile into validated startup ideas with advisor-grade insights."
        path="/product"
      />
      <div className="rounded-[38px] bg-white/97 p-10 md:p-14">
        <header className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
              Product overview
            </span>
            <h1 className="text-3xl font-semibold text-brand-900 md:text-4xl">
              Ship your next idea with an advisor in the loop
            </h1>
            <p className="max-w-2xl text-sm text-cloud-700 md:text-base">
              Startup Idea Advisor turns your profile into a ranked, defensible shortlist plus a validation plan you can run the same week.
              No recycled hustles—just the research, numbers, and scripts an operator needs to move.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-coral-600"
              >
                Generate my report
              </Link>
              <Link
                to="/results/recommendations/full"
                className="inline-flex items-center justify-center rounded-full border border-cloud-300 px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-cloud-100"
              >
                View sample structure
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-aqua-100 p-6 shadow-[0_30px_80px_-48px_rgba(17,31,66,0.45)]">
            <p className="text-xs uppercase tracking-wide text-brand-600">Inside the ranked shortlist</p>
            <div className="mt-4 grid gap-4">
              {ideaTiles.map((idea) => (
                <article
                  key={idea.title}
                  className="rounded-2xl border border-white/60 bg-white/95 p-4 text-sm text-cloud-700 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold text-brand-900">{idea.title}</p>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                      {idea.fit}
                    </span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-cloud-500">Focus</p>
                  <p>{idea.focus}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-cloud-500">Why it works for you</p>
                  <p>{idea.whyNow}</p>
                  <div className="mt-3 grid gap-3 rounded-2xl bg-brand-50/40 p-3 text-xs text-brand-900 md:grid-cols-2">
                    <div>
                      <p className="font-semibold uppercase tracking-wide">Immediate move</p>
                      <p className="mt-1 text-cloud-700">{idea.nextStep}</p>
                    </div>
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-rose-600">Key risk</p>
                      <p className="mt-1 text-cloud-700">
                        {idea.risk} → <span className="text-rose-600">Mitigate:</span> {idea.mitigation}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {reportSlices.map((item) => (
            <article
              key={item.title}
              className={`rounded-[28px] border border-white/60 bg-gradient-to-br ${item.accent} p-6 shadow-[0_24px_60px_-36px_rgba(17,31,66,0.4)]`}
            >
              <h2 className="text-lg font-semibold text-brand-900">{item.title}</h2>
              <p className="mt-3 text-sm text-cloud-700">{item.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-cloud-700">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 text-brand-600">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-[32px] border border-brand-100 bg-white/98 p-8 shadow-[0_30px_80px_-48px_rgba(17,31,66,0.45)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-brand-900">How the crew works on your behalf</h2>
              <p className="mt-2 text-sm text-cloud-600">
                Multiple agents pair research, finance, and customer development until the output is decision ready. You see the result, not the back-and-forth.
              </p>
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Compare plans
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {workflow.map((step, index) => (
              <article
                key={step.label}
                className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-sm text-cloud-700"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold uppercase tracking-wide text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-brand-900">{step.label}</h3>
                <p className="mt-2">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-sand-200 bg-sand-50/80 p-8 shadow-[0_24px_70px_-46px_rgba(17,31,66,0.4)]">
          <h2 className="text-2xl font-semibold text-brand-900">Signals you get in every report</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {decisionSignals.map((signal) => (
              <article key={signal.label} className="rounded-2xl border border-sand-200 bg-white/95 p-5 text-sm text-cloud-700">
                <p className="text-xs uppercase tracking-wide text-cloud-500">{signal.label}</p>
                <p className="mt-2 font-semibold text-brand-800">{signal.value}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-3xl bg-gradient-to-r from-coral-500 via-coral-400 to-aqua-400 p-[1px] shadow-[0_24px_70px_-42px_rgba(240,79,67,0.55)]">
          <div className="flex flex-col gap-4 rounded-[28px] bg-white/97 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-coral-500">Next step</p>
              <h3 className="mt-1 text-lg font-semibold text-brand-900">Ship your next experiment with confidence</h3>
              <p className="mt-2 text-sm text-cloud-700">
                Start a free beta run or jump to pricing for unlimited reports. Your next validation cycle can be underway by tomorrow.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-coral-600"
              >
                Start a free run
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-cloud-300 px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-cloud-100"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

