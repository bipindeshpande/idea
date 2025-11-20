import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { frameworks } from "../../templates/frameworksConfig.js";

// Note: Frameworks are now imported from templates/frameworksConfig.js
// Templates are stored in separate .md files in frontend/src/templates/

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
          Use these playbooks and templates alongside your reports to keep momentum—run experiments, gather signal, and generate new recommendations when you need fresh direction.
        </p>
      </header>

      {/* Frameworks & Templates Section */}
      <div className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Validation Frameworks & Templates</h2>
          <p className="mt-2 text-slate-600">
            Download free, actionable frameworks to validate your startup idea, test pricing, conduct interviews, and build your MVP.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework, index) => {
            const colorClasses = [
              { border: "border-brand-200", bg: "bg-brand-50" },
              { border: "border-aqua-200", bg: "bg-aqua-50" },
              { border: "border-coral-200", bg: "bg-coral-50" },
              { border: "border-sand-200", bg: "bg-sand-50" },
              { border: "border-brand-200", bg: "bg-brand-50" },
              { border: "border-aqua-200", bg: "bg-aqua-50" },
            ];
            const colors = colorClasses[index % colorClasses.length];

            return (
              <article
                key={framework.id}
                className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-sm transition hover:shadow-md`}
              >
                <div className="mb-4 text-4xl">{framework.icon}</div>
                <div className="mb-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {framework.category}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{framework.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{framework.description}</p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const blob = new Blob([framework.content], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${framework.title.toLowerCase().replace(/\s+/g, "-")}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
                  >
                    Download Framework (.md)
                  </button>
                  <p className="mt-2 text-xs text-slate-500 text-center">
                    Opens in any text editor or markdown viewer
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

