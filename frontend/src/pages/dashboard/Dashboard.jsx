import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { parseTopIdeas, trimFromHeading } from "../../utils/markdown/markdown.js";
import { 
  buildFinancialSnapshots, 
  parseRiskRows, 
  splitFullReportSections 
} from "../../utils/formatters/recommendationFormatters.js";
import { intakeScreen } from "../../config/intakeScreen.js";
import DashboardActiveIdeasTab from "../../components/dashboard/DashboardActiveIdeasTab.jsx";
import DashboardSessionsTab from "../../components/dashboard/DashboardSessionsTab.jsx";
import DashboardSearchTab from "../../components/dashboard/DashboardSearchTab.jsx";
import DashboardCompareTab from "../../components/dashboard/DashboardCompareTab.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [apiRuns, setApiRuns] = useState([]);
  const [apiValidations, setApiValidations] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [activeTab, setActiveTab] = useState("ideas"); // "ideas" or "validations" (for My Sessions sub-tabs)
  const [mainTab, setMainTab] = useState("sessions"); // "active-ideas", "sessions", "search", or "compare" (for main dashboard tabs)
  const { deleteRun, setInputs } = useReports();
  const { user, isAuthenticated, subscription, getAuthHeaders } = useAuth();
  const { getSavedValidations } = useValidation();
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [searchInput, setSearchInput] = useState(""); // What user is typing
  const [searchQuery, setSearchQuery] = useState(""); // Active search query used for filtering
  const [sortBy, setSortBy] = useState("date"); // "date", "score", "name"
  const [dateFilter, setDateFilter] = useState("all"); // "all", "week", "month", "3months", "year"
  const [scoreFilter, setScoreFilter] = useState("all"); // "all", "high" (>=7), "medium" (5-7), "low" (<5)
  // Advanced search fields
  const [advancedSearch, setAdvancedSearch] = useState({
    goalType: "all",
    interestArea: "all",
    ideaDescription: "",
    budgetRange: "all",
    timeCommitment: "all",
    workStyle: "all",
    skillStrength: "all",
    searchType: "ideas", // "ideas" or "validations"
  });
  const [searchPerformed, setSearchPerformed] = useState(false); // Track if search has been performed
  const [selectedSearchIdeas, setSelectedSearchIdeas] = useState(new Set()); // Selected ideas from search results for comparison
  // Compare tab state - now for ideas
  const [allIdeas, setAllIdeas] = useState([]); // All ideas extracted from runs
  const [selectedIdeas, setSelectedIdeas] = useState(new Set()); // Selected idea IDs (format: "runId-ideaIndex")
  const [selectedValidations, setSelectedValidations] = useState(new Set());
  const [comparisonData, setComparisonData] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [autoCompareTrigger, setAutoCompareTrigger] = useState(false); // Flag to trigger auto-comparison

  const loadRuns = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out any validations that might have been saved as runs
        const filtered = parsed.filter(run => {
          // If it has validation_id or overall_score, it's a validation, not a run
          return !run.validation_id && run.overall_score === undefined;
        });
        setRuns(filtered);
      } catch (error) {
        console.error("Failed to parse saved runs", error);
      }
    }
  };

  // Consolidated dashboard data loader - replaces separate loadApiRuns, loadActions, and loadNotes calls
  const loadDashboardData = useCallback(async () => {
    setLoadingRuns(true);
    setLoadingActions(true);
    setLoadingNotes(true);
    
    try {
      // Clear localStorage validations immediately when loading API data for authenticated users
      if (isAuthenticated) {
        localStorage.removeItem("sia_validations");
        localStorage.removeItem("revalidate_data");
      }
      
      // Single consolidated API call instead of 3 separate calls
      const response = await fetch("/api/user/dashboard", {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Set all data from single response
          setApiRuns(data.activity?.runs || []);
          setApiValidations(data.activity?.validations || []);
          setActions(data.actions || []);
          setNotes(data.notes || []);
        }
      } else {
        // Fallback to individual endpoints if consolidated endpoint fails
        if (process.env.NODE_ENV === 'development') {
          console.warn("Consolidated dashboard endpoint failed, falling back to individual calls");
        }
        // Fallback logic could go here if needed
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to load dashboard data:", error);
      }
    } finally {
      setLoadingRuns(false);
      setLoadingActions(false);
      setLoadingNotes(false);
    }
  }, [getAuthHeaders, isAuthenticated]);

  useEffect(() => {
    // Immediately clear localStorage validations when authenticated
    if (isAuthenticated) {
      localStorage.removeItem("sia_validations");
      localStorage.removeItem("revalidate_data");
    }
    
    loadRuns();
    if (isAuthenticated) {
      // Single consolidated call instead of 3 separate API calls
      loadDashboardData();
    } else {
      setLoadingRuns(false);
      setLoadingActions(false);
      setLoadingNotes(false);
    }
  }, [isAuthenticated, loadDashboardData]);

  // Extract all ideas from runs when apiRuns changes
  useEffect(() => {
    const extractIdeas = async () => {
      const ideasList = [];
      const seenIds = new Set(); // Track unique idea IDs to prevent duplicates
      
      // Identify runs missing reports and batch fetch them in parallel
      const runsNeedingReports = apiRuns.filter(
        run => !run.reports?.personalized_recommendations && run.run_id
      );
      
      // Batch fetch all missing reports in parallel (much faster than sequential)
      const reportsMap = new Map();
      if (runsNeedingReports.length > 0) {
        const fetchPromises = runsNeedingReports.map(async (run) => {
          try {
            const response = await fetch(`/api/user/run/${run.run_id}`, {
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.run?.reports) {
                try {
                  const reports = typeof data.run.reports === 'string' 
                    ? JSON.parse(data.run.reports) 
                    : data.run.reports;
                  reportsMap.set(run.run_id, reports);
                } catch (e) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn("Failed to parse reports for run:", run.run_id);
                  }
                }
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("Failed to fetch reports for run:", run.run_id, error);
            }
          }
        });
        
        // Wait for all fetches to complete in parallel
        await Promise.all(fetchPromises);
      }
      
      // Process all runs (use cached reports or fetched reports)
      for (const run of apiRuns) {
        let reports = run.reports;
        
        // Use fetched reports if available
        if (!reports?.personalized_recommendations && run.run_id) {
          reports = reportsMap.get(run.run_id);
        }
        
        // Extract ideas from reports (limit to 3 ideas per discovery)
        if (reports?.personalized_recommendations) {
          const topIdeas = parseTopIdeas(reports.personalized_recommendations, 3);
          topIdeas.forEach((idea) => {
            const ideaId = `${run.run_id}-${idea.index}`;
            // Only add if we haven't seen this ID before
            if (!seenIds.has(ideaId)) {
              seenIds.add(ideaId);
              ideasList.push({
                id: ideaId,
                runId: run.run_id,
                ideaIndex: idea.index,
                title: idea.title,
                summary: idea.summary,
                runInputs: run.inputs,
                runCreatedAt: run.created_at,
                runReports: reports,
              });
            }
          });
        }
      }
      
      // Only check localStorage runs if user is not authenticated or API hasn't loaded yet
      // If authenticated and API has loaded, ignore localStorage to respect database state
      if (!isAuthenticated || loadingRuns) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.forEach((run) => {
              // Skip if already processed (check by run_id or id)
              const runId = run.run_id || run.id?.replace("run_", "") || run.id;
              const alreadyProcessed = apiRuns.some(apiRun => 
                apiRun.run_id === runId || 
                apiRun.run_id === run.run_id ||
                (run.id && apiRuns.some(ar => ar.id === run.id))
              );
              
            if (!alreadyProcessed && run.outputs?.personalized_recommendations) {
              const topIdeas = parseTopIdeas(run.outputs.personalized_recommendations, 3);
                topIdeas.forEach((idea) => {
                  const ideaId = `${runId}-${idea.index}`;
                  // Only add if we haven't seen this ID before
                  if (!seenIds.has(ideaId)) {
                    seenIds.add(ideaId);
                    ideasList.push({
                      id: ideaId,
                      runId: runId,
                      ideaIndex: idea.index,
                      title: idea.title,
                      summary: idea.summary,
                      runInputs: run.inputs || {},
                      runCreatedAt: run.timestamp ? new Date(run.timestamp).toISOString() : null,
                      runReports: run.outputs,
                    });
                  }
                });
              }
            });
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn("Failed to parse localStorage runs:", e);
            }
          }
        }
      }
      
      setAllIdeas(ideasList);
    };
    
    if (apiRuns.length > 0 || isAuthenticated || !loadingRuns) {
      extractIdeas();
    }
  }, [apiRuns, isAuthenticated, loadingRuns, getAuthHeaders]);

  // Helper function to extract comparison metrics from reports
  const extractComparisonMetrics = (run, ideaIndex) => {
    const metrics = {
      startupCost: "N/A",
      monthlyRevenue: "N/A",
      marketSize: "N/A",
      competitionLevel: "N/A",
      riskLevel: "N/A",
      timeToMarket: "N/A",
      customerSegment: "N/A",
      keyStrengths: "N/A",
      validationScore: "N/A",
      scalability: "N/A",
    };

    if (!run || !run.reports) return metrics;

    const reportsObj = typeof run.reports === 'object' ? run.reports : {};
    const personalizedRecs = reportsObj.personalized_recommendations;
    
    if (!personalizedRecs) return metrics;

    // Get the full markdown text
    const reportsStr = typeof personalizedRecs === 'string' ? personalizedRecs : JSON.stringify(personalizedRecs);
    
    // Use splitFullReportSections to get structured sections
    const sections = splitFullReportSections(reportsStr);
    
    // Extract idea data
    const topIdeas = parseTopIdeas(personalizedRecs, 3);
    const idea = topIdeas.find(i => i.index === ideaIndex);
    
    if (idea) {
      // Extract Key Strengths from idea summary
      if (idea.summary) {
        const summaryLines = idea.summary.split(/[\.;]/).filter(line => line.trim().length > 20);
        if (summaryLines.length > 0) {
          metrics.keyStrengths = summaryLines[0].trim().substring(0, 80);
        }
      }
      // Also try to get from "Why it fits" section
      if (idea.whyItFits && metrics.keyStrengths === "N/A") {
        metrics.keyStrengths = idea.whyItFits.substring(0, 80);
      }
    }

    // Extract Financial data using buildFinancialSnapshots
    const financialSection = sections['financial outlook'] || sections['financial'] || '';
    if (financialSection) {
      const financialSnapshots = buildFinancialSnapshots(
        financialSection, 
        idea?.title || '', 
        run.inputs?.budget_range || ''
      );
      
      // Extract startup cost
      const startupCostEntry = financialSnapshots.find(e => 
        e.focus?.toLowerCase().includes('startup') || 
        e.focus?.toLowerCase().includes('investment')
      );
      if (startupCostEntry && startupCostEntry.metric) {
        metrics.startupCost = startupCostEntry.metric;
      }
      
      // Extract monthly revenue
      const revenueEntry = financialSnapshots.find(e => 
        e.focus?.toLowerCase().includes('revenue') || 
        e.focus?.toLowerCase().includes('profit')
      );
      if (revenueEntry && revenueEntry.metric) {
        metrics.monthlyRevenue = revenueEntry.metric;
      }
    }

    // Extract Market Size from financial section or search text
    const marketMatch = reportsStr.match(/(?:market\s+size|market\s+opportunity|TAM)[:\-]?\s*(.+?)(?:\n|$)/i);
    if (marketMatch) {
      const marketText = marketMatch[1].trim();
      // Try to extract currency
      const currencyMatch = marketText.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
      if (currencyMatch) {
        metrics.marketSize = currencyMatch[0];
      } else {
        metrics.marketSize = marketText.substring(0, 50);
      }
    }

    // Extract Competition Level
    const competitionMatch = reportsStr.match(/(?:competition\s+level|competitive\s+landscape|competition)[:\-]?\s*(low|medium|high|intense|moderate)/i);
    if (competitionMatch) {
      metrics.competitionLevel = competitionMatch[1].charAt(0).toUpperCase() + competitionMatch[1].slice(1);
    }

    // Extract Risk Level from Risk Radar using parseRiskRows
    const riskSection = sections['risk radar'] || sections['risk'] || '';
    if (riskSection) {
      const riskRows = parseRiskRows(riskSection);
      if (riskRows && riskRows.length > 0) {
        // Get the highest severity risk or first risk's severity
        const highRisk = riskRows.find(r => r.severity === 'HIGH');
        const mediumRisk = riskRows.find(r => r.severity === 'MEDIUM');
        if (highRisk) {
          metrics.riskLevel = 'High';
        } else if (mediumRisk) {
          metrics.riskLevel = 'Medium';
        } else if (riskRows[0]) {
          metrics.riskLevel = riskRows[0].severity.charAt(0) + riskRows[0].severity.slice(1).toLowerCase();
        }
      }
    }

    // Extract Time to Market
    const timeMatch = reportsStr.match(/(?:time\s+to\s+market|launch\s+timeline|time\s+to\s+launch)[:\-]?\s*(\d+\s*(?:weeks?|months?|days?))/i);
    if (timeMatch) {
      metrics.timeToMarket = timeMatch[1];
    }

    // Extract Customer Segment from Customer Persona
    const personaSection = sections['customer persona'] || sections['persona'] || '';
    if (personaSection) {
      const segmentMatch = personaSection.match(/(?:target\s+audience|primary\s+customer|customer\s+segment|primary)[:\-]?\s*([^\n]+)/i);
      if (segmentMatch) {
        metrics.customerSegment = segmentMatch[1].trim().substring(0, 50);
      }
    }

    // Extract Scalability potential
    const scalabilityMatch = reportsStr.match(/(?:scalability|scalable|growth\s+potential)[:\-]?\s*(high|medium|low|excellent|good)/i);
    if (scalabilityMatch) {
      metrics.scalability = scalabilityMatch[1].charAt(0).toUpperCase() + scalabilityMatch[1].slice(1);
    }

    return metrics;
  };

  // Reusable function to perform comparison
  const performComparison = useCallback(async (ideasToCompare) => {
    if (!ideasToCompare || ideasToCompare.length === 0) {
      return;
    }

    if (ideasToCompare.length > 5) {
      alert("Maximum 5 ideas can be compared at once");
      return;
    }

    setComparing(true);
    try {
      // Get selected ideas data
      const selectedIdeasData = allIdeas.filter(idea => ideasToCompare.has(idea.id));
      
      // Group by run_id to fetch full run data
      const runIds = [...new Set(selectedIdeasData.map(idea => idea.runId))];
      
      const response = await fetch("/api/user/compare-sessions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          run_ids: runIds,
          validation_ids: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Extract ONLY the selected ideas from the comparison data
          const ideasComparison = {
            ideas: selectedIdeasData.map(idea => {
              const run = data.comparison.runs?.find(r => r.run_id === idea.runId);
              if (run && run.reports?.personalized_recommendations) {
                const topIdeas = parseTopIdeas(run.reports.personalized_recommendations, 3);
                // Find the specific idea by matching both runId and ideaIndex
                const matchedIdea = topIdeas.find(i => 
                  i.index === idea.ideaIndex && idea.runId === run.run_id
                );
                if (matchedIdea) {
                  // Extract comparison metrics
                  const metrics = extractComparisonMetrics(run, idea.ideaIndex);
                  return {
                    ...idea,
                    fullData: matchedIdea,
                    runInputs: run.inputs,
                    runCreatedAt: run.created_at,
                    metrics: metrics,
                  };
                }
              }
              // Return the idea as-is if we can't find full data
              const metrics = run ? extractComparisonMetrics(run, idea.ideaIndex) : {};
              return {
                ...idea,
                runInputs: idea.runInputs || {},
                runCreatedAt: idea.runCreatedAt,
                metrics: metrics,
              };
            }).filter(idea => idea !== null), // Filter out any null entries
          };
          // Ensure we only have the exact number of selected ideas
          if (ideasComparison.ideas.length !== selectedIdeasData.length) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Expected ${selectedIdeasData.length} ideas but got ${ideasComparison.ideas.length}`);
            }
          }
          setComparisonData(ideasComparison);
        } else {
          alert(data.error || "Failed to compare ideas. Please try again.");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(errorData.error || "Failed to compare ideas. Please try again.");
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to compare ideas:", error);
      }
      alert("Network error. Please check your connection and try again.");
    } finally {
      setComparing(false);
    }
  }, [allIdeas, getAuthHeaders]);

  // Auto-trigger comparison when navigating to compare tab with pre-selected ideas
  useEffect(() => {
    if (mainTab === "compare" && selectedIdeas.size > 0 && !comparisonData && !comparing && autoCompareTrigger) {
      performComparison(selectedIdeas);
      setAutoCompareTrigger(false); // Reset the trigger
    }
  }, [mainTab, selectedIdeas, comparisonData, comparing, autoCompareTrigger, performComparison]);

  const handleDelete = async (session) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      // Handle validation deletion
      if (session.is_validation && session.from_api && session.validation_id) {
        // Note: Validation delete endpoint not yet implemented
        // For now, just remove from local state
        setApiValidations(prev => prev.filter(v => v.validation_id !== session.validation_id));
        // Reload dashboard data to refresh the list
        await loadDashboardData();
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
            // Reload dashboard data to refresh the list
            await loadDashboardData();
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

  // Removed loadApiValidations - now handled by loadDashboardData to avoid duplicate API calls

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
  // If user is authenticated and API has loaded, only show API data (ignore localStorage)
  const allRuns = useMemo(() => {
    // If authenticated and API has loaded, only use API data
    if (isAuthenticated && !loadingRuns) {
      const apiRunsList = apiRuns.map(apiRun => ({
        id: `run_${apiRun.run_id}`,
        timestamp: apiRun.created_at ? new Date(apiRun.created_at).getTime() : Date.now(),
        inputs: apiRun.inputs || {},
        outputs: {},
        run_id: apiRun.run_id,
        from_api: true,
        is_validation: false,
      }));
      
      // Ensure all runs are explicitly marked as not validations
      apiRunsList.forEach(run => {
        if (run.is_validation === undefined) {
          run.is_validation = false;
        }
      });
      
      return apiRunsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    
    // For unauthenticated users or while loading, merge localStorage with API
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
          is_validation: false, // Explicitly mark as not a validation
        });
      }
    });
    
    // Ensure all runs are explicitly marked as not validations
    merged.forEach(run => {
      if (run.is_validation === undefined) {
        run.is_validation = false;
      }
    });
    
    // Sort by timestamp, newest first
    return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [runs, apiRuns, isAuthenticated, loadingRuns]);

  // Format validations for display - combine API and localStorage validations
  // If user is authenticated and API has loaded, only show API data (ignore localStorage)
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

    // If authenticated and API has loaded, only use API data (ignore localStorage completely)
    if (isAuthenticated && !loadingRuns) {
      // Always clear localStorage validations when authenticated - API is source of truth
      localStorage.removeItem("sia_validations");
      localStorage.removeItem("revalidate_data");
      return apiVals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // For unauthenticated users or while loading, merge localStorage with API
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
  }, [apiValidations, getSavedValidations, isAuthenticated, loadingRuns]);

  // Combine runs and validations, sorted by timestamp
  const allSessions = useMemo(() => {
    const combined = [
      ...allRuns.map(r => ({ ...r, is_validation: false })),
      ...allValidations,
    ];
    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [allRuns, allValidations]);

  // Filter and sort ideas (for search)
  const filteredIdeas = useMemo(() => {
    let filtered = [...allIdeas];
    
    // Advanced search filters
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(idea => {
        const title = idea.title?.toLowerCase() || "";
        const summary = idea.summary?.toLowerCase() || "";
        const goalType = idea.runInputs?.goal_type?.toLowerCase() || "";
        const interestArea = idea.runInputs?.interest_area?.toLowerCase() || "";
        const subInterest = idea.runInputs?.sub_interest_area?.toLowerCase() || "";
        const runId = idea.runId?.toLowerCase() || "";
        
        // Check if any query part matches
        const queryParts = query.split(/\s+/).filter(p => p.length > 0);
        return queryParts.some(part => 
          title.includes(part) || 
          summary.includes(part) ||
          goalType.includes(part) || 
          interestArea.includes(part) || 
          subInterest.includes(part) || 
          runId.includes(part)
        );
      });
    }
    
    // Advanced field filters
    if (advancedSearch.goalType && advancedSearch.goalType !== "all") {
      filtered = filtered.filter(idea => 
        idea.runInputs?.goal_type === advancedSearch.goalType
      );
    }
    
    if (advancedSearch.interestArea && advancedSearch.interestArea !== "all") {
      filtered = filtered.filter(idea => 
        idea.runInputs?.interest_area === advancedSearch.interestArea ||
        idea.runInputs?.sub_interest_area === advancedSearch.interestArea
      );
    }
    
    if (advancedSearch.budgetRange !== "all") {
      filtered = filtered.filter(idea => 
        idea.runInputs?.budget_range === advancedSearch.budgetRange
      );
    }
    
    if (advancedSearch.timeCommitment !== "all") {
      filtered = filtered.filter(idea => 
        idea.runInputs?.time_commitment === advancedSearch.timeCommitment
      );
    }
    
    
    // Date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const filterMap = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        "3months": 90 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - filterMap[dateFilter];
      filtered = filtered.filter(idea => {
        const ideaDate = idea.runCreatedAt ? new Date(idea.runCreatedAt).getTime() : 0;
        return ideaDate >= cutoff;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          const aName = a.title || "";
          const bName = b.title || "";
          return aName.localeCompare(bName);
        case "date":
        default:
          const aDate = a.runCreatedAt ? new Date(a.runCreatedAt).getTime() : 0;
          const bDate = b.runCreatedAt ? new Date(b.runCreatedAt).getTime() : 0;
          return bDate - aDate;
      }
    });
    
    return filtered;
  }, [allIdeas, searchQuery, dateFilter, sortBy, advancedSearch]);

  // Filter and sort sessions (for My Sessions tab only)
  const filteredRuns = useMemo(() => {
    // Filter out validations - check multiple conditions to be safe
    let filtered = allRuns.filter(s => {
      // Explicitly exclude validations
      if (s.is_validation === true) return false;
      // If it has validation_id, it's a validation
      if (s.validation_id) return false;
      // If it has overall_score but no run_id, it might be a validation
      if (s.overall_score !== undefined && !s.run_id) return false;
      // If it has idea_explanation but no inputs, it might be a validation
      if (s.idea_explanation && !s.inputs) return false;
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          // For runs, we don't have scores, so sort by date
          return (b.timestamp || 0) - (a.timestamp || 0);
        case "name":
          const aName = a.inputs?.goal_type || "";
          const bName = b.inputs?.goal_type || "";
          return aName.localeCompare(bName);
        case "date":
        default:
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });
    
    return filtered;
  }, [allRuns, sortBy]);

  const filteredValidations = useMemo(() => {
    let filtered = [...allValidations];
    
    // Advanced search filters
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const queryParts = query.split(/\s+/).filter(p => p.length > 0);
      filtered = filtered.filter(session => {
        const idea = session.idea_explanation?.toLowerCase() || "";
        const valId = session.validation_id?.toLowerCase() || session.id?.toLowerCase() || "";
        return queryParts.some(part => idea.includes(part) || valId.includes(part));
      });
    }
    
    if (advancedSearch.ideaDescription) {
      const ideaDesc = advancedSearch.ideaDescription.toLowerCase();
      filtered = filtered.filter(s => 
        s.idea_explanation?.toLowerCase().includes(ideaDesc)
      );
    }
    
    // Date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const filterMap = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        "3months": 90 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - filterMap[dateFilter];
      filtered = filtered.filter(s => (s.timestamp || 0) >= cutoff);
    }
    
    // Score filter
    if (scoreFilter !== "all") {
      filtered = filtered.filter(s => {
        const score = s.overall_score;
        if (score === undefined || score === null) return false;
        switch (scoreFilter) {
          case "high":
            return score >= 7;
          case "medium":
            return score >= 5 && score < 7;
          case "low":
            return score < 5;
          default:
            return true;
        }
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          const aScore = a.overall_score ?? 0;
          const bScore = b.overall_score ?? 0;
          return bScore - aScore;
        case "name":
          const aName = a.idea_explanation || "";
          const bName = b.idea_explanation || "";
          return aName.localeCompare(bName);
        case "date":
        default:
          return (b.timestamp || 0) - (a.timestamp || 0);
      }
    });
    
    return filtered;
  }, [allValidations, searchQuery, dateFilter, scoreFilter, sortBy, advancedSearch]);

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
                ? `Welcome back, ${user.email.split("@")[0]}! Ready to validate your next big idea? 💡`
                : "Manage your startup idea validations and discoveries."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/dashboard/analytics"
              className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 whitespace-nowrap"
            >
              📊 Analytics
            </Link>
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
            <button
              onClick={() => setMainTab("search")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "search"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setMainTab("compare")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "compare"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Compare
            </button>
          </nav>
      </div>

        {/* Tab 1: Active Ideas */}
        {mainTab === "active-ideas" && (
          <DashboardActiveIdeasTab
            actions={actions}
            notes={notes}
            loadingActions={loadingActions}
            loadingNotes={loadingNotes}
            allRuns={allRuns}
            allValidations={allValidations}
          />
        )}

        {/* Tab 2: My Sessions */}
        {mainTab === "sessions" && (
          <DashboardSessionsTab
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filteredRuns={filteredRuns}
            filteredValidations={filteredValidations}
            loadingRuns={loadingRuns}
            sessionHasOpenActions={sessionHasOpenActions}
            sessionHasNotes={sessionHasNotes}
            handleDelete={handleDelete}
            handleNewRequest={handleNewRequest}
          />
        )}

        {/* Tab 3: Search */}
        {mainTab === "search" && (
          <DashboardSearchTab
            advancedSearch={advancedSearch}
            setAdvancedSearch={setAdvancedSearch}
            searchPerformed={searchPerformed}
            setSearchPerformed={setSearchPerformed}
            selectedSearchIdeas={selectedSearchIdeas}
            setSelectedSearchIdeas={setSelectedSearchIdeas}
            filteredIdeas={filteredIdeas}
            filteredValidations={filteredValidations}
            allIdeas={allIdeas}
            allValidations={allValidations}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            scoreFilter={scoreFilter}
            setScoreFilter={setScoreFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            setMainTab={setMainTab}
            setSelectedIdeas={setSelectedIdeas}
            setComparisonData={setComparisonData}
            setAutoCompareTrigger={setAutoCompareTrigger}
            performComparison={performComparison}
          />
        )}

        {/* Tab 4: Compare */}
        {mainTab === "compare" && (
          <DashboardCompareTab
            allIdeas={allIdeas}
            selectedIdeas={selectedIdeas}
            setSelectedIdeas={setSelectedIdeas}
            comparisonData={comparisonData}
            setComparisonData={setComparisonData}
            comparing={comparing}
            performComparison={performComparison}
          />
        )}
      </section>
    </div>
  );
}
