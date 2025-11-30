import { SCORE_LEGEND } from "../../pages/validation/constants.js";

export default function ScoreLegend() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-soft">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Score Legend</h3>
      <div className="space-y-2">
        {SCORE_LEGEND.map((item) => (
          <div key={item.range} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.color}`} />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-tight">
              <span className="font-semibold">{item.range}</span> — {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

