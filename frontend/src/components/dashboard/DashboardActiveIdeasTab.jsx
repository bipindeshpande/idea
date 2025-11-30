import { Link } from "react-router-dom";
import { memo } from "react";

function DashboardActiveIdeasTab({
  actions,
  notes,
  loadingActions,
  loadingNotes,
  allRuns,
  allValidations,
}) {
  // Get ideas with non-completed actions
  const ideaActions = actions.filter((a) => {
    if (a.status === "completed") return false;
    if (!a.idea_id) return false;
    return a.idea_id.match(/run_([^_]+)_idea_(\d+)/) || 
           a.idea_id.match(/idea_(\d+)/) ||
           (a.idea_id.match(/run_([^_]+)/) && !a.idea_id.match(/val_/));
  });
  
  // Get ideas with notes
  const ideaNotes = notes.filter((n) => {
    if (!n.idea_id) return false;
    return n.idea_id.match(/run_([^_]+)_idea_(\d+)/) || 
           n.idea_id.match(/idea_(\d+)/) ||
           (n.idea_id.match(/run_([^_]+)/) && !n.idea_id.match(/val_/));
  });
  
  // Combine and deduplicate by idea_id
  const ideaIdsWithActions = new Set(ideaActions.map(a => a.idea_id));
  const ideaIdsWithNotes = new Set(ideaNotes.map(n => n.idea_id));
  const allActiveIdeaIds = new Set([...ideaIdsWithActions, ...ideaIdsWithNotes]);
  
  // Create a map of idea_id to display info
  const activeIdeasMap = new Map();
  
  // Process actions
  ideaActions.forEach(action => {
    if (!activeIdeasMap.has(action.idea_id)) {
      activeIdeasMap.set(action.idea_id, {
        idea_id: action.idea_id,
        hasAction: true,
        hasNote: false,
        action: action,
        note: null,
      });
    } else {
      const existing = activeIdeasMap.get(action.idea_id);
      existing.hasAction = true;
      existing.action = action;
    }
  });
  
  // Process notes
  ideaNotes.forEach(note => {
    if (!activeIdeasMap.has(note.idea_id)) {
      activeIdeasMap.set(note.idea_id, {
        idea_id: note.idea_id,
        hasAction: false,
        hasNote: true,
        action: null,
        note: note,
      });
    } else {
      const existing = activeIdeasMap.get(note.idea_id);
      existing.hasNote = true;
      existing.note = note;
    }
  });
  
  const activeIdeas = Array.from(activeIdeasMap.values());
  
  // Get validations with non-completed actions
  const validationActions = actions.filter((a) => {
    if (a.status === "completed") return false;
    if (!a.idea_id) return false;
    return a.idea_id.match(/val_(.+)/);
  });
  
  // Get validations with notes
  const validationNotes = notes.filter((n) => {
    if (!n.idea_id) return false;
    return n.idea_id.match(/val_(.+)/);
  });
  
  // Combine and deduplicate by idea_id
  const validationIdsWithActions = new Set(validationActions.map(a => a.idea_id));
  const validationIdsWithNotes = new Set(validationNotes.map(n => n.idea_id));
  const allActiveValidationIds = new Set([...validationIdsWithActions, ...validationIdsWithNotes]);
  
  // Create a map of idea_id to display info
  const activeValidationsMap = new Map();
  
  // Process actions
  validationActions.forEach(action => {
    if (!activeValidationsMap.has(action.idea_id)) {
      activeValidationsMap.set(action.idea_id, {
        idea_id: action.idea_id,
        hasAction: true,
        hasNote: false,
        action: action,
        note: null,
      });
    } else {
      const existing = activeValidationsMap.get(action.idea_id);
      existing.hasAction = true;
      existing.action = action;
    }
  });
  
  // Process notes
  validationNotes.forEach(note => {
    if (!activeValidationsMap.has(note.idea_id)) {
      activeValidationsMap.set(note.idea_id, {
        idea_id: note.idea_id,
        hasAction: false,
        hasNote: true,
        action: null,
        note: note,
      });
    } else {
      const existing = activeValidationsMap.get(note.idea_id);
      existing.hasNote = true;
      existing.note = note;
    }
  });
  
  const activeValidations = Array.from(activeValidationsMap.values());

  return (
    <div className="space-y-6">
      {/* Ideas Active Projects */}
      {activeIdeas.length > 0 ? (
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">
            💡 Active Ideas ({activeIdeas.length})
          </h3>
          {loadingActions || loadingNotes ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading...</p>
          ) : (
            <div className="space-y-2.5">
              {activeIdeas.slice(0, 10).map((item) => {
                let projectName = "Unknown Project";
                let ideaLink = null;
                let run = null;
                let ideaIndex = null;
                const ideaId = item.idea_id;
                
                if (ideaId) {
                  const runMatch = ideaId.match(/run_([^_]+)_idea_(\d+)/);
                  if (runMatch) {
                    const [, runId, idx] = runMatch;
                    ideaIndex = idx;
                    run = allRuns.find(r => r.run_id === runId || r.id === runId || r.id === `run_${runId}`);
                    if (run?.inputs?.goal_type) {
                      projectName = `${run.inputs.goal_type} - Idea #${ideaIndex}`;
                    } else {
                      projectName = `Idea #${ideaIndex}`;
                    }
                    const actualRunId = run?.run_id || run?.id || runId;
                    ideaLink = `/results/recommendations/${ideaIndex}?id=${actualRunId}`;
                  } else {
                    const ideaMatch = ideaId.match(/idea_(\d+)/);
                    if (ideaMatch) {
                      ideaIndex = ideaMatch[1];
                      projectName = `Idea #${ideaIndex}`;
                      run = allRuns.find(r => {
                        const runIdStr = r.run_id || r.id;
                        return ideaId.includes(`run_${runIdStr}_idea_`);
                      });
                      if (run) {
                        const actualRunId = run.run_id || run.id;
                        ideaLink = `/results/recommendations/${ideaIndex}?id=${actualRunId}`;
                      } else {
                        ideaLink = `/results/recommendations/${ideaIndex}`;
                      }
                    }
                  }
                }
                
                const cardContent = (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      {item.hasAction && item.action && (
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            item.action.status === "completed"
                              ? "bg-green-500"
                              : item.action.status === "in_progress"
                              ? "bg-yellow-500"
                              : item.action.status === "blocked"
                              ? "bg-red-500"
                              : "bg-slate-400"
                          }`}
                        />
                      )}
                      {!item.hasAction && item.hasNote && (
                        <div className="h-2 w-2 rounded-full flex-shrink-0 bg-purple-500" />
                      )}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate flex-1">
                        {projectName}
                      </h4>
                      {item.hasAction && item.action && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                          {item.action.status.replace("_", " ")}
                        </span>
                      )}
                      {item.hasNote && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 flex-shrink-0">
                          📝 Note
                        </span>
                      )}
                    </div>
                    {run?.inputs && Object.keys(run.inputs).length > 0 && (
                      <p className="mb-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Time: {run.inputs.time_commitment || "Not set"} • Budget: {run.inputs.budget_range || "Not set"} • Focus:{" "}
                        {run.inputs.sub_interest_area || run.inputs.interest_area || "Not captured"} • Skill:{" "}
                        {run.inputs.skill_strength || "Not captured"}
                      </p>
                    )}
                    {item.hasAction && item.action && (
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {item.action.action_text}
                      </p>
                    )}
                    {item.hasNote && item.note && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                        {item.note.content.length > 100 
                          ? item.note.content.substring(0, 100) + "..." 
                          : item.note.content}
                      </p>
                    )}
                  </>
                );
                
                return ideaLink ? (
                  <Link
                    key={item.idea_id}
                    to={ideaLink}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md cursor-pointer"
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div key={item.idea_id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    {cardContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            No active ideas with action items or notes yet.
          </p>
          <Link
            to="/advisor#intake-form"
            className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
          >
            Discover Ideas
          </Link>
        </div>
      )}

      {/* Validations Active Projects */}
      {activeValidations.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">
            ✅ Active Validations ({activeValidations.length})
          </h3>
          {loadingActions || loadingNotes ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading...</p>
          ) : (
            <div className="space-y-2.5">
              {activeValidations.slice(0, 10).map((item) => {
                let projectName = "Unknown Validation";
                let validationLink = null;
                if (item.idea_id) {
                  const valMatch = item.idea_id.match(/val_(.+)/);
                  if (valMatch) {
                    const validationId = valMatch[1];
                    const validation = allValidations.find(v => v.validation_id === validationId);
                    if (validation?.idea_explanation) {
                      projectName = validation.idea_explanation.length > 40 
                        ? validation.idea_explanation.substring(0, 40) + "..." 
                        : validation.idea_explanation;
                    } else {
                      projectName = "Validation";
                    }
                    validationLink = `/validate-result?id=${validationId}`;
                  }
                }
                
                const validationCardContent = (
                  <>
                    <div className="mb-1.5 flex items-center gap-2">
                      {item.hasAction && item.action && (
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            item.action.status === "completed"
                              ? "bg-green-500"
                              : item.action.status === "in_progress"
                              ? "bg-yellow-500"
                              : item.action.status === "blocked"
                              ? "bg-red-500"
                              : "bg-slate-400"
                          }`}
                        />
                      )}
                      {!item.hasAction && item.hasNote && (
                        <div className="h-2 w-2 rounded-full flex-shrink-0 bg-purple-500" />
                      )}
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate flex-1">
                        {projectName}
                      </span>
                      {item.hasAction && item.action && (
                        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                          {item.action.status.replace("_", " ")}
                        </span>
                      )}
                      {item.hasNote && (
                        <span className="ml-auto text-xs text-purple-600 dark:text-purple-400 flex-shrink-0">
                          📝 Note
                        </span>
                      )}
                    </div>
                    {item.hasAction && item.action && (
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {item.action.action_text}
                      </p>
                    )}
                    {item.hasNote && item.note && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                        {item.note.content.length > 100 
                          ? item.note.content.substring(0, 100) + "..." 
                          : item.note.content}
                      </p>
                    )}
                  </>
                );
                
                return validationLink ? (
                  <Link
                    key={item.idea_id}
                    to={validationLink}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md cursor-pointer"
                  >
                    {validationCardContent}
                  </Link>
                ) : (
                  <div key={item.idea_id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    {validationCardContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DashboardActiveIdeasTab);

