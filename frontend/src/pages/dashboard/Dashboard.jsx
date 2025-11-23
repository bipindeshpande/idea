import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import DashboardTips from "../../components/dashboard/DashboardTips.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [apiRuns, setApiRuns] = useState([]);
  const [apiValidations, setApiValidations] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [activeTab, setActiveTab] = useState("ideas"); // "ideas" or "validations"
  const { deleteRun, setInputs } = useReports();
  const { user, isAuthenticated, subscription, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    loadRuns();
    if (isAuthenticated) {
      loadApiRuns();
      loadApiValidations();
    } else {
      setLoadingRuns(false);
    }
  }, [isAuthenticated]);

  const handleDelete = async (session) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      // Handle validation deletion
      if (session.is_validation && session.from_api && session.validation_id) {
        // TODO: Add validation delete endpoint if needed
        // For now, just remove from local state
        setApiValidations(prev => prev.filter(v => v.validation_id !== session.validation_id));
        await loadApiValidations();
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

  const loadApiRuns = async () => {
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
      console.error("Failed to load API runs:", error);
    } finally {
      setLoadingRuns(false);
    }
  };

  const loadApiValidations = async () => {
    try {
      const response = await fetch("/api/user/activity", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setApiValidations(data.activity?.validations || []);
      }
    } catch (error) {
      console.error("Failed to load API validations:", error);
    }
  };

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

  // Format validations for display
  const allValidations = useMemo(() => {
    return apiValidations.map(v => ({
      id: `val_${v.validation_id}`,
      validation_id: v.validation_id,
      timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
      overall_score: v.overall_score,
      from_api: true,
      is_validation: true,
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [apiValidations]);

  // Combine runs and validations, sorted by timestamp
  const allSessions = useMemo(() => {
    const combined = [
      ...allRuns.map(r => ({ ...r, is_validation: false })),
      ...allValidations,
    ];
    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allRuns, allValidations]);

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

      {/* Engagement Section - Tips */}
      <div className="mb-8">
        <DashboardTips />
      </div>

      {/* My Sessions - Tabbed view of idea discovery runs and validations */}
      <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">My Sessions</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Manage your idea discovery runs and validations - revisit previous recommendations, compare results, or generate new ones.
            </p>
          </div>
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
                {allRuns.length === 0 ? (
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
                    {allRuns.map((session) => (
                      <article key={session.id} className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(session.timestamp).toLocaleString()}
                              {session.from_api && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400 font-medium">(Synced)</span>}
                            </p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                              {session.inputs?.goal_type || "Idea Discovery Session"}
                            </h3>
                            {session.inputs && Object.keys(session.inputs).length > 0 ? (
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                                Time: {session.inputs.time_commitment || "Not set"} • Budget: {session.inputs.budget_range || "Not set"} • Focus:{" "}
                                {session.inputs.sub_interest_area || session.inputs.interest_area || "Not captured"} • Skill:{" "}
                                {session.inputs.skill_strength || "Not captured"}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">Idea discovery run</p>
                            )}
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
                    ))}
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
                    {allValidations.map((session) => (
                      <article key={session.id} className="group relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-5 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(session.timestamp).toLocaleString()}
                              {session.from_api && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400 font-medium">(Synced)</span>}
                            </p>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-1">
                              Idea Validation
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">
                              Validation ID: {session.validation_id?.slice(-8) || session.id}
                            </p>
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
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

