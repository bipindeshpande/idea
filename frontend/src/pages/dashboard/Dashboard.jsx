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
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false); // Collapsible state for Additional Filters
  // Advanced search fields
  const [advancedSearch, setAdvancedSearch] = useState({
    goalType: "",
    interestArea: "",
    ideaDescription: "",
    sessionId: "",
    budgetRange: "all",
    timeCommitment: "all",
    workStyle: "all",
    skillStrength: "all",
    searchType: "ideas", // "ideas" or "validations"
  });
  // Compare tab state
  const [selectedRuns, setSelectedRuns] = useState(new Set());
  const [selectedValidations, setSelectedValidations] = useState(new Set());
  const [comparisonData, setComparisonData] = useState(null);
  const [comparing, setComparing] = useState(false);

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
      loadActions();
      loadNotes();
    } else {
      setLoadingRuns(false);
    }
  }, [isAuthenticated, loadApiRuns, loadActions, loadNotes]);

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

  // Filter and sort sessions
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
    
    // Advanced search filters
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session => {
        const goalType = session.inputs?.goal_type?.toLowerCase() || "";
        const interestArea = session.inputs?.interest_area?.toLowerCase() || "";
        const subInterest = session.inputs?.sub_interest_area?.toLowerCase() || "";
        const runId = session.run_id?.toLowerCase() || session.id?.toLowerCase() || "";
        
        // Check if any query part matches
        const queryParts = query.split(/\s+/).filter(p => p.length > 0);
        return queryParts.some(part => 
          goalType.includes(part) || 
          interestArea.includes(part) || 
          subInterest.includes(part) || 
          runId.includes(part)
        );
      });
    }
    
    // Advanced field filters
    if (advancedSearch.goalType) {
      const goalType = advancedSearch.goalType.toLowerCase();
      filtered = filtered.filter(s => 
        s.inputs?.goal_type?.toLowerCase().includes(goalType)
      );
    }
    
    if (advancedSearch.interestArea) {
      const interestArea = advancedSearch.interestArea.toLowerCase();
      filtered = filtered.filter(s => 
        s.inputs?.interest_area?.toLowerCase().includes(interestArea) ||
        s.inputs?.sub_interest_area?.toLowerCase().includes(interestArea)
      );
    }
    
    if (advancedSearch.sessionId) {
      const sessionId = advancedSearch.sessionId.toLowerCase();
      filtered = filtered.filter(s => {
        const runId = s.run_id?.toLowerCase() || s.id?.toLowerCase() || "";
        return runId.includes(sessionId);
      });
    }
    
    if (advancedSearch.budgetRange !== "all") {
      filtered = filtered.filter(s => 
        s.inputs?.budget_range === advancedSearch.budgetRange
      );
    }
    
    if (advancedSearch.timeCommitment !== "all") {
      filtered = filtered.filter(s => 
        s.inputs?.time_commitment === advancedSearch.timeCommitment
      );
    }
    
    if (advancedSearch.workStyle !== "all") {
      filtered = filtered.filter(s => 
        s.inputs?.work_style === advancedSearch.workStyle
      );
    }
    
    if (advancedSearch.skillStrength !== "all") {
      filtered = filtered.filter(s => 
        s.inputs?.skill_strength === advancedSearch.skillStrength
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
  }, [allRuns, searchQuery, dateFilter, sortBy, advancedSearch]);

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
    
    if (advancedSearch.sessionId) {
      const sessionId = advancedSearch.sessionId.toLowerCase();
      filtered = filtered.filter(s => {
        const valId = s.validation_id?.toLowerCase() || s.id?.toLowerCase() || "";
        return valId.includes(sessionId);
      });
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
                ? `Welcome back, ${user.email.split("@")[0]}!`
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

            {/* Advanced Search Form */}
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
                        goalType: "",
                        interestArea: "",
                        ideaDescription: "",
                        sessionId: "",
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
                    {/* Goal Type */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Goal Type
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Extra Income, Side Project"
                        value={advancedSearch.goalType}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, goalType: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      />
                    </div>

                    {/* Interest Area */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Interest Area
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., AI / Automation, E-commerce"
                        value={advancedSearch.interestArea}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, interestArea: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      />
                    </div>

                    {/* Session ID */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Session ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter session ID"
                        value={advancedSearch.sessionId}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, sessionId: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Idea Description - for validations */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Idea Description
                      </label>
                      <input
                        type="text"
                        placeholder="Search in idea descriptions..."
                        value={advancedSearch.ideaDescription}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, ideaDescription: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      />
                    </div>

                    {/* Validation ID */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Validation ID
                      </label>
                      <input
                        type="text"
                        placeholder="Enter validation ID"
                        value={advancedSearch.sessionId}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, sessionId: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      />
                    </div>
                  </div>
                )}

                {/* Advanced Filters - Only show for Ideas */}
                {advancedSearch.searchType === "ideas" && (
                  <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                      className="flex items-center justify-between w-full mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      <span>Additional Filters</span>
                      <svg
                        className={`h-5 w-5 transition-transform ${showAdditionalFilters ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAdditionalFilters && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Budget Range */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Budget Range
                        </label>
                        <select
                          value={advancedSearch.budgetRange}
                          onChange={(e) => setAdvancedSearch({...advancedSearch, budgetRange: e.target.value})}
                          className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                        >
                          <option value="all">All Budgets</option>
                          <option value="Free / Sweat-equity only">Free / Sweat-equity</option>
                          <option value="<$100">Less than $100</option>
                          <option value="$100-$500">$100-$500</option>
                          <option value="$500-$2000">$500-$2000</option>
                          <option value=">$2000">More than $2000</option>
                        </select>
                      </div>

                      {/* Time Commitment */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Time Commitment
                        </label>
                        <select
                          value={advancedSearch.timeCommitment}
                          onChange={(e) => setAdvancedSearch({...advancedSearch, timeCommitment: e.target.value})}
                          className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                        >
                          <option value="all">All Time</option>
                          <option value="<5 hrs/week">Less than 5 hrs/week</option>
                          <option value="5-10 hrs/week">5-10 hrs/week</option>
                          <option value="10-20 hrs/week">10-20 hrs/week</option>
                          <option value="20+ hrs/week">20+ hrs/week</option>
                        </select>
                      </div>

                      {/* Work Style */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Work Style
                        </label>
                        <select
                          value={advancedSearch.workStyle}
                          onChange={(e) => setAdvancedSearch({...advancedSearch, workStyle: e.target.value})}
                          className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                        >
                          <option value="all">All Styles</option>
                          <option value="Solo">Solo</option>
                          <option value="Team">Team</option>
                          <option value="Partnership">Partnership</option>
                        </select>
                      </div>

                      {/* Skill Strength */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Skill Strength
                        </label>
                        <select
                          value={advancedSearch.skillStrength}
                          onChange={(e) => setAdvancedSearch({...advancedSearch, skillStrength: e.target.value})}
                          className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                        >
                          <option value="all">All Skills</option>
                          <option value="Technical / Automation">Technical</option>
                          <option value="Creative / Design">Creative</option>
                          <option value="Business / Marketing">Business</option>
                          <option value="Sales / Communication">Sales</option>
                        </select>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {/* Score Filter - Only for Validations */}
                {advancedSearch.searchType === "validations" && (
                  <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Validation Score
                    </label>
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                    >
                      <option value="all">All Scores</option>
                      <option value="high">High (≥7.0)</option>
                      <option value="medium">Medium (5.0-6.9)</option>
                      <option value="low">Low (&lt;5.0)</option>
                    </select>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      // Build search query from advanced fields
                      const queryParts = [];
                      if (advancedSearch.goalType) queryParts.push(advancedSearch.goalType);
                      if (advancedSearch.interestArea) queryParts.push(advancedSearch.interestArea);
                      if (advancedSearch.ideaDescription) queryParts.push(advancedSearch.ideaDescription);
                      if (advancedSearch.sessionId) queryParts.push(advancedSearch.sessionId);
                      setSearchQuery(queryParts.join(" ").trim() || " ");
                      setSearchInput(queryParts.join(" ").trim());
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setAdvancedSearch({
                        goalType: "",
                        interestArea: "",
                        ideaDescription: "",
                        sessionId: "",
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
                    }}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            {(searchQuery || advancedSearch.goalType || advancedSearch.interestArea || advancedSearch.ideaDescription || advancedSearch.sessionId || advancedSearch.budgetRange !== "all" || advancedSearch.timeCommitment !== "all" || advancedSearch.workStyle !== "all" || advancedSearch.skillStrength !== "all" || dateFilter !== "all" || scoreFilter !== "all") && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {advancedSearch.searchType === "ideas" && (
                  <>Showing {filteredRuns.length} of {allRuns.filter(s => !s.is_validation).length} ideas</>
                )}
                {advancedSearch.searchType === "validations" && (
                  <>Showing {filteredValidations.length} of {allValidations.length} validations</>
                )}
              </div>
            )}

            {/* Show results only when there's a search query or filters applied */}
            {(searchQuery || advancedSearch.goalType || advancedSearch.interestArea || advancedSearch.ideaDescription || advancedSearch.sessionId || advancedSearch.budgetRange !== "all" || advancedSearch.timeCommitment !== "all" || advancedSearch.workStyle !== "all" || advancedSearch.skillStrength !== "all" || dateFilter !== "all" || scoreFilter !== "all") ? (
              <div className="space-y-4">
                {/* Ideas Results - Only show if searchType is ideas */}
                {advancedSearch.searchType === "ideas" && filteredRuns.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50 mb-3">Ideas ({filteredRuns.length})</h4>
                    <div className="space-y-2.5">
                      {filteredRuns.map((session) => {
                        const runId = session.run_id || session.id?.replace("run_", "") || session.id;
                        return (
                          <Link
                            key={session.id || session.timestamp}
                            to={`/results/recommendations/0?id=${runId}`}
                            className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-all duration-200 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-1">
                                  {session.inputs?.goal_type || "Idea Discovery"} - {session.inputs?.interest_area || session.inputs?.sub_interest_area || "General"}
                                </h5>
                                {session.inputs && Object.keys(session.inputs).length > 0 && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                                    Time: {session.inputs.time_commitment || "Not set"} • Budget: {session.inputs.budget_range || "Not set"} • Focus: {session.inputs.sub_interest_area || session.inputs.interest_area || "Not captured"}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  ID: {runId?.substring(0, 8) || "N/A"} • {session.timestamp ? new Date(session.timestamp).toLocaleDateString() : "Unknown date"}
                                </p>
                              </div>
                            </div>
                          </Link>
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
                {((advancedSearch.searchType === "ideas" && filteredRuns.length === 0) ||
                  (advancedSearch.searchType === "validations" && filteredValidations.length === 0)) && (
                  <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No sessions found matching your search criteria.</p>
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                      setDateFilter("all");
                      setScoreFilter("all");
                      setSortBy("date");
                    }}
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Clear Filters
                  </button>
                  </div>
                )}
              </div>
            ) : (
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
                  You can search by goal type, interest area, idea description, or session ID.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Compare */}
        {mainTab === "compare" && (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Compare Sessions</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Select up to 5 sessions to compare side-by-side. You can compare ideas with other ideas, or validations with other validations, but not mix them.
              </p>
            </div>

            {!comparisonData ? (
              <div className="space-y-6">
                {/* Idea Discovery Runs */}
                <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Idea Discovery Runs</h4>
                    {selectedValidations.size > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Clear validations to select ideas
                      </span>
                    )}
                  </div>
                  {allRuns.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No idea discovery runs found.</p>
                  ) : (
                    <div className="space-y-2">
                      {allRuns.map((run) => {
                        const runId = run.run_id || run.id?.replace("run_", "") || run.id;
                        const isSelected = selectedRuns.has(runId);
                        return (
                          <label
                            key={run.id || run.timestamp}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={selectedValidations.size > 0}
                              onChange={() => {
                                // If validations are selected, clear them first
                                if (selectedValidations.size > 0) {
                                  setSelectedValidations(new Set());
                                }
                                
                                const newSet = new Set(selectedRuns);
                                if (newSet.has(runId)) {
                                  newSet.delete(runId);
                                } else {
                                  if (newSet.size >= 5) {
                                    alert("Maximum 5 sessions can be compared at once");
                                    return;
                                  }
                                  newSet.add(runId);
                                }
                                setSelectedRuns(newSet);
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {run.inputs?.goal_type || "Idea Discovery"} - {run.inputs?.interest_area || run.inputs?.sub_interest_area || "General"}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                ID: {runId?.substring(0, 8) || "N/A"} • {run.timestamp ? new Date(run.timestamp).toLocaleDateString() : "Unknown date"}
                              </p>
                            </div>
                          </label>
                        );
                      })}
          </div>
        )}
      </section>

                {/* Validations */}
                <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Validations</h4>
                    {selectedRuns.size > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Clear ideas to select validations
                      </span>
                    )}
    </div>
                  {allValidations.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No validations found.</p>
                  ) : (
                    <div className="space-y-2">
                      {allValidations.map((validation) => {
                        const validationId = validation.validation_id || validation.id;
                        const isSelected = selectedValidations.has(validationId);
                        return (
                          <label
                            key={validation.id || validation.validation_id || validation.timestamp}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={selectedRuns.size > 0}
                              onChange={() => {
                                // If ideas are selected, clear them first
                                if (selectedRuns.size > 0) {
                                  setSelectedRuns(new Set());
                                }
                                
                                const newSet = new Set(selectedValidations);
                                if (newSet.has(validationId)) {
                                  newSet.delete(validationId);
                                } else {
                                  if (newSet.size >= 5) {
                                    alert("Maximum 5 sessions can be compared at once");
                                    return;
                                  }
                                  newSet.add(validationId);
                                }
                                setSelectedValidations(newSet);
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                                {validation.idea_explanation && validation.idea_explanation.length > 50
                                  ? validation.idea_explanation.substring(0, 50) + "..."
                                  : validation.idea_explanation || "Validation"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {validation.overall_score !== undefined && (
                                  <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                                    Score: {validation.overall_score.toFixed(1)}/10
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ID: {validationId?.substring(0, 8) || "N/A"} • {validation.timestamp ? new Date(validation.timestamp).toLocaleDateString() : "Unknown date"}
                                </span>
    </div>
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
                      if (selectedRuns.size === 0 && selectedValidations.size === 0) {
                        alert("Please select at least one session to compare");
                        return;
                      }

                      // Ensure only one type is selected
                      if (selectedRuns.size > 0 && selectedValidations.size > 0) {
                        alert("Cannot compare ideas with validations. Please select only ideas or only validations.");
                        return;
                      }

                      if (selectedRuns.size + selectedValidations.size > 5) {
                        alert("Maximum 5 sessions can be compared at once");
                        return;
                      }

                      setComparing(true);
                      try {
                        const response = await fetch("/api/user/compare-sessions", {
                          method: "POST",
                          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify({
                            run_ids: Array.from(selectedRuns),
                            validation_ids: Array.from(selectedValidations),
                          }),
                        });
                        if (response.ok) {
                          const data = await response.json();
                          if (data.success) {
                            setComparisonData(data.comparison);
                          } else {
                            alert(data.error || "Failed to compare sessions. Please try again.");
                          }
                        } else {
                          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                          alert(errorData.error || "Failed to compare sessions. Please try again.");
                        }
                      } catch (error) {
                        console.error("Failed to compare sessions:", error);
                        alert("Network error. Please check your connection and try again.");
                      } finally {
                        setComparing(false);
                      }
                    }}
                    disabled={comparing || (selectedRuns.size === 0 && selectedValidations.size === 0) || (selectedRuns.size > 0 && selectedValidations.size > 0)}
                    className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparing ? "Comparing..." : `Compare ${selectedRuns.size + selectedValidations.size} Session${selectedRuns.size + selectedValidations.size !== 1 ? "s" : ""}`}
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
                      setSelectedRuns(new Set());
                      setSelectedValidations(new Set());
                    }}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    New Comparison
                  </button>
                </div>

                {/* Comparison Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Metric</th>
                        {comparisonData.runs?.map((run, idx) => (
                          <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {run.project_name || `Run ${idx + 1}`}
                          </th>
                        ))}
                        {comparisonData.validations?.map((val, idx) => (
                          <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {val.idea_explanation?.substring(0, 30) || `Validation ${idx + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-50">Date</td>
                        {comparisonData.runs?.map((run, idx) => (
                          <td key={idx} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {run.created_at ? new Date(run.created_at).toLocaleDateString() : "N/A"}
                          </td>
                        ))}
                        {comparisonData.validations?.map((val, idx) => (
                          <td key={idx} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {val.created_at ? new Date(val.created_at).toLocaleDateString() : "N/A"}
                          </td>
                        ))}
                      </tr>
                      {comparisonData.validations && comparisonData.validations.length > 0 && (
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-50">Validation Score</td>
                          {comparisonData.runs?.map(() => (
                            <td key={Math.random()} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">N/A</td>
                          ))}
                          {comparisonData.validations?.map((val, idx) => (
                            <td key={idx} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                              {val.validation_result?.overall_score?.toFixed(1) || "N/A"}/10
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

