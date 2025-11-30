import { getScoreMeta, formatDetails } from "../../pages/validation/utils.js";

export default function ParameterCard({ parameter, score, details }) {
  const safeScore = typeof score === "number" ? score : 0;
  const meta = getScoreMeta(safeScore);
  const percentage = Math.max(0, Math.min(100, (safeScore / 10) * 100));
  const assessment = formatDetails(details);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{parameter}</p>
          <p className="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">{meta.label}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
          {safeScore.toFixed(1)} / 10
        </div>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full ${meta.progress}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex-1">
        <p 
          className="text-sm text-slate-700 dark:text-slate-300"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {assessment}
        </p>
      </div>
    </div>
  );
}

