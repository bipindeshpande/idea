import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
// Lazy load PDF dependencies - only load when needed
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
import Seo from "../../components/common/Seo.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { parseTopIdeas, trimFromHeading } from "../../utils/markdown/markdown.js";
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
  buildFinalConclusion,
} from "../../utils/formatters/recommendationFormatters.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function stripReportHeading(markdown = "") {
  if (!markdown) return "";
  return markdown.replace(/^###\s*Comprehensive Recommendation Report\s*/i, "").trim();
}

function FitBadge({ value }) {
  if (!value) return <span className="text-slate-500">-</span>;
  
  const normalized = value.toLowerCase();
  let bgColor = "bg-slate-100";
  let textColor = "text-slate-700";
  
  // High/Strong/Strongly aligned
  if (normalized.includes("high") || normalized.includes("strong") || normalized.includes("strongly")) {
    bgColor = "bg-emerald-100";
    textColor = "text-emerald-700";
  }
  // Medium/Moderate/Aligned
  else if (normalized.includes("medium") || normalized.includes("moderate") || normalized.includes("aligned")) {
    bgColor = "bg-amber-100";
    textColor = "text-amber-700";
  }
  // Low/Minor
  else if (normalized.includes("low") || normalized.includes("minor")) {
    bgColor = "bg-coral-100";
    textColor = "text-coral-700";
  }
  // Within range/Matches preferences/Leverages strengths
  else if (normalized.includes("within") || normalized.includes("matches") || normalized.includes("leverages")) {
    bgColor = "bg-brand-100";
    textColor = "text-brand-700";
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {value}
    </span>
  );
}

const SAMPLE_REPORT = `### Comprehensive Recommendation Report

### 1. AI-Powered Personal Finance Assistant
- **Summary**: An intelligent assistant that helps users track expenses, optimize budgets, and make smarter financial decisions using AI-powered insights and automation.
- **Why it fits now**: Your technical background and interest in automation make this a natural fit. The market for personal finance tools is growing, and there's room for AI-enhanced solutions that go beyond basic budgeting.

### 2. Niche SaaS for Freelancers
- **Summary**: A specialized SaaS platform designed specifically for freelancers, offering project management, invoicing, client communication, and tax preparation in one integrated solution.
- **Why it fits now**: With your product development skills and understanding of workflow optimization, you can create a solution that addresses the fragmented tool landscape freelancers face.

### 3. Content Creation Platform
- **Summary**: A platform that combines AI-powered content generation with collaboration tools, helping creators produce, edit, and distribute content more efficiently.
- **Why it fits now**: Your creative and technical skills align well with the content creation market, which is rapidly adopting AI tools to scale production.

#### Recommendation Matrix

| **Idea** | **Goal Alignment** | **Time Commitment** | **Budget** | **Skill Fit** | **Work Style** |
|----------|-------------------|---------------------|------------|---------------|----------------|
| **1. AI-Powered Personal Finance Assistant** | High | ≤ 5 hours/week | $3K Estimated | High (Technical + Design) | Strongly aligned |
| **2. Niche SaaS for Freelancers** | Medium | ≤ 5 hours/week | $5K Estimated | Medium (Product + Marketing) | Aligned |
| **3. Content Creation Platform** | High | ≤ 5 hours/week | $4K Estimated | High (Creative + Technical) | Strongly aligned |

#### Financial Outlook

- **Startup costs**: $3,000–$5,000 for initial setup (tools, hosting, basic marketing)
- **Monthly operating costs**: $200–$500 (SaaS subscriptions, infrastructure)
- **Revenue potential**: $1,000–$3,000/month within 6 months with 50–100 paying users
- **Breakeven timeline**: 3–6 months at $29–$49/month pricing
- **Profit margin**: 60–70% after initial setup costs

#### Risk Radar

- **Market saturation** (Medium severity): Mitigation: Focus on a specific niche or unique angle that larger players ignore. Validate demand through pre-launch waitlist.
- **Technical complexity** (Low severity): Mitigation: Start with no-code tools (Bubble, Retool) or leverage existing APIs to reduce development time.
- **Customer acquisition cost** (Medium severity): Mitigation: Use content marketing and community building to reduce paid acquisition dependency.

#### Customer Persona

**Primary**: Tech-savvy professionals (25–40) seeking productivity tools, willing to pay $29–$49/month for solutions that save 5+ hours/week.

**Secondary**: Small business owners looking for affordable automation tools to streamline operations.

#### Validation Questions

1. What's the biggest pain point you face in managing your finances/workflow?
   - What to listen for: Specific scenarios, frequency of the problem, current workarounds
   - Act on it: Use responses to refine value proposition and feature prioritization

2. How much time do you currently spend on this task per week?
   - What to listen for: Quantified time investment, willingness to pay for time savings
   - Act on it: Calculate ROI messaging and pricing strategy

3. What tools or solutions have you tried before?
   - What to listen for: Gaps in existing solutions, switching barriers
   - Act on it: Position your solution to address specific gaps

#### 30/60/90 Day Roadmap

**Days 0–30**: Validate core assumptions
- Build landing page with clear value proposition
- Run 10 customer interviews using validation questions
- Collect 20+ waitlist sign-ups
- Test pricing sensitivity ($29 vs $49/month)

**Days 30–60**: Build MVP
- Develop core features using no-code tools or minimal code
- Onboard 5 beta users for feedback
- Iterate based on usage data and feedback
- Set up basic analytics and tracking

**Days 60–90**: Launch and iterate
- Public launch with pricing in place
- Focus on content marketing and community building
- Aim for 20–30 paying customers
- Plan next feature set based on user feedback

#### Decision Checklist

- [ ] Validated problem-solution fit through interviews
- [ ] Confirmed willingness to pay at target price point
- [ ] Identified clear differentiation from competitors
- [ ] Secured initial budget for tools and marketing
- [ ] Committed to 5 hours/week for next 90 days
- [ ] Have backup plan if initial idea needs pivoting`;

const SAMPLE_PROFILE_ANALYSIS = `## 1. Core Motivations and Objective Framing

You're looking to generate extra income while maintaining flexibility. Your interest in technology and automation suggests you value efficiency and scalable solutions.

## 2. Operating Constraints

- **Time**: Limited to ≤ 5 hours/week, requiring solutions that can be built and managed part-time
- **Budget**: Working with a lean budget, prioritizing cost-effective tools and strategies
- **Work style**: Prefer structured, systematic approaches that allow for incremental progress

## 3. Opportunity Angles

Given your technical background and interest in automation, there are several opportunity angles:
- SaaS products that solve specific workflow problems
- Tools that leverage AI to reduce manual work
- Platforms that connect service providers with customers

## 4. Strengths

- Technical skills enable rapid prototyping and iteration
- Understanding of product development and user needs
- Ability to work independently and systematically

## 5. Strategic Considerations

Focus on ideas that:
- Can be validated quickly with minimal investment
- Have clear monetization paths
- Leverage your existing skills and knowledge
- Can scale without requiring full-time commitment initially`;

const SAMPLE_INPUTS = {
  goal_type: "Extra Income",
  time_commitment: "≤ 5 hours/week",
  budget_range: "Up to $5 K",
  interest_area: "Technology",
  sub_interest_area: "Automation",
  work_style: "Structured",
  skill_strength: "Technical",
};

export default function RecommendationFullReport() {
  const { reports, loadRunById, currentRunId, inputs, loading } = useReports();
  const query = useQuery();
  const runId = query.get("id");
  const isSample = query.get("sample") === "true";
  const pdfRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (runId && !isSample) {
      loadRunById(runId);
    } else if (!runId && !isSample && currentRunId) {
      // If no runId in URL but we have a currentRunId, load it
      loadRunById(currentRunId);
    }
  }, [runId, loadRunById, isSample, currentRunId]);

  // Use sample data if in sample mode
  const effectiveReports = isSample
    ? { personalized_recommendations: SAMPLE_REPORT, profile_analysis: SAMPLE_PROFILE_ANALYSIS }
    : reports;
  
  const effectiveInputs = isSample ? SAMPLE_INPUTS : inputs;

  const markdown = useMemo(
    () => trimFromHeading(effectiveReports?.personalized_recommendations ?? "", "### Comprehensive Recommendation Report"),
    [effectiveReports]
  );

  const ideas = useMemo(() => parseTopIdeas(markdown, 10), [markdown]);
  const topIdeas = ideas.slice(0, 3);

  // For sample mode, use the sample report directly without removing ideas
  const sampleRemainderMarkdown = useMemo(() => {
    if (!isSample) return "";
    // Extract everything after the ideas (from Recommendation Matrix onwards)
    const matrixIndex = SAMPLE_REPORT.indexOf("#### Recommendation Matrix");
    if (matrixIndex > 0) {
      return SAMPLE_REPORT.slice(matrixIndex).replace(/^#### /, "#### ");
    }
    return SAMPLE_REPORT.replace(/### Comprehensive Recommendation Report\n\n/, "")
      .replace(/### \d+\. [^\n]+[\s\S]*?(?=#### |$)/g, "")
      .trim();
  }, [isSample]);

  const remainderMarkdown = useMemo(() => {
    if (isSample) return sampleRemainderMarkdown;
    if (!markdown) return "";
    
    // Strategy 1: Find section headings (Recommendation Matrix, Financial Outlook, etc.)
    const sectionPatterns = [
      /(?:^|\n)(?:####?\s*)?(?:Recommendation Matrix|Recommendation\s+Matrix)/i,
      /(?:^|\n)(?:####?\s*)?(?:Financial Outlook|Financial\s+Outlook)/i,
      /(?:^|\n)(?:####?\s*)?(?:Risk Radar|Risk\s+Radar)/i,
      /(?:^|\n)(?:####?\s*)?(?:Customer Persona|Customer\s+Persona)/i,
      /(?:^|\n)(?:####?\s*)?(?:Validation Questions|Validation\s+Questions)/i,
      /(?:^|\n)(?:####?\s*)?(?:30\/60\/90 Day Roadmap|30\/60\/90\s+Day\s+Roadmap)/i,
      /(?:^|\n)(?:####?\s*)?(?:Decision Checklist|Decision\s+Checklist)/i,
    ];
    
    for (const pattern of sectionPatterns) {
      const match = markdown.match(pattern);
      if (match && match.index !== undefined) {
        // Extract everything from this section onwards
        const remainder = markdown.slice(match.index).trim();
        const cleaned = stripReportHeading(remainder);
        if (cleaned.length > 50) {
          return cleaned;
        }
      }
    }
    
    // Strategy 2: Remove ideas more carefully, preserving everything else
    let remainder = markdown;
    
    // Sort ideas by index in reverse order to avoid index shifting issues
    const sortedIdeas = [...ideas].sort((a, b) => {
      const aIndex = markdown.indexOf(a.fullText || '');
      const bIndex = markdown.indexOf(b.fullText || '');
      return bIndex - aIndex; // Remove from end to start
    });
    
    sortedIdeas.forEach((idea) => {
      if (idea.fullText) {
        const fullTextIndex = remainder.indexOf(idea.fullText);
        if (fullTextIndex >= 0) {
          // Remove only this specific occurrence
          remainder = remainder.slice(0, fullTextIndex) + remainder.slice(fullTextIndex + idea.fullText.length);
        }
      }
    });
    
    const cleaned = stripReportHeading(remainder).trim();
    
    // Only return if there's substantial content left
    if (cleaned.length > 50) {
      return cleaned;
    }
    
    // Strategy 3: Use splitFullReportSections to extract sections
    try {
      const sections = splitFullReportSections(markdown);
      const sectionKeys = ["recommendation matrix", "financial outlook", "risk radar", "customer persona", "validation questions", "30/60/90 day roadmap", "decision checklist"];
      
      for (const key of sectionKeys) {
        if (sections[key] && sections[key].trim().length > 50) {
          // Reconstruct from this section onwards
          const sectionIndex = sectionKeys.indexOf(key);
          const remainingSections = sectionKeys.slice(sectionIndex).map(k => {
            if (sections[k]) {
              const heading = k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return `#### ${heading}\n\n${sections[k]}`;
            }
            return '';
          }).filter(Boolean).join('\n\n');
          
          if (remainingSections.length > 50) {
            return remainingSections;
          }
        }
      }
    } catch (e) {
      // If splitFullReportSections fails, continue
      console.warn("Failed to parse sections:", e);
    }
    
    return "";
  }, [markdown, ideas, isSample, sampleRemainderMarkdown]);

  const runQuery = runId || currentRunId;
  const backPath = runQuery ? `/results/recommendations?id=${runQuery}` : "/results/recommendations";

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || downloading) return;
    try {
      setDownloading(true);
      
      // Lazy load heavy PDF dependencies only when needed
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      const canvas = await html2canvas(pdfRef.current, { 
        scale: 1.5, 
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multi-page PDF
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`startup-idea-advisor-complete-report-${runQuery || Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="grid gap-6">
      <Seo
        title="Full Recommendation Report | Startup Idea Advisor"
        description="Review the complete recommendation report including matrix, financial outlook, risk radar, customer persona, validation plan, and roadmap."
        path="/results/recommendations/full"
      />

      {isSample && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-center">
          <p className="text-sm font-semibold text-brand-700">
            📋 Sample Report — This is a demonstration of what you'll receive
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link 
          to={isSample ? "/product" : backPath} 
          className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800"
        >
          <span aria-hidden="true">←</span> {isSample ? "Back to product" : "Back to recommendations"}
        </Link>
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={downloading || (isSample ? false : !remainderMarkdown)}
          className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:border-brand-400 hover:text-brand-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 whitespace-nowrap"
        >
          {downloading ? "Preparing PDF..." : "Download Complete Report PDF"}
        </button>
      </div>

      {/* Loading state */}
      {loading && !isSample && (
        <div className="rounded-3xl border border-brand-200 bg-brand-50/80 p-6 text-brand-800 shadow-soft">
          <h2 className="text-lg font-semibold">Loading full report...</h2>
          <p className="mt-2 text-sm">
            Please wait while we load your complete recommendation report.
          </p>
        </div>
      )}

      {/* Error state - no reports and not loading */}
      {!loading && !isSample && !reports?.personalized_recommendations && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Report not found</h2>
          <p className="mt-2 text-sm">
            Unable to load the recommendation report. Please try accessing it from the recommendations page.
          </p>
        </div>
      )}

      {/* No remainder markdown state */}
      {!loading && !isSample && reports?.personalized_recommendations && !remainderMarkdown && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Full report not available</h2>
          <p className="mt-2 text-sm">
            We couldn't find additional sections beyond the top ideas. The report may only contain the top recommendations. Try viewing the individual idea details for more information.
          </p>
        </div>
      )}

      {/* Off-screen container for PDF generation */}
      <div 
        ref={pdfRef} 
        className="absolute left-[-9999px] top-0"
        style={{ width: "210mm" }}
      >
        <CompleteReportPDF 
          profileAnalysis={effectiveReports?.profile_analysis || ""}
          topIdeas={topIdeas}
          remainderMarkdown={remainderMarkdown}
          inputs={effectiveInputs}
        />
      </div>

      {/* Visible content */}
      {remainderMarkdown ? (
        <FullReportContent remainderMarkdown={remainderMarkdown} inputs={effectiveInputs} topIdeas={topIdeas} />
      ) : (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Full report not available</h2>
          <p className="mt-2 text-sm">
            We couldn't find additional sections beyond the top ideas. Try generating new recommendations with more context.
          </p>
        </div>
      )}
    </section>
  );
}

function CompleteReportPDF({ profileAnalysis, topIdeas, remainderMarkdown, inputs }) {
  const sections = useMemo(() => splitFullReportSections(remainderMarkdown), [remainderMarkdown]);
  const matrixRows = parseRecommendationMatrix(sections["recommendation matrix"]);
  const financialOutlook = buildFinancialSnapshots(sections["financial outlook"], "", inputs?.budget_range || "");
  const riskRows = parseRiskRows(sections["risk radar"]);
  const validationQuestions = buildValidationQuestions(
    sections["validation questions"],
    "your top ideas",
    "",
    ""
  );
  const roadmapMarkdown = sections["30/60/90 day roadmap"];
  const decisionChecklist = dedupeStrings(extractValidationQuestions(sections["decision checklist"]));

  return (
    <div className="bg-white p-8 space-y-8" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* Cover/Title */}
      <div className="text-center mb-12 pb-8 border-b-2 border-brand-300">
        <h1 className="text-4xl font-bold text-brand-700 mb-4">Startup Idea Advisor</h1>
        <h2 className="text-2xl font-semibold text-slate-700">Complete Recommendation Report</h2>
        <p className="text-slate-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Profile Summary Section */}
      {profileAnalysis && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-300">Profile Summary</h2>
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-3" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-outside space-y-1 text-slate-700 mb-3 ml-5" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-outside space-y-1 text-slate-700 mb-3 ml-5" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-2" {...props} />,
              }}
            >
              {profileAnalysis}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Top Recommendations Section */}
      {topIdeas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-300">Top Startup Ideas</h2>
          <div className="overflow-hidden border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Idea</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topIdeas.map((idea) => (
                  <tr key={idea.index}>
                    <td className="px-4 py-3 font-semibold text-slate-600">{idea.index}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{idea.title}</td>
                    <td className="px-4 py-3 text-slate-600">{personalizeCopy(idea.summary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Recommendation Report Section */}
      {remainderMarkdown && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-300">Full Recommendation Report</h2>
          
          {/* Recommendation Matrix */}
          {matrixRows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Recommendation Matrix</h3>
              <div className="overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Idea</th>
                      <th className="px-3 py-2">Goal Fit</th>
                      <th className="px-3 py-2">Time Fit</th>
                      <th className="px-3 py-2">Budget Fit</th>
                      <th className="px-3 py-2">Skill Fit</th>
                      <th className="px-3 py-2">Work Style Fit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {matrixRows.map((row) => (
                      <tr key={row.order}>
                        <td className="px-3 py-2 font-semibold text-slate-600">{row.order}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{row.idea}</td>
                        <td className="px-3 py-2 text-slate-700">{row.goal}</td>
                        <td className="px-3 py-2 text-slate-700">{row.time}</td>
                        <td className="px-3 py-2 text-slate-700">{row.budget}</td>
                        <td className="px-3 py-2 text-slate-700">{row.skill}</td>
                        <td className="px-3 py-2 text-slate-700">{row.workStyle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Outlook */}
          {financialOutlook.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Financial Outlook</h3>
              <div className="overflow-hidden border border-amber-100">
                <table className="min-w-full divide-y divide-amber-100 text-sm">
                  <thead className="bg-amber-100/60 text-left uppercase tracking-wide text-amber-700">
                    <tr>
                      <th className="px-3 py-2">Focus</th>
                      <th className="px-3 py-2">Estimate</th>
                      <th className="px-3 py-2 text-right">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-slate-700">
                    {financialOutlook.map(({ focus, estimate, metric }, index) => (
                      <tr key={`${focus}-${index}`}>
                        <td className="px-3 py-2 font-semibold text-amber-800">{focus}</td>
                        <td className="px-3 py-2">{estimate}</td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-700">{metric}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk Radar */}
          {riskRows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Risk Radar</h3>
              <div className="overflow-hidden border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Risk</th>
                      <th className="px-3 py-2 w-32">Severity</th>
                      <th className="px-3 py-2">Mitigation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riskRows.map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-slate-700">{row.risk}</td>
                        <td className="px-3 py-2 text-slate-700">{row.severity}</td>
                        <td className="px-3 py-2 text-slate-700">{row.mitigation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Questions */}
          {validationQuestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Validation Questions</h3>
              <div className="space-y-3">
                {validationQuestions.map((q, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <p className="font-semibold text-slate-900 mb-2">{q.question}</p>
                    {q.listenFor && <p className="text-sm text-slate-600 mb-1"><strong>What to listen for:</strong> {q.listenFor}</p>}
                    {q.actOn && <p className="text-sm text-slate-600"><strong>Act on it:</strong> {q.actOn}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 30/60/90 Day Roadmap */}
          {roadmapMarkdown && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">30/60/90 Day Roadmap</h3>
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="text-slate-700 leading-relaxed mb-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-outside space-y-1 text-slate-700 mb-2 ml-5" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside space-y-1 text-slate-700 mb-2 ml-5" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                  }}
                >
                  {roadmapMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Decision Checklist */}
          {decisionChecklist.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Decision Checklist</h3>
              <ul className="list-disc list-outside space-y-2 text-slate-700 ml-5">
                {decisionChecklist.map((item, index) => (
                  <li key={index} className="leading-relaxed">{personalizeCopy(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SampleReportContent({ inputs }) {
  const sampleMatrixRows = [
    {
      order: 1,
      idea: "AI-Powered Personal Finance Assistant",
      goal: "High",
      time: "≤ 5 hours/week",
      budget: "$3K Estimated",
      skill: "High (Technical + Design)",
      workStyle: "Strongly aligned",
    },
    {
      order: 2,
      idea: "Niche SaaS for Freelancers",
      goal: "Medium",
      time: "≤ 5 hours/week",
      budget: "$5K Estimated",
      skill: "Medium (Product + Marketing)",
      workStyle: "Aligned",
    },
    {
      order: 3,
      idea: "Content Creation Platform",
      goal: "High",
      time: "≤ 5 hours/week",
      budget: "$4K Estimated",
      skill: "High (Creative + Technical)",
      workStyle: "Strongly aligned",
    },
  ];

  const sampleFinancialOutlook = [
    {
      focus: "Startup costs",
      estimate: "$3,000–$5,000 for initial setup (tools, hosting, basic marketing)",
      metric: "$3K–$5K",
    },
    {
      focus: "Monthly operating costs",
      estimate: "$200–$500 (SaaS subscriptions, infrastructure)",
      metric: "$200–$500/mo",
    },
    {
      focus: "Revenue potential",
      estimate: "$1,000–$3,000/month within 6 months with 50–100 paying users",
      metric: "$1K–$3K/mo",
    },
    {
      focus: "Breakeven timeline",
      estimate: "3–6 months at $29–$49/month pricing",
      metric: "3–6 months",
    },
    {
      focus: "Profit margin",
      estimate: "60–70% after initial setup costs",
      metric: "60–70%",
    },
  ];

  const sampleRiskRows = [
    {
      risk: "Market saturation",
      severity: "MEDIUM",
      mitigation: "Focus on a specific niche or unique angle that larger players ignore. Validate demand through pre-launch waitlist.",
    },
    {
      risk: "Technical complexity",
      severity: "LOW",
      mitigation: "Start with no-code tools (Bubble, Retool) or leverage existing APIs to reduce development time.",
    },
    {
      risk: "Customer acquisition cost",
      severity: "MEDIUM",
      mitigation: "Use content marketing and community building to reduce paid acquisition dependency.",
    },
  ];

  const sampleValidationQuestions = [
    {
      question: "What's the biggest pain point you face in managing your finances/workflow?",
      listenFor: "Specific scenarios, frequency of the problem, current workarounds",
      actOn: "Use responses to refine value proposition and feature prioritization",
    },
    {
      question: "How much time do you currently spend on this task per week?",
      listenFor: "Quantified time investment, willingness to pay for time savings",
      actOn: "Calculate ROI messaging and pricing strategy",
    },
    {
      question: "What tools or solutions have you tried before?",
      listenFor: "Gaps in existing solutions, switching barriers",
      actOn: "Position your solution to address specific gaps",
    },
  ];

  const sampleDecisionChecklist = [
    "Validated problem-solution fit through interviews",
    "Confirmed willingness to pay at target price point",
    "Identified clear differentiation from competitors",
    "Secured initial budget for tools and marketing",
    "Committed to 5 hours/week for next 90 days",
    "Have backup plan if initial idea needs pivoting",
  ];

  return (
    <div className="grid gap-6">
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">Full recommendation report</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review the matrix, financial outlook, risk radar, persona, validation plan, roadmap, and decision checklist so
          you can move forward confidently.
        </p>
      </article>

      {/* Recommendation Matrix */}
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Recommendation Matrix</h2>
        <p className="text-sm text-slate-600 mb-6">Compare how each idea aligns with your goals, capacity, and preferences.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Idea</th>
                <th className="px-4 py-3 font-semibold">Goal Fit</th>
                <th className="px-4 py-3 font-semibold">Time Fit</th>
                <th className="px-4 py-3 font-semibold">Budget Fit</th>
                <th className="px-4 py-3 font-semibold">Skill Fit</th>
                <th className="px-4 py-3 font-semibold">Work Style Fit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sampleMatrixRows.map((row) => (
                <tr key={row.order} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-semibold text-brand-600">{row.order}</td>
                  <td className="px-4 py-4 font-semibold text-slate-900">{row.idea}</td>
                  <td className="px-4 py-4">
                    <FitBadge value={row.goal} />
                  </td>
                  <td className="px-4 py-4">
                    <FitBadge value={row.time} />
                  </td>
                  <td className="px-4 py-4">
                    <FitBadge value={row.budget} />
                  </td>
                  <td className="px-4 py-4">
                    <FitBadge value={row.skill} />
                  </td>
                  <td className="px-4 py-4">
                    <FitBadge value={row.workStyle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Financial Outlook */}
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
              {sampleFinancialOutlook.map(({ focus, estimate, metric }, index) => (
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

      {/* Risk Radar */}
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
              {sampleRiskRows.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-slate-700">{row.risk}</td>
                  <td className="px-4 py-3 text-slate-700">{row.severity}</td>
                  <td className="px-4 py-3 text-slate-700">{row.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Validation Questions */}
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Validation questions</h2>
        <p className="text-sm text-slate-600 mb-6">
          Use these questions to validate your idea with potential customers. Each question includes guidance on what to listen for and how to act on the responses.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {sampleValidationQuestions.map((q, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="font-semibold text-slate-900 mb-3">{q.question}</p>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  <strong className="text-slate-900">What to listen for:</strong> {q.listenFor}
                </p>
                <p className="text-slate-600">
                  <strong className="text-slate-900">Act on it:</strong> {q.actOn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* 30/60/90 Day Roadmap */}
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">30/60/90 Day Roadmap</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Days 0–30</h3>
            <p className="text-sm font-semibold text-slate-700 mb-2">Validate core assumptions</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Build landing page with clear value proposition</li>
              <li>• Run 10 customer interviews using validation questions</li>
              <li>• Collect 20+ waitlist sign-ups</li>
              <li>• Test pricing sensitivity ($29 vs $49/month)</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-aqua-200 bg-aqua-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Days 30–60</h3>
            <p className="text-sm font-semibold text-slate-700 mb-2">Build MVP</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Develop core features using no-code tools or minimal code</li>
              <li>• Onboard 5 beta users for feedback</li>
              <li>• Iterate based on usage data and feedback</li>
              <li>• Set up basic analytics and tracking</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-coral-200 bg-coral-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Days 60–90</h3>
            <p className="text-sm font-semibold text-slate-700 mb-2">Launch and iterate</p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Public launch with pricing in place</li>
              <li>• Focus on content marketing and community building</li>
              <li>• Aim for 20–30 paying customers</li>
              <li>• Plan next feature set based on user feedback</li>
            </ul>
          </div>
        </div>
      </article>

      {/* Decision Checklist */}
      <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">Decision Checklist</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <ul className="space-y-3 text-sm text-slate-700">
            {sampleDecisionChecklist.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 text-brand-500">□</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}

function FullReportContent({ remainderMarkdown, inputs }) {
  const sections = useMemo(() => splitFullReportSections(remainderMarkdown), [remainderMarkdown]);

  const profileSummary = useMemo(() => buildConciseProfileSummary(inputs), [inputs]);
  const matrixRows = parseRecommendationMatrix(sections["recommendation matrix"]);
  const financialOutlook = buildFinancialSnapshots(sections["financial outlook"], "", inputs?.budget_range || "");
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
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Recommendation Matrix</h2>
          <p className="text-sm text-slate-600 mb-6">Compare how each idea aligns with your goals, capacity, and preferences.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 w-12 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Idea</th>
                  <th className="px-4 py-3 font-semibold">Goal Fit</th>
                  <th className="px-4 py-3 font-semibold">Time Fit</th>
                  <th className="px-4 py-3 font-semibold">Budget Fit</th>
                  <th className="px-4 py-3 font-semibold">Skill Fit</th>
                  <th className="px-4 py-3 font-semibold">Work Style Fit</th>
                  {matrixRows.some(r => r.notes) && <th className="px-4 py-3 font-semibold">Notes</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {matrixRows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-brand-600">{row.order}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.idea}</td>
                    <td className="px-4 py-4">
                      <FitBadge value={row.goal} />
                    </td>
                    <td className="px-4 py-4">
                      <FitBadge value={row.time} />
                    </td>
                    <td className="px-4 py-4">
                      <FitBadge value={row.budget} />
                    </td>
                    <td className="px-4 py-4">
                      <FitBadge value={row.skill} />
                    </td>
                    <td className="px-4 py-4">
                      <FitBadge value={row.workStyle} />
                    </td>
                    {matrixRows.some(r => r.notes) && (
                      <td className="px-4 py-4 text-slate-600 text-xs max-w-xs">{row.notes || '-'}</td>
                    )}
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

      {/* Final Conclusion */}
      {(() => {
        const conclusion = buildFinalConclusion(
          topIdeas,
          matrixRows,
          inputs
        );
        if (!conclusion) return null;
        return (
          <article className="rounded-3xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-8 shadow-soft">
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 mt-6" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-4" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-slate-700 leading-relaxed mb-3" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside space-y-2 text-slate-700 mb-4 ml-6" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-slate-900" {...props} />
                  ),
                }}
              >
                {conclusion}
              </ReactMarkdown>
            </div>
          </article>
        );
      })()}

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



