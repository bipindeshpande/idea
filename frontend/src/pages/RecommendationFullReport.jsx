import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../components/Seo.jsx";
import { useReports } from "../context/ReportsContext.jsx";
import { parseTopIdeas, trimFromHeading } from "../utils/markdown.js";
import {
  personalizeCopy,
  splitFullReportSections,
  extractValidationQuestions,
  buildValidationQuestions,
  parseRecommendationMatrix,
  parseRiskRows,
  buildFinancialSnapshots,
  formatSectionHeading,
  extractTimelineSlice,
  cleanNarrativeMarkdown,
  dedupeStrings,
} from "../utils/recommendationFormatters.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function stripReportHeading(markdown = "") {
  if (!markdown) return "";
  return markdown.replace(/^###\s*Comprehensive Recommendation Report\s*/i, "").trim();
}

export default function RecommendationFullReport() {
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

  const remainderMarkdown = useMemo(() => {
    if (!markdown) return "";
    let remainder = markdown;
    ideas.forEach((idea) => {
      if (idea.fullText) {
        remainder = remainder.replace(idea.fullText, "");
      }
    });
    return stripReportHeading(remainder);
  }, [markdown, ideas]);

  const runQuery = runId || currentRunId;
  const backPath = runQuery ? `/results/recommendations?id=${runQuery}` : "/results/recommendations";

  return (
    <section className="grid gap-6">
      <Seo
        title="Full Recommendation Report | Startup Idea Advisor"
        description="Review the complete recommendation report including matrix, financial outlook, risk radar, customer persona, validation plan, and roadmap."
        path="/results/recommendations/full"
      />

      <div className="flex items-center gap-3 text-sm">
        <Link to={backPath} className="inline-flex items-center gap-2 text-brand-700 hover:text-brand-800">
          <span aria-hidden="true">←</span> Back to recommendations
        </Link>
      </div>

      {!remainderMarkdown && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Full report not available</h2>
          <p className="mt-2 text-sm">
            We couldn't find additional sections beyond the top ideas. Try rerunning the crew with more context.
          </p>
        </div>
      )}

      {remainderMarkdown && (
        <FullReportContent remainderMarkdown={remainderMarkdown} inputs={inputs} />
      )}
    </section>
  );
}

function FullReportContent({ remainderMarkdown, inputs }) {
  const sections = useMemo(() => splitFullReportSections(remainderMarkdown), [remainderMarkdown]);

  const profileSummary = useMemo(() => buildConciseProfileSummary(inputs), [inputs]);
  const matrixRows = parseRecommendationMatrix(sections["recommendation matrix"]);
  const financialOutlook = buildFinancialSnapshots(sections["financial outlook"], "");
  const riskRows = parseRiskRows(sections["risk radar"]);
  const validationQuestions = buildValidationQuestions(
    sections["validation questions"],
    "your top ideas",
    "",
    ""
  );
  const roadmapMarkdown = sections["30/60/90 day roadmap"];
  const decisionChecklist = dedupeStrings(extractValidationQuestions(sections["decision checklist"]));

  const otherSections = Object.entries(sections)
    .filter(
      ([key]) =>
        ![
          "profile fit summary",
          "recommendation matrix",
          "financial outlook",
          "risk radar",
          "customer persona",
          "validation questions",
          "30/60/90 day roadmap",
          "decision checklist",
        ].includes(key)
    )
    .map(([key, value]) => ({ heading: key, content: value }));

  return (
    <div className="grid gap-6">
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">Full recommendation report</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review the matrix, financial outlook, risk radar, persona, validation plan, roadmap, and decision checklist so
          you can move forward confidently.
        </p>
      </article>


      {matrixRows.length > 0 && (
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">Recommendation matrix</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Idea</th>
                  <th className="px-4 py-3">Goal Fit</th>
                  <th className="px-4 py-3">Time Fit</th>
                  <th className="px-4 py-3">Budget Fit</th>
                  <th className="px-4 py-3">Skill Fit</th>
                  <th className="px-4 py-3">Work Style Fit</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixRows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 font-semibold text-slate-500">{row.order}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.idea}</td>
                    <td className="px-4 py-3 text-slate-700">{row.goal}</td>
                    <td className="px-4 py-3 text-slate-700">{row.time}</td>
                    <td className="px-4 py-3 text-slate-700">{row.budget}</td>
                    <td className="px-4 py-3 text-slate-700">{row.skill}</td>
                    <td className="px-4 py-3 text-slate-700">{row.workStyle}</td>
                    <td className="px-4 py-3 text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {financialOutlook.length > 0 && (
        <article className="rounded-3xl border border-amber-100 bg-amber-50/80 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">Financial outlook</h2>
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
                {financialOutlook.map(({ focus, estimate, metric }, index) => (
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

      {riskRows.length > 0 && (
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">Risk radar</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3 w-32">Severity</th>
                  <th className="px-4 py-3">Mitigation</th>
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

      {sections["customer persona"] && (
        <article className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">Customer persona</h2>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-inner">
            <ReactMarkdown>{cleanNarrativeMarkdown(sections["customer persona"])}</ReactMarkdown>
          </div>
        </article>
      )}

      {validationQuestions.length > 0 && (
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <header className="space-y-1">
            <h2 className="text-2xl font-semibold text-slate-900">Validation questions</h2>
            <p className="text-sm text-slate-500">
              Use these prompts in discovery conversations or lightweight surveys to confirm demand, buying triggers, and
              budget fit. Treat responses as go/no-go signals before committing more cycles.
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

      {roadmapMarkdown && (
        <article className="rounded-3xl border border-brand-100 bg-brand-50/70 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">30/60/90 day roadmap</h2>
          <p className="mt-2 text-sm text-slate-600">
            Split execution into focused sprints that move from validation to launch. Refresh these milestones as real-world feedback arrives.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {["0-30 Days", "30-60 Days", "60-90 Days"].map((window, index) => (
              <div key={window} className="rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{window}</p>
                <div className="mt-2 text-sm text-slate-700">
                  <ReactMarkdown>
                    {extractTimelineSlice(personalizeCopy(roadmapMarkdown), index)}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {decisionChecklist.length > 0 && (
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">Decision checklist</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {decisionChecklist.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-1 text-brand-500">•</span>
                <span>{cleanNarrativeMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        </article>
      )}

      {otherSections.map((section) => (
        <article key={section.heading} className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold text-slate-900">{formatSectionHeading(section.heading)}</h2>
          <div className="mt-4 prose prose-slate">
            <ReactMarkdown>{personalizeCopy(section.content)}</ReactMarkdown>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildConciseProfileSummary(inputs = {}) {
  if (!inputs || Object.keys(inputs).length === 0) return [];

  const sections = [];

  // Section 1: Direction (Goal + Focus) - Brand theme
  const directionItems = [];
  
  if (inputs.goal_type) {
    const goalRationale = {
      "Extra Income": "Ideas that generate quick revenue without full-time commitment",
      "Replace Full-Time Job": "Ideas with scalable income potential and clear growth path",
      "Passive Income": "Ideas with recurring revenue models and minimal ongoing effort",
      "Passion Project": "Ideas aligned with personal interests and long-term fulfillment",
      "Social Impact / Non-Profit": "Ideas focused on mission-driven outcomes and community benefit",
      "Tech-Driven Venture": "Ideas leveraging technology for competitive advantage",
      "Consulting / Knowledge Business": "Ideas that monetize expertise and relationships",
      "Experimental / Learning Project": "Ideas with low risk and high learning potential",
    }[inputs.goal_type] || "Ideas aligned with your primary objective";
    
    directionItems.push({
      parameter: `Goal: ${inputs.goal_type}`,
      rationale: goalRationale,
    });
  }

  const focusArea = inputs.sub_interest_area || inputs.interest_area;
  if (focusArea) {
    directionItems.push({
      parameter: `Focus: ${focusArea}`,
      rationale: "Ideas in this domain where you can leverage existing knowledge and networks",
    });
  }

  if (directionItems.length > 0) {
    sections.push({
      title: "Direction",
      items: directionItems,
    });
  }

  // Section 2: Capacity (Time + Budget) - Coral theme
  const capacityItems = [];

  if (inputs.time_commitment) {
    const timeRationale = {
      "<5 hrs/week": "Ideas that validate and launch with minimal weekly time",
      "5–10 hrs/week": "Ideas with structured sprints that fit part-time schedules",
      "10–20 hrs/week": "Ideas that can scale with consistent weekly effort",
      "Full-time": "Ideas requiring dedicated focus and rapid iteration",
    }[inputs.time_commitment] || "Ideas matching your available time";
    
    capacityItems.push({
      parameter: `Time: ${inputs.time_commitment}`,
      rationale: timeRationale,
    });
  }

  if (inputs.budget_range) {
    const budgetRationale = {
      "Free / Sweat-equity only": "Ideas that launch with tools you already have",
      "< $1 K": "Ideas with minimal upfront costs and fast validation cycles",
      "Up to $5 K": "Ideas that can prototype and test with lean capital",
      "Up to $10 K": "Ideas requiring some tooling or initial marketing spend",
      "Up to $20 K": "Ideas with moderate setup costs and growth runway",
      "$20 K and Above": "Ideas with higher initial investment and return potential",
    }[inputs.budget_range] || "Ideas within your budget constraints";
    
    capacityItems.push({
      parameter: `Budget: ${inputs.budget_range}`,
      rationale: budgetRationale,
    });
  }

  if (capacityItems.length > 0) {
    sections.push({
      title: "Capacity",
      items: capacityItems,
    });
  }

  // Section 3: Strengths (Skills + Work Style + Background) - Aqua theme
  const strengthsItems = [];

  if (inputs.skill_strength) {
    const skillRationale = {
      "Technical / Automation": "Ideas that leverage your technical skills for competitive moats",
      "Analytical / Strategic": "Ideas requiring data-driven decision-making and planning",
      "Creative / Design": "Ideas where design and creativity drive differentiation",
      "Operational / Process": "Ideas that benefit from efficient systems and workflows",
      "Communication / Community": "Ideas that grow through relationships and community building",
      "Financial / Analytical": "Ideas requiring financial modeling and unit economics",
      "Research / Insight-Driven": "Ideas that solve problems through deep understanding",
      "Other / Mixed": "Ideas that combine multiple skill sets for unique positioning",
    }[inputs.skill_strength] || "Ideas that play to your core strengths";
    
    strengthsItems.push({
      parameter: `Strength: ${inputs.skill_strength}`,
      rationale: skillRationale,
    });
  }

  if (inputs.work_style) {
    const workStyleRationale = {
      "Solo": "Ideas you can execute independently with minimal dependencies",
      "Small Team": "Ideas that benefit from 2-3 person collaboration",
      "Community-Based": "Ideas that grow through community engagement and networks",
      "Remote Only": "Ideas that operate entirely online without physical presence",
      "Requires Physical Presence": "Ideas that need in-person interaction or location-based services",
    }[inputs.work_style] || "Ideas matching your preferred work structure";
    
    strengthsItems.push({
      parameter: `Work style: ${inputs.work_style}`,
      rationale: workStyleRationale,
    });
  }

  if (inputs.experience_summary && inputs.experience_summary.trim().length > 0) {
    const exp = inputs.experience_summary.trim();
    const truncated = exp.length > 60 ? `${exp.slice(0, 57)}...` : exp;
    strengthsItems.push({
      parameter: "Background",
      rationale: `Your experience in ${truncated} informs which ideas have the best execution fit`,
    });
  }

  if (strengthsItems.length > 0) {
    sections.push({
      title: "Strengths",
      items: strengthsItems,
    });
  }

  return sections;
}



