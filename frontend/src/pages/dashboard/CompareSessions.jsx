import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingIndicator from "../../components/common/LoadingIndicator.jsx";
import { parseTopIdeas } from "../../utils/markdown/markdown.js";

export default function CompareSessionsPage() {
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [validations, setValidations] = useState([]);
  const [allIdeas, setAllIdeas] = useState([]); // All ideas extracted from runs
  const [selectedIdeas, setSelectedIdeas] = useState(new Set()); // Selected idea IDs (format: "runId-ideaIndex")
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
            const runsData = data.activity?.runs || [];
            setRuns(runsData);
            setValidations(data.activity?.validations || []);
            
            // Extract all ideas from runs
            const ideasList = [];
            runsData.forEach((run) => {
              if (run.reports?.personalized_recommendations) {
                const topIdeas = parseTopIdeas(run.reports.personalized_recommendations, 3);
                topIdeas.forEach((idea) => {
                  ideasList.push({
                    id: `${run.run_id}-${idea.index}`,
                    runId: run.run_id,
                    ideaIndex: idea.index,
                    title: idea.title,
                    summary: idea.summary,
                    runInputs: run.inputs,
                    runCreatedAt: run.created_at,
                  });
                });
              }
            });
            setAllIdeas(ideasList);
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
    if (selectedIdeas.size === 0) {
      alert("Please select at least one idea to compare");
      return;
    }

    if (selectedIdeas.size > 5) {
      alert("Maximum 5 ideas can be compared at once");
      return;
    }

    setComparing(true);
    
    try {
      // Get selected ideas data
      const selectedIdeasData = allIdeas.filter(idea => selectedIdeas.has(idea.id));
      
      // Group by run_id to fetch full run data
      const runIds = [...new Set(selectedIdeasData.map(idea => idea.runId))];
      
      const requestBody = {
        run_ids: runIds,
        validation_ids: [],
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Comparing ideas:", selectedIdeasData);
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
            // Extract only the selected ideas from the comparison data
            const ideasComparison = {
              ideas: selectedIdeasData.map(idea => {
                const run = data.comparison.runs?.find(r => r.run_id === idea.runId);
                if (run && run.reports?.personalized_recommendations) {
                  const topIdeas = parseTopIdeas(run.reports.personalized_recommendations, 3);
                  const matchedIdea = topIdeas.find(i => i.index === idea.ideaIndex);
                  return {
                    ...idea,
                    fullData: matchedIdea,
                    runInputs: run.inputs,
                    runCreatedAt: run.created_at,
                  };
                }
                return idea;
              }),
            };
            setComparisonData(ideasComparison);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            alert("Comparison completed but no data was returned. Please try again.");
          }
        } else {
          alert(data.error || "Failed to compare ideas. Please try again.");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Comparison error:", errorData);
        alert(errorData.error || `Failed to compare ideas (${response.status}). Please try again.`);
      }
    } catch (error) {
      console.error("Failed to compare ideas:", error);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setComparing(false);
    }
  };

  const toggleIdea = (ideaId) => {
    setSelectedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
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
        title="Compare Ideas | Startup Idea Advisor"
        description="Compare multiple startup ideas side-by-side"
        path="/dashboard/compare"
      />

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
              Compare Ideas
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
              Select up to 5 ideas to compare side-by-side. See differences and patterns across your ideas.
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
              disabled={comparing || selectedIdeas.size === 0}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? "Comparing..." : `Compare ${selectedIdeas.size} Idea(s)`}
            </button>
          </div>

          {/* Ideas List */}
          <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-50">Select Ideas to Compare</h2>
            {allIdeas.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No ideas found. Create some idea discovery sessions first.</p>
            ) : (
              <div className="space-y-2">
                {allIdeas.map((idea) => (
                  <label
                    key={idea.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIdeas.has(idea.id)}
                      onChange={() => toggleIdea(idea.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {idea.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {idea.summary}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleString() : "Unknown date"}
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
              disabled={comparing || selectedIdeas.size === 0}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? "Comparing..." : `Compare ${selectedIdeas.size} Idea(s)`}
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
                setSelectedIdeas(new Set());
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Compare Different Ideas
            </button>
          </div>

          {/* Ideas Comparison */}
          {comparisonData && comparisonData.ideas && comparisonData.ideas.length > 0 && (
            <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">
                Ideas Comparison ({comparisonData.ideas.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Idea Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Summary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Session Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Goal Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Interest Area
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {comparisonData.ideas.map((idea, idx) => {
                      const inputs = idea.runInputs || {};
                      return (
                        <tr key={idea.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {idea.title}
                            {idea.runId && (
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                (Run ID: {String(idea.runId).slice(-8)})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-md">
                            {idea.summary || idea.fullData?.summary || "N/A"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                            {inputs.goal_type || "N/A"}
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

          {/* Show message if no ideas found */}
          {comparisonData && (!comparisonData.ideas || comparisonData.ideas.length === 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No ideas found for comparison. The selected ideas may have been deleted or you may not have access to them.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

