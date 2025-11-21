import { Link } from "react-router-dom";

const updates = [
  {
    id: 1,
    date: "2024-11-14",
    title: "Triggered Emails Now Live",
    description: "Get notified when your validations complete, trial ends, or subscription expires.",
    type: "feature",
    link: "/dashboard",
  },
  {
    id: 2,
    date: "2024-11-14",
    title: "Enhanced Dashboard",
    description: "New tips section, activity summaries, and personalized recommendations.",
    type: "improvement",
    link: "/dashboard",
  },
  {
    id: 3,
    date: "2024-11-10",
    title: "Idea Validation Improvements",
    description: "More critical feedback and detailed scoring across 10 key parameters.",
    type: "improvement",
    link: "/validate-idea",
  },
];

export default function WhatsNew() {
  const recentUpdates = updates.slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">What's New</h2>
        <span className="text-xs text-slate-500">Recent updates</span>
      </div>
      <div className="space-y-4">
        {recentUpdates.map((update) => (
          <div key={update.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  update.type === "feature"
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {update.type === "feature" ? "New" : "Update"}
              </span>
              <span className="text-xs text-slate-500">{update.date}</span>
            </div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">{update.title}</h3>
            <p className="text-sm text-slate-600">{update.description}</p>
            {update.link && (
              <Link
                to={update.link}
                className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Learn more →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

