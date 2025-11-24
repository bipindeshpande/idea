import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { mapValidationToIntake, getExperienceSummaryFromValidation } from "../../utils/mappers/validationToIntakeMapper.js";
import { buildValidationConclusion } from "../../utils/formatters/validationConclusion.js";

const VALIDATION_PARAMETERS = [
  "Market Opportunity",
  "Problem-Solution Fit",
  "Competitive Landscape",
  "Target Audience Clarity",
  "Business Model Viability",
  "Technical Feasibility",
  "Financial Sustainability",
  "Scalability Potential",
  "Risk Assessment",
  "Go-to-Market Strategy",
];

function ScoreBadge({ score, parameter }) {
  const getScoreColor = (score) => {
    if (score >= 8) return "bg-emerald-100 text-emerald-700 border-emerald-300";
    if (score >= 6) return "bg-amber-100 text-amber-700 border-amber-300";
    return "bg-coral-100 text-coral-700 border-coral-300";
  };

  return (
    <div className={`rounded-lg border-2 p-3 text-center ${getScoreColor(score)}`}>
      <div className="text-2xl font-bold">{score}</div>
      <div className="text-xs font-medium">/ 10</div>
    </div>
  );
}

export default function ValidationResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentValidation, loadValidationById, categoryAnswers, ideaExplanation } = useValidation();
  const { setInputs } = useReports();
  const { subscription } = useAuth();
  const isPro = subscription?.subscription_type === "pro" || subscription?.subscription_type === "weekly";

  useEffect(() => {
    const validationId = searchParams.get("id");
    if (validationId && !currentValidation) {
      loadValidationById(validationId);
    }
  }, [searchParams, currentValidation, loadValidationById]);

  const validation = currentValidation?.validation || null;

  if (!validation) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-6">
        <Seo
          title="Idea Validation Results | Startup Idea Advisor"
          description="Review your startup idea validation results with comprehensive analysis across 10 key parameters and actionable recommendations."
          keywords="startup validation results, idea validation score, startup idea analysis, business validation report"
          path="/validate-result"
        />
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
          <h2 className="text-lg font-semibold">Validation results not available</h2>
          <p className="mt-2 text-sm">
            Unable to load validation results. Please try validating your idea again.
          </p>
          <Link
            to="/validate-idea"
            className="mt-4 inline-block rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700"
          >
            Validate Again
          </Link>
        </div>
      </section>
    );
  }

  const scores = validation?.scores || {};
  const overallScore = validation?.overall_score || 0;
  const recommendations = validation?.recommendations || "";
  
  // Normalize next_steps format - convert comma-separated to proper markdown list
  const rawNextSteps = validation?.next_steps || "";
  const nextSteps = useMemo(() => {
    // Ensure rawNextSteps is a string - handle all edge cases
    let nextStepsStr = "";
    try {
      if (rawNextSteps === null || rawNextSteps === undefined) {
        nextStepsStr = "";
      } else if (typeof rawNextSteps === 'string') {
        nextStepsStr = rawNextSteps;
      } else if (Array.isArray(rawNextSteps)) {
        nextStepsStr = rawNextSteps.join("\n\n");
      } else {
        nextStepsStr = String(rawNextSteps);
      }
    } catch (e) {
      // Fallback to empty string if conversion fails
      nextStepsStr = "";
    }
    
    // Final safety check - ensure it's a string
    if (typeof nextStepsStr !== 'string') {
      nextStepsStr = String(nextStepsStr || "");
    }
    
    if (!nextStepsStr || nextStepsStr.length === 0) return "";
    
    // Check if it's comma-separated (common AI output format)
    // Pattern: "1. **Title**: description,2. **Title**: description"
    // Look for pattern where comma is followed by a number and period
    // Additional safety check before calling .match()
    if (typeof nextStepsStr.match === 'function' && nextStepsStr.match(/,\d+\./)) {
      // Simple approach: split on ",1.", ",2.", etc. and reconstruct
      // First, find all positions where ",1.", ",2.", etc. occur
      // Match comma followed by number and period, with optional space
      const splitPattern = /(,\d+\.\s*)/g;
      const items = [];
      let lastIndex = 0;
      let match;
      
      // Find all matches
      while ((match = splitPattern.exec(nextStepsStr)) !== null) {
        // Extract the item before this match
        if (match.index > lastIndex) {
          const item = nextStepsStr.substring(lastIndex, match.index).trim();
          if (item && item.match(/^\d+\./)) {
            items.push(item);
          }
        }
        lastIndex = match.index + match[0].length;
      }
      
      // Add the last item (after the last match)
      if (lastIndex < nextStepsStr.length) {
        const lastItem = nextStepsStr.substring(lastIndex).trim();
        if (lastItem && lastItem.match(/^\d+\./)) {
          items.push(lastItem);
        }
      }
      
      // Also get the first item (before the first match)
      // Reset regex to find first match
      const firstMatch = /,\d+\./.exec(nextStepsStr);
      if (firstMatch && firstMatch.index > 0) {
        const firstItem = nextStepsStr.substring(0, firstMatch.index).trim();
        if (firstItem && firstItem.match(/^\d+\./)) {
          // Only add if not already in items (in case our logic missed it)
          if (items.length === 0 || items[0] !== firstItem) {
            items.unshift(firstItem);
          }
        }
      } else if (items.length === 0 && 
                 typeof nextStepsStr.match === 'function' && 
                 nextStepsStr.match(/^\d+\./)) {
        // If no comma matches found but string starts with a number, it's a single item
        items.push(nextStepsStr.trim());
      }
      
      // If we found items, join them with newlines
      if (items.length > 0) {
        const formatted = items.join("\n\n");
        // Ensure it's a valid string
        if (typeof formatted === 'string' && formatted.length > 0) {
          return formatted;
        }
      }
    }
    
    // Fallback: try a simpler split approach if the above didn't work
    // Split on ",1.", ",2.", etc. more directly
    // Additional safety check before calling string methods
    if (typeof nextStepsStr.includes === 'function' && 
        typeof nextStepsStr.match === 'function' &&
        nextStepsStr.includes(',') && 
        nextStepsStr.match(/\d+\./)) {
      const simpleSplit = nextStepsStr.split(/(?=,\d+\.)/);
      if (simpleSplit.length > 1) {
        const cleaned = simpleSplit
          .map(item => item.trim().replace(/^,\s*/, ''))
          .filter(item => item && item.match(/^\d+\./))
          .join("\n\n");
        if (cleaned && cleaned.length > 0) {
          return cleaned;
        }
      }
    }
    
    // If it already looks like proper markdown, return as-is
    // But ensure it's a string
    return nextStepsStr;
  }, [rawNextSteps]);

  // Generate final conclusion
  const finalConclusion = useMemo(() => 
    buildValidationConclusion(validation, categoryAnswers, ideaExplanation),
    [validation, categoryAnswers, ideaExplanation]
  );
  const scoreDescription = overallScore >= 8
    ? "Your idea shows strong potential with excellent scores across key validation parameters."
    : overallScore >= 6
    ? "Your idea has good potential with some areas that need strengthening."
    : "Your idea requires refinement in several key areas before moving forward.";

  const dynamicTitle = validation
    ? `Idea Validation Results - Score: ${overallScore}/10 | Startup Idea Advisor`
    : "Idea Validation Results | Startup Idea Advisor";

  const dynamicDescription = validation
    ? `${scoreDescription} Review detailed analysis across 10 parameters: market opportunity, problem-solution fit, competitive landscape, target audience clarity, business model viability, technical feasibility, financial sustainability, scalability potential, risk assessment, and go-to-market strategy. Get actionable recommendations to strengthen your startup concept.`
    : "Review your startup idea validation results with comprehensive analysis across 10 key parameters and actionable recommendations to improve your startup concept.";

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title={dynamicTitle}
        description={dynamicDescription}
        keywords="startup validation results, idea validation score, startup idea analysis, business validation report, startup feasibility report, idea evaluation results, startup assessment, business idea score, validation feedback, startup recommendations"
        path="/validate-result"
      />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Idea Validation Results</h1>
          <p className="mt-2 text-slate-600">Your idea has been evaluated across 10 key parameters</p>
        </div>
        <Link
          to="/validate-idea"
          className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 whitespace-nowrap"
        >
          Validate Another Idea
        </Link>
      </div>

      {/* Parameter Scores Grid */}
      <div className="mb-8">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">Validation Parameters</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {VALIDATION_PARAMETERS.map((parameter) => {
            // Try multiple key formats to find the score
            const keyVariations = [
              parameter.toLowerCase().replace(/\s+/g, "_"),
              parameter.toLowerCase().replace(/\s+/g, "-"),
              parameter,
            ];
            let score = 0;
            for (const key of keyVariations) {
              if (scores[key] !== undefined) {
                score = scores[key];
                break;
              }
            }
            
            return (
              <div
                key={parameter}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{parameter}</h3>
                  <ScoreBadge score={score} parameter={parameter} />
                </div>
                {validation.details?.[parameter] && (
                  <p className="text-xs text-slate-600">{validation.details[parameter]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Analysis */}
      {recommendations && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
          <h2 className="mb-4 text-2xl font-semibold text-slate-900">Detailed Analysis & Recommendations</h2>
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="text-slate-700 leading-relaxed mb-4" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside space-y-2 text-slate-700 mb-4 ml-6" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside space-y-2 text-slate-700 mb-4 ml-6" {...props} />
                ),
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-2" {...props} />
                ),
              }}
            >
              {recommendations}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Final Conclusion */}
      {finalConclusion && (
        <div className="mb-6 rounded-3xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-6 shadow-soft">
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
              {finalConclusion}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Idea Summary */}
      <div className="rounded-3xl border border-sand-200 bg-sand-50/80 p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Your Idea Summary</h2>
        <div className="space-y-4 text-sm">
          {Object.entries(categoryAnswers).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold text-slate-700">{key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:</span>{" "}
              <span className="text-slate-600">{value}</span>
            </div>
          ))}
          {ideaExplanation && (
            <div>
              <p className="mb-2 font-semibold text-slate-700">Idea Explanation:</p>
              <p className="text-slate-600">{ideaExplanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Next Steps - Actionable Items */}
      {nextSteps && (
        <div className="mb-6 rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">🚀 Your Next Steps</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Start Here</span>
          </div>
          <p className="mb-6 text-slate-600">
            Follow these specific, actionable steps to move your idea forward. Each step includes resources and timelines.
          </p>
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside space-y-4 text-slate-700 mb-4 ml-6" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed text-base" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-slate-700 leading-relaxed mb-2" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-brand-600 hover:text-brand-700 underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
              }}
            >
              {nextSteps}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Value Highlights - What You Get */}
      {!isPro && (
        <div className="mb-6 rounded-3xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">💡 Get Even Better Outcomes</h2>
          </div>
          <p className="mb-4 text-slate-700">
            You're getting comprehensive validation analysis. Here's how Pro users get even more value:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-brand-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-brand-700">Unlimited Validations</h3>
              <p className="text-sm text-slate-600">
                Validate multiple ideas and compare them side-by-side to find your best opportunity.
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-brand-700">Deeper Market Research</h3>
              <p className="text-sm text-slate-600">
                Get more detailed competitive analysis, market sizing, and customer research insights.
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-brand-700">Priority Processing</h3>
              <p className="text-sm text-slate-600">
                Get your results faster with priority AI processing, so you can move forward quickly.
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-brand-700">Export & Share</h3>
              <p className="text-sm text-slate-600">
                Download professional PDF reports and share insights with your team or investors.
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/pricing"
              className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Explore Pro Features
            </Link>
          </div>
        </div>
      )}

      {/* Additional Actions */}
      <div className="mb-6 rounded-3xl border border-brand-200 bg-brand-50/80 p-6 shadow-soft">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Additional Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => {
              // Map validation answers to intake form fields
              const mappedFields = mapValidationToIntake(categoryAnswers);
              const experienceSummary = getExperienceSummaryFromValidation(categoryAnswers, ideaExplanation);
              
              // Set the mapped inputs
              setInputs({
                ...mappedFields,
                experience_summary: experienceSummary,
              });
              
              // Navigate to advisor page and scroll to form
              navigate("/advisor#intake-form");
            }}
            className="rounded-2xl border border-brand-300 bg-white p-6 text-center transition hover:border-brand-400 hover:bg-brand-50"
          >
            <div className="mb-2 text-2xl">💡</div>
            <h3 className="mb-2 font-semibold text-slate-900">Discover Related Ideas</h3>
            <p className="text-sm text-slate-600">
              Get personalized startup ideas based on your profile and interests
            </p>
          </button>
          <Link
            to="/validate-idea"
            className="rounded-2xl border border-coral-300 bg-white p-6 text-center transition hover:border-coral-400 hover:bg-coral-50"
          >
            <div className="mb-2 text-2xl">🔄</div>
            <h3 className="mb-2 font-semibold text-slate-900">Refine & Re-validate</h3>
            <p className="text-sm text-slate-600">
              Update your idea based on feedback and validate again
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}

