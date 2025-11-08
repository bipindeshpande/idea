import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const resources = [
  {
    category: "Playbooks",
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
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
      <Seo
        title="Resources & Guides | Startup Idea Advisor"
        description="Access AI startup guides, validation templates, and community links to accelerate your next venture."
        path="/resources"
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">Toolbox</p>
        <h1 className="text-3xl font-semibold text-slate-900">Resources to go from insight to traction</h1>
        <p className="text-slate-600">
          Use these playbooks and templates alongside your reports to keep momentum—run experiments, gather signal, and rerun the crew when you need fresh direction.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((group) => (
          <div key={group.category} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">{group.category}</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {group.items.map((item) => (
                <li key={item.title}>
                  {item.link.startsWith("mailto") ? (
                    <a href={item.link} className="font-semibold text-brand-600 underline">
                      {item.title}
                    </a>
                  ) : (
                    <Link to={item.link} className="font-semibold text-brand-600 underline">
                      {item.title}
                    </Link>
                  )}
                  <p className="text-slate-600">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section id="newsletter" className="rounded-2xl border border-brand-200 bg-brand-50/80 p-5 shadow-inner">
        <h2 className="text-lg font-semibold text-brand-800">Newsletter</h2>
        <p className="mt-2 text-sm text-brand-700">
          Receive a weekly digest of real-world tests, AI prompts, and frameworks we refine while helping founders validate ideas.
        </p>
        <p className="mt-3 text-sm text-brand-700">
          Subscribe from the footer and we’ll send the first edition when you join.
        </p>
      </section>
    </section>
  );
}

