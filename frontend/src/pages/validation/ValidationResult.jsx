import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { pdf } from "@react-pdf/renderer";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { mapValidationToIntake, getExperienceSummaryFromValidation } from "../../utils/mappers/validationToIntakeMapper.js";
import { buildValidationConclusion } from "../../utils/formatters/validationConclusion.js";
import { validationQuestions } from "../../config/validationQuestions.js";
import Celebration, { getCelebrationMessage } from "../../components/common/Celebration.jsx";
import ValidationReportPDF from "../../components/pdf/ValidationReportPDF.jsx";
import { VALIDATION_PARAMETERS, PARAMETER_GROUPS_LAYOUT, RADAR_AXES } from "./constants.js";
import { getScoreMeta, getScoreFromScores } from "./utils.js";
import RadarChart from "../../components/validation/RadarChart.jsx";
import ParameterScores from "../../components/validation/ParameterScores.jsx";
import ScoreLegend from "../../components/validation/ScoreLegend.jsx";
import ParameterCard from "../../components/validation/ParameterCard.jsx";
import OpenForCollaboratorsButton from "../../components/founder/OpenForCollaboratorsButton.jsx";


export default function ValidationResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentValidation, loadValidationById, categoryAnswers, ideaExplanation } = useValidation();
  const { setInputs } = useReports();
  const { subscription, user } = useAuth();
  const isPro = subscription?.subscription_type === "pro" || subscription?.subscription_type === "annual";
  const isFree = !subscription || subscription?.subscription_type === "free";
  const isStarter = subscription?.subscription_type === "starter";
  const [activeTab, setActiveTab] = useState("input"); // Default to "input" tab
  const [previousScore, setPreviousScore] = useState(null);
  const [previousValidationId, setPreviousValidationId] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [viewFilter, setViewFilter] = useState("all");
  const [sortOption, setSortOption] = useState("category");
  const downloadButtonRef = useRef(null);

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
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Show celebration for high scores
  useEffect(() => {
    if (overallScore >= 8 && validation) {
      setShowCelebration(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [overallScore, validation]);
  const rawRecommendations = validation?.recommendations || "";

  const parameterLookup = useMemo(() => {
    const detailsMap = validation?.details || {};
    const lookup = {};
    VALIDATION_PARAMETERS.forEach((parameter) => {
      lookup[parameter] = {
        score: getScoreFromScores(scores, parameter),
        details: detailsMap?.[parameter],
      };
    });
    return lookup;
  }, [scores, validation?.details]);

  const radarData = useMemo(
    () =>
      RADAR_AXES.map((axis) => ({
        label: axis.label,
        value: parameterLookup[axis.parameter]?.score ?? 0,
      })),
    [parameterLookup]
  );

  const parameterGroups = useMemo(() => {
    return PARAMETER_GROUPS_LAYOUT.map((group) => {
      const cards = group.parameters
        .map((name, index) => {
          const data = parameterLookup[name] || { score: 0, details: null };
          return {
            name,
            score: data.score ?? 0,
            details: data.details,
            order: index,
          };
        })
        .filter((item) => (viewFilter === "red" ? item.score <= 3 : true));

      const sortedCards = [...cards];
      if (sortOption === "score-asc") {
        sortedCards.sort((a, b) => a.score - b.score);
      } else if (sortOption === "score-desc") {
        sortedCards.sort((a, b) => b.score - a.score);
      } else {
        sortedCards.sort((a, b) => a.order - b.order);
      }

      return { ...group, cards: sortedCards };
    }).filter((group) => group.cards.length > 0);
  }, [parameterLookup, viewFilter, sortOption]);

  const overallStatus = getScoreMeta(overallScore);
  const overallScorePercent = Math.round(
    Math.max(0, Math.min(100, (overallScore / 10) * 100))
  );
  
  // Format recommendations to ensure proper bullet points with sub-bullets
  const recommendations = useMemo(() => {
    if (!rawRecommendations) return "";
    
    // Ensure it's a string
    let text = typeof rawRecommendations === 'string' ? rawRecommendations : String(rawRecommendations || "");
    
    // Clean up stray ** markers that aren't part of proper markdown formatting
    // First, normalize proper bold markdown patterns, then remove any remaining stray **
    text = text
      // Replace proper bold patterns temporarily (we'll restore them)
      .replace(/\*\*([^*]+?)\*\*/g, '___BOLD___$1___BOLD___')
      // Remove any remaining stray **
      .replace(/\*\*/g, '')
      // Restore proper bold markers
      .replace(/___BOLD___/g, '**');
    
    
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
          
          // Add the main bullet with title (clean any stray **)
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
                // Clean any stray ** from description text
                const cleanedBeforeText = beforeText.replace(/\*\*/g, '').trim();
                processedLines.push(`  - ${cleanedBeforeText}`);
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
                const cleanItemTitle = itemTitle.replace(/\*\*/g, '').trim();
                processedLines.push(`- **${cleanItemTitle}**:`);
                if (itemDescription && itemDescription.length > 10) {
                  // Clean any stray ** from description text
                  const cleanedDescription = itemDescription.replace(/\*\*/g, '').trim();
                  processedLines.push(`  - ${cleanedDescription}`);
                }
              }
            });
          } else if (description.length > 80) {
            // Try to split by sentences first
            const sentences = description.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 20);
            if (sentences.length > 1) {
              sentences.forEach(sentence => {
                // Clean any stray ** from sentence text
                const cleanedSentence = sentence.trim().replace(/\*\*/g, '');
                processedLines.push(`  - ${cleanedSentence}`);
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
                    // Clean any stray ** from part text
                    const cleanedPart = part.trim().replace(/\*\*/g, '');
                    processedLines.push(`  - ${cleanedPart}.`);
                  });
                } else {
                  // Keep as single sub-bullet, clean any stray **
                  const cleanedDescription = description.replace(/\*\*/g, '').trim();
                  processedLines.push(`  - ${cleanedDescription}`);
                }
              }
            }
          } else {
            // Short description, keep as single sub-bullet, clean any stray **
            const cleanedDescription = description.replace(/\*\*/g, '').trim();
            processedLines.push(`  - ${cleanedDescription}`);
          }
        } else {
          // No colon, convert numbered to bullet, clean any stray **
          const cleanedContent = content.replace(/\*\*/g, '').trim();
          processedLines.push(`- ${cleanedContent}`);
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
          
          // Add the main bullet with title, clean any stray **
          const cleanTitle2 = title.replace(/\*\*/g, '').trim();
          processedLines.push(`- **${cleanTitle2}**:`);
          
          // Break down description into sub-bullets if it's long
          if (description.length > 50) {
            // Try to split by sentences
            const sentences = description.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 15);
            if (sentences.length > 1) {
              sentences.forEach(sentence => {
                // Clean any stray ** from sentence text
                const cleanedSentence = sentence.trim().replace(/\*\*/g, '');
                processedLines.push(`  - ${cleanedSentence}`);
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
                      // Clean any stray ** from part text
                      const cleanedPart = part.trim().replace(/\*\*/g, '');
                      processedLines.push(`  - ${cleanedPart}`);
                    });
                    split = true;
                    break;
                  }
                }
              }
              if (!split) {
                // Keep as single sub-bullet, clean any stray **
                const cleanedDescription = description.replace(/\*\*/g, '').trim();
                processedLines.push(`  - ${cleanedDescription}`);
              }
            }
          } else {
            // Short description, keep as single sub-bullet, clean any stray **
            const cleanedDescription = description.replace(/\*\*/g, '').trim();
            processedLines.push(`  - ${cleanedDescription}`);
          }
        } else {
          // No colon, keep as is, but clean any stray **
          const cleanedContent = content.replace(/\*\*/g, '').trim();
          processedLines.push(`- ${cleanedContent}`);
        }
        continue;
      }
      
      // Regular paragraph - try to convert to bullets
      if (line.length > 50) {
        // Try splitting by sentences
        const sentences = line.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 20);
        if (sentences.length > 1) {
          sentences.forEach(sentence => {
            // Clean any stray ** from sentence text
            const cleanedSentence = sentence.trim().replace(/\*\*/g, '');
            processedLines.push(`- ${cleanedSentence}`);
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
                  // Clean any stray ** from part text
                  const cleanedPart = part.trim().replace(/\*\*/g, '');
                  processedLines.push(`- ${cleanedPart}`);
                });
                split = true;
                break;
              }
            }
          }
          if (!split) {
            // Clean any stray ** from line text
            const cleanedLine = line.replace(/\*\*/g, '').trim();
            processedLines.push(`- ${cleanedLine}`);
          }
        }
      } else {
        // Clean any stray ** from line text
        const cleanedLine = line.replace(/\*\*/g, '').trim();
        processedLines.push(`- ${cleanedLine}`);
      }
    }
    
    let result = processedLines.join('\n');
    
    // Final cleanup: remove any remaining stray ** that aren't part of proper markdown bold syntax
    // Match proper markdown bold: **text**, then remove any remaining **
    result = result
      // Temporarily protect proper bold patterns
      .replace(/\*\*([^*\n]+?)\*\*/g, '___BOLD_START___$1___BOLD_END___')
      // Remove any remaining stray **
      .replace(/\*\*/g, '')
      // Restore proper bold markers
      .replace(/___BOLD_START___/g, '**')
      .replace(/___BOLD_END___/g, '**');
    
    
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

  const effectiveCategoryAnswers = useMemo(() => {
    if (categoryAnswers && Object.keys(categoryAnswers).length > 0) {
      return categoryAnswers;
    }
    if (currentValidation?.categoryAnswers && Object.keys(currentValidation.categoryAnswers).length > 0) {
      return currentValidation.categoryAnswers;
    }
    return {};
  }, [categoryAnswers, currentValidation]);
  const businessArchetypeLabel = effectiveCategoryAnswers?.business_archetype;
  const deliveryChannelLabel = effectiveCategoryAnswers?.delivery_channel;

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Idea Validation Results</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Your idea has been evaluated across 10 key parameters</p>
        </div>
        <div className="flex gap-3">
          <button
            ref={downloadButtonRef}
            onClick={async () => {
              if (downloadingPDF) return;
              try {
                setDownloadingPDF(true);
                
                // Flatten parameter groups to get all parameter cards
                const allParameterCards = parameterGroups.flatMap(group => group.cards);
                
                // Prepare props
                const pdfProps = {
                  validation: validation,
                  overallScore: overallScore,
                  scores: scores,
                  parameterCards: allParameterCards,
                  recommendations: recommendations,
                  nextSteps: nextSteps,
                  categoryAnswers: effectiveCategoryAnswers || categoryAnswers,
                  ideaExplanation: ideaExplanation,
                  userName: user?.name || user?.email?.split('@')[0] || 'User',
                  userEmail: user?.email || '',
                  finalConclusion: finalConclusion
                };
                
                // Generate PDF using @react-pdf/renderer
                const pdfBlob = await pdf(
                  <ValidationReportPDF {...pdfProps} />
                ).toBlob();
                
                // Create download link and trigger download
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                const validationId = validation?.id || validation?.validation_id || currentValidation?.id || Date.now();
                link.download = `idea-validation-report-${validationId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Failed to generate PDF:", err);
                alert("Failed to generate PDF: " + (err.message || "Please check the console for details."));
              } finally {
                setDownloadingPDF(false);
              }
            }}
            disabled={downloadingPDF}
            className="rounded-xl border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPDF ? "Generating PDF..." : "Download PDF"}
          </button>
          <Link
            to="/validate-idea"
            className="rounded-xl border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 whitespace-nowrap"
          >
            Validate Another Idea
          </Link>
          {currentValidation && (
            <OpenForCollaboratorsButton 
              validationId={currentValidation?.id || currentValidation?.validation_id}
              sourceType="validation"
              sourceId={currentValidation?.id || currentValidation?.validation_id}
              ideaTitle={ideaExplanation?.substring(0, 100) || "My validated idea"}
              categoryAnswers={categoryAnswers}
            />
          )}
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="mb-8 no-print">
        <nav className="flex flex-wrap gap-2 rounded-full bg-slate-100/80 dark:bg-slate-800/80 p-1">
          {[
            { id: "input", label: "Your Input", hidden: false },
            { id: "results", label: "Validation Results", hidden: false },
            { id: "analysis", label: "Detailed Analysis & Recommendations", hidden: !recommendations },
            { id: "conclusion", label: "Final Validation Conclusion & Decision", hidden: !finalConclusion },
            { id: "nextsteps", label: "Next Steps", hidden: false },
          ]
            .filter((tab) => !tab.hidden)
            .map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm shadow-slate-300 dark:shadow-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
            </button>
            ))}
          </nav>
      </div>

      {/* Tab Content: Your Input */}
      {activeTab === "input" && (
        <div className="space-y-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">These are the inputs you provided during validation.</p>
          {/* Category Questions */}
          {validationQuestions.category_questions && validationQuestions.category_questions.length > 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Category Information</h2>
              <div className="space-y-6">
                {validationQuestions.category_questions.map((question) => {
                  const answer = categoryAnswers[question.id];
                  if (!answer) return null;
                  return (
                    <div key={question.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{question.question}</h3>
                      <p className="text-base text-slate-900 dark:text-slate-100">{answer}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Idea Explanation Questions */}
          {validationQuestions.idea_explanation_questions && validationQuestions.idea_explanation_questions.length > 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Idea Details</h2>
              <div className="space-y-6">
                {validationQuestions.idea_explanation_questions.map((question) => {
                  const answer = categoryAnswers[question.id];
                  if (!answer) return null;
                  return (
                    <div key={question.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{question.question}</h3>
                      <p className="text-base text-slate-900 dark:text-slate-100">{answer}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Fields (Business Archetype, Delivery Channel, etc.) */}
          {validationQuestions.optional_fields && validationQuestions.optional_fields.length > 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Additional Information</h2>
              <div className="space-y-6">
                {validationQuestions.optional_fields.map((question) => {
                  const answer = categoryAnswers[question.id];
                  if (!answer) return null;
                  // Handle multi-select fields (like constraints)
                  const displayAnswer = Array.isArray(answer) ? answer.join(", ") : answer;
                  return (
                    <div key={question.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{question.question}</h3>
                      <p className="text-base text-slate-900 dark:text-slate-100">{displayAnswer}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Idea Explanation */}
          {ideaExplanation && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
              <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Detailed Idea Explanation</h2>
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 p-4">
                <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-900 dark:text-slate-100">{ideaExplanation}</p>
              </div>
            </div>
          )}

          {/* Fallback: Show raw category answers if questions not available */}
          {(!validationQuestions.category_questions || validationQuestions.category_questions.length === 0) &&
            Object.keys(categoryAnswers).length > 0 && (
              <div className="rounded-3xl border border-sand-200 bg-sand-50/80 p-6 shadow-soft">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Your Idea Summary</h2>
                <div className="space-y-4 text-sm">
                  {Object.entries(categoryAnswers).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                      </span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">{value}</span>
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
          {/* Celebration Banner for High Scores */}
          {overallScore >= 8 && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-emerald-50 p-6 shadow-lg">
              <Celebration score={overallScore} show={showCelebration} />
              <div className="relative z-10 flex items-center gap-4">
                <div className="text-4xl">{getCelebrationMessage(overallScore).emoji}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-emerald-900">
                    {getCelebrationMessage(overallScore).message}
                  </h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    Your idea scored {overallScore.toFixed(1)}/10 - That's impressive! 🎉
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Re-Validation Comparison Banner */}
          {previousScore !== null && previousScore !== undefined && (
            <div className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-600 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 p-6 shadow-soft">
              <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">📈 Improvement Comparison</h2>
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

          {/* Diagnostic Layout */}
          <div className="space-y-4">
          {/* Overall Score + Score Legend */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 mb-1.5">
            {/* Small Score Card - Left Side */}
            <div className="lg:w-48 flex-shrink-0">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  Overall Score
                </p>
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{overallScore.toFixed(1)}</p>
                    <p className="text-lg text-slate-500 dark:text-slate-400">/10</p>
                  </div>
                  <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${overallStatus.badge}`}>
                    {overallStatus.label}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Score Legend - Right Side */}
            <div className="lg:w-48 flex-shrink-0">
              <ScoreLegend />
            </div>
          </div>

            {/* Diagnostic Overview - Unified Analytics Block */}
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">Diagnostic Overview Across 10 Validation Pillars</p>
            <div className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              {/* Desktop ≥1024px: 2 columns (50% / 50%), Tablet/Mobile: Stacked */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-stretch min-h-[340px]">
                {/* Column 1: Radar Chart (50%) */}
                <div className="lg:w-[50%] flex flex-col lg:justify-center lg:pr-4">
                  <RadarChart axes={radarData} />
                </div>
                
                {/* Column 2: Parameter Scores (50%) */}
                <div className="lg:w-[50%] flex flex-col lg:justify-center lg:border-l lg:border-slate-200 dark:lg:border-slate-700 lg:pl-4">
                  <ParameterScores 
                    parameterCards={parameterGroups.flatMap(g => g.cards)} 
                    parameterLookup={parameterLookup} 
                  />
                </div>
              </div>
            </div>

            {/* Filter / Sort Row */}
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">View parameter-by-parameter breakdown and insights.</p>
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-soft md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">View</p>
                <div className="mt-2 inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewFilter("all")}
                    className={`px-4 py-2 text-sm font-semibold transition ${
                      viewFilter === "all"
                        ? "bg-slate-900 dark:bg-slate-700 text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    All Parameters
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewFilter("red")}
                    className={`px-4 py-2 text-sm font-semibold transition ${
                      viewFilter === "red"
                        ? "bg-slate-900 dark:bg-slate-700 text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    Red Flags Only
                  </button>
                      </div>
                      </div>
              <div className="w-full md:w-auto">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Sort by
                </label>
                <select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 md:w-56"
                >
                  <option value="category">Category Order</option>
                  <option value="score-asc">Score: Low → High</option>
                  <option value="score-desc">Score: High → Low</option>
                </select>
                    </div>
            </div>

            {/* Parameter Groups */}
            <div className="space-y-12">
              {parameterGroups.length > 0 ? (
                parameterGroups.map((group) => (
                  <div key={group.id}>
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{group.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
                      </div>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {group.cards.map((card) => (
                          <ParameterCard
                          key={card.name}
                          parameter={card.name}
                          score={card.score}
                          details={card.details}
                          />
                        ))}
                      </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-sm text-slate-600 dark:text-slate-400">
                  No parameters match the selected filter.
                    </div>
                  )}
            </div>

            {/* Footer Nav */}
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-soft lg:flex-row lg:items-center lg:justify-between">
                    <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">This page shows your diagnostic scores only.</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  To explore next steps and recommendations, go to the relevant sections.
                </p>
                      </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("analysis")}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-brand-300 hover:text-brand-600"
                >
                  Recommendations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("nextsteps")}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-brand-300 hover:text-brand-600"
                >
                  Action Plan
                </button>
                <button
                  type="button"
                  onClick={() => downloadButtonRef.current?.click()}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-brand-300 hover:text-brand-600"
                >
                  Download Full Report
                </button>
                      </div>
                    </div>
              </div>
        </div>
      )}

      {/* Tab Content: Detailed Analysis & Recommendations */}
      {activeTab === "analysis" && recommendations && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
          <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Detailed Analysis & Recommendations</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => {
                  const text = node.children?.[0]?.value || "";
                  if (text && text.length > 50 && !text.includes("\n")) {
                    return <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4" {...props} />;
                  }
                  return <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4" {...props} />;
                },
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }} {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" style={{ listStyleType: 'decimal', paddingLeft: '1.5rem' }} {...props} />
                ),
                li: ({ node, ...props }) => {
                  // Check if this is a nested list item (has ul/ol as children)
                  const hasNestedList = node.children?.some(child => 
                    child.type === 'element' && (child.tagName === 'ul' || child.tagName === 'ol')
                  );
                  return (
                    <li 
                      className={`leading-relaxed text-base text-slate-700 dark:text-slate-300 ${hasNestedList ? 'mb-2' : 'mb-3'}`} 
                      style={{ display: 'list-item', listStylePosition: 'outside' }} 
                      {...props} 
                    />
                  );
                },
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-4" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-3" {...props} />
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
        <div className="rounded-3xl border-2 border-brand-300 dark:border-brand-600 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-6 shadow-soft">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 mt-6" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3 mt-4" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed text-slate-700 dark:text-slate-300" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
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
          <div className="rounded-3xl border-2 border-brand-300 dark:border-brand-600 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-6 shadow-soft">
            <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">📋 What's Next?</h2>
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
            <div className="rounded-3xl border-2 border-brand-200 dark:border-brand-700 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-800 p-6 shadow-soft">
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">🚀 Unlock More Features</h2>
              {isFree && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    You've used <strong>{subscription?.validations_used || 0} of 2</strong> free validations.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    You've used <strong>{subscription?.validations_used || 0} of 20</strong> validations this month.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
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
            <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🚀 Your Next Steps</h2>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Start Here</span>
              </div>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                Follow these specific, actionable steps to move your idea forward. Each step includes resources and timelines.
              </p>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-outside space-y-4 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="leading-relaxed text-base text-slate-700 dark:text-slate-300" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2" {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
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
    </section>
  );
}

