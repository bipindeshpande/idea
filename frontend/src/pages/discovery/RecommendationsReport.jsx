import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
// Lazy load PDF dependencies - only load when needed
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { trimFromHeading, parseTopIdeas } from "../../utils/markdown/markdown.js";
import { personalizeCopy, buildFinalConclusion, parseRecommendationMatrix, splitFullReportSections } from "../../utils/formatters/recommendationFormatters.js";
import ReactMarkdown from "react-markdown";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RecommendationsReport() {
  const { reports, loadRunById, currentRunId, inputs } = useReports();
  const { subscription, getAuthHeaders, isAuthenticated } = useAuth();
  const query = useQuery();
  const runId = query.get("id");
  const reportRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ideas");
  const [smartRecommendations, setSmartRecommendations] = useState(null);
  const [ideasWithActions, setIdeasWithActions] = useState(new Set());
  const [ideasWithNotes, setIdeasWithNotes] = useState(new Set());
  const [enhancements, setEnhancements] = useState(null);
  const [enhancementsLoading, setEnhancementsLoading] = useState(false);
  const [enhancementsStarted, setEnhancementsStarted] = useState(false);
  const abortControllerRef = useRef(null);
  const isPro = subscription && (subscription.subscription_type === "pro" || subscription.subscription_type === "weekly");

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    if (runId) {
      const loadData = async () => {
        try {
          const result = await loadRunById(runId);
          if (!result) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("Run not found:", runId);
            }
            setError(`Report not found. The report ID "${runId}" may be invalid or may have been deleted.`);
          }
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error("Failed to load run:", err);
          }
          setError(err.message || "Failed to load report data. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    } else {
      // No runId provided - check if we have current reports
      if (!reports || !reports.personalized_recommendations) {
        setError("No report ID provided. Please select a report from your dashboard.");
      }
      setIsLoading(false);
    }
  }, [runId, loadRunById]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadSmartRecs = async () => {
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
        }
      };
      
      const loadActionsAndNotes = async () => {
        try {
          // Load all actions
          const actionsResponse = await fetch("/api/user/actions", {
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          });
          if (actionsResponse.ok) {
            const actionsData = await actionsResponse.json();
            if (actionsData.success) {
              const ideaIdsWithActions = new Set();
              actionsData.actions?.forEach(action => {
                if (action.idea_id) {
                  ideaIdsWithActions.add(action.idea_id);
                }
              });
              setIdeasWithActions(ideaIdsWithActions);
            }
          }
          
          // Load all notes
          const notesResponse = await fetch("/api/user/notes", {
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          });
          if (notesResponse.ok) {
            const notesData = await notesResponse.json();
            if (notesData.success) {
              const ideaIdsWithNotes = new Set();
              notesData.notes?.forEach(note => {
                if (note.idea_id) {
                  ideaIdsWithNotes.add(note.idea_id);
                }
              });
              setIdeasWithNotes(ideaIdsWithNotes);
            }
          }
        } catch (error) {
          console.error("Failed to load actions/notes:", error);
        }
      };
      
      loadSmartRecs();
      loadActionsAndNotes();
    }
  }, [isAuthenticated, getAuthHeaders]);

  // Smart detection for enhancements: Start if user scrolls or stays >30s
  useEffect(() => {
    if (!isAuthenticated || !runId || enhancementsStarted || !reports?.personalized_recommendations) {
      return;
    }

    let scrollTimer;
    let stayTimer;
    let hasScrolled = false;

    const handleScroll = () => {
      if (!hasScrolled && window.scrollY > 500) {
        hasScrolled = true;
        clearTimeout(scrollTimer);
        startEnhancements();
      }
    };

    const handleStay = () => {
      if (!enhancementsStarted) {
        startEnhancements();
      }
    };

    // Start enhancements if user stays >30 seconds
    stayTimer = setTimeout(handleStay, 30000);

    // Start enhancements if user scrolls past 500px
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(stayTimer);
      clearTimeout(scrollTimer);
      window.removeEventListener('scroll', handleScroll);
      // Cancel enhancements if user leaves
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, runId, enhancementsStarted, reports]);

  const startEnhancements = async () => {
    if (enhancementsStarted || !runId) return;
    
    setEnhancementsStarted(true);
    setEnhancementsLoading(true);
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/enhance-report", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEnhancements(data.enhancements);
          if (process.env.NODE_ENV === 'development') {
            console.log("Enhancements loaded:", data.metadata);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        if (process.env.NODE_ENV === 'development') {
          console.log("Enhancements cancelled");
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to load enhancements:", error);
        }
      }
    } finally {
      setEnhancementsLoading(false);
    }
  };

  const markdown = useMemo(() => {
    try {
      return trimFromHeading(reports?.personalized_recommendations ?? "", "### Comprehensive Recommendation Report");
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error trimming markdown:", err);
      }
      return reports?.personalized_recommendations ?? "";
    }
  }, [reports]);

  const allIdeas = useMemo(() => {
    try {
      const parsed = parseTopIdeas(markdown, 10);
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development' && parsed.length === 0 && markdown.length > 0) {
        console.log("Failed to parse ideas from markdown:", {
          markdownLength: markdown.length,
          markdownPreview: markdown.substring(0, 500),
          firstLines: markdown.split('\n').slice(0, 10),
        });
      }
      return parsed;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error parsing ideas:", err);
      }
      return [];
    }
  }, [markdown]);
  const topIdeas = allIdeas.slice(0, 3);
  const secondaryIdeas = allIdeas.slice(3);

  // Extract matrix data for conclusion
  const sections = useMemo(() => {
    try {
      return splitFullReportSections(markdown);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error splitting sections:", err);
      }
      return {};
    }
  }, [markdown]);
  
  const matrixRows = useMemo(() => {
    try {
      return parseRecommendationMatrix(sections["recommendation matrix"] || "");
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error parsing matrix:", err);
      }
      return [];
    }
  }, [sections]);
  
  const finalConclusion = useMemo(() => {
    try {
      return buildFinalConclusion(topIdeas, matrixRows, inputs || {});
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error building conclusion:", err);
      }
      return null;
    }
  }, [topIdeas, matrixRows, inputs]);

  // Show error state
  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-6">
        <Seo
          title="Error | Startup Idea Advisor"
          description="Error loading recommendation report"
          path="/results/recommendations"
        />
        <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-red-800 shadow-soft">
          <h2 className="text-lg font-semibold">Error Loading Report</h2>
          <p className="mt-2 text-sm">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link
              to="/dashboard"
              className="inline-block rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/advisor"
              className="inline-block rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
            >
              Generate New Report
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-6">
        <Seo
          title="Loading Recommendations | Startup Idea Advisor"
          description="Loading recommendation report"
          path="/results/recommendations"
        />
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Loading Report...</h2>
          <p className="mt-2 text-sm text-slate-600">Please wait while we load your recommendations.</p>
        </div>
      </section>
    );
  }

  // Show message if no reports yet
  if (!reports || !reports.personalized_recommendations) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-6">
        <Seo
          title="No Recommendations | Startup Idea Advisor"
          description="No recommendation report available"
          path="/results/recommendations"
        />
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No Report Available</h2>
          <p className="mt-2 text-sm text-slate-600">
            {runId ? "Report not found. It may have been deleted or the ID is invalid." : "No report data available. Please generate recommendations first."}
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <Link
              to="/advisor"
              className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Generate Recommendations
            </Link>
            <Link
              to="/dashboard"
              className="inline-block rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <Seo
        title="Personalized Startup Recommendations | Startup Idea Advisor"
        description="Review AI-generated startup ideas, financial outlook, and execution roadmap tailored to your profile."
        path="/results/recommendations"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Recommendation Report</h1>
      </div>

      <div ref={reportRef} className="grid gap-6">
        {topIdeas.length === 0 && markdown && markdown.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
            <h2 className="text-lg font-semibold">Unable to Parse Recommendations</h2>
            <p className="mt-2 text-sm mb-4">
              The recommendations couldn't be parsed into individual ideas. This might happen if the format is unexpected or the report is very brief.
            </p>
            <div className="space-y-3">
              <Link
                to="/advisor"
                className="inline-block rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
              >
                Generate New Recommendations
              </Link>
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2">Raw Recommendations Content:</p>
                <div className="prose prose-slate max-w-none bg-white p-4 rounded-lg border border-amber-300 text-xs max-h-96 overflow-y-auto">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="text-slate-700 leading-relaxed mb-2" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside space-y-1 text-slate-700 mb-2 ml-4" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-outside space-y-1 text-slate-700 mb-2 ml-4" {...props} />
                      ),
                      li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-slate-900" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 className="text-xl font-bold text-slate-900 mb-2 mt-3" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-lg font-bold text-slate-900 mb-2 mt-3" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-base font-semibold text-slate-800 mb-1 mt-2" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-sm font-semibold text-slate-800 mb-1 mt-2" {...props} />
                      ),
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {topIdeas.length === 0 && (!markdown || markdown.length === 0) && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900">No Recommendations Available</h2>
            <p className="mt-2 text-sm text-slate-600">
              The recommendation report is empty or could not be loaded.
            </p>
            <div className="mt-4 flex gap-3 justify-center">
              <Link
                to="/advisor"
                className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Generate Recommendations
              </Link>
              <Link
                to="/dashboard"
                className="inline-block rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {topIdeas.length > 0 && (
          <>
            {/* Tabbed Interface */}
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab("ideas")}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                    activeTab === "ideas"
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  Top Startup Ideas
                </button>
                <button
                  onClick={() => setActiveTab("nextsteps")}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                    activeTab === "nextsteps"
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  Next Steps
                </button>
                {finalConclusion && (
                  <button
                    onClick={() => setActiveTab("conclusion")}
                    className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                      activeTab === "conclusion"
                        ? "border-brand-500 text-brand-600"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}
                  >
                    Final Conclusion
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content: Top Startup Ideas */}
            {activeTab === "ideas" && (
              <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
                <h2 className="text-xl font-semibold text-slate-900">
                  Top Startup Ideas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your three tailored ideas. Click any row to open the full playbook with financial outlook, risk radar, validation questions, and more.
                </p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm shadow-brand-100">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Idea</th>
                        <th className="px-4 py-3">Summary</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {topIdeas.map((idea) => {
                        const runQuery = runId || currentRunId;
                        const detailPath = runQuery
                          ? `/results/recommendations/${idea.index}?id=${runQuery}`
                          : `/results/recommendations/${idea.index}`;
                        const ideaId = runQuery ? `run_${runQuery}_idea_${idea.index}` : `idea_${idea.index}`;
                        const hasActions = ideasWithActions.has(ideaId);
                        const hasNotes = ideasWithNotes.has(ideaId);
                        
                        return (
                          <tr key={idea.index} className="transition hover:bg-brand-50/60">
                            <td className="px-4 py-3 font-semibold text-slate-600">{idea.index}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <span>{idea.title}</span>
                                {(hasActions || hasNotes) && (
                                  <div className="flex items-center gap-1">
                                    {hasActions && (
                                      <span 
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300"
                                        title="Has action items"
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
                              {runQuery && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  ID: {runQuery.slice(-8)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{personalizeCopy(idea.summary)}</td>
                            <td className="px-4 py-3">
                              <Link
                                to={detailPath}
                                className="mx-auto flex max-w-[8rem] justify-center rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 whitespace-nowrap"
                              >
                                View details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {topIdeas.length < 3 && (
                        <tr className="bg-slate-50/60 text-slate-500">
                          <td colSpan={4} className="px-4 py-3 text-center italic">
                            Fewer than three ideas generated—rerun with expanded preferences for more options.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={
                      runId || currentRunId
                        ? `/results/recommendations/full?id=${runId || currentRunId}`
                        : "/results/recommendations/full"
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:text-brand-800"
                  >
                    View full recommendation report
                  </Link>
                </div>
              </div>
            )}

            {/* Tab Content: Next Steps */}
            {activeTab === "nextsteps" && (
              <div className="mb-4 rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">🚀 Your Next Steps</h2>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Start Here</span>
                </div>
                <p className="mb-6 text-slate-600">
                  Follow these specific steps to move forward with your startup ideas.
                </p>
                <ol className="ml-6 space-y-4 text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">1</span>
                    <div>
                      <strong className="font-semibold text-slate-900">Review all 3 recommendations</strong>
                      <p className="mt-1 text-sm text-slate-600">Click "View details" on each idea to see the full analysis, financial outlook, and execution roadmap.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">2</span>
                    <div>
                      <strong className="font-semibold text-slate-900">Validate your top choice</strong>
                      <p className="mt-1 text-sm text-slate-600">Use our validation tool to get detailed feedback on your selected idea across 10 key parameters.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">3</span>
                    <div>
                      <strong className="font-semibold text-slate-900">Talk to potential customers</strong>
                      <p className="mt-1 text-sm text-slate-600">Reach out to 10 people in your target market this week. Use the customer validation questions from the detailed reports.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">4</span>
                    <div>
                      <strong className="font-semibold text-slate-900">Create a simple prototype or landing page</strong>
                      <p className="mt-1 text-sm text-slate-600">Within 30 days, build a minimal version to test interest. Use tools like Carrd, Webflow, or no-code platforms.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">5</span>
                    <div>
                      <strong className="font-semibold text-slate-900">Download templates and resources</strong>
                      <p className="mt-1 text-sm text-slate-600">Access our business plan template, pitch deck template, and email templates from the Resources section.</p>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {/* Tab Content: Final Conclusion */}
            {activeTab === "conclusion" && finalConclusion && (
              <div className="rounded-3xl border-2 border-brand-300 dark:border-brand-600 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-8 shadow-soft">
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-4" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                      ),
                    }}
                  >
                    {finalConclusion}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Similar Ideas Section */}
            {smartRecommendations && smartRecommendations.similar_ideas && smartRecommendations.similar_ideas.length > 0 && (
              <div className="mt-6 rounded-3xl border border-brand-200 dark:border-brand-700 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-6 shadow-soft">
                <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  💡 Similar High-Scoring Ideas from Your History
                </h2>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                  Based on your validation history, here are similar ideas you've validated highly in the past:
                </p>
                <div className="space-y-3">
                  {smartRecommendations.similar_ideas.slice(0, 3).map((idea, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-slate-800 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                          Score: {idea.score.toFixed(1)}/10
                        </span>
                        <Link
                          to={`/validate-result?id=${idea.validation_id}`}
                          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          View Validation →
                        </Link>
                      </div>
                      {idea.idea_explanation && (
                        <p className="text-sm text-slate-700 dark:text-slate-300">{idea.idea_explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
