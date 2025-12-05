import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import OpenForCollaboratorsButton from "../../components/founder/OpenForCollaboratorsButton.jsx";
import { parseTopIdeas, trimFromHeading } from "../../utils/markdown/markdown.js";
import {
  splitIdeaSections,
  extractWhyFit,
  buildExecutionSteps,
  buildFinancialSnapshots,
  parseRiskRows,
  buildValidationQuestions,
  extractValidationQuestions,
  extractOtherSection,
  personalizeCopy,
  formatSectionHeading,
  cleanNarrativeMarkdown,
  extractTimelineSlice,
  dedupeStrings,
} from "../../utils/formatters/recommendationFormatters.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Get theme for different sections
function getSectionTheme(sectionTitle) {
  const lowerTitle = sectionTitle.toLowerCase();
  
  if (lowerTitle.includes("financial") || lowerTitle.includes("snapshot")) {
    return {
      icon: "💰",
      border: "border-amber-300",
      bg: "bg-amber-50",
      headerBg: "bg-amber-100",
      text: "text-amber-800",
      borderColor: "#FCD34D",
      bgColor: "#FEF3C7",
      headerBgColor: "#FDE68A",
      textColor: "#92400E",
    };
  }
  
  if (lowerTitle.includes("execution") || lowerTitle.includes("roadmap")) {
    return {
      icon: "🗺️",
      border: "border-brand-300",
      bg: "bg-brand-50",
      headerBg: "bg-brand-100",
      text: "text-brand-800",
      borderColor: "#A5B6E0",
      bgColor: "#E8ECF7",
      headerBgColor: "#D0D9F0",
      textColor: "#1B4091",
    };
  }
  
  if (lowerTitle.includes("risk") || lowerTitle.includes("radar")) {
    return {
      icon: "⚠️",
      border: "border-rose-300",
      bg: "bg-rose-50",
      headerBg: "bg-rose-100",
      text: "text-rose-800",
      borderColor: "#FDA4AF",
      bgColor: "#FFF1F2",
      headerBgColor: "#FFE4E6",
      textColor: "#BE123C",
    };
  }
  
  if (lowerTitle.includes("market") || lowerTitle.includes("signal")) {
    return {
      icon: "📈",
      border: "border-teal-300",
      bg: "bg-teal-50",
      headerBg: "bg-teal-100",
      text: "text-teal-800",
      borderColor: "#5EEAD4",
      bgColor: "#F0FDFA",
      headerBgColor: "#CCFBF1",
      textColor: "#134E4A",
    };
  }
  
  if (lowerTitle.includes("customer") || lowerTitle.includes("persona")) {
    return {
      icon: "👤",
      border: "border-violet-300",
      bg: "bg-violet-50",
      headerBg: "bg-violet-100",
      text: "text-violet-800",
      borderColor: "#C4B5FD",
      bgColor: "#F5F3FF",
      headerBgColor: "#EDE9FE",
      textColor: "#6D28D9",
    };
  }
  
  if (lowerTitle.includes("validation") || lowerTitle.includes("question")) {
    return {
      icon: "❓",
      border: "border-brand-300",
      bg: "bg-brand-50",
      headerBg: "bg-brand-100",
      text: "text-brand-800",
      borderColor: "#A5B6E0",
      bgColor: "#E8ECF7",
      headerBgColor: "#D0D9F0",
      textColor: "#1B4091",
    };
  }
  
  if (lowerTitle.includes("experiment") || lowerTitle.includes("next")) {
    return {
      icon: "🧪",
      border: "border-amber-300",
      bg: "bg-amber-50",
      headerBg: "bg-amber-100",
      text: "text-amber-800",
      borderColor: "#FCD34D",
      bgColor: "#FEF3C7",
      headerBgColor: "#FDE68A",
      textColor: "#92400E",
    };
  }
  
  if (lowerTitle.includes("decision") || lowerTitle.includes("checkpoint")) {
    return {
      icon: "✅",
      border: "border-emerald-300",
      bg: "bg-emerald-50",
      headerBg: "bg-emerald-100",
      text: "text-emerald-800",
      borderColor: "#86EFAC",
      bgColor: "#ECFDF5",
      headerBgColor: "#D1FAE5",
      textColor: "#047857",
    };
  }
  
  if (lowerTitle.includes("30") || lowerTitle.includes("60") || lowerTitle.includes("90") || lowerTitle.includes("outlook")) {
    return {
      icon: "📅",
      border: "border-brand-300",
      bg: "bg-brand-50",
      headerBg: "bg-brand-100",
      text: "text-brand-800",
      borderColor: "#A5B6E0",
      bgColor: "#E8ECF7",
      headerBgColor: "#D0D9F0",
      textColor: "#1B4091",
    };
  }
  
  return {
    icon: "📋",
    border: "border-slate-300",
    bg: "bg-slate-50",
    headerBg: "bg-slate-100",
    text: "text-slate-800",
    borderColor: "#CAD2DA",
    bgColor: "#F8FAFC",
    headerBgColor: "#EEF2F6",
    textColor: "#47505B",
  };
}

function CollapsibleSection({ title, description, theme, isOpen, onToggle, children }) {
  return (
    <article
      className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-0 overflow-hidden shadow-md`}
      style={{
        borderColor: theme.borderColor,
        backgroundColor: theme.bgColor,
      }}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-6 py-4 ${theme.headerBg} border-b-2 hover:opacity-90 transition-opacity`}
        style={{
          backgroundColor: theme.headerBgColor,
          borderBottomColor: theme.borderColor,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theme.icon}</span>
          <div className="text-left">
            <h2
              className={`text-xl font-semibold ${theme.text}`}
              style={{ color: theme.textColor }}
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs mt-1 text-slate-500">{description}</p>
            )}
          </div>
        </div>
        <span className={`text-xl transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </article>
  );
}

export default function RecommendationDetail() {
  const { ideaIndex } = useParams();
  const { reports, loadRunById, currentRunId, inputs, loading } = useReports();
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const query = useQuery();
  const runId = query.get("id");
  const [openSections, setOpenSections] = useState(new Set());
  const [actions, setActions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  useEffect(() => {
    // Only load if we don't already have the reports data and we're not currently loading
    if (runId && !loading && (!reports || Object.keys(reports).length === 0)) {
      loadRunById(runId);
    } else if (currentRunId && !runId && !loading && (!reports || Object.keys(reports).length === 0)) {
      // If no runId in URL but we have a currentRunId, load it
      loadRunById(currentRunId);
    }
  }, [runId, currentRunId, loading, reports, loadRunById]); // Include all dependencies to ensure proper loading

  const markdown = useMemo(
    () => trimFromHeading(reports?.personalized_recommendations ?? "", "### Comprehensive Recommendation Report"),
    [reports]
  );

  const ideas = useMemo(() => {
    return parseTopIdeas(markdown, 10);
  }, [markdown]);
  
  const numericIndex = Number.parseInt(ideaIndex ?? "", 10);
  const activeIdea = ideas.find((idea) => idea.index === numericIndex);

  // Load actions and notes for this idea
  const ideaId = useMemo(() => {
    if (runId && activeIdea?.index !== undefined) return `run_${runId}_idea_${activeIdea.index}`;
    if (currentRunId && activeIdea?.index !== undefined) return `run_${currentRunId}_idea_${activeIdea.index}`;
    if (activeIdea?.index !== undefined) return `idea_${activeIdea.index}`;
    if (runId) return `run_${runId}`;
    if (currentRunId) return `run_${currentRunId}`;
    return null;
  }, [runId, currentRunId, activeIdea?.index]);

  useEffect(() => {
    if (!isAuthenticated || !ideaId) return;
    
    const loadActions = async () => {
      setLoadingActions(true);
      try {
        const response = await fetch(`/api/user/actions?idea_id=${encodeURIComponent(ideaId)}`, {
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
    };

    const loadNotes = async () => {
      setLoadingNotes(true);
      try {
        const response = await fetch(`/api/user/notes?idea_id=${encodeURIComponent(ideaId)}`, {
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
    };

    loadActions();
    loadNotes();
  }, [ideaId, isAuthenticated, getAuthHeaders]);

  const handleCreateAction = useCallback(async () => {
    if (!newActionText.trim() || !ideaId) return;
    
    try {
      const response = await fetch("/api/user/actions", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_id: ideaId,
          action_text: newActionText.trim(),
          status: "pending",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActions((prev) => [data.action, ...prev]);
          setNewActionText("");
        } else {
          alert(data.error || "Failed to create action. Please try again.");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(errorData.error || "Failed to create action. Please try again.");
      }
    } catch (error) {
      console.error("Failed to create action:", error);
      alert("Network error. Please check your connection and try again.");
    }
  }, [newActionText, ideaId, getAuthHeaders]);

  const handleUpdateAction = useCallback(async (actionId, status) => {
    try {
      const response = await fetch(`/api/user/actions/${actionId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActions((prev) => prev.map((a) => (a.id === actionId ? data.action : a)));
        } else {
          console.error("Failed to update action:", data.error);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to update action:", errorData.error);
      }
    } catch (error) {
      console.error("Failed to update action:", error);
    }
  }, [getAuthHeaders]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteContent.trim() || !ideaId) return;
    
    try {
      const response = await fetch("/api/user/notes", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_id: ideaId,
          content: newNoteContent.trim(),
          tags: [],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotes((prev) => [data.note, ...prev]);
          setNewNoteContent("");
        } else {
          alert(data.error || "Failed to create note. Please try again.");
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        alert(errorData.error || "Failed to create note. Please try again.");
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      alert("Network error. Please check your connection and try again.");
    }
  }, [newNoteContent, ideaId, getAuthHeaders]);
  

  // All sections start closed by default - user can expand as needed

  const runQuery = runId || currentRunId;
  const backPath = runQuery ? `/results/recommendations?id=${runQuery}` : "/results/recommendations";

  const sections = useMemo(() => (activeIdea ? splitIdeaSections(activeIdea.body) : {}), [activeIdea]);

  const whyFit = useMemo(() => extractWhyFit(sections.intro || ""), [sections]);
  const executionSteps = useMemo(
    () =>
      buildExecutionSteps(sections["execution path"], activeIdea?.title || "", {
        goalType: inputs?.goal_type || "",
        timeCommitment: inputs?.time_commitment || "",
        budgetRange: inputs?.budget_range || "",
        workStyle: inputs?.work_style || "",
        skillStrength: inputs?.skill_strength || "",
        focus: inputs?.sub_interest_area || inputs?.interest_area || "",
      }),
    [sections, activeIdea?.title, inputs]
  );
  const financialSnapshot = useMemo(
    () => buildFinancialSnapshots(
      sections["financial snapshot"], 
      activeIdea?.title || "",
      inputs?.budget_range || ""
    ),
    [sections, activeIdea?.title, inputs?.budget_range]
  );
  const riskRows = useMemo(() => parseRiskRows(sections["key risks & mitigations"]), [sections]);
  const validationQuestions = useMemo(
    () =>
      buildValidationQuestions(
        sections["validation questions"],
        activeIdea?.title || "",
        inputs?.sub_interest_area || inputs?.interest_area || "",
        inputs?.goal_type || ""
      ),
    [sections, activeIdea?.title, inputs]
  );

  const heroStatement = useMemo(() => {
    let statement = "";
    if (whyFit.length > 0) {
      statement = whyFit[0];
    } else if (sections.intro) {
      const introText = personalizeCopy(sections.intro);
      const firstSentence = introText.split(/(?<=[.!?])\s+/)[0];
      if (firstSentence) {
        statement = firstSentence;
      }
    }
    
    // Clean statement - remove "Execution Path:" and other section headers
    if (statement) {
      statement = statement
        .replace(/^execution\s+path[:\s]*/i, "")
        .replace(/^[-*]\s*\*\*execution\s+path\*\*[:\s]*/i, "")
        .replace(/^[-*]\s*execution\s+path[:\s]*/i, "")
        .replace(/\*\*execution\s+path\*\*[:\s]*/gi, "")
        .replace(/^[-*]\s*/g, "")
        .trim();
    }
    
    return statement || "This idea aligns with your goals, strengths, and capacity.";
  }, [whyFit, sections]);

  const fitHighlights = useMemo(() => {
    if (!whyFit.length) return [];
    if (whyFit[0] === heroStatement) {
      return whyFit.slice(1);
    }
    return whyFit;
  }, [whyFit, heroStatement]);

  const heroChips = useMemo(() => {
    if (!inputs) return [];
    const chips = [
      inputs.goal_type && { label: "Goal Fit", value: inputs.goal_type },
      inputs.time_commitment && { label: "Time Fit", value: inputs.time_commitment },
      inputs.budget_range && { label: "Budget", value: inputs.budget_range },
      (inputs.sub_interest_area || inputs.interest_area) && {
        label: "Focus",
        value: inputs.sub_interest_area || inputs.interest_area,
      },
    ].filter(Boolean);
    return chips;
  }, [inputs]);

  const executionPhases = useMemo(() => {
    if (!executionSteps.length) return [];
    const phases = [
      { title: "Validate", steps: executionSteps.slice(0, 3) },
      { title: "Build", steps: executionSteps.slice(3, 6) },
      { title: "Launch", steps: executionSteps.slice(6, 8) },
      { title: "Scale", steps: executionSteps.slice(8, 10) },
    ].filter((phase) => phase.steps.length > 0);
    return phases;
  }, [executionSteps]);

  const executionPhaseCards = useMemo(() => {
    let counter = 0;
    return executionPhases.map((phase) => ({
      title: phase.title,
      items: dedupeStrings(phase.steps).map((step) => {
        counter += 1;
        return { text: step, index: counter };
      }),
    }));
  }, [executionPhases]);

  const marketSectionKey = useMemo(() => {
    const keys = Object.keys(sections);
    return keys.find((key) =>
      ["market opportunity", "market trends", "market opportunity & trends", "market opportunity insights"].some(
        (needle) => key.includes(needle)
      )
    );
  }, [sections]);

  const marketInsights = useMemo(() => {
    const source = marketSectionKey ? sections[marketSectionKey] : "";
    return dedupeStrings(extractValidationQuestions(source));
  }, [marketSectionKey, sections]);

  const personaMarkdown = useMemo(() => sections["customer persona"] || "", [sections]);
  const fitNarrativeMarkdown = useMemo(() => {
    const raw = sections.intro || "";
    if (!raw) return "";
    
    // Remove "Why it fits now:" from anywhere in the content (case-insensitive, with optional colon and spaces)
    let cleaned = raw
      .replace(/^why\s+it\s+fits\s+now[:\s]*/gi, "")
      .replace(/\*\*why\s+it\s+fits\s+now\*\*[:\s]*/gi, "")
      .replace(/why\s+it\s+fits\s+now[:\s]*/gi, "")
      .trim();
    
    // Don't use cleanNarrativeMarkdown here as it breaks list structure
    // Just personalize the copy while preserving markdown structure
    return personalizeCopy(cleaned);
  }, [sections]);
  const immediateExperimentsList = useMemo(
    () => dedupeStrings(extractValidationQuestions(sections["immediate experiments"])),
    [sections]
  );
  const immediateNextSteps = useMemo(
    () => dedupeStrings(extractValidationQuestions(sections["immediate next steps"])),
    [sections]
  );
  const decisionChecklist = useMemo(
    () => dedupeStrings(extractValidationQuestions(sections["decision checklist"])),
    [sections]
  );
  const roadmapMarkdown = useMemo(
    () => sections["timeline & effort"] || sections["timeline"] || sections["roadmap"] || "",
    [sections]
  );

  const handledKeys = useMemo(() => {
    const keys = [
      "intro",
      "execution path",
      "financial snapshot",
      "key risks & mitigations",
      "validation questions",
      "customer persona",  // Combined with validation questions in UI
      "immediate experiments",
      "immediate next steps",
      "timeline & effort",
      "timeline",
      "roadmap",
      "decision checklist",
    ];
    if (marketSectionKey) {
      keys.push(marketSectionKey);
    }
    return new Set(keys);
  }, [marketSectionKey]);

  const additionalSections = useMemo(
    () =>
      Object.entries(sections)
        .filter(([key, value]) => value && !handledKeys.has(key))
        .map(([key, value]) => ({
          heading: key,
          content: extractOtherSection(value),
        })),
    [sections, handledKeys]
  );

  const otherIdeas = useMemo(
    () => ideas.filter((idea) => activeIdea && idea.index !== activeIdea.index),
    [ideas, activeIdea]
  );

  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  };

  // Redirect if we have markdown but the idea index doesn't match
  if (markdown && !activeIdea && ideas.length > 0) {
    return <Navigate to={backPath} replace />;
  }

  return (
    <section className="grid gap-6">
      <Seo
        title={
          activeIdea
            ? `${activeIdea.title} | Recommendation Detail`
            : "Recommendation Detail | Startup Idea Advisor"
        }
        description="Dive deeper into the selected startup recommendation, including financial outlook, risk radar, and validation plan."
        path={`/results/recommendations/${ideaIndex}`}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Link to={backPath} className="inline-flex items-center gap-2 text-brand-700 hover:text-brand-800">
            <span aria-hidden="true">←</span> Back to recommendations
          </Link>
        </div>
        {activeIdea && runQuery && (
          <OpenForCollaboratorsButton
            runId={runQuery}
            sourceType="advisor"
            sourceId={runQuery}
            ideaTitle={activeIdea.title}
            ideaIndex={activeIdea.index}
            categoryAnswers={inputs}
          />
        )}
      </div>

      {loading && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50/80 p-6 text-blue-800 shadow-soft">
          <h2 className="text-lg font-semibold">Loading recommendation details...</h2>
          <p className="mt-2 text-sm">Please wait while we load the data.</p>
        </div>
      )}

      {!loading && !markdown && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">No report available</h2>
          <p className="mt-2 text-sm">
            We couldn't find a saved recommendation report. Return to the home page to run a new session.
          </p>
        </div>
      )}

      {markdown && ideas.length > 0 && !activeIdea && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Idea not found</h2>
          <p className="mt-2 text-sm">
            Idea #{ideaIndex} not found in the recommendations. Available ideas: {ideas.map(i => i.index).join(", ")}
          </p>
          <Link to={backPath} className="mt-4 inline-block text-sm font-semibold text-amber-900 underline">
            Back to recommendations
          </Link>
        </div>
      )}

      {activeIdea && (
        <>
          <article className="rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-8 py-10 text-white shadow-soft shadow-brand-300/50">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-white/80">Idea #{activeIdea.index}</p>
              {(actions.length > 0 || notes.length > 0) && (
                <div className="flex items-center gap-2">
                  {actions.length > 0 && (
                    <span 
                      className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white"
                      title={`${actions.length} action item${actions.length !== 1 ? 's' : ''}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {actions.length} Task{actions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {notes.length > 0 && (
                    <span 
                      className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white"
                      title={`${notes.length} note${notes.length !== 1 ? 's' : ''}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {notes.length} Note{notes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{activeIdea.title}</h1>
            <p className="mt-4 max-w-3xl text-sm text-white/90 md:text-base">{heroStatement}</p>
            {heroChips.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {heroChips.map(({ label, value }) => (
                  <span
                    key={`${label}-${value}`}
                    className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                  >
                    {label}: {value}
                  </span>
                ))}
              </div>
            )}
          </article>

          {fitNarrativeMarkdown && (
            <CollapsibleSection
              title="Why this Idea Fits You"
              theme={getSectionTheme("Why this Idea Fits You")}
              isOpen={openSections.has("why-fits")}
              onToggle={() => toggleSection("why-fits")}
            >
              {fitNarrativeMarkdown && (
                <div className="mt-6 text-slate-700">
                  <style>{`
                    .fit-narrative-content ul {
                      list-style-type: disc;
                      margin-left: 1.5rem;
                      margin-top: 0.75rem;
                      margin-bottom: 0.75rem;
                      padding-left: 0;
                    }
                    .fit-narrative-content ul ul {
                      list-style-type: circle;
                      margin-left: 2rem;
                      margin-top: 0.5rem;
                      margin-bottom: 0.5rem;
                    }
                    .fit-narrative-content ul ul ul {
                      list-style-type: square;
                      margin-left: 2rem;
                    }
                    .fit-narrative-content ol {
                      list-style-type: decimal;
                      margin-left: 1.5rem;
                      margin-top: 0.75rem;
                      margin-bottom: 0.75rem;
                    }
                    .fit-narrative-content ol ol {
                      list-style-type: lower-alpha;
                      margin-left: 2rem;
                    }
                    .fit-narrative-content li {
                      margin-top: 0.5rem;
                      margin-bottom: 0.5rem;
                      line-height: 1.7;
                      padding-left: 0.25rem;
                    }
                    .fit-narrative-content li > p {
                      margin: 0;
                      display: inline;
                    }
                    .fit-narrative-content p {
                      margin-bottom: 1rem;
                      line-height: 1.7;
                    }
                    .fit-narrative-content strong {
                      font-weight: 600;
                      color: #1e293b;
                    }
                  `}</style>
                  <div className="fit-narrative-content">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => (
                          <p className="leading-relaxed mb-4" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} />
                        ),
                        li: ({ node, children, ...props }) => (
                          <li className="leading-relaxed" {...props}>
                            {children}
                          </li>
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-slate-900" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic text-slate-600" {...props} />
                        ),
                      }}
                    >
                      {fitNarrativeMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

          {financialSnapshot.length > 0 && (
            <CollapsibleSection
              title="Financial snapshot"
              theme={getSectionTheme("Financial snapshot")}
              isOpen={openSections.has("financial")}
              onToggle={() => toggleSection("financial")}
            >
              <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
                <table className="min-w-full divide-y divide-amber-100 text-sm">
                  <thead className="bg-amber-100/60 text-left uppercase tracking-wide text-amber-700">
                    <tr>
                      <th className="px-4 py-3 w-10"></th>
                      <th className="px-4 py-3">Focus</th>
                      <th className="px-4 py-3">Estimate</th>
                      <th className="px-4 py-3 text-right">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-slate-700">
                    {financialSnapshot.map(({ focus, estimate, metric }, index) => (
                      <tr key={`${focus}-${index}`}>
                        <td className="px-4 py-3 text-brand-500">✓</td>
                        <td className="px-4 py-3 font-semibold text-amber-800">{focus}</td>
                        <td className="px-4 py-3">{estimate}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">{metric}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

            {executionPhaseCards.length > 0 && (
              <CollapsibleSection
                title="Execution roadmap"
                description="Move from validation to scale with focused sprints that match your capacity."
                theme={getSectionTheme("Execution roadmap")}
                isOpen={openSections.has("execution")}
                onToggle={() => toggleSection("execution")}
              >
              <div className="grid gap-4 md:grid-cols-2">
                {executionPhaseCards.map((phase) => (
                  <div key={phase.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-inner">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{phase.title}</h3>
                    <ol className="mt-3 space-y-2 text-sm text-slate-700">
                      {phase.items.map((item) => (
                        <li key={item.index} className="flex gap-3">
                          <span className="min-w-[2.25rem] rounded-full bg-brand-100 px-2 py-1 text-center font-semibold text-brand-700">
                            {item.index}
                          </span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {riskRows.length > 0 && (
            <CollapsibleSection
              title="Risk radar"
              theme={getSectionTheme("Risk radar")}
              isOpen={openSections.has("risk")}
              onToggle={() => toggleSection("risk")}
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3 w-32">Severity</th>
                      <th className="px-4 py-3">Early mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riskRows.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-slate-700">{row.risk}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{row.severity}</td>
                        <td className="px-4 py-3 text-slate-700">{row.mitigation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {marketInsights.length > 0 && (
            <CollapsibleSection
              title="Market signals"
              description="Trends and proof points worth validating as you move forward."
              theme={getSectionTheme("Market signals")}
              isOpen={openSections.has("market")}
              onToggle={() => toggleSection("market")}
            >
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {marketInsights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-2xl border border-teal-100 dark:border-teal-800 bg-white/90 dark:bg-slate-700/50 p-3 shadow-inner"
                  >
                    <span className="mt-1 text-teal-500">📈</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {(personaMarkdown || validationQuestions.length > 0) && (
            <CollapsibleSection
              title="Customer Persona & Validation Questions"
              description="Understand your ideal customer profile and use these validation questions to confirm demand and buying triggers."
              theme={getSectionTheme("Customer persona")}
              isOpen={openSections.has("persona-validation")}
              onToggle={() => toggleSection("persona-validation")}
            >
              <div className="space-y-6">
                {personaMarkdown && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Customer Persona</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      A detailed profile of your ideal customer—their demographics, pain points, goals, and buying behavior.
                    </p>
                    <div className="rounded-2xl border border-violet-100 dark:border-violet-800 bg-white/90 dark:bg-slate-700/50 p-4 shadow-inner">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => (
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-3 ml-5" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="leading-relaxed" {...props} />
                          ),
                        }}
                      >
                        {cleanNarrativeMarkdown(personaMarkdown)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {validationQuestions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Validation Questions</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Ask these during discovery interviews, quick surveys, or pilot onboarding to confirm demand, willingness to pay, and whether the idea solves the right pain.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {validationQuestions.map(({ question, listenFor, actOn }, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-brand-100 dark:border-brand-800 bg-brand-50/70 dark:bg-brand-900/30 p-4 text-sm text-slate-800 dark:text-slate-200 shadow-inner"
                        >
                          <p className="font-semibold text-brand-700 dark:text-brand-400">Question {index + 1}</p>
                          <p className="mt-2 text-sm">{question}</p>
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            <strong>What to listen for:</strong> {listenFor}
                          </p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <strong>Act on it:</strong> {actOn}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {(immediateExperimentsList.length > 0 ||
            immediateNextSteps.length > 0) && (
            <div className="grid gap-6">
              {immediateExperimentsList.length > 0 && (
                <CollapsibleSection
                  title="Experiments to run next"
                  theme={getSectionTheme("Experiments")}
                  isOpen={openSections.has("experiments")}
                  onToggle={() => toggleSection("experiments")}
                >
                  <ul className="space-y-2 text-sm text-slate-700">
                    {immediateExperimentsList.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 text-brand-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
              {immediateNextSteps.length > 0 && (
                <CollapsibleSection
                  title="Immediate next moves"
                  theme={getSectionTheme("Next moves")}
                  isOpen={openSections.has("next-steps")}
                  onToggle={() => toggleSection("next-steps")}
                >
                  <ul className="space-y-2 text-sm text-slate-700">
                    {immediateNextSteps.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 text-brand-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
            </div>
          )}

            {decisionChecklist.length > 0 && (
              <CollapsibleSection
                title="Decision checkpoint"
                theme={getSectionTheme("Decision checkpoint")}
                isOpen={openSections.has("decision")}
                onToggle={() => toggleSection("decision")}
              >
              <ul className="space-y-2 text-sm text-slate-700">
                {decisionChecklist.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 text-brand-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

            {roadmapMarkdown && (
              <CollapsibleSection
                title="30/60/90 day outlook"
                theme={getSectionTheme("30/60/90 day outlook")}
                isOpen={openSections.has("roadmap")}
                onToggle={() => toggleSection("roadmap")}
              >
              <div className="grid gap-4 md:grid-cols-3">
                {["0-30 Days", "30-60 Days", "60-90 Days"].map((window, index) => (
                  <div key={window} className="rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-inner">
                    <p className="text-xs uppercase tracking-wide text-brand-500">{window}</p>
                    <div className="mt-2 text-sm text-slate-700">
                      <ReactMarkdown>
                        {extractTimelineSlice(roadmapMarkdown, index)}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

            {additionalSections.length > 0 && (
              <CollapsibleSection
                title="Additional insights"
                theme={getSectionTheme("Additional insights")}
                isOpen={openSections.has("additional")}
                onToggle={() => toggleSection("additional")}
              >
              <div className="grid gap-4">
                {additionalSections.map((section) => (
                  <div key={section.heading} className="rounded-2xl border border-slate-100 bg-white/90 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {formatSectionHeading(section.heading)}
                    </h3>
                    <div className="mt-3 prose prose-slate">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Action Items Section */}
          {isAuthenticated && (
            <CollapsibleSection
              title="Action Items"
              description="Track your progress on this idea. Mark items as completed as you work through them."
              theme={getSectionTheme("Action Items")}
              isOpen={openSections.has("actions")}
              onToggle={() => toggleSection("actions")}
            >
              <div className="space-y-4">
                {/* Add new action */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleCreateAction()}
                    placeholder="Add a new action item..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    onClick={handleCreateAction}
                    disabled={!newActionText.trim()}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {/* Actions list */}
                {loadingActions ? (
                  <p className="text-sm text-slate-500">Loading actions...</p>
                ) : actions.length === 0 ? (
                  <p className="text-sm text-slate-500">No action items yet. Add one above to get started!</p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <select
                          value={action.status}
                          onChange={(e) => handleUpdateAction(action.id, e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                        <span
                          className={`flex-1 text-sm ${
                            action.status === "completed" ? "line-through text-slate-500" : "text-slate-900"
                          }`}
                        >
                          {action.action_text}
                        </span>
                        {action.due_date && (() => {
                          try {
                            const dueDate = new Date(action.due_date);
                            if (!isNaN(dueDate.getTime())) {
                              return (
                                <span className="text-xs text-slate-500">
                                  Due: {dueDate.toLocaleDateString()}
                                </span>
                              );
                            }
                          } catch (e) {
                            // Invalid date, don't show
                          }
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Notes Section */}
          {isAuthenticated && (
            <CollapsibleSection
              title="Notes & Journal"
              description="Capture your thoughts, insights, customer feedback, and research findings for this idea."
              theme={getSectionTheme("Notes")}
              isOpen={openSections.has("notes")}
              onToggle={() => toggleSection("notes")}
            >
              <div className="space-y-4">
                {/* Add new note */}
                <div className="space-y-2">
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add a note... (e.g., customer interview insights, pivot ideas, market research)"
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    onClick={handleCreateNote}
                    disabled={!newNoteContent.trim()}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    Save Note
                  </button>
                </div>

                {/* Notes list */}
                {loadingNotes ? (
                  <p className="text-sm text-slate-500">Loading notes...</p>
                ) : notes.length === 0 ? (
                  <p className="text-sm text-slate-500">No notes yet. Add one above to start tracking your insights!</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            {note.created_at ? (() => {
                              try {
                                const date = new Date(note.created_at);
                                return isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
                              } catch (e) {
                                return "Unknown date";
                              }
                            })() : "Unknown date"}
                          </span>
                          {note.updated_at && note.created_at && note.updated_at !== note.created_at && (
                            <span className="text-xs text-slate-400">(edited)</span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-900">{note.content}</p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {note.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              to={runQuery ? `/results/recommendations/full?id=${runQuery}` : "/results/recommendations/full"}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:text-brand-800"
            >
              View full recommendation report
            </Link>
            <Link
              to={backPath}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-800"
            >
              Back to top ideas
            </Link>
          </div>

          {/* Explore other ideas section removed based on feedback */}
        </>
      )}
    </section>
  );
}

function ProfilePanels({ inputs }) {
  const panels = useMemo(() => buildProfilePanels(inputs), [inputs]);
  if (!panels.length) return null;

  const columnClass =
    panels.length === 1 ? "md:grid-cols-1" : panels.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

  return (
    <div className={`mt-5 grid gap-4 ${columnClass}`}>
      {panels.map(({ title, icon, items, theme }, index) => (
        <div
          key={`${title}-${index}`}
          className={`rounded-3xl border ${theme.border} ${theme.background} p-5 shadow-[0_18px_40px_-32px_rgba(34,79,175,0.25)] transition`}
        >
          <div className="flex items-start justify-between">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${theme.icon}`}>
              {icon}
            </span>
            <p className={`text-xs font-semibold uppercase tracking-wide ${theme.title}`}>{title}</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-cloud-800">
            {items.map(({ label, value }) => (
              <li key={label} className="leading-relaxed">
                <span className={`font-semibold ${theme.label}`}>{label}:</span> {value}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const PANEL_THEMES = [
  {
    background: "bg-gradient-to-br from-brand-50 via-white to-aqua-50",
    border: "border-brand-100",
    icon: "bg-brand-100 text-brand-700",
    title: "text-brand-700",
    label: "text-brand-700",
  },
  {
    background: "bg-gradient-to-br from-coral-50 via-white to-sand-50",
    border: "border-coral-100",
    icon: "bg-coral-100 text-coral-600",
    title: "text-coral-600",
    label: "text-coral-600",
  },
  {
    background: "bg-gradient-to-br from-aqua-50 via-white to-brand-50",
    border: "border-aqua-100",
    icon: "bg-aqua-100 text-aqua-600",
    title: "text-aqua-600",
    label: "text-aqua-600",
  },
];

function buildProfilePanels(inputs = {}) {
  const cleaned = {
    goal: personalizeCopy(inputs?.goal_type ?? ""),
    focus: personalizeCopy(inputs?.sub_interest_area ?? inputs?.interest_area ?? ""),
    time: personalizeCopy(inputs?.time_commitment ?? ""),
    budget: personalizeCopy(inputs?.budget_range ?? ""),
    workStyle: personalizeCopy(inputs?.work_style ?? ""),
    skill: personalizeCopy(inputs?.skill_strength ?? ""),
    experience: personalizeCopy(inputs?.experience_summary ?? ""),
  };

  const panels = [];

  if (cleaned.goal || cleaned.focus) {
    panels.push({
      title: "Direction",
      icon: "🎯",
      theme: PANEL_THEMES[0],
      items: [
        cleaned.goal && { label: "Goal", value: cleaned.goal },
        cleaned.focus && { label: "Focus", value: cleaned.focus },
      ].filter(Boolean),
    });
  }

  if (cleaned.time || cleaned.budget) {
    panels.push({
      title: "Capacity",
      icon: "⏳",
      theme: PANEL_THEMES[1],
      items: [
        cleaned.time && { label: "Time commitment", value: cleaned.time },
        cleaned.budget && { label: "Budget", value: cleaned.budget },
      ].filter(Boolean),
    });
  }

  if (cleaned.workStyle || cleaned.skill || cleaned.experience) {
    panels.push({
      title: "Strengths",
      icon: "💪",
      theme: PANEL_THEMES[2],
      items: [
        cleaned.workStyle && { label: "Work style", value: cleaned.workStyle },
        cleaned.skill && { label: "Skill", value: cleaned.skill },
        cleaned.experience && { label: "Experience", value: truncateNarrative(cleaned.experience) },
      ].filter(Boolean),
    });
  }

  return panels.slice(0, 3);
}

function truncateNarrative(text = "", limit = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

