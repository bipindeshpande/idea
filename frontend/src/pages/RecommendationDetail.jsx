import { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../components/Seo.jsx";
import { useReports } from "../context/ReportsContext.jsx";
import { parseTopIdeas, trimFromHeading } from "../utils/markdown.js";
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
} from "../utils/recommendationFormatters.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RecommendationDetail() {
  const { ideaIndex } = useParams();
  const { reports, loadRunById, currentRunId, inputs } = useReports();
  const query = useQuery();
  const runId = query.get("id");

  useEffect(() => {
    if (runId) {
      loadRunById(runId);
    }
  }, [runId, loadRunById]);

  const markdown = useMemo(
    () => trimFromHeading(reports?.personalized_recommendations ?? "", "### Comprehensive Recommendation Report"),
    [reports]
  );

  const ideas = useMemo(() => parseTopIdeas(markdown, 10), [markdown]);
  const numericIndex = Number.parseInt(ideaIndex ?? "", 10);
  const activeIdea = ideas.find((idea) => idea.index === numericIndex);

  const runQuery = runId || currentRunId;
  const backPath = runQuery ? `/results/recommendations?id=${runQuery}` : "/results/recommendations";

  const sections = useMemo(() => (activeIdea ? splitIdeaSections(activeIdea.body) : {}), [activeIdea]);

  const whyFit = useMemo(() => extractWhyFit(sections["why it fits now"]), [sections]);
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
    () => buildFinancialSnapshots(sections["financial snapshot"], activeIdea?.title || ""),
    [sections, activeIdea?.title]
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
    if (whyFit.length > 0) {
      return whyFit[0];
    }
    if (sections.intro) {
      const introText = personalizeCopy(sections.intro);
      const firstSentence = introText.split(/(?<=[.!?])\s+/)[0];
      if (firstSentence) {
        return firstSentence;
      }
    }
    return "This idea aligns with your goals, strengths, and capacity.";
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
  const fitNarrativeMarkdown = useMemo(
    () => sections["why it fits now"] || sections.intro || "",
    [sections]
  );
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
      "why it fits now",
      "execution path",
      "financial snapshot",
      "key risks & mitigations",
      "validation questions",
      "customer persona",
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

      <div className="flex items-center gap-3 text-sm">
        <Link to={backPath} className="inline-flex items-center gap-2 text-brand-700 hover:text-brand-800">
          <span aria-hidden="true">←</span> Back to recommendations
        </Link>
      </div>

      {!markdown && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">No report available</h2>
          <p className="mt-2 text-sm">
            We couldn’t find a saved recommendation report. Return to the home page to run a new session.
          </p>
        </div>
      )}

      {activeIdea && (
        <>
          <article className="rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-8 py-10 text-white shadow-soft shadow-brand-300/50">
            <p className="text-xs uppercase tracking-wide text-white/80">Idea #{activeIdea.index}</p>
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

          {(fitNarrativeMarkdown || fitHighlights.length > 0) && (
            <article className="rounded-3xl border border-brand-100 bg-white/95 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-slate-900">Why this Idea Fits You</h2>
              <p className="mt-2 text-sm text-slate-500">
                Quick recap of what you shared and the advantages you bring into this idea.
              </p>
              <ProfilePanels inputs={inputs} />
              {fitNarrativeMarkdown && (
                <div className="mt-6 prose prose-slate">
                  <ReactMarkdown>{cleanNarrativeMarkdown(fitNarrativeMarkdown)}</ReactMarkdown>
                </div>
              )}
              {fitHighlights.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Highlights in plain language
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {fitHighlights.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 text-brand-500">•</span>
                        <span>{cleanNarrativeMarkdown(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}

          {financialSnapshot.length > 0 && (
            <article className="rounded-3xl border border-amber-100 bg-amber-50/80 p-8 shadow-soft shadow-amber-200/60">
              <h2 className="text-2xl font-semibold text-slate-900">Financial snapshot</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-amber-100 bg-white">
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
            </article>
          )}

            {executionPhaseCards.length > 0 && (
              <article className="rounded-3xl border border-brand-100 bg-white/95 p-8 shadow-soft">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Execution roadmap</h2>
                  <p className="text-sm text-slate-500">
                    Move from validation to scale with focused sprints that match your capacity.
                  </p>
                </div>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
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
            </article>
          )}

          {riskRows.length > 0 && (
            <article className="rounded-3xl border border-rose-100 bg-rose-50/70 p-8 shadow-soft shadow-rose-200/50">
              <h2 className="text-2xl font-semibold text-slate-900">Risk radar</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
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
            </article>
          )}

          {(marketInsights.length > 0 || personaMarkdown) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {marketInsights.length > 0 && (
                <article className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-white p-8 shadow-soft">
                  <h2 className="text-2xl font-semibold text-slate-900">Market signals</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Trends and proof points worth validating as you move forward.
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-700">
                    {marketInsights.map((insight, index) => (
                      <li
                        key={index}
                        className="flex gap-3 rounded-2xl border border-teal-100 bg-white/90 p-3 shadow-inner"
                      >
                        <span className="mt-1 text-teal-500">📈</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
              {personaMarkdown && (
                <article className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-8 shadow-soft">
                  <h2 className="text-2xl font-semibold text-slate-900">Customer persona</h2>
                  <div className="mt-4 rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-inner">
                    <ReactMarkdown>{cleanNarrativeMarkdown(personaMarkdown)}</ReactMarkdown>
                  </div>
                </article>
              )}
            </div>
          )}

          {(validationQuestions.length > 0 ||
            immediateExperimentsList.length > 0 ||
            immediateNextSteps.length > 0) && (
            <div className="grid gap-6">
              {validationQuestions.length > 0 && (
                <article className="rounded-3xl border border-brand-100 bg-white/95 p-8 shadow-soft">
                  <header className="space-y-1">
                    <h2 className="text-2xl font-semibold text-slate-900">Validation questions</h2>
                    <p className="text-sm text-slate-500">
                      Ask these during discovery interviews, quick surveys, or pilot onboarding to confirm demand,
                      willingness to pay, and whether the idea solves the right pain. Capture verbatims and note which
                      answers indicate a fast “go” versus red flags that require pivots.
                    </p>
                  </header>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {validationQuestions.map(({ question, listenFor, actOn }, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-slate-800 shadow-inner"
                      >
                        <p className="font-semibold text-brand-700">Question {index + 1}</p>
                        <p className="mt-2 text-sm">{question}</p>
                        <p className="mt-3 text-xs text-slate-500">
                          <strong>What to listen for:</strong> {listenFor}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          <strong>Act on it:</strong> {actOn}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              )}
              {immediateExperimentsList.length > 0 && (
                <article className="rounded-3xl border border-amber-100 bg-amber-50/70 p-8 shadow-soft">
                  <h2 className="text-2xl font-semibold text-slate-900">Experiments to run next</h2>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {immediateExperimentsList.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 text-brand-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
              {immediateNextSteps.length > 0 && (
                <article className="rounded-3xl border border-brand-100 bg-white/95 p-8 shadow-soft">
                  <h2 className="text-2xl font-semibold text-slate-900">Immediate next moves</h2>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {immediateNextSteps.map((item, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 text-brand-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          )}

            {decisionChecklist.length > 0 && (
              <article className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-slate-900">Decision checkpoint</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {decisionChecklist.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 text-brand-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          )}

            {roadmapMarkdown && (
              <article className="rounded-3xl border border-brand-100 bg-brand-50/70 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-slate-900">30/60/90 day outlook</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            </article>
          )}

            {additionalSections.length > 0 && (
              <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
              <h2 className="text-2xl font-semibold text-slate-900">Additional insights</h2>
              <div className="mt-4 grid gap-4">
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
            </article>
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
