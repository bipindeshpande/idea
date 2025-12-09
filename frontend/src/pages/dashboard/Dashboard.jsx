import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const [activeTab, setActiveTab] = useState("ideas"); // "ideas" or "validations" (for My Workspace sub-tabs)
  const [mainTab, setMainTab] = useState("workspace"); // "workspace" or "explore" (for main dashboard tabs)
  const { deleteRun, setInputs } = useReports();
  const { user, isAuthenticated, subscription, getAuthHeaders } = useAuth();
  const { getSavedValidations } = useValidation();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [psychologyEmpty, setPsychologyEmpty] = useState(false); // Track if psychology profile is empty

  // ... existing loadRuns, useEffect, loadDashboardData, and other functions remain the same ...
  
  // Keep all the existing helper functions and data processing logic
  // (loadRuns, loadDashboardData, extractIdeas, extractComparisonMetrics, performComparison, etc.)
  // ... (keeping all existing logic from lines 63-1023)

  const loadRuns = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter(run => {
          return !run.validation_id && run.overall_score === undefined;
        });
        setRuns(filtered);
      } catch (error) {
        console.error("Failed to parse saved runs", error);
      }
    }
  };

  // Load psychology data to check if empty
  const checkPsychology = useCallback(async () => {
    if (!isAuthenticated) {
      setPsychologyEmpty(false);
      return;
    }

    try {
      const response = await fetch("/api/founder/psychology", {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Response structure: {success: true, data: {...psychology fields...}}
        const psychology = (data.success && data.data) ? data.data : {};
        
        // Check if psychology is actually empty
        // Profile is considered complete if archetype exists and is not empty
        const archetype = psychology.archetype;
        const hasArchetype = archetype && String(archetype).trim() !== "";
        
        const isEmpty = !hasArchetype;
        setPsychologyEmpty(isEmpty);
        
        // Debug logging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Psychology check:', { 
            hasArchetype, 
            isEmpty, 
            archetype: archetype,
            psychology: psychology,
            keys: Object.keys(psychology),
            fullResponse: data
          });
        }
      } else if (response.status === 401) {
        // Auth failed - don't show banner
        setPsychologyEmpty(false);
      } else {
        // Other error - assume empty to show banner
        setPsychologyEmpty(true);
      }
    } catch (error) {
      console.error("Error checking psychology:", error);
      setPsychologyEmpty(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    checkPsychology();
    
    // Re-check when component gains focus (user navigates back)
    const handleFocus = () => {
      if (isAuthenticated) {
        // Small delay to ensure backend has processed the save
        setTimeout(() => checkPsychology(), 100);
      }
    };
    
    // Re-check when location changes (user navigates back from psychology page)
    const handleLocationChange = () => {
      if (isAuthenticated && location.pathname === '/dashboard') {
        // Small delay to ensure backend has processed the save
        setTimeout(() => checkPsychology(), 200);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    handleLocationChange(); // Check immediately when location changes
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, checkPsychology, location.pathname]);

  // Consolidated dashboard data loader
  const loadDashboardData = useCallback(async () => {
    setLoadingRuns(true);
    setLoadingActions(true);
    setLoadingNotes(true);
    
    try {
      if (isAuthenticated) {
        localStorage.removeItem("sia_validations");
        localStorage.removeItem("revalidate_data");
      }
      
      const response = await fetch("/api/user/dashboard", {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApiRuns(data.activity?.runs || []);
          setApiValidations(data.activity?.validations || []);
          setActions(data.actions || []);
          setNotes(data.notes || []);
        }
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
    if (isAuthenticated) {
      localStorage.removeItem("sia_validations");
      localStorage.removeItem("revalidate_data");
    }
    
    loadRuns();
    if (isAuthenticated) {
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
      const seenIds = new Set();
      
      const runsNeedingReports = apiRuns.filter(
        run => !run.reports?.personalized_recommendations && run.run_id
      );
      
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
        
        await Promise.all(fetchPromises);
      }
      
      for (const run of apiRuns) {
        let reports = run.reports;
        
        if (!reports?.personalized_recommendations && run.run_id) {
          reports = reportsMap.get(run.run_id);
        }
        
        if (reports?.personalized_recommendations) {
          const topIdeas = parseTopIdeas(reports.personalized_recommendations, 3);
          topIdeas.forEach((idea) => {
            const ideaId = `${run.run_id}-${idea.index}`;
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
      
      if (!isAuthenticated || loadingRuns) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            parsed.forEach((run) => {
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

    const reportsStr = typeof personalizedRecs === 'string' ? personalizedRecs : JSON.stringify(personalizedRecs);
    const sections = splitFullReportSections(reportsStr);
    const topIdeas = parseTopIdeas(personalizedRecs, 3);
    const idea = topIdeas.find(i => i.index === ideaIndex);
    
    if (idea) {
      if (idea.summary) {
        const summaryLines = idea.summary.split(/[\.;]/).filter(line => line.trim().length > 20);
        if (summaryLines.length > 0) {
          metrics.keyStrengths = summaryLines[0].trim().substring(0, 80);
        }
      }
      if (idea.whyItFits && metrics.keyStrengths === "N/A") {
        metrics.keyStrengths = idea.whyItFits.substring(0, 80);
      }
    }

    const financialSection = sections['financial outlook'] || sections['financial'] || '';
    if (financialSection) {
      const financialSnapshots = buildFinancialSnapshots(
        financialSection, 
        idea?.title || '', 
        run.inputs?.budget_range || ''
      );
      
      const startupCostEntry = financialSnapshots.find(e => 
        e.focus?.toLowerCase().includes('startup') || 
        e.focus?.toLowerCase().includes('investment')
      );
      if (startupCostEntry && startupCostEntry.metric) {
        metrics.startupCost = startupCostEntry.metric;
      }
      
      const revenueEntry = financialSnapshots.find(e => 
        e.focus?.toLowerCase().includes('revenue') || 
        e.focus?.toLowerCase().includes('profit')
      );
      if (revenueEntry && revenueEntry.metric) {
        metrics.monthlyRevenue = revenueEntry.metric;
      }
    }

    const marketMatch = reportsStr.match(/(?:market\s+size|market\s+opportunity|TAM)[:\-]?\s*(.+?)(?:\n|$)/i);
    if (marketMatch) {
      const marketText = marketMatch[1].trim();
      const currencyMatch = marketText.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
      if (currencyMatch) {
        metrics.marketSize = currencyMatch[0];
      } else {
        metrics.marketSize = marketText.substring(0, 50);
      }
    }

    const competitionMatch = reportsStr.match(/(?:competition\s+level|competitive\s+landscape|competition)[:\-]?\s*(low|medium|high|intense|moderate)/i);
    if (competitionMatch) {
      metrics.competitionLevel = competitionMatch[1].charAt(0).toUpperCase() + competitionMatch[1].slice(1);
    }

    const riskSection = sections['risk radar'] || sections['risk'] || '';
    if (riskSection) {
      const riskRows = parseRiskRows(riskSection);
      if (riskRows && riskRows.length > 0) {
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

    const timeMatch = reportsStr.match(/(?:time\s+to\s+market|launch\s+timeline|time\s+to\s+launch)[:\-]?\s*(\d+\s*(?:weeks?|months?|days?))/i);
    if (timeMatch) {
      metrics.timeToMarket = timeMatch[1];
    }

    const personaSection = sections['customer persona'] || sections['persona'] || '';
    if (personaSection) {
      const segmentMatch = personaSection.match(/(?:target\s+audience|primary\s+customer|customer\s+segment|primary)[:\-]?\s*([^\n]+)/i);
      if (segmentMatch) {
        metrics.customerSegment = segmentMatch[1].trim().substring(0, 50);
      }
    }

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
      const selectedIdeasData = allIdeas.filter(idea => ideasToCompare.has(idea.id));
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
          const ideasComparison = {
            ideas: selectedIdeasData.map(idea => {
              const run = data.comparison.runs?.find(r => r.run_id === idea.runId);
              if (run && run.reports?.personalized_recommendations) {
                const topIdeas = parseTopIdeas(run.reports.personalized_recommendations, 3);
                const matchedIdea = topIdeas.find(i => 
                  i.index === idea.ideaIndex && idea.runId === run.run_id
                );
                if (matchedIdea) {
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
              const metrics = run ? extractComparisonMetrics(run, idea.ideaIndex) : {};
              return {
                ...idea,
                runInputs: idea.runInputs || {},
                runCreatedAt: idea.runCreatedAt,
                metrics: metrics,
              };
            }).filter(idea => idea !== null),
          };
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
    if (mainTab === "workspace" && activeTab === "compare" && selectedIdeas.size > 0 && !comparisonData && !comparing && autoCompareTrigger) {
      performComparison(selectedIdeas);
      setAutoCompareTrigger(false);
    }
  }, [mainTab, activeTab, selectedIdeas, comparisonData, comparing, autoCompareTrigger, performComparison]);

  const handleDelete = async (session) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      if (session.is_validation || session.validation_id) {
        const validationId = session.validation_id || session.id;
        const cleanId = validationId.toString().replace(/^val_/, '');
        
        try {
          const response = await fetch(`/api/validate-idea/${cleanId}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          
          const responseData = await response.json().catch(() => ({}));
          
          if (response.ok) {
            setApiValidations(prev => prev.filter(v => {
              const vId = v.validation_id || v.id;
              const vCleanId = vId?.toString().replace(/^val_/, '') || '';
              return vCleanId !== cleanId;
            }));
            await loadDashboardData();
          } else {
            console.error('❌ [Delete] Delete failed:', response.status, responseData);
            alert(responseData.error || `Failed to delete validation (${response.status}). Please try again.`);
          }
        } catch (error) {
          console.error("❌ [Delete] Exception while deleting validation:", error);
          alert("Failed to delete validation. Please try again.");
        }
        return;
      }
      
      if (session.from_api && session.run_id) {
        try {
          const response = await fetch(`/api/user/run/${session.run_id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            setApiRuns(prev => prev.filter(r => r.run_id !== session.run_id));
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
        deleteRun(session.id);
        loadRuns();
      }
    }
  };

  const handleNewRequest = async (run) => {
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

    if (run.inputs && Object.keys(run.inputs).length > 0) {
    setInputs(run.inputs);
      navigate("/advisor#intake-form");
    } else {
      navigate("/advisor#intake-form");
    }
  };

  const handleEditValidation = (validation) => {
    let validationId = null;
    
    if (validation.validation_id) {
      validationId = String(validation.validation_id);
    } else if (validation.id) {
      const id = String(validation.id);
      validationId = id.replace(/^val_/, '');
    }
    
    if (!validationId) {
      console.error('Cannot edit validation: no ID found', validation);
      alert('Unable to edit validation: ID not found');
      return;
    }
    
    const cleanId = validationId.replace(/^val_/, '');
    navigate(`/validate-idea?edit=${cleanId}`);
  };

  // Merge localStorage runs with API runs
  const allRuns = useMemo(() => {
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
      
      apiRunsList.forEach(run => {
        if (run.is_validation === undefined) {
          run.is_validation = false;
        }
      });
      
      return apiRunsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    
    const merged = [...runs];
    const existingIds = new Set(runs.map(r => r.id));
    
    apiRuns.forEach(apiRun => {
      const apiRunId = `run_${apiRun.run_id}`;
      if (!existingIds.has(apiRunId)) {
        merged.push({
          id: apiRunId,
          timestamp: apiRun.created_at ? new Date(apiRun.created_at).getTime() : Date.now(),
          inputs: apiRun.inputs || {},
          outputs: {},
          run_id: apiRun.run_id,
          from_api: true,
          is_validation: false,
        });
      }
    });
    
    merged.forEach(run => {
      if (run.is_validation === undefined) {
        run.is_validation = false;
      }
    });
    
    return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [runs, apiRuns, isAuthenticated, loadingRuns]);

  // Format validations for display
  const allValidations = useMemo(() => {
    const apiVals = apiValidations.map(v => {
      const validationId = v.validation_id || v.id || null;
      return {
        id: validationId ? `val_${validationId}` : `val_${Date.now()}`,
        validation_id: validationId,
        timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
        overall_score: v.overall_score,
        idea_explanation: v.idea_explanation,
        from_api: true,
        is_validation: true,
      };
    });

    if (isAuthenticated && !loadingRuns) {
      localStorage.removeItem("sia_validations");
      localStorage.removeItem("revalidate_data");
      return apiVals.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

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

    const combined = [...apiVals];
    const apiIds = new Set(apiVals.map(v => v.validation_id));
    localVals.forEach(localVal => {
      if (!apiIds.has(localVal.validation_id)) {
        combined.push(localVal);
      }
    });

    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [apiValidations, getSavedValidations, isAuthenticated, loadingRuns]);

  // Combine runs and validations
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
    
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(idea => {
        const title = idea.title?.toLowerCase() || "";
        const summary = idea.summary?.toLowerCase() || "";
        const goalType = idea.runInputs?.goal_type?.toLowerCase() || "";
        const interestArea = idea.runInputs?.interest_area?.toLowerCase() || "";
        const subInterest = idea.runInputs?.sub_interest_area?.toLowerCase() || "";
        const runId = idea.runId?.toLowerCase() || "";
        
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

  // Filter and sort sessions
  const filteredRuns = useMemo(() => {
    let filtered = allRuns.filter(s => {
      if (s.is_validation === true) return false;
      if (s.validation_id) return false;
      if (s.overall_score !== undefined && !s.run_id) return false;
      if (s.idea_explanation && !s.inputs) return false;
      return true;
    });
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
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

  // Check if a session has open actions
  const sessionHasOpenActions = useCallback((session) => {
    if (!session || !actions.length) return false;
    
    if (!session.is_validation) {
      const runId = session.run_id || session.id?.replace('run_', '');
      return actions.some(action => {
        if (!action.idea_id || action.status === "completed") return false;
        const runMatch = action.idea_id.match(/run_([^_]+)/);
        return runMatch && runMatch[1] === runId;
      });
    }
    
    if (session.is_validation && session.validation_id) {
      return actions.some(action => {
        if (!action.idea_id || action.status === "completed") return false;
        const valMatch = action.idea_id.match(/val_(.+)/);
        return valMatch && valMatch[1] === session.validation_id;
      });
    }
    
    return false;
  }, [actions]);

  // Check if a session has notes
  const sessionHasNotes = useCallback((session) => {
    if (!session || !notes.length) return false;
    
    if (!session.is_validation) {
      const runId = session.run_id || session.id?.replace('run_', '');
      return notes.some(note => {
        if (!note.idea_id) return false;
        const runMatch = note.idea_id.match(/run_([^_]+)/);
        return runMatch && runMatch[1] === runId;
      });
    }
    
    if (session.is_validation && session.validation_id) {
      return notes.some(note => {
        if (!note.idea_id) return false;
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
      
      {/* Small Psychology Banner */}
      {isAuthenticated && psychologyEmpty && (
        <div className="mb-4 rounded-lg border border-brand-200 dark:border-brand-800 bg-gradient-to-r from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-brand-800 dark:text-brand-300">
              Complete your Founder Psychology profile for more personalized recommendations.
            </p>
            <Link
              to="/founder-psychology"
              className="ml-3 rounded-md bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition whitespace-nowrap"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      )}
      
      {/* Psychology Profile Complete - Edit Link */}
      {isAuthenticated && !psychologyEmpty && (
        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              ✓ Founder Psychology profile completed
            </p>
            <Link
              to="/founder-psychology"
              className="ml-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      )}

      {/* Simplified Header with Only Primary CTAs */}
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
              to="/validate-idea"
              className="rounded-xl border border-brand-300/60 dark:border-brand-700/60 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300 shadow-sm transition-all duration-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Validate Idea
            </Link>
            <Link
              to="/advisor#intake-form"
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Discover Ideas
            </Link>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface - My Workspace & Explore */}
      <section className="mb-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
        {/* Main Tabs */}
        <div className="mb-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <nav className="flex gap-2" aria-label="Dashboard tabs">
            <button
              onClick={() => setMainTab("workspace")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "workspace"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              My Workspace
            </button>
            <button
              onClick={() => setMainTab("explore")}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                mainTab === "explore"
                  ? "border-brand-500 text-brand-700 dark:text-brand-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              Explore
            </button>
          </nav>
        </div>

        {/* Tab 1: My Workspace */}
        {mainTab === "workspace" && (
          <div className="space-y-6">
            {/* Sub-tabs for My Workspace */}
            <div className="border-b border-slate-200/60 dark:border-slate-700/60">
              <nav className="flex gap-4 flex-wrap" aria-label="Workspace sub-tabs">
                <button
                  onClick={() => setActiveTab("searches")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === "searches"
                      ? "border-brand-500 text-brand-700 dark:text-brand-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Your Idea Searches
                </button>
                <button
                  onClick={() => setActiveTab("validations")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === "validations"
                      ? "border-brand-500 text-brand-700 dark:text-brand-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Your Validations
                </button>
                <button
                  onClick={() => setActiveTab("ideas")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === "ideas"
                      ? "border-brand-500 text-brand-700 dark:text-brand-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Your Saved Ideas
                </button>
                <button
                  onClick={() => setActiveTab("search")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === "search"
                      ? "border-brand-500 text-brand-700 dark:text-brand-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab("compare")}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === "compare"
                      ? "border-brand-500 text-brand-700 dark:text-brand-400"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Compare
                </button>
              </nav>
            </div>

            {/* Your Idea Searches */}
            {activeTab === "searches" && (
              <DashboardSessionsTab
                activeTab="ideas"
                setActiveTab={setActiveTab}
                filteredRuns={filteredRuns}
                filteredValidations={[]}
                loadingRuns={loadingRuns}
                sessionHasOpenActions={sessionHasOpenActions}
                sessionHasNotes={sessionHasNotes}
                handleDelete={handleDelete}
                handleNewRequest={handleNewRequest}
                handleEditValidation={handleEditValidation}
              />
            )}

            {/* Your Validations */}
            {activeTab === "validations" && (
              <DashboardSessionsTab
                activeTab="validations"
                setActiveTab={setActiveTab}
                filteredRuns={[]}
                filteredValidations={filteredValidations}
                loadingRuns={loadingRuns}
                sessionHasOpenActions={sessionHasOpenActions}
                sessionHasNotes={sessionHasNotes}
                handleDelete={handleDelete}
                handleNewRequest={handleNewRequest}
                handleEditValidation={handleEditValidation}
              />
            )}

            {/* Your Saved Ideas */}
            {activeTab === "ideas" && (
              <DashboardActiveIdeasTab
                actions={actions}
                notes={notes}
                loadingActions={loadingActions}
                loadingNotes={loadingNotes}
                allRuns={allRuns}
                allValidations={allValidations}
              />
            )}

            {/* Search */}
            {activeTab === "search" && (
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

            {/* Compare */}
            {activeTab === "compare" && (
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
          </div>
        )}

        {/* Tab 2: Explore */}
        {mainTab === "explore" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Discover Ideas */}
              <Link
                to="/advisor#intake-form"
                className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-700/40 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="mb-3 text-2xl">💡</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Discover Ideas</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get AI-powered startup recommendations tailored to your profile
                </p>
              </Link>

              {/* Validate Idea */}
              <Link
                to="/validate-idea"
                className="group rounded-xl border border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-700/40 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="mb-3 text-2xl">✅</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Validate Idea</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Test your startup idea with comprehensive validation analysis
                </p>
              </Link>

              {/* Founder Connect */}
              <Link
                to="/founder-connect"
                className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-700/40 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="mb-3 text-2xl">🤝</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Founder Connect</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Connect with other founders and explore collaboration opportunities
                </p>
              </Link>

              {/* Analytics */}
              <Link
                to="/dashboard/analytics"
                className="group rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-700/40 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <div className="mb-3 text-2xl">📊</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Analytics</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  View insights and trends from your idea searches and validations
                </p>
              </Link>
            </div>

            {/* Additional Explore Features */}
            <div className="mt-8 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Advanced Tools</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setMainTab("workspace");
                    setActiveTab("search");
                  }}
                  className="text-left rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="mb-2 text-xl">🔍</div>
                  <h4 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Search Ideas</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Search and filter through all your saved ideas
                  </p>
                </button>
                <button
                  onClick={() => {
                    setMainTab("workspace");
                    setActiveTab("compare");
                  }}
                  className="text-left rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="mb-2 text-xl">⚖️</div>
                  <h4 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Compare Ideas</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Side-by-side comparison of multiple ideas
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
