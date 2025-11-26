import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingIndicator from "../../components/common/LoadingIndicator.jsx";

export default function CompareSessionsPage() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [validations, setValidations] = useState([]);
  const [selectedRuns, setSelectedRuns] = useState(new Set());
  const [selectedValidations, setSelectedValidations] = useState(new Set());
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadSessions = async () => {
      try {
        const response = await fetch("/api/user/activity", {
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setRuns(data.activity?.runs || []);
            setValidations(data.activity?.validations || []);
          }
        }
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [isAuthenticated, getAuthHeaders, navigate]);

  const handleCompare = async () => {
    if (selectedRuns.size === 0 && selectedValidations.size === 0) {
      alert("Please select at least one session to compare");
      return;
    }

    if (selectedRuns.size + selectedValidations.size > 5) {
      alert("Maximum 5 sessions can be compared at once");
      return;
    }

    setComparing(true);
    try {
      const requestBody = {
        run_ids: Array.from(selectedRuns),
        validation_ids: Array.from(selectedValidations),
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Comparing sessions:", requestBody);
      }

      const response = await fetch("/api/user/compare-sessions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log("Comparison response:", data);
        }
        
        if (data.success) {
          if (data.comparison) {
            setComparisonData(data.comparison);
            // Scroll to results
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            alert("Comparison completed but no data was returned. Please try again.");
          }
        } else {
          alert(data.error || "Failed to compare sessions. Please try again.");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Comparison error:", errorData);
        alert(errorData.error || `Failed to compare sessions (${response.status}). Please try again.`);
      }
    } catch (error) {
      console.error("Failed to compare sessions:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setComparing(false);
    }
  };

  const toggleRun = (runId) => {
    setSelectedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const toggleValidation = (validationId) => {
    setSelectedValidations((prev) => {
      const next = new Set(prev);
      if (next.has(validationId)) {
        next.delete(validationId);
      } else {
        next.add(validationId);
      }
      return next;
    });
  };

  if (loading) {
    return <LoadingIndicator simple={true} message="Loading sessions..." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Seo
        title="Compare Sessions | Startup Idea Advisor"
        description="Compare multiple idea discovery sessions and validations side-by-side"
        path="/dashboard/compare"
      />

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
              Compare Sessions
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
              Select up to 5 sessions to compare side-by-side. See trends, differences, and patterns across your ideas.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {!comparisonData ? (
        <div className="space-y-6">
          {/* Compare Button at Top */}
          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={comparing || (selectedRuns.size === 0 && selectedValidations.size === 0)}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? "Comparing..." : `Compare ${selectedRuns.size + selectedValidations.size} Session(s)`}
            </button>
          </div>

          {/* Idea Discovery Runs */}
          <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-50">Idea Discovery Runs</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No discovery runs yet.</p>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <label
                    key={run.run_id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRuns.has(run.run_id)}
                      onChange={() => toggleRun(run.run_id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {run.inputs?.goal_type || "Idea Discovery"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {run.created_at ? new Date(run.created_at).toLocaleString() : "Unknown date"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Validations */}
          <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-50">Idea Validations</h2>
            {validations.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No validations yet.</p>
            ) : (
              <div className="space-y-2">
                {validations.map((validation) => (
                  <label
                    key={validation.validation_id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValidations.has(validation.validation_id)}
                      onChange={() => toggleValidation(validation.validation_id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {validation.idea_explanation 
                          ? (validation.idea_explanation.length > 50 
                              ? validation.idea_explanation.substring(0, 50) + "..." 
                              : validation.idea_explanation)
                          : "Idea Validation"}
                        {validation.overall_score !== undefined && (
                          <span className="ml-2 text-brand-600 dark:text-brand-400">
                            ({validation.overall_score.toFixed(1)}/10)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {validation.created_at ? new Date(validation.created_at).toLocaleString() : "Unknown date"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Compare Button at Bottom */}
          <div className="flex justify-center">
            <button
              onClick={handleCompare}
              disabled={comparing || (selectedRuns.size === 0 && selectedValidations.size === 0)}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? "Comparing..." : `Compare ${selectedRuns.size + selectedValidations.size} Session(s)`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Comparison Results</h2>
            <button
              onClick={() => {
                setComparisonData(null);
                setSelectedRuns(new Set());
                setSelectedValidations(new Set());
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Compare Different Sessions
            </button>
          </div>

          {/* Debug info - remove in production if not needed */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
              <strong>Debug:</strong> Runs: {comparisonData?.runs?.length || 0}, Validations: {comparisonData?.validations?.length || 0}
            </div>
          )}

          {/* Runs Comparison */}
          {comparisonData && comparisonData.runs && comparisonData.runs.length > 0 && (
            <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">
                Idea Discovery Runs ({comparisonData.runs.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Project Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Goal Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Time Commitment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Budget
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Interest Area
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {comparisonData.runs.map((run, idx) => {
                      // Ensure inputs is an object
                      const inputs = run.inputs || {};
                      const projectName = inputs.goal_type 
                        ? `${inputs.goal_type}${inputs.interest_area || inputs.sub_interest_area ? ` - ${inputs.interest_area || inputs.sub_interest_area}` : ""}`
                        : "Idea Discovery Session";
                      
                      return (
                        <tr key={run.run_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {projectName}
                            {run.run_id && (
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                (ID: {String(run.run_id).slice(-8)})
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {run.created_at ? new Date(run.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {inputs.goal_type || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {inputs.time_commitment || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {inputs.budget_range || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {inputs.sub_interest_area || inputs.interest_area || "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Show message if no runs found */}
          {comparisonData && (!comparisonData.runs || comparisonData.runs.length === 0) && selectedRuns.size > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No runs found for comparison. The selected runs may have been deleted or you may not have access to them.
            </div>
          )}

          {/* Validations Comparison */}
          {comparisonData && comparisonData.validations && comparisonData.validations.length > 0 && (
            <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">
                Idea Validations ({comparisonData.validations.length})
              </h3>
              <div className="space-y-4">
                {comparisonData.validations.map((validation, idx) => {
                  // Ensure validation_result is an object
                  const validationResult = validation.validation_result || {};
                  const scores = validationResult.scores || {};
                  const overallScore = validationResult.overall_score;
                  
                  const projectName = validation.idea_explanation 
                    ? (validation.idea_explanation.length > 80 
                        ? validation.idea_explanation.substring(0, 80) + "..." 
                        : validation.idea_explanation)
                    : "Idea Validation";
                  
                  return (
                    <div key={validation.validation_id || idx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {projectName}
                            {overallScore !== undefined && overallScore !== null && (
                              <span className="ml-2 text-brand-600 dark:text-brand-400">
                                Score: {Number(overallScore).toFixed(1)}/10
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {validation.created_at ? new Date(validation.created_at).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        {validation.validation_id && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            ID: {String(validation.validation_id).slice(-8)}
                          </p>
                        )}
                      </div>
                      {Object.keys(scores).length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                          {Object.entries(scores).map(([category, score]) => (
                            <div key={category} className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 p-2">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </p>
                              <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                {Number(score).toFixed(1)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          No detailed scores available for this validation.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Show message if no validations found */}
          {comparisonData && (!comparisonData.validations || comparisonData.validations.length === 0) && selectedValidations.size > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No validations found for comparison. The selected validations may have been deleted or you may not have access to them.
            </div>
          )}

          {/* Show message if no comparison data at all */}
          {comparisonData && 
           (!comparisonData.runs || comparisonData.runs.length === 0) && 
           (!comparisonData.validations || comparisonData.validations.length === 0) && (
            <div className="rounded-lg border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
              No comparison data available. Please try selecting different sessions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

