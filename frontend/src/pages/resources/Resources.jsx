import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { frameworks } from "../../templates/frameworksConfig.js";

// Note: Frameworks are now imported from templates/frameworksConfig.js
// Templates are stored in separate .md files in frontend/src/templates/

export default function ResourcesPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-4">
      <Seo
        title="Resources & Guides | Startup Idea Advisor"
        description="Access AI startup guides, validation templates, and community links to accelerate your next venture."
        path="/resources"
      />

      {/* Hero Section */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-3xl">
          Resources to go from insight to traction
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Use these playbooks and templates alongside your reports to keep momentum—run experiments, gather signal, and generate new recommendations when you need fresh direction.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
          All templates download as .txt files and can be opened in any text editor or markdown viewer.
        </p>
      </header>

      {/* Templates Section */}
      <div className="mb-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Startup Templates</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ready-to-use templates for business plans, pitch decks, and customer outreach.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <article className="flex flex-col rounded-2xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30 p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="text-3xl shrink-0">📄</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Business Plan Template</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex-1">Complete business plan template with all sections you need.</p>
            <div className="mt-auto pt-4">
              <a
                href="/templates/business-plan-template.md"
                download="business-plan-template.txt"
                className="block w-full rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-4 py-2 text-center text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
              >
                Download Template
              </a>
            </div>
          </article>
          <article className="flex flex-col rounded-2xl border border-aqua-200 dark:border-aqua-700 bg-aqua-50 dark:bg-aqua-900/30 p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="text-3xl shrink-0">🎯</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pitch Deck Template</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex-1">12-slide investor pitch deck template with design tips.</p>
            <div className="mt-auto pt-4">
              <a
                href="/templates/pitch-deck-template.md"
                download="pitch-deck-template.txt"
                className="block w-full rounded-xl border border-aqua-300 dark:border-aqua-700 bg-white dark:bg-slate-800 px-4 py-2 text-center text-sm font-semibold text-aqua-700 dark:text-aqua-400 shadow-sm transition hover:border-aqua-400 dark:hover:border-aqua-600 hover:bg-aqua-50 dark:hover:bg-aqua-900/30"
              >
                Download Template
              </a>
            </div>
          </article>
          <article className="flex flex-col rounded-2xl border border-coral-200 dark:border-coral-700 bg-coral-50 dark:bg-coral-900/30 p-4 shadow-sm transition hover:shadow-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="text-3xl shrink-0">✉️</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Email Templates</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex-1">Customer outreach email templates for validation.</p>
            <div className="mt-auto pt-4">
              <a
                href="/templates/customer-outreach-email-template.md"
                download="customer-outreach-email-template.txt"
                className="block w-full rounded-xl border border-coral-300 dark:border-coral-700 bg-white dark:bg-slate-800 px-4 py-2 text-center text-sm font-semibold text-coral-700 dark:text-coral-400 shadow-sm transition hover:border-coral-400 dark:hover:border-coral-600 hover:bg-coral-50 dark:hover:bg-coral-900/30"
              >
                Download Template
              </a>
            </div>
          </article>
        </div>
      </div>

      {/* Frameworks & Templates Section */}
      <div className="mb-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Validation Frameworks & Templates</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Download free, actionable frameworks to validate your startup idea, test pricing, conduct interviews, and build your MVP.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework, index) => {
            const colorClasses = [
              { border: "border-brand-200 dark:border-brand-700", bg: "bg-brand-50 dark:bg-brand-900/30" },
              { border: "border-aqua-200 dark:border-aqua-700", bg: "bg-aqua-50 dark:bg-aqua-900/30" },
              { border: "border-coral-200 dark:border-coral-700", bg: "bg-coral-50 dark:bg-coral-900/30" },
              { border: "border-sand-200 dark:border-sand-700", bg: "bg-sand-50 dark:bg-sand-900/30" },
              { border: "border-brand-200 dark:border-brand-700", bg: "bg-brand-50 dark:bg-brand-900/30" },
              { border: "border-aqua-200 dark:border-aqua-700", bg: "bg-aqua-50 dark:bg-aqua-900/30" },
            ];
            const colors = colorClasses[index % colorClasses.length];

            return (
              <article
                key={framework.id}
                className={`flex flex-col rounded-2xl border ${colors.border} ${colors.bg} p-4 shadow-sm transition hover:shadow-md`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="text-3xl shrink-0">{framework.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{framework.title}</h3>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex-1">{framework.description}</p>
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => {
                      const blob = new Blob([framework.content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${framework.title.toLowerCase().replace(/\s+/g, "-")}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                  >
                    Download Framework
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

