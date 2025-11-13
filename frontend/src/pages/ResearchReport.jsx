import ReactMarkdown from "react-markdown";
import { useReports } from "../context/ReportsContext.jsx";
import { extractHighlights } from "../utils/markdown.js";

const palette = [
  { icon: "🔍", gradient: "from-brand-500/15 to-brand-500/5" },
  { icon: "📊", gradient: "from-emerald-500/20 to-emerald-500/5" },
  { icon: "🧭", gradient: "from-amber-500/20 to-amber-500/5" },
];

export default function ResearchReport() {
  const { reports, inputs } = useReports();
  const highlights = extractHighlights(reports?.startup_ideas_research, 3);

  return (
    <section className="grid gap-6">
      <header className="overflow-hidden rounded-3xl bg-white/95 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">
          Startup Ideas Research
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Market trends, competitive landscape, and opportunity sizing tuned to your goal type, time commitment, and
          focus areas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="tag-chip">🎯 Goal: {inputs.goal_type}</span>
          <span className="tag-chip">⏱️ Time: {inputs.time_commitment}</span>
          <span className="tag-chip">💵 Budget: {inputs.budget_range}</span>
          <span className="tag-chip">📚 Focus: {inputs.sub_interest_area || inputs.interest_area}</span>
          <span className="tag-chip">🛠️ Skill: {inputs.skill_strength}</span>
          <span className="tag-chip">🤝 Work Style: {inputs.work_style || "Flexible"}</span>
        </div>
      </header>

      {highlights.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {highlights.map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${palette[index % palette.length].gradient} p-6 shadow-inner`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-xl">
                  {palette[index % palette.length].icon}
                </span>
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <div className="prose prose-slate">
          <ReactMarkdown>
            {reports?.startup_ideas_research || "No research report available."}
          </ReactMarkdown>
        </div>
      </article>
    </section>
  );
}
