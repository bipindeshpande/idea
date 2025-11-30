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
      // Clear localStorage validations immediately when loading API data for authenticated users
      if (isAuthenticated) {
        localStorage.removeItem("sia_validations");
        localStorage.removeItem("revalidate_data");
      }
      
      const response = await fetch("/api/user/activity", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setApiRuns(data.activity?.runs || []);
        const apiValidations = data.activity?.validations || [];
        setApiValidations(apiValidations);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to load API runs:", error);
      }
    } finally {
      setLoadingRuns(false);
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
      // Only call loadApiRuns once - it loads both runs and validations
      loadApiRuns();
      loadActions();
      loadNotes();
    } else {
      setLoadingRuns(false);
    }
  }, [isAuthenticated, loadApiRuns, loadActions, loadNotes]);

  // Extract all ideas from runs when apiRuns changes
  useEffect(() => {
    const extractIdeas = async () => {
      const ideasList = [];
      const seenIds = new Set(); // Track unique idea IDs to prevent duplicates
      
      // Process apiRuns - fetch full run data if reports are missing
      for (const run of apiRuns) {
        let reports = run.reports;
        
        // If reports are missing, fetch full run data
        if (!reports?.personalized_recommendations && run.run_id) {
          try {
            const response = await fetch(`/api/user/run/${run.run_id}`, {
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.run?.reports) {
                try {
                  reports = typeof data.run.reports === 'string' 
                    ? JSON.parse(data.run.reports) 
                    : data.run.reports;
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
          <div className="space-y-6">
            {/* Ideas Active Projects */}
            {(() => {
              // Get ideas with non-completed actions
              const ideaActions = actions.filter((a) => {
                if (a.status === "completed") return false;
                if (!a.idea_id) return false;
                // Match run_<runId>_idea_<number> or idea_<number> or run_<runId>
                return a.idea_id.match(/run_([^_]+)_idea_(\d+)/) || 
                       a.idea_id.match(/idea_(\d+)/) ||
                       (a.idea_id.match(/run_([^_]+)/) && !a.idea_id.match(/val_/));
              });
              
              // Get ideas with notes
              const ideaNotes = notes.filter((n) => {
                if (!n.idea_id) return false;
                // Match run_<runId>_idea_<number> or idea_<number> or run_<runId>
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
              
              return activeIdeas.length > 0 ? (
          <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">💡 Active Ideas ({activeIdeas.length})</h3>
                  {loadingActions || loadingNotes ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">Loading...</p>
                  ) : (
                    <div className="space-y-2.5">
                      {activeIdeas.slice(0, 10).map((item) => {
                        // Extract project name and navigation info from idea_id
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
                            // Use the actual run_id from the run object if available, otherwise use extracted runId
                            const actualRunId = run?.run_id || run?.id || runId;
                            ideaLink = `/results/recommendations/${ideaIndex}?id=${actualRunId}`;
                          } else {
                            const ideaMatch = ideaId.match(/idea_(\d+)/);
                            if (ideaMatch) {
                              ideaIndex = ideaMatch[1];
                              projectName = `Idea #${ideaIndex}`;
                              // Try to find the run from allRuns by checking if ideaId contains the run info
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
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No active ideas with action items or notes yet.</p>
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
              // Get validations with non-completed actions
              const validationActions = actions.filter((a) => {
                if (a.status === "completed") return false;
                if (!a.idea_id) return false;
                // Match val_<validation_id>
                return a.idea_id.match(/val_(.+)/);
              });
              
              // Get validations with notes
              const validationNotes = notes.filter((n) => {
                if (!n.idea_id) return false;
                // Match val_<validation_id>
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
              
              return activeValidations.length > 0 ? (
                <div>
                  <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">✅ Active Validations ({activeValidations.length})</h3>
                  {loadingActions || loadingNotes ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">Loading...</p>
                  ) : (
                    <div className="space-y-2.5">
                      {activeValidations.slice(0, 10).map((item) => {
                        // Extract project name from idea_id
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
                            validationLink = `/validation/${validationId}`;
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
              ) : null;
            })()}
      </div>
        )}

        {/* Tab 2: My Sessions */}
        {mainTab === "sessions" && (
          <>
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Manage your idea discovery runs and validations - revisit previous recommendations or generate new ones.
          </p>
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
              Ideas Search ({filteredRuns.length})
            </button>
            <button
              onClick={() => setActiveTab("validations")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "validations"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Validations ({filteredValidations.length})
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
                {filteredRuns.length === 0 ? (
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
                    {filteredRuns.map((session) => {
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
                {filteredValidations.length === 0 ? (
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
                    {filteredValidations.map((session) => {
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
                              to={`/validate-idea?edit=${session.validation_id}`}
                              className="rounded-lg border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-900/20 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-all duration-200 hover:border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:-translate-y-0.5 whitespace-nowrap"
                            >
                              Edit
                            </Link>
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

        {/* Tab 3: Search */}
        {mainTab === "search" && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Advanced Search</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Use multiple search criteria and filters to find exactly what you're looking for.
              </p>
            </div>

            {/* Advanced Search Form - Hide when search performed */}
            {!searchPerformed && (
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
              <div className="space-y-4">
                {/* Search Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Search Type
                  </label>
                  <select
                    value={advancedSearch.searchType}
                    onChange={(e) => {
                      // Clear all fields when switching type
                      setAdvancedSearch({
                        goalType: "all",
                        interestArea: "all",
                        ideaDescription: "",
                        budgetRange: "all",
                        timeCommitment: "all",
                        workStyle: "all",
                        skillStrength: "all",
                        searchType: e.target.value,
                      });
                      setSearchQuery("");
                      setSearchInput("");
                    }}
                    className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                  >
                    <option value="ideas">Ideas</option>
                    <option value="validations">Validations</option>
                  </select>
                </div>

                {/* Search Fields Grid - Show different fields based on search type */}
                {advancedSearch.searchType === "ideas" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Goal Type - Dropdown */}
                    {(() => {
                      const goalTypeField = intakeScreen.fields.find(f => f.id === "goal_type");
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Goal Type
                          </label>
                          <select
                            value={advancedSearch.goalType}
                            onChange={(e) => setAdvancedSearch({...advancedSearch, goalType: e.target.value})}
                            className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                          >
                            <option value="all">All Goal Types</option>
                            {goalTypeField?.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* Interest Area - Dropdown */}
                    {(() => {
                      const interestAreaField = intakeScreen.fields.find(f => f.id === "interest_area");
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Interest Area
                          </label>
                          <select
                            value={advancedSearch.interestArea}
                            onChange={(e) => setAdvancedSearch({...advancedSearch, interestArea: e.target.value})}
                            className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                          >
                            <option value="all">All Interest Areas</option>
                            {interestAreaField?.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* Budget Range - Merged from Additional Filters */}
                    {(() => {
                      const budgetField = intakeScreen.fields.find(f => f.id === "budget_range");
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Budget Range
                          </label>
                          <select
                            value={advancedSearch.budgetRange}
                            onChange={(e) => setAdvancedSearch({...advancedSearch, budgetRange: e.target.value})}
                            className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                          >
                            <option value="all">All Budgets</option>
                            {budgetField?.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* Time Commitment - Merged from Additional Filters */}
                    {(() => {
                      const timeField = intakeScreen.fields.find(f => f.id === "time_commitment");
                      return (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Time Commitment
                          </label>
                          <select
                            value={advancedSearch.timeCommitment}
                            onChange={(e) => setAdvancedSearch({...advancedSearch, timeCommitment: e.target.value})}
                            className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                          >
                            <option value="all">All Time</option>
                            {timeField?.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Validation Score Range - for validations */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Validation Score Range
                      </label>
                      <select
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value)}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      >
                        <option value="all">All Scores</option>
                        <option value="high">High (≥7.0)</option>
                        <option value="medium">Medium (5.0-6.9)</option>
                        <option value="low">Low (&lt;5.0)</option>
                      </select>
                    </div>
                  </div>
                )}


                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      // Build search query from advanced fields
                      const queryParts = [];
                      if (advancedSearch.goalType && advancedSearch.goalType !== "all") queryParts.push(advancedSearch.goalType);
                      if (advancedSearch.interestArea && advancedSearch.interestArea !== "all") queryParts.push(advancedSearch.interestArea);
                      if (advancedSearch.ideaDescription) queryParts.push(advancedSearch.ideaDescription);
                      setSearchQuery(queryParts.join(" ").trim() || " ");
                      setSearchInput(queryParts.join(" ").trim());
                      setSearchPerformed(true); // Mark that search has been performed
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setAdvancedSearch({
                        goalType: "all",
                        interestArea: "all",
                        ideaDescription: "",
                        budgetRange: "all",
                        timeCommitment: "all",
                        workStyle: "all",
                        skillStrength: "all",
                        searchType: "ideas",
                      });
                      setSearchInput("");
                      setSearchQuery("");
                      setDateFilter("all");
                      setScoreFilter("all");
                      setSortBy("date");
                      setSearchPerformed(false);
                      setSelectedSearchIdeas(new Set());
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Results Count and Compare Button - Only show when search performed */}
            {searchPerformed && (
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {advancedSearch.searchType === "ideas" && (
                    <>Showing {filteredIdeas.length} of {allIdeas.length} ideas</>
                  )}
                  {advancedSearch.searchType === "validations" && (
                    <>Showing {filteredValidations.length} of {allValidations.length} validations</>
                  )}
                </div>
                {advancedSearch.searchType === "ideas" && filteredIdeas.length > 0 && selectedSearchIdeas.size > 0 && (
                  <button
                    onClick={async () => {
                      // Navigate to compare tab with selected ideas
                      const selectedIdeasData = filteredIdeas.filter(idea => selectedSearchIdeas.has(idea.id));
                      const selectedIds = new Set(selectedIdeasData.map(idea => idea.id));
                      
                      // Set selected ideas in compare tab state
                      setSelectedIdeas(selectedIds);
                      setComparisonData(null); // Clear any previous comparison
                      setAutoCompareTrigger(true); // Set flag to trigger auto-comparison
                      setMainTab("compare");
                      
                      // Perform comparison immediately
                      await performComparison(selectedIds);
                    }}
                    className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30"
                  >
                    Compare {selectedSearchIdeas.size} Idea{selectedSearchIdeas.size !== 1 ? "s" : ""}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSearchPerformed(false);
                    setSelectedSearchIdeas(new Set());
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  New Search
                </button>
              </div>
            )}

            {/* Show results only when search has been performed */}
            {searchPerformed ? (
              <div className="space-y-4">
                {/* Ideas Results - Only show if searchType is ideas */}
                {advancedSearch.searchType === "ideas" && filteredIdeas.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50 mb-3">Ideas ({filteredIdeas.length})</h4>
                    <div className="space-y-2.5">
                      {filteredIdeas.map((idea) => {
                        const runId = idea.runId;
                        const ideaIndex = idea.ideaIndex;
                        const isSelected = selectedSearchIdeas.has(idea.id);
                        return (
                          <div
                            key={idea.id}
                            className={`rounded-lg border ${
                              isSelected
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            } p-3 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const newSet = new Set(selectedSearchIdeas);
                                  if (newSet.has(idea.id)) {
                                    newSet.delete(idea.id);
                                  } else {
                                    if (newSet.size >= 5) {
                                      alert("Maximum 5 ideas can be compared at once");
                                      return;
                                    }
                                    newSet.add(idea.id);
                                  }
                                  setSelectedSearchIdeas(newSet);
                                }}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                              />
                              <Link
                                to={`/results/recommendations/${ideaIndex}?id=${runId}`}
                                className="flex-1"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                                      {idea.title}
                                    </h5>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : ""}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                                    {idea.summary}
                                  </p>
                                  {idea.runInputs && Object.keys(idea.runInputs).length > 0 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Goal: {idea.runInputs.goal_type || "Not set"} • Area: {idea.runInputs.sub_interest_area || idea.runInputs.interest_area || "Not set"}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Validations Results - Only show if searchType is validations */}
                {advancedSearch.searchType === "validations" && filteredValidations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50 mb-3">Validations ({filteredValidations.length})</h4>
                    <div className="space-y-2.5">
                      {filteredValidations.map((session) => (
                        <Link
                          key={session.id || session.validation_id || session.timestamp}
                          to={`/validate-result?id=${session.validation_id || session.id}`}
                          className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">
                                {session.idea_explanation && session.idea_explanation.length > 60
                                  ? session.idea_explanation.substring(0, 60) + "..."
                                  : session.idea_explanation || "Validation"}
                              </h5>
                              <div className="flex items-center gap-2 mt-2">
                                {session.overall_score !== undefined && (
                                  <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                                    Score: {session.overall_score.toFixed(1)}/10
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ID: {session.validation_id || session.id || "N/A"} • {session.timestamp ? new Date(session.timestamp).toLocaleDateString() : "Unknown date"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {((advancedSearch.searchType === "ideas" && filteredIdeas.length === 0) ||
                  (advancedSearch.searchType === "validations" && filteredValidations.length === 0)) && (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      {advancedSearch.searchType === "ideas" ? "No ideas found matching your search criteria." : "No validations found matching your search criteria."}
                    </p>
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                      setDateFilter("all");
                      setScoreFilter("all");
                      setSortBy("date");
                      setSearchPerformed(false);
                      setSelectedSearchIdeas(new Set());
                    }}
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Clear Filters
                  </button>
                  </div>
                )}
              </div>
            ) : !searchPerformed && (
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Start Your Search</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  Enter a search term above to find your ideas and validations.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use the filters below to find specific ideas that match your criteria.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Compare */}
        {mainTab === "compare" && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Compare Ideas</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Select up to 5 ideas to compare side-by-side. Compare different ideas from your discovery sessions to see their differences and similarities.
              </p>
            </div>

            {!comparisonData ? (
              <div className="space-y-6">
                {/* Ideas List */}
                <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Select Ideas to Compare</h4>
                  </div>
                  {allIdeas.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No ideas found. Create some idea discovery sessions first.</p>
                  ) : (
                    <div className="space-y-2">
                      {allIdeas.map((idea) => {
                        const isSelected = selectedIdeas.has(idea.id);
                        return (
                          <label
                            key={idea.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                const newSet = new Set(selectedIdeas);
                                if (newSet.has(idea.id)) {
                                  newSet.delete(idea.id);
                                } else {
                                  if (newSet.size >= 5) {
                                    alert("Maximum 5 ideas can be compared at once");
                                    return;
                                  }
                                  newSet.add(idea.id);
                                }
                                setSelectedIdeas(newSet);
                              }}
                              onClick={(e) => e.stopPropagation()} // Prevent label click from triggering twice
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {idea.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {idea.summary}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : "Unknown date"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>


                {/* Compare Button */}
                <div className="flex justify-center">
                  <button
                    onClick={async () => {
                      if (selectedIdeas.size === 0) {
                        alert("Please select at least one idea to compare");
                        return;
                      }

                      if (selectedIdeas.size > 5) {
                        alert("Maximum 5 ideas can be compared at once");
                        return;
                      }

                      await performComparison(selectedIdeas);
                    }}
                    disabled={comparing || selectedIdeas.size === 0}
                    className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparing ? "Comparing..." : `Compare ${selectedIdeas.size} Idea${selectedIdeas.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Comparison Results</h4>
                  <button
                    onClick={() => {
                      setComparisonData(null);
                      setSelectedIdeas(new Set());
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Compare Different Ideas
                  </button>
                </div>

                {/* Ideas Comparison Table - 10 Result-Focused Parameters */}
                {comparisonData && comparisonData.ideas && comparisonData.ideas.length > 0 && (() => {
                  // Define all comparison rows with their data extraction logic
                  const comparisonRows = [
                    {
                      label: "1. Summary",
                      getValue: (idea) => idea.summary || idea.fullData?.summary || "N/A",
                      bgClass: "",
                    },
                    {
                      label: "2. Startup Cost",
                      getValue: (idea) => idea.metrics?.startupCost || "N/A",
                      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
                    },
                    {
                      label: "3. Monthly Revenue Potential",
                      getValue: (idea) => idea.metrics?.monthlyRevenue || "N/A",
                      bgClass: "",
                    },
                    {
                      label: "4. Market Size",
                      getValue: (idea) => idea.metrics?.marketSize || "N/A",
                      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
                    },
                    {
                      label: "5. Competition Level",
                      getValue: (idea) => idea.metrics?.competitionLevel || "N/A",
                      bgClass: "",
                      isBadge: true,
                    },
                    {
                      label: "6. Risk Level",
                      getValue: (idea) => idea.metrics?.riskLevel || "N/A",
                      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
                      isBadge: true,
                    },
                    {
                      label: "7. Time to Market",
                      getValue: (idea) => idea.metrics?.timeToMarket || "N/A",
                      bgClass: "",
                    },
                    {
                      label: "8. Target Customer Segment",
                      getValue: (idea) => idea.metrics?.customerSegment || "N/A",
                      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
                    },
                    {
                      label: "9. Key Strengths",
                      getValue: (idea) => idea.metrics?.keyStrengths || idea.summary?.substring(0, 80) || "N/A",
                      bgClass: "",
                    },
                    {
                      label: "10. Scalability Potential",
                      getValue: (idea) => idea.metrics?.scalability || "N/A",
                      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
                      isBadge: true,
                    },
                  ];

                  // Filter rows to only show those where at least one idea has non-N/A data
                  const visibleRows = comparisonRows.filter(row => {
                    return comparisonData.ideas.some(idea => {
                      const value = row.getValue(idea);
                      return value && value !== "N/A" && value.trim() !== "";
                    });
                  });

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Parameter</th>
                            {comparisonData.ideas.map((idea, idx) => (
                              <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                                <div className="font-bold">{idea.title || `Idea ${idx + 1}`}</div>
                                <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
                                  {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : ""}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className={`border-b border-slate-100 dark:border-slate-800 ${row.bgClass}`}>
                              <td className={`px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-50 sticky left-0 ${row.bgClass || "bg-white dark:bg-slate-800"} z-10`}>
                                {row.label}
                              </td>
                              {comparisonData.ideas.map((idea, idx) => {
                                const value = row.getValue(idea);
                                return (
                                  <td key={idx} className={`px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${row.label.includes("Revenue") ? "font-semibold text-green-600 dark:text-green-400" : row.label.includes("Startup Cost") ? "font-semibold" : ""} ${row.label.includes("Summary") ? "max-w-md" : ""}`}>
                                    {row.isBadge ? (
                                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                        value === "Low" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        value === "Medium" || value === "Moderate" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                        value === "High" || value === "Intense" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                        value === "Excellent" || value === "Good" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                      }`}>
                                        {value}
                                      </span>
                                    ) : (
                                      value
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

