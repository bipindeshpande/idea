import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import DashboardTips from "../../components/dashboard/DashboardTips.jsx";
import ActivitySummary from "../../components/dashboard/ActivitySummary.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [apiRuns, setApiRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
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
    } else {
      setLoadingRuns(false);
    }
  }, [isAuthenticated]);

  const handleDelete = async (run) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      if (run.from_api && run.run_id) {
        // Delete from API/database
        try {
          const response = await fetch(`/api/user/run/${run.run_id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            // Remove from local state and reload
            setApiRuns(prev => prev.filter(r => r.run_id !== run.run_id));
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
        deleteRun(run.id);
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
      }
    } catch (error) {
      console.error("Failed to load API runs:", error);
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleNewRequest = (run) => {
    // Load the saved inputs into the form
    setInputs(run.inputs);
    // Navigate to home page with hash to scroll to form
    navigate("/#intake-form");
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
          inputs: {}, // API doesn't return inputs, will show placeholder
          outputs: {},
          run_id: apiRun.run_id,
          from_api: true,
        });
      }
    });
    
    // Sort by timestamp, newest first
    return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [runs, apiRuns]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Seo
        title="Dashboard | Startup Idea Advisor"
        description="Access your saved AI-generated startup reports, compare runs, and revisit recommendations."
        path="/dashboard"
      />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">
              {isAuthenticated && user
                ? `Welcome back, ${user.email.split("@")[0]}!`
                : "Manage your startup idea validations and discoveries."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/validate-idea"
              className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50 whitespace-nowrap"
            >
              Validate Idea
            </Link>
            <Link
              to="/#intake-form"
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-600 whitespace-nowrap"
            >
              Discover Ideas
            </Link>
          </div>
        </div>
      </div>

      {/* Engagement Section - Tips and Activity */}
      <div className="mb-8 space-y-6">
        <DashboardTips />
      </div>

      {/* Activity Summary - Only show validations */}
      <div className="mb-8">
        <ActivitySummary showRuns={false} />
      </div>

      {/* My Sessions - Unified view of all idea discovery runs */}
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">My Sessions</h2>
            <p className="mt-1 text-sm text-slate-600">
              All your idea discovery runs - revisit previous recommendations, compare results, or generate new recommendations with updated context.
            </p>
          </div>
        </div>
        {loadingRuns ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center">
            <p className="text-slate-600">Loading sessions...</p>
          </div>
        ) : allRuns.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center">
            <p className="text-slate-600">No sessions saved yet. Run a new request to populate your dashboard.</p>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                to="/#intake-form"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Discover Ideas
              </Link>
              <Link
                to="/validate-idea"
                className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Validate Idea
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {allRuns.map((run) => (
              <article key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500">
                      {new Date(run.timestamp).toLocaleString()}
                      {run.from_api && <span className="ml-2 text-xs text-brand-600">(Synced)</span>}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {run.inputs?.goal_type || "Idea Discovery Session"}
                    </h3>
                    {run.inputs && Object.keys(run.inputs).length > 0 ? (
                      <p className="text-sm text-slate-600">
                        Time: {run.inputs.time_commitment || "Not set"} • Budget: {run.inputs.budget_range || "Not set"} • Focus:{" "}
                        {run.inputs.sub_interest_area || run.inputs.interest_area || "Not captured"} • Skill:{" "}
                        {run.inputs.skill_strength || "Not captured"}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">Idea discovery run</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {run.inputs && Object.keys(run.inputs).length > 0 && (
                      <button
                        onClick={() => handleNewRequest(run)}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-700 hover:border-brand-300 hover:bg-brand-100 whitespace-nowrap"
                      >
                        Edit
                      </button>
                    )}
                    <Link
                      to={`/results/profile?id=${run.run_id || run.id}`}
                      className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-100 whitespace-nowrap"
                    >
                      View profile
                    </Link>
                    <Link
                      to={`/results/recommendations?id=${run.run_id || run.id}`}
                      className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-100 whitespace-nowrap"
                    >
                      View recommendations
                    </Link>
                    <button
                      onClick={() => handleDelete(run)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 hover:border-red-300 hover:bg-red-100 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

