import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { mapValidationToIntake, getExperienceSummaryFromValidation } from "../../utils/mappers/validationToIntakeMapper.js";
import { buildValidationConclusion } from "../../utils/formatters/validationConclusion.js";
import { validationQuestions } from "../../config/validationQuestions.js";

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

function ParameterCard({ parameter, score, details }) {
  const getScoreInfo = (score) => {
    if (score >= 8) {
      return {
        bgGradient: "from-emerald-50 to-emerald-100/50",
        borderColor: "border-emerald-200",
        progressColor: "bg-emerald-500",
        labelColor: "text-emerald-700",
        label: "Strong",
        icon: "✓"
      };
    }
    if (score >= 6) {
      return {
        bgGradient: "from-amber-50 to-amber-100/50",
        borderColor: "border-amber-200",
        progressColor: "bg-amber-500",
        labelColor: "text-amber-700",
        label: "Good",
        icon: "→"
      };
    }
    return {
      bgGradient: "from-coral-50 to-coral-100/50",
      borderColor: "border-coral-200",
      progressColor: "bg-coral-500",
      labelColor: "text-coral-700",
      label: "Needs Work",
      icon: "!"
    };
  };

  const scoreInfo = getScoreInfo(score);
  const percentage = (score / 10) * 100;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border-2 ${scoreInfo.borderColor} bg-gradient-to-br ${scoreInfo.bgGradient} p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
      {/* Score indicator in top right */}
      <div className="absolute top-3 right-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${scoreInfo.progressColor} text-lg font-bold text-white shadow-sm`}>
          {score}
        </div>
      </div>

      {/* Parameter name */}
      <div className="mb-4 pr-16">
        <h3 className="text-base font-bold text-slate-900 leading-tight">{parameter}</h3>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-xs font-semibold ${scoreInfo.labelColor}`}>{scoreInfo.label}</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-500">{score}/10</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60">
        <div
          className={`h-full ${scoreInfo.progressColor} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Details */}
      {details && (
        <div className="mt-3 rounded-lg bg-white/60 p-3">
          <p className="text-xs leading-relaxed text-slate-700">{details}</p>
        </div>
      )}
    </div>
  );
}

export default function ValidationResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentValidation, loadValidationById, categoryAnswers, ideaExplanation } = useValidation();
  const { setInputs } = useReports();
  const { subscription } = useAuth();
  const isPro = subscription?.subscription_type === "pro" || subscription?.subscription_type === "annual";
  const isFree = !subscription || subscription?.subscription_type === "free";
  const isStarter = subscription?.subscription_type === "starter";
  const [activeTab, setActiveTab] = useState("input"); // Default to "input" tab
  const [previousScore, setPreviousScore] = useState(null);
  const [previousValidationId, setPreviousValidationId] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    const validationId = searchParams.get("id");
    const prevId = searchParams.get("previous");
    const prevScore = searchParams.get("previousScore");
    
    if (validationId) {
      // Check if we need to load a different validation
      // Load if: no current validation OR current validation ID doesn't match URL ID
      if (!currentValidation || currentValidation.id !== validationId) {
        loadValidationById(validationId);
      }
    }
    
    // Set previous validation data for comparison
    if (prevId && prevScore) {
      setPreviousValidationId(prevId);
      setPreviousScore(parseFloat(prevScore));
    }
  }, [searchParams, currentValidation, loadValidationById]);

  const validation = currentValidation?.validation || null;
  const scores = validation?.scores || {};
  const overallScore = validation?.overall_score || 0;
  const rawRecommendations = validation?.recommendations || "";
  
  // Format recommendations to ensure proper bullet points with sub-bullets
  const recommendations = useMemo(() => {
    if (!rawRecommendations) return "";
    
    // Ensure it's a string
    let text = typeof rawRecommendations === 'string' ? rawRecommendations : String(rawRecommendations || "");
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Recommendations] Raw text preview:', text.substring(0, 500));
    }
    
    // Process each line to convert numbered lists to bullets and break down descriptions
    const lines = text.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines (but preserve them for spacing)
      if (line === '') {
        processedLines.push('');
        continue;
      }
      
      // If it's a heading, keep it as is
      if (line.startsWith('#')) {
        processedLines.push(line);
        continue;
      }
      
      // If it's a numbered list item (e.g., "1. **Title**: Description")
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const content = numberedMatch[2];
        // Check if content has a colon (title: description format)
        const colonIndex = content.indexOf(':');
        if (colonIndex > 0 && colonIndex < content.length - 10) {
          // Split title and description
          const title = content.substring(0, colonIndex).trim();
          const description = content.substring(colonIndex + 1).trim();
          
          // Add the main bullet with title (preserve bold if present)
          const cleanTitle = title.replace(/\*\*/g, '').trim();
          processedLines.push(`- **${cleanTitle}**:`);
          
          // Break down description into sub-bullets for better readability
          // First, check if description contains numbered items embedded in text
          // Pattern to match: "**2. Title:** description" or "2. Title: description"
          // This handles cases where numbered items are embedded within the description text
          const numberedItemPattern = /(\*\*)?(\d+)\.\s+(\*\*)?([^:]+?)(\*\*)?:\s*([^**]+?)(?=\s*(?:\*\*)?\d+\.|$)/g;
          let numberedMatches = [];
          let match;
          const descriptionCopy = description; // Create a copy for exec
          while ((match = numberedItemPattern.exec(descriptionCopy)) !== null) {
            numberedMatches.push({
              fullMatch: match[0],
              title: (match[4] || '').trim(),
              description: (match[6] || '').trim(),
              index: match.index
            });
          }
          
          if (numberedMatches.length > 0) {
            // Extract the first part before any numbered items
            if (numberedMatches[0].index > 0) {
              const beforeText = description.substring(0, numberedMatches[0].index).trim();
              if (beforeText.length > 10) {
                processedLines.push(`  - ${beforeText}`);
              }
            }
            
            // Convert each numbered item to a main bullet point
            numberedMatches.forEach((item, idx) => {
              const itemTitle = item.title;
              let itemDescription = item.description;
              
              // Check if this description contains the next numbered item
              if (idx < numberedMatches.length - 1) {
                const nextItemIndex = itemDescription.indexOf(numberedMatches[idx + 1].fullMatch);
                if (nextItemIndex > 0) {
                  itemDescription = itemDescription.substring(0, nextItemIndex).trim();
                }
              }
              
              if (itemTitle) {
                processedLines.push(`- **${itemTitle}**:`);
                if (itemDescription && itemDescription.length > 10) {
                  processedLines.push(`  - ${itemDescription}`);
                }
              }
            });
          } else if (description.length > 80) {
            // Try to split by sentences first
            const sentences = description.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 20);
            if (sentences.length > 1) {
              sentences.forEach(sentence => {
                processedLines.push(`  - ${sentence.trim()}`);
              });
            } else {
              // If single sentence, try splitting by common separators
              const separators = [';', '—', '–', '. ', ', and ', ', or '];
              let split = false;
              for (const sep of separators) {
                if (description.includes(sep)) {
                  const parts = description.split(sep).filter(p => p.trim().length > 20);
                  if (parts.length > 1) {
                    parts.forEach(part => {
                      processedLines.push(`  - ${part.trim()}`);
                    });
                    split = true;
                    break;
                  }
                }
              }
              if (!split) {
                // If still can't split, try splitting by periods followed by space
                const periodSplit = description.split(/\.\s+/).filter(s => s.trim().length > 20);
                if (periodSplit.length > 1) {
                  periodSplit.forEach(part => {
                    processedLines.push(`  - ${part.trim()}.`);
                  });
                } else {
                  // Keep as single sub-bullet
                  processedLines.push(`  - ${description}`);
                }
              }
            }
          } else {
            // Short description, keep as single sub-bullet
            processedLines.push(`  - ${description}`);
          }
        } else {
          // No colon, convert numbered to bullet
          processedLines.push(`- ${content}`);
        }
        continue;
      }
      
      // If it's already a bullet point, keep it but process the content
      const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        const content = bulletMatch[1];
        // Check if content has a colon (title: description format)
        const colonIndex = content.indexOf(':');
        if (colonIndex > 0 && colonIndex < content.length - 10) {
          // Split title and description
          const title = content.substring(0, colonIndex).trim();
          const description = content.substring(colonIndex + 1).trim();
          
          // Add the main bullet with title
          processedLines.push(`- **${title}**:`);
          
          // Break down description into sub-bullets if it's long
          if (description.length > 50) {
            // Try to split by sentences
            const sentences = description.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 15);
            if (sentences.length > 1) {
              sentences.forEach(sentence => {
                processedLines.push(`  - ${sentence.trim()}`);
              });
            } else {
              // If single sentence, try splitting by common separators
              const separators = [';', '—', '–', ', and', ', or'];
              let split = false;
              for (const sep of separators) {
                if (description.includes(sep)) {
                  const parts = description.split(sep).filter(p => p.trim().length > 15);
                  if (parts.length > 1) {
                    parts.forEach(part => {
                      processedLines.push(`  - ${part.trim()}`);
                    });
                    split = true;
                    break;
                  }
                }
              }
              if (!split) {
                // Keep as single sub-bullet
                processedLines.push(`  - ${description}`);
              }
            }
          } else {
            // Short description, keep as single sub-bullet
            processedLines.push(`  - ${description}`);
          }
        } else {
          // No colon, keep as is
          processedLines.push(`- ${content}`);
        }
        continue;
      }
      
      // Regular paragraph - try to convert to bullets
      if (line.length > 50) {
        // Try splitting by sentences
        const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 20);
        if (sentences.length > 1) {
          sentences.forEach(sentence => {
            processedLines.push(`- ${sentence.trim()}`);
          });
        } else {
          // Try splitting by separators
          const separators = [';', '—', '–'];
          let split = false;
          for (const sep of separators) {
            if (line.includes(sep)) {
              const parts = line.split(sep).filter(p => p.trim().length > 20);
              if (parts.length > 1) {
                parts.forEach(part => {
                  processedLines.push(`- ${part.trim()}`);
                });
                split = true;
                break;
              }
            }
          }
          if (!split) {
            processedLines.push(`- ${line}`);
          }
        }
      } else {
        processedLines.push(`- ${line}`);
      }
    }
    
    const result = processedLines.join('\n');
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Recommendations] Processed result preview:', result.substring(0, 500));
    }
    
    return result;
  }, [rawRecommendations]);
  
  // Normalize next_steps format - convert comma-separated to proper markdown list
  // IMPORTANT: All hooks must be called before any early returns
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
  // IMPORTANT: All hooks must be called before any early returns
  const finalConclusion = useMemo(() => 
    buildValidationConclusion(validation, categoryAnswers, ideaExplanation),
    [validation, categoryAnswers, ideaExplanation]
  );

  // Early return AFTER all hooks have been called
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
      <div className="mb-8 flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Idea Validation Results</h1>
          <p className="mt-2 text-slate-600">Your idea has been evaluated across 10 key parameters</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!pdfRef.current || downloadingPDF) return;
              try {
                setDownloadingPDF(true);
                const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                  import('html2canvas'),
                  import('jspdf')
                ]);
                
                const elementsToHide = pdfRef.current.querySelectorAll('button, a, [role="button"], .no-print, nav');
                elementsToHide.forEach(el => el.style.display = 'none');
                
                const canvas = await html2canvas(pdfRef.current, {
                  scale: 1.2,
                  backgroundColor: "#ffffff",
                  useCORS: true,
                  logging: false,
                  ignoreElements: (element) => {
                    return element.tagName === 'BUTTON' || 
                           element.tagName === 'A' || 
                           element.classList?.contains('no-print') ||
                           element.getAttribute('role') === 'button' ||
                           element.tagName === 'NAV';
                  }
                });
                
                elementsToHide.forEach(el => el.style.display = '');
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "pt", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                // Handle multi-page PDF with proper page breaks
                const pageHeight = pdf.internal.pageSize.getHeight();
                let heightLeft = pdfHeight;
                let position = 0;
                
                // Add first page
                pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
                
                // Add additional pages if content exceeds one page
                while (heightLeft >= 0) {
                  position = heightLeft - pdfHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
                  heightLeft -= pageHeight;
                }
                
                const validationId = validation?.id || currentValidation?.id || Date.now();
                pdf.save(`idea-validation-report-${validationId}.pdf`);
              } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                  console.error("Failed to generate PDF", err);
                }
                alert("Failed to generate PDF. Please try again.");
              } finally {
                setDownloadingPDF(false);
              }
            }}
            disabled={downloadingPDF}
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPDF ? "Generating PDF..." : "Download PDF"}
          </button>
          <Link
            to="/validate-idea"
            className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 whitespace-nowrap"
          >
            Validate Another Idea
          </Link>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="mb-8 no-print">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("input")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                activeTab === "input"
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Your Input
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                activeTab === "results"
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Validation Results
            </button>
            {recommendations && (
              <button
                onClick={() => setActiveTab("analysis")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                  activeTab === "analysis"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                Detailed Analysis & Recommendations
              </button>
            )}
            {finalConclusion && (
              <button
                onClick={() => setActiveTab("conclusion")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-semibold transition ${
                  activeTab === "conclusion"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                Final Validation Conclusion & Decision
              </button>
            )}
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
          </nav>
        </div>
      </div>

      {/* PDF Export Container */}
      <div ref={pdfRef}>
      {/* Tab Content: Your Input */}
      {activeTab === "input" && (
        <div className="space-y-6">
          {/* Category Questions */}
          {validationQuestions.category_questions && validationQuestions.category_questions.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900">Category Information</h2>
              <div className="space-y-6">
                {validationQuestions.category_questions.map((question) => {
                  const answer = categoryAnswers[question.id];
                  if (!answer) return null;
                  return (
                    <div key={question.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">{question.question}</h3>
                      <p className="text-base text-slate-900">{answer}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Idea Explanation Questions */}
          {validationQuestions.idea_explanation_questions && validationQuestions.idea_explanation_questions.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900">Idea Details</h2>
              <div className="space-y-6">
                {validationQuestions.idea_explanation_questions.map((question) => {
                  const answer = categoryAnswers[question.id];
                  if (!answer) return null;
                  return (
                    <div key={question.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">{question.question}</h3>
                      <p className="text-base text-slate-900">{answer}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Idea Explanation */}
          {ideaExplanation && (
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
              <h2 className="mb-4 text-2xl font-semibold text-slate-900">Detailed Idea Explanation</h2>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-900">{ideaExplanation}</p>
              </div>
            </div>
          )}

          {/* Fallback: Show raw category answers if questions not available */}
          {(!validationQuestions.category_questions || validationQuestions.category_questions.length === 0) &&
            Object.keys(categoryAnswers).length > 0 && (
              <div className="rounded-3xl border border-sand-200 bg-sand-50/80 p-6 shadow-soft">
                <h2 className="mb-4 text-xl font-semibold text-slate-900">Your Idea Summary</h2>
                <div className="space-y-4 text-sm">
                  {Object.entries(categoryAnswers).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-semibold text-slate-700">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                      </span>{" "}
                      <span className="text-slate-600">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Tab Content: Validation Results */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {/* Re-Validation Comparison Banner */}
          {previousScore !== null && previousScore !== undefined && (
            <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft">
              <h2 className="mb-3 text-xl font-bold text-slate-900">📈 Improvement Comparison</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Previous Score</div>
                  <div className="text-3xl font-bold text-slate-700">{previousScore.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">/ 10</div>
                </div>
                <div className="text-2xl font-bold text-emerald-600">→</div>
                <div className="flex-1 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-semibold text-emerald-700 mb-1">New Score</div>
                  <div className="text-3xl font-bold text-emerald-700">{overallScore.toFixed(1)}</div>
                  <div className="text-xs text-emerald-600">/ 10</div>
                </div>
                <div className="flex-1 rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
                  <div className="text-xs font-semibold text-brand-700 mb-1">Change</div>
                  <div className={`text-3xl font-bold ${overallScore > previousScore ? 'text-emerald-600' : overallScore < previousScore ? 'text-coral-600' : 'text-slate-600'}`}>
                    {overallScore > previousScore ? '+' : ''}{(overallScore - previousScore).toFixed(1)}
                  </div>
                  <div className="text-xs text-brand-600">
                    {overallScore > previousScore ? 'Improved!' : overallScore < previousScore ? 'Decreased' : 'No change'}
                  </div>
                </div>
              </div>
              {overallScore > previousScore && (
                <p className="mt-4 text-sm font-semibold text-emerald-700">
                  🎉 Great job! Your idea improved by {((overallScore - previousScore) / previousScore * 100).toFixed(0)}%. Keep refining!
                </p>
              )}
            </div>
          )}

          {/* Parameter Scores - Visual Display */}
      <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Validation Parameters</h2>
                <p className="mt-1 text-sm text-slate-600">Your idea evaluated across 10 key dimensions</p>
              </div>
              <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-brand-700">{overallScore.toFixed(1)}</div>
                <div className="text-xs font-semibold text-brand-600">Overall Score</div>
              </div>
            </div>

            {/* Group parameters by score range for better visual organization */}
            {(() => {
              const groupedParams = VALIDATION_PARAMETERS.map((parameter) => {
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
                return { parameter, score, details: validation.details?.[parameter] };
              }).sort((a, b) => b.score - a.score); // Sort by score descending

              const strongParams = groupedParams.filter(p => p.score >= 8);
              const goodParams = groupedParams.filter(p => p.score >= 6 && p.score < 8);
              const needsWorkParams = groupedParams.filter(p => p.score < 6);
            
            return (
                <div className="space-y-6">
                  {/* Strong Parameters (8-10) */}
                  {strongParams.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">✓</div>
                        <h3 className="text-lg font-semibold text-slate-900">Strong Areas ({strongParams.length})</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {strongParams.map(({ parameter, score, details }) => (
                          <ParameterCard
                            key={parameter}
                            parameter={parameter}
                            score={score}
                            details={details}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Good Parameters (6-7.9) */}
                  {goodParams.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">→</div>
                        <h3 className="text-lg font-semibold text-slate-900">Good Areas ({goodParams.length})</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {goodParams.map(({ parameter, score, details }) => (
                          <ParameterCard
                            key={parameter}
                            parameter={parameter}
                            score={score}
                            details={details}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Needs Work Parameters (<6) */}
                  {needsWorkParams.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-500 text-sm font-bold text-white">!</div>
                        <h3 className="text-lg font-semibold text-slate-900">Areas to Strengthen ({needsWorkParams.length})</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {needsWorkParams.map(({ parameter, score, details }) => (
                          <ParameterCard
                key={parameter}
                            parameter={parameter}
                            score={score}
                            details={details}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
              </div>
        </div>
      )}

      {/* Tab Content: Detailed Analysis & Recommendations */}
      {activeTab === "analysis" && recommendations && (
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
          <h2 className="mb-4 text-2xl font-semibold text-slate-900">Detailed Analysis & Recommendations</h2>
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => {
                  // Check if paragraph contains bullet-like content that should be converted
                  const text = node.children?.[0]?.value || '';
                  if (text && text.length > 50 && !text.includes('\n')) {
                    // Long paragraph without breaks - might need splitting
                    return (
                      <p className="text-slate-700 leading-relaxed mb-4" {...props} />
                    );
                  }
                  return (
                  <p className="text-slate-700 leading-relaxed mb-4" {...props} />
                  );
                },
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside space-y-2 text-slate-700 mb-4 ml-6" style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }} {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside space-y-2 text-slate-700 mb-4 ml-6" style={{ listStyleType: 'decimal', paddingLeft: '1.5rem' }} {...props} />
                ),
                li: ({ node, ...props }) => {
                  // Check if this is a nested list item (has ul/ol as children)
                  const hasNestedList = node.children?.some(child => 
                    child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')
                  );
                  return (
                    <li 
                      className={`leading-relaxed text-base ${hasNestedList ? 'mb-2' : 'mb-3'}`} 
                      style={{ display: 'list-item', listStylePosition: 'outside' }} 
                      {...props} 
                    />
                  );
                },
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold text-slate-900 mt-6 mb-4" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-semibold text-slate-800 mt-5 mb-3" {...props} />
                ),
              }}
            >
              {recommendations}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Tab Content: Final Validation Conclusion & Decision */}
      {activeTab === "conclusion" && finalConclusion && (
        <div className="rounded-3xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-6 shadow-soft">
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

      {/* Tab Content: Next Steps */}
      {activeTab === "nextsteps" && (
        <div className="space-y-6">
          {/* What's Next Section - Score-based recommendations */}
          <div className="rounded-3xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white p-6 shadow-soft">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">📋 What's Next?</h2>
            {overallScore >= 7 ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-emerald-900">🎉 Strong Potential Detected!</h3>
                  <p className="mb-3 text-sm text-emerald-800">
                    Your idea shows strong potential with a score of {overallScore.toFixed(1)}/10. Here's your recommended path forward:
                  </p>
                  <ul className="ml-4 list-disc space-y-2 text-sm text-emerald-800">
                    <li>Create an MVP roadmap - Break down your idea into minimum viable features</li>
                    <li>Validate with real customers - Conduct user interviews and gather feedback</li>
                    <li>Build a landing page - Test demand before full development</li>
                    <li>Consider funding options - Prepare pitch deck if seeking investment</li>
                    <li>Set up legal structure - Choose business entity (LLC, Corp, etc.)</li>
                  </ul>
                </div>
              </div>
            ) : overallScore >= 5 ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-amber-900">⚡ Good Potential, Needs Work</h3>
                  <p className="mb-3 text-sm text-amber-800">
                    Your idea has potential with a score of {overallScore.toFixed(1)}/10, but there are areas to strengthen:
                  </p>
                  <ul className="ml-4 list-disc space-y-2 text-sm text-amber-800">
                    <li>Address weak areas - Focus on parameters scoring below 6</li>
                    <li>Refine your value proposition - Make it clearer and more compelling</li>
                    <li>Conduct market research - Validate assumptions with real data</li>
                    <li>Improve problem-solution fit - Ensure you're solving a real pain point</li>
                    <li>Re-validate after changes - Use our re-validation feature to track improvements</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-coral-200 bg-coral-50/50 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-coral-900">🔍 Consider Pivoting or Addressing Key Issues</h3>
                  <p className="mb-3 text-sm text-coral-800">
                    Your idea scored {overallScore.toFixed(1)}/10. Consider these actions:
                  </p>
                  <ul className="ml-4 list-disc space-y-2 text-sm text-coral-800">
                    <li>Identify critical gaps - Review parameters scoring below 5</li>
                    <li>Pivot or refine - Consider adjusting your idea based on feedback</li>
                    <li>Address fundamental issues - Market fit, problem clarity, or business model</li>
                    <li>Research competitors - Understand why similar ideas succeeded or failed</li>
                    <li>Re-validate after major changes - Test improvements systematically</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Progress-Based Upgrade Prompts */}
          {(isFree || isStarter) && (
            <div className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-soft">
              <h2 className="mb-4 text-xl font-bold text-slate-900">🚀 Unlock More Features</h2>
              {isFree && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700">
                    You've used <strong>{subscription?.validations_used || 0} of 2</strong> free validations.
                  </p>
                  <p className="text-sm text-slate-600">
                    Upgrade to <strong>Starter ($9/month)</strong> to get 20 validations/month and compare your ideas side-by-side.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-brand-700"
                  >
                    View Plans →
                  </Link>
                </div>
              )}
              {isStarter && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700">
                    You've used <strong>{subscription?.validations_used || 0} of 20</strong> validations this month.
                  </p>
                  <p className="text-sm text-slate-600">
                    Upgrade to <strong>Pro ($29/month)</strong> for unlimited validations, advanced analytics, and priority support.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-brand-700"
                  >
                    Upgrade to Pro →
                  </Link>
                </div>
              )}
            </div>
          )}

          {nextSteps && (
            <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-soft">
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

          {/* Additional Actions */}
          <div className="rounded-3xl border border-brand-200 bg-brand-50/80 p-6 shadow-soft">
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
          <button
            onClick={() => {
              // Store current validation data for re-validation
              const revalidateData = {
                previousValidationId: validation?.id || currentValidation?.id,
                previousScore: overallScore,
                previousScores: scores,
                categoryAnswers: categoryAnswers,
                ideaExplanation: ideaExplanation,
                timestamp: new Date().toISOString(),
              };
              localStorage.setItem("revalidate_data", JSON.stringify(revalidateData));
              
              // Navigate to validation form
              navigate("/validate-idea?revalidate=true");
            }}
            className="rounded-2xl border border-coral-300 bg-white p-6 text-center transition hover:border-coral-400 hover:bg-coral-50"
          >
            <div className="mb-2 text-2xl">🔄</div>
            <h3 className="mb-2 font-semibold text-slate-900">Improve This Idea</h3>
            <p className="text-sm text-slate-600">
              Update your idea based on feedback and re-validate to see improvements
            </p>
          </button>
        </div>
      </div>

          {/* Benchmarking Section - Last card in Next Steps */}
          <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-soft">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">📊 How Your Idea Compares</h2>
            <div className="space-y-4">
              {overallScore >= 8 ? (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="text-sm text-emerald-800">
                    <strong>Top 15%</strong> - Your idea scores higher than 85% of validated ideas. This indicates exceptional potential.
                  </p>
                </div>
              ) : overallScore >= 7 ? (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="text-sm text-emerald-800">
                    <strong>Top 30%</strong> - Your idea scores higher than 70% of validated ideas. Strong potential with room for improvement.
                  </p>
                </div>
              ) : overallScore >= 6 ? (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Above Average</strong> - Your idea scores higher than 50% of validated ideas. Good foundation with clear improvement areas.
                  </p>
                </div>
              ) : overallScore >= 5 ? (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Average</strong> - Your idea is in the middle range. Average score for validated ideas is 5.5/10. Focus on strengthening weak areas.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-coral-200 bg-coral-50/50 p-4">
                  <p className="text-sm text-coral-800">
                    <strong>Below Average</strong> - Your idea scores below 50% of validated ideas. Consider significant refinements or pivoting.
                  </p>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                * Comparison based on anonymized aggregated data from all validated ideas on our platform.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

