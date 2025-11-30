import { Link } from "react-router-dom";
import React from "react";

function SessionCard({ 
  session, 
  hasOpenActions, 
  hasNotes, 
  onDelete, 
  onEdit,
  isValidation = false 
}) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(session.timestamp).toLocaleString()}
              {session.from_api && (
                <span className="ml-2 text-xs text-brand-600 dark:text-brand-400 font-medium">
                  (Synced)
                </span>
              )}
            </p>
            {(hasOpenActions || hasNotes) && (
              <div className="flex items-center gap-1">
                {hasOpenActions && (
                  <span 
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300"
                    title="Has open action items"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Tasks
                  </span>
                )}
                {hasNotes && (
                  <span 
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300"
                    title="Has notes"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notes
                  </span>
                )}
              </div>
            )}
          </div>
          
          {isValidation ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                {session.idea_explanation || "Validation"}
              </h3>
              {session.overall_score !== undefined && (
                <div className="mt-1.5">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Score:</span> {session.overall_score.toFixed(1)}/10
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                {session.inputs?.goal_type 
                  ? `${session.inputs.goal_type}${session.inputs.interest_area || session.inputs.sub_interest_area ? ` - ${session.inputs.interest_area || session.inputs.sub_interest_area}` : ""}`
                  : "Idea Discovery Session"}
              </h3>
              {session.inputs && Object.keys(session.inputs).length > 0 ? (
                <div className="mt-1.5">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-medium">Time:</span> {session.inputs.time_commitment || "Not set"} • 
                    <span className="font-medium"> Budget:</span> {session.inputs.budget_range || "Not set"} • 
                    <span className="font-medium"> Focus:</span>{" "}
                    {session.inputs.sub_interest_area || session.inputs.interest_area || "Not captured"} • 
                    <span className="font-medium"> Skill:</span>{" "}
                    {session.inputs.skill_strength || "Not captured"}
                  </p>
                </div>
              ) : session.run_id ? (
                <div className="mt-1.5">
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Run ID: {session.run_id}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {!isValidation && session.inputs && Object.keys(session.inputs).length > 0 && onEdit && (
            <button
              onClick={() => onEdit(session)}
              className="rounded-lg border border-brand-200/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Edit
            </button>
          )}
          
          {isValidation ? (
            <Link
              to={`/validate-result?id=${session.validation_id || session.id}`}
              className="rounded-lg border border-brand-300/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
            >
              View
            </Link>
          ) : (
            <>
              <Link
                to={`/results/profile?id=${session.run_id || session.id}`}
                className="rounded-lg border border-brand-300/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
              >
                View profile
              </Link>
              <Link
                to={`/results/recommendations?id=${session.run_id || session.id}`}
                className="rounded-lg border border-brand-300/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
              >
                View recommendations
              </Link>
            </>
          )}
          
          {onDelete && (
            <button
              onClick={() => onDelete(session)}
              className="rounded-lg border border-red-200/60 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 transition-all duration-200 hover:border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default React.memo(SessionCard);

