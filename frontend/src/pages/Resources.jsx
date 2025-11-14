import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const resources = [
  {
    category: "Playbooks",
    icon: "📚",
    color: "brand",
    items: [
      {
        title: "Founder Onboarding Checklist",
        description: "10-minute prep to capture goals, constraints, and unfair advantages before running the crew.",
        link: "/blog/validate-a-startup-idea-in-60-minutes",
      },
      {
        title: "60-Minute Validation Sprint",
        description: "Rapid loop to test landing pages, interviews, and willingness to pay.",
        link: "/blog/validate-a-startup-idea-in-60-minutes",
      },
    ],
  },
  {
    category: "Templates",
    icon: "📋",
    color: "aqua",
    items: [
      {
        title: "Customer Interview Script",
        description: "Structured questions for post-report discovery calls (problem, solution, willingness to pay).",
        link: "/contact?topic=interview-script",
      },
      {
        title: "Experiment Tracker",
        description: "Lightweight sheet to log hypotheses, tests, and outcomes.",
        link: "/contact?topic=experiment-tracker",
      },
    ],
  },
  {
    category: "Community",
    icon: "👥",
    color: "coral",
    items: [
      {
        title: "Builder Circle (Slack)",
        description: "Swap validation tactics, share feedback on reports, and find co-conspirators.",
        link: "mailto:hello@startupideaadvisor.com?subject=Builder%20Circle",
      },
      {
        title: "Office Hours",
        description: "Fortnightly Zoom sessions to review reports and plan next action steps.",
        link: "/contact?topic=office-hours",
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Resources & Guides | Startup Idea Advisor"
        description="Access AI startup guides, validation templates, and community links to accelerate your next venture."
        path="/resources"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Resources
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Resources to go from insight to traction
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Use these playbooks and templates alongside your reports to keep momentum—run experiments, gather signal, and rerun the crew when you need fresh direction.
        </p>
      </header>

      {/* Resource Categories */}
      <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((group) => {
          const colorClasses = {
            brand: "border-brand-200 bg-brand-50",
            aqua: "border-aqua-200 bg-aqua-50",
            coral: "border-coral-200 bg-coral-50",
            sand: "border-sand-200 bg-sand-50",
          };

          return (
            <div
              key={group.category}
              className={`rounded-2xl border ${colorClasses[group.color]} p-6 shadow-sm`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="text-2xl">{group.icon}</span>
                <h2 className="text-lg font-semibold text-slate-900">{group.category}</h2>
              </div>
              <ul className="space-y-4 text-sm">
                {group.items.map((item) => (
                  <li key={item.title} className="space-y-1">
                    {item.link.startsWith("mailto") ? (
                      <a
                        href={item.link}
                        className="font-semibold text-brand-600 underline hover:text-brand-700"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Link
                        to={item.link}
                        className="font-semibold text-brand-600 underline hover:text-brand-700"
                      >
                        {item.title}
                      </Link>
                    )}
                    <p className="text-slate-600">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Newsletter Section */}
      <section
        id="newsletter"
        className="rounded-3xl border border-brand-200 bg-brand-50/80 p-8 shadow-soft"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 text-3xl">📬</div>
          <h2 className="mb-3 text-xl font-semibold text-slate-900">Newsletter</h2>
          <p className="text-slate-600">
            Receive a weekly digest of real-world tests, AI prompts, and frameworks we refine while helping founders validate ideas.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Subscribe from the footer and we'll send the first edition when you join.
          </p>
        </div>
      </section>
    </section>
  );
}

