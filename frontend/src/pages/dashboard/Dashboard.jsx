import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [apiRuns, setApiRuns] = useState([]);
  const [apiValidations, setApiValidations] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [activeTab, setActiveTab] = useState("ideas"); // "ideas" or "validations" (for My Sessions sub-tabs)
  const [mainTab, setMainTab] = useState("sessions"); // "active-ideas" or "sessions" (for main dashboard tabs)
  const { deleteRun, setInputs } = useReports();
  const { user, isAuthenticated, subscription, getAuthHeaders } = useAuth();
  const { getSavedValidations } = useValidation();
  const navigate = useNavigate();
  const [smartRecommendations, setSmartRecommendations] = useState(null);
  const [loadingSmartRecs, setLoadingSmartRecs] = useState(false);
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const loadRuns = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRuns(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse saved runs", error);
      }
    }
  };

  const loadSmartRecommendations = useCallback(async () => {
    setLoadingSmartRecs(true);
    try {
      const response = await fetch("/api/user/smart-recommendations", {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSmartRecommendations(data.insights);
        }
      }
    } catch (error) {
      console.error("Failed to load smart recommendations:", error);
    } finally {
      setLoadingSmartRecs(false);
    }
  }, [getAuthHeaders]);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const response = await fetch("/api/user/actions", {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActions(data.actions || []);
        }
      }
    } catch (error) {
      console.error("Failed to load actions:", error);
    } finally {
      setLoadingActions(false);
    }
  }, [getAuthHeaders]);

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const response = await fetch("/api/user/notes", {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes(data.notes || []);
        }
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, [getAuthHeaders]);

  const loadApiRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/user/activity", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setApiRuns(data.activity?.runs || []);
        setApiValidations(data.activity?.validations || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to load API runs:", error);
      }
    } finally {
      setLoadingRuns(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadRuns();
    if (isAuthenticated) {
      // Only call loadApiRuns once - it loads both runs and validations
      loadApiRuns();
      loadSmartRecommendations();
      loadActions();
      loadNotes();
    } else {
      setLoadingRuns(false);
    }
  }, [isAuthenticated, loadApiRuns, loadSmartRecommendations, loadActions, loadNotes]);

  const handleDelete = async (session) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      // Handle validation deletion
      if (session.is_validation && session.from_api && session.validation_id) {
        // TODO: Add validation delete endpoint if needed
        // For now, just remove from local state
        setApiValidations(prev => prev.filter(v => v.validation_id !== session.validation_id));
        // Reload both runs and validations from the same endpoint
        await loadApiRuns();
        return;
      }
      
      // Handle run deletion
      if (session.from_api && session.run_id) {
        // Delete from API/database
        try {
          const response = await fetch(`/api/user/run/${session.run_id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            // Remove from local state and reload
            setApiRuns(prev => prev.filter(r => r.run_id !== session.run_id));
            // Reload API runs to refresh the list
            await loadApiRuns();
          } else {
            const data = await response.json().catch(() => ({}));
            alert(data.error || "Failed to delete session. Please try again.");
          }
        } catch (error) {
          console.error("Failed to delete session:", error);
          alert("Failed to delete session. Please try again.");
        }
      } else {
        // Delete from localStorage
        deleteRun(session.id);
        loadRuns(); // Reload the list
      }
    }
  };

  // Removed loadApiValidations - now handled by loadApiRuns to avoid duplicate API calls

  const handleNewRequest = async (run) => {
    // If it's an API run and we don't have inputs, fetch them
    if (run.from_api && run.run_id && (!run.inputs || Object.keys(run.inputs).length === 0)) {
      try {
        const response = await fetch(`/api/user/run/${run.run_id}`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.run?.inputs) {
            setInputs(data.run.inputs);
            navigate("/advisor#intake-form");
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load run inputs:", error);
      }
    }
    
    // Load the saved inputs into the form (for localStorage runs or if API fetch failed)
    if (run.inputs && Object.keys(run.inputs).length > 0) {
      setInputs(run.inputs);
      navigate("/advisor#intake-form");
    } else {
      // If no inputs available, just navigate to form
      navigate("/advisor#intake-form");
    }
  };

  // Merge localStorage runs with API runs, removing duplicates
  const allRuns = useMemo(() => {
    const merged = [...runs];
    const existingIds = new Set(runs.map(r => r.id));
    
    // Add API runs that aren't already in localStorage runs
    apiRuns.forEach(apiRun => {
      const apiRunId = `run_${apiRun.run_id}`;
      if (!existingIds.has(apiRunId)) {
        merged.push({
          id: apiRunId,
          timestamp: apiRun.created_at ? new Date(apiRun.created_at).getTime() : Date.now(),
          inputs: apiRun.inputs || {}, // Use inputs from API if available
          outputs: {},
          run_id: apiRun.run_id,
          from_api: true,
        });
      }
    });
    
    // Sort by timestamp, newest first
    return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [runs, apiRuns]);

  // Format validations for display - combine API and localStorage validations
  const allValidations = useMemo(() => {
    // Get validations from API
    const apiVals = apiValidations.map(v => ({
      id: `val_${v.validation_id}`,
      validation_id: v.validation_id,
      timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
      overall_score: v.overall_score,
      idea_explanation: v.idea_explanation,
      from_api: true,
      is_validation: true,
    }));

    // Get validations from localStorage
    const localValidations = getSavedValidations();
    const localVals = localValidations.map(v => ({
      id: v.id || `local_${v.timestamp}`,
      validation_id: v.id || `local_${v.timestamp}`,
      timestamp: v.timestamp || Date.now(),
      overall_score: v.validation?.overall_score,
      idea_explanation: v.ideaExplanation || v.idea_explanation,
      from_api: false,
      is_validation: true,
    }));

    // Combine and deduplicate (prefer API validations if same ID exists)
    const combined = [...apiVals];
    const apiIds = new Set(apiVals.map(v => v.validation_id));
    localVals.forEach(localVal => {
      if (!apiIds.has(localVal.validation_id)) {
        combined.push(localVal);
      }
    });

    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [apiValidations, getSavedValidations]);

  // Combine runs and validations, sorted by timestamp
  const allSessions = useMemo(() => {
    const combined = [
      ...allRuns.map(r => ({ ...r, is_validation: false })),
      ...allValidations,
    ];
    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allRuns, allValidations]);

  // Check if a session has open (non-completed) actions
  const sessionHasOpenActions = useCallback((session) => {
    if (!session || !actions.length) return false;
    
    // For runs: check if any action belongs to this run
    if (!session.is_validation) {
      const runId = session.run_id || session.id?.replace('run_', '');
      return actions.some(action => {
        if (!action.idea_id || action.status === "completed") return false;
        // Match run_<runId>_idea_<number> or run_<runId>
        const runMatch = action.idea_id.match(/run_([^_]+)/);
        return runMatch && runMatch[1] === runId;
      });
    }
    
    // For validations: check if any action belongs to this validation
    if (session.is_validation && session.validation_id) {
      return actions.some(action => {
        if (!action.idea_id || action.status === "completed") return false;
        // Match val_<validation_id>
        const valMatch = action.idea_id.match(/val_(.+)/);
        return valMatch && valMatch[1] === session.validation_id;
      });
    }
    
    return false;
  }, [actions]);

  // Check if a session has notes
  const sessionHasNotes = useCallback((session) => {
    if (!session || !notes.length) return false;
    
    // For runs: check if any note belongs to this run
    if (!session.is_validation) {
      const runId = session.run_id || session.id?.replace('run_', '');
      return notes.some(note => {
        if (!note.idea_id) return false;
        // Match run_<runId>_idea_<number> or run_<runId>
        const runMatch = note.idea_id.match(/run_([^_]+)/);
        return runMatch && runMatch[1] === runId;
      });
    }
    
    // For validations: check if any note belongs to this validation
    if (session.is_validation && session.validation_id) {
      return notes.some(note => {
        if (!note.idea_id) return false;
        // Match val_<validation_id>
        const valMatch = note.idea_id.match(/val_(.+)/);
        return valMatch && valMatch[1] === session.validation_id;
      });
    }
    
    return false;
  }, [notes]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Seo
        title="Dashboard | Startup Idea Advisor"
        description="Access your saved AI-generated startup reports, compare runs, and revisit recommendations."
        path="/dashboard"
      />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">Dashboard</h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
              {isAuthenticated && user
                ? `Welcome back, ${user.email.split("@")[0]}!`
                : "Manage your startup idea validations and discoveries."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/validate-idea"
              className="rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300 shadow-sm transition-all duration-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Validate Idea
            </Link>
            <Link
              to="/advisor#intake-form"
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Discover Ideas
            </Link>
          </div>
        </div>
      </div>

      {/* Smart Insights - On top */}
      {smartRecommendations && 
       smartRecommendations.total_validations >= 2 && 
       !smartRecommendations.message &&
       ((smartRecommendations.patterns && smartRecommendations.patterns.length > 0) || 
        (smartRecommendations.similar_ideas && smartRecommendations.similar_ideas.length > 0)) && (
        <section className="mb-6 rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 p-4 shadow-lg">
          <h2 className="mb-2.5 text-base font-bold text-slate-900 dark:text-slate-50">💡 Smart Insights</h2>
          {loadingSmartRecs ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">Loading insights...</p>
          ) : (
            <div className="space-y-2">
              {smartRecommendations.patterns && smartRecommendations.patterns.length > 0 && (
                smartRecommendations.patterns.slice(0, 2).map((pattern, idx) => (
                  <div key={idx} className="rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-slate-800 p-2">
                    <p className="text-xs text-slate-900 dark:text-slate-100 leading-relaxed">{pattern.message}</p>
                  </div>
                ))
              )}
              {smartRecommendations.similar_ideas && smartRecommendations.similar_ideas.length > 0 && (
                <div className="mt-2 rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-slate-800 p-2">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                    Similar Ideas
                  </p>
                  {smartRecommendations.similar_ideas.slice(0, 2).map((idea, idx) => (
                    <div key={idx} className="mb-1 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{idea.score.toFixed(1)}/10</span>
                      {idea.idea_explanation && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {idea.idea_explanation.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Main Tabbed Interface - Active Ideas & My Sessions */}
      <section className="mb-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
        {/* Main Tabs */}
        <div className="mb-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <nav className="flex gap-2" aria-label="Dashboard tabs">
            <button
              onClick={() => setMainTab("sessions")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "sessions"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              My Sessions
            </button>
            <button
              onClick={() => setMainTab("active-ideas")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "active-ideas"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Active Ideas
            </button>
          </nav>
        </div>

        {/* Tab 1: Active Ideas */}
        {mainTab === "active-ideas" && (
          <div className="space-y-6">
            {/* Ideas Active Projects */}
            {(() => {
              const ideaActions = actions.filter((a) => {
                if (a.status === "completed") return false;
                if (!a.idea_id) return false;
                // Match run_<runId>_idea_<number> or idea_<number> or run_<runId>
                return a.idea_id.match(/run_([^_]+)_idea_(\d+)/) || 
                       a.idea_id.match(/idea_(\d+)/) ||
                       (a.idea_id.match(/run_([^_]+)/) && !a.idea_id.match(/val_/));
              });
              
              return ideaActions.length > 0 ? (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">💡 Active Ideas ({ideaActions.length})</h3>
                  {loadingActions ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">Loading actions...</p>
                  ) : (
                    <div className="space-y-2.5">
                      {ideaActions.slice(0, 10).map((action) => {
                        // Extract project name and navigation info from idea_id
                        let projectName = "Unknown Project";
                        let ideaLink = null;
                        let run = null;
                        let ideaIndex = null;
                        if (action.idea_id) {
                          const runMatch = action.idea_id.match(/run_([^_]+)_idea_(\d+)/);
                          if (runMatch) {
                            const [, runId, idx] = runMatch;
                            ideaIndex = idx;
                            run = allRuns.find(r => r.run_id === runId || r.id === runId || r.id === `run_${runId}`);
                            if (run?.inputs?.goal_type) {
                              projectName = `${run.inputs.goal_type} - Idea #${ideaIndex}`;
                            } else {
                              projectName = `Idea #${ideaIndex}`;
                            }
                            // Use the actual run_id from the run object if available, otherwise use extracted runId
                            const actualRunId = run?.run_id || run?.id || runId;
                            ideaLink = `/results/recommendations/${ideaIndex}?id=${actualRunId}`;
                          } else {
                            const ideaMatch = action.idea_id.match(/idea_(\d+)/);
                            if (ideaMatch) {
                              ideaIndex = ideaMatch[1];
                              projectName = `Idea #${ideaIndex}`;
                              // Try to find the run from allRuns by checking if action.idea_id contains the run info
                              run = allRuns.find(r => {
                                const runIdStr = r.run_id || r.id;
                                return action.idea_id.includes(`run_${runIdStr}_idea_`);
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
                              <div
                                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                  action.status === "completed"
                                    ? "bg-green-500"
                                    : action.status === "in_progress"
                                    ? "bg-yellow-500"
                                    : action.status === "blocked"
                                    ? "bg-red-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate flex-1">
                                {projectName}
                              </h4>
                              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                                {action.status.replace("_", " ")}
                              </span>
                            </div>
                            {run?.inputs && Object.keys(run.inputs).length > 0 && (
                              <p className="mb-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                Time: {run.inputs.time_commitment || "Not set"} • Budget: {run.inputs.budget_range || "Not set"} • Focus:{" "}
                                {run.inputs.sub_interest_area || run.inputs.interest_area || "Not captured"} • Skill:{" "}
                                {run.inputs.skill_strength || "Not captured"}
                              </p>
                            )}
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              {action.action_text}
                            </p>
                          </>
                        );
                        
                        return ideaLink ? (
                          <Link
                            key={action.id}
                            to={ideaLink}
                            className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md cursor-pointer"
                          >
                            {cardContent}
                          </Link>
                        ) : (
                          <div key={action.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                            {cardContent}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No active ideas with action items yet.</p>
                  <Link
                    to="/advisor#intake-form"
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Discover Ideas
                  </Link>
                </div>
              );
            })()}

            {/* Validations Active Projects */}
            {(() => {
              const validationActions = actions.filter((a) => {
                if (a.status === "completed") return false;
                if (!a.idea_id) return false;
                // Match val_<validation_id>
                return a.idea_id.match(/val_(.+)/);
              });
              
              return validationActions.length > 0 ? (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">✅ Active Validations ({validationActions.length})</h3>
                  {loadingActions ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">Loading actions...</p>
                  ) : (
                    <div className="space-y-2.5">
                      {validationActions.slice(0, 10).map((action) => {
                        // Extract project name from idea_id
                        let projectName = "Unknown Validation";
                        if (action.idea_id) {
                          const valMatch = action.idea_id.match(/val_(.+)/);
                          if (valMatch) {
                            const validation = allValidations.find(v => v.validation_id === valMatch[1]);
                            if (validation?.idea_explanation) {
                              projectName = validation.idea_explanation.length > 40 
                                ? validation.idea_explanation.substring(0, 40) + "..." 
                                : validation.idea_explanation;
                            } else {
                              projectName = "Validation";
                            }
                          }
                        }
                        
                        return (
                          <div key={action.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                            <div className="mb-1.5 flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                  action.status === "completed"
                                    ? "bg-green-500"
                                    : action.status === "in_progress"
                                    ? "bg-yellow-500"
                                    : action.status === "blocked"
                                    ? "bg-red-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                                {projectName}
                              </span>
                              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                                {action.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-sm text-slate-900 dark:text-slate-100">
                              {action.action_text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Tab 2: My Sessions */}
        {mainTab === "sessions" && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">My Sessions</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Manage your idea discovery runs and validations - revisit previous recommendations, compare results, or generate new ones.
                </p>
              </div>
          {(allRuns.length > 1 || allValidations.length > 1) && (
            <Link
              to="/dashboard/compare"
              className="rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30"
            >
              Compare Sessions
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <nav className="flex gap-2" aria-label="Session tabs">
            <button
              onClick={() => setActiveTab("ideas")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "ideas"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Ideas Search ({allRuns.length})
            </button>
            <button
              onClick={() => setActiveTab("validations")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "validations"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Validations ({allValidations.length})
            </button>
          </nav>
        </div>
        {loadingRuns ? (
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading sessions...</p>
          </div>
        ) : (
          <>
            {/* Ideas Search Tab */}
            {activeTab === "ideas" && (
              <>
                {allRuns.filter(s => !s.is_validation).length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No idea discovery sessions yet.</p>
                    <Link
                      to="/advisor#intake-form"
                      className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                    >
                      Discover Ideas
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {allRuns.filter(s => !s.is_validation).map((session) => {
                      const hasOpenActions = sessionHasOpenActions(session);
                      const hasNotes = sessionHasNotes(session);
                      
                      return (
                      <article key={session.id} className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(session.timestamp).toLocaleString()}
                                {session.from_api && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400 font-medium">(Synced)</span>}
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
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                              {session.inputs?.goal_type 
                                ? `${session.inputs.goal_type}${session.inputs.interest_area || session.inputs.sub_interest_area ? ` - ${session.inputs.interest_area || session.inputs.sub_interest_area}` : ""}`
                                : "Idea Discovery Session"}
                            </h3>
                            {session.inputs && Object.keys(session.inputs).length > 0 ? (
                              <div className="mt-1.5">
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                  <span className="font-medium">Time:</span> {session.inputs.time_commitment || "Not set"} • <span className="font-medium">Budget:</span> {session.inputs.budget_range || "Not set"} • <span className="font-medium">Focus:</span>{" "}
                                  {session.inputs.sub_interest_area || session.inputs.interest_area || "Not captured"} • <span className="font-medium">Skill:</span>{" "}
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
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {session.inputs && Object.keys(session.inputs).length > 0 && (
                              <button
                                onClick={() => handleNewRequest(session)}
                                className="rounded-lg border border-brand-200/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
                              >
                                Edit
                              </button>
                            )}
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
                            <button
                              onClick={() => handleDelete(session)}
                              className="rounded-lg border border-red-200/60 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 transition-all duration-200 hover:border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:-translate-y-0.5 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Validations Tab */}
            {activeTab === "validations" && (
              <>
                {allValidations.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No validations yet.</p>
                    <Link
                      to="/validate-idea"
                      className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                    >
                      Validate Idea
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {allValidations.map((session) => {
                      const hasOpenActions = sessionHasOpenActions(session);
                      const hasNotes = sessionHasNotes(session);
                      
                      return (
                      <article key={session.id} className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(session.timestamp).toLocaleString()}
                                {session.from_api && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400 font-medium">(Synced)</span>}
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
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                              {session.idea_explanation 
                                ? (session.idea_explanation.length > 60 
                                    ? session.idea_explanation.substring(0, 60) + "..." 
                                    : session.idea_explanation)
                                : "Idea Validation"}
                            </h3>
                            <div className="mt-1.5">
                              {session.overall_score !== undefined && (
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                                    Validation Score: {session.overall_score.toFixed(1)}/10
                                  </span>
                                  {session.validation_id && (
                                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                      • ID: {session.validation_id.slice(-8)}
                                    </span>
                                  )}
                                </p>
                              )}
                              {session.idea_explanation && session.idea_explanation.length > 60 && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                  {session.idea_explanation}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            {session.overall_score !== undefined && (
                              <div className="rounded-lg border border-brand-300/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 px-3 py-1.5 shadow-sm">
                                <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                                  {session.overall_score.toFixed(1)}/10
                                </span>
                              </div>
                            )}
                            <Link
                              to={`/validate-result?id=${session.validation_id}`}
                              className="rounded-lg border border-brand-300/60 dark:border-brand-700/60 bg-brand-50/80 dark:bg-brand-900/20 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 transition-all duration-200 hover:border-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/30 hover:-translate-y-0.5 whitespace-nowrap"
                            >
                              View Results
                            </Link>
                            <button
                              onClick={() => handleDelete(session)}
                              className="rounded-lg border border-red-200/60 dark:border-red-800/60 bg-red-50/80 dark:bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 transition-all duration-200 hover:border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:-translate-y-0.5 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
          </>
        )}
      </section>
    </div>
  );
}

