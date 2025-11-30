import { RADAR_AXES } from "../../pages/validation/constants.js";

export default function ParameterScores({ parameterCards, parameterLookup }) {
  const getScoreColor = (score) => {
    if (score >= 9) return 'bg-green-500';
    if (score >= 7) return 'bg-green-500';
    if (score >= 4) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getScoreForParam = (paramName) => {
    const card = parameterCards?.find(c => c.name === paramName);
    if (card?.score !== undefined) return card.score;
    const lookup = parameterLookup?.[paramName];
    if (lookup?.score !== undefined) return lookup.score;
    return 0;
  };

  // Map RADAR_AXES to get all parameters in order
  const parameters = RADAR_AXES.map(axis => ({
    label: axis.label,
    fullName: axis.parameter,
    score: getScoreForParam(axis.parameter),
  }));

  return (
    <div className="h-full flex flex-col">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Parameter Scores</h3>
      <div className="flex-1 space-y-3">
        {parameters.map((param) => {
          const percentage = Math.max(0, Math.min(100, (param.score / 10) * 100));
          return (
            <div key={param.fullName} className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 text-left" style={{ width: 'auto', minWidth: '140px' }}>
                {param.label}
              </span>
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-full ${getScoreColor(param.score)} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex-shrink-0 text-right" style={{ width: '32px' }}>
                {param.score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

