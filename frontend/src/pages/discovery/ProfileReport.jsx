import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useReports } from "../../context/ReportsContext.jsx";
import Seo from "../../components/common/Seo.jsx";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function parseProfileSections(markdown = "") {
  if (!markdown) return [];

  const sections = [];
  const lines = markdown.split(/\r?\n/);
  let currentSection = null;
  let currentSubsection = null;
  let currentContent = [];
  let subsectionContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip document titles
    if (trimmed.match(/^\*\*.*Profile\s+Summary\s+Document\*\*/i) || 
        trimmed.match(/^#+\s*.*Profile\s+Summary\s+Document/i)) {
      continue;
    }
    
    // Check for main section: **1. Title:** or **Title:** (more flexible)
    const boldSectionMatch = trimmed.match(/^\*\*(\d+\.\s*)?([^*]+?)\*\*:?\s*$/);
    if (boldSectionMatch) {
      const fullTitle = boldSectionMatch[0];
      if (fullTitle.toLowerCase().includes('profile summary document') || 
          fullTitle.toLowerCase().includes('intake profile')) {
        continue;
      }
      // Save previous section
      if (currentSection) {
        if (currentContent.length > 0) {
          currentSection.intro = currentContent.join("\n").trim();
        }
        if (currentSubsection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push({
            ...currentSubsection,
            content: subsectionContent.join("\n").trim(),
          });
        }
        sections.push(currentSection);
      }
      
      // Start new section
      const title = (boldSectionMatch[2] || boldSectionMatch[1] || '').trim().replace(/^\d+\.\s*/, '');
      currentSection = {
        title,
        level: 4,
        intro: "",
        subsections: [],
      };
      currentContent = [];
      currentSubsection = null;
      subsectionContent = [];
      continue;
    }
    
    // Check for markdown headings (#, ##, ###, ####) - more flexible
    const mdHeadingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdHeadingMatch) {
      // Save previous section
      if (currentSection) {
        if (currentContent.length > 0) {
          currentSection.intro = currentContent.join("\n").trim();
        }
        if (currentSubsection) {
          if (!currentSection.subsections) currentSection.subsections = [];
          currentSection.subsections.push({
            ...currentSubsection,
            content: subsectionContent.join("\n").trim(),
          });
        }
        sections.push(currentSection);
      }
      
      // Start new section - accept h2 and below as sections (h1 is usually title)
      const title = mdHeadingMatch[2].trim().replace(/^\d+\.\s*/, '');
      const headingLevel = mdHeadingMatch[1].length;
      if (headingLevel >= 2) {
        currentSection = {
          title,
          level: headingLevel,
          intro: "",
          subsections: [],
        };
        currentContent = [];
        currentSubsection = null;
        subsectionContent = [];
        continue;
      }
    }
    
    // Check for lines that look like section headers (all caps, or title case with colon)
    // Pattern: "SECTION TITLE:" or "Section Title:" at start of line
    const headerLikeMatch = trimmed.match(/^([A-Z][A-Za-z\s]+):\s*$/);
    if (headerLikeMatch && trimmed.length < 100 && !trimmed.includes('*') && !trimmed.includes('#')) {
      // Only treat as header if it's a short line (likely a title) and we don't have a current section with content
      if (!currentSection || currentContent.length > 5 || currentSection.intro.length > 50) {
        // Save previous section
        if (currentSection) {
          if (currentContent.length > 0) {
            currentSection.intro = currentContent.join("\n").trim();
          }
          if (currentSubsection) {
            if (!currentSection.subsections) currentSection.subsections = [];
            currentSection.subsections.push({
              ...currentSubsection,
              content: subsectionContent.join("\n").trim(),
            });
          }
          sections.push(currentSection);
        }
        
        // Start new section
        const title = headerLikeMatch[1].trim();
        currentSection = {
          title,
          level: 3,
          intro: "",
          subsections: [],
        };
        currentContent = [];
        currentSubsection = null;
        subsectionContent = [];
        continue;
      }
    }
    
    // Check for subsection: numbered list with bold
    const numberedSubMatch = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)$/);
    if (numberedSubMatch && currentSection) {
      // Save intro if we have content
      if (currentContent.length > 0 && !currentSection.intro) {
        currentSection.intro = currentContent.join("\n").trim();
        currentContent = [];
      }
      
      // Save previous subsection
      if (currentSubsection) {
        if (!currentSection.subsections) currentSection.subsections = [];
        currentSection.subsections.push({
          ...currentSubsection,
          content: subsectionContent.join("\n").trim(),
        });
      }
      
      // Start new subsection
      currentSubsection = {
        title: numberedSubMatch[2].trim(),
        level: 3,
        content: "",
      };
      subsectionContent = [];
      const rest = numberedSubMatch[3].trim();
      if (rest) {
        subsectionContent.push(rest);
      }
      continue;
    }
    
    // Check for subsection: bullet list with bold (may be indented with spaces)
    // Match: "   - **Time Commitment:** content here"
    const bulletSubMatch = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*:?\s*(.*)$/);
    if (bulletSubMatch && currentSection) {
      // Save intro if we have content
      if (currentContent.length > 0 && !currentSection.intro) {
        currentSection.intro = currentContent.join("\n").trim();
        currentContent = [];
      }
      
      // Save previous subsection
      if (currentSubsection) {
        if (!currentSection.subsections) currentSection.subsections = [];
        currentSection.subsections.push({
          ...currentSubsection,
          content: subsectionContent.join("\n").trim(),
        });
      }
      
      // Start new subsection
      currentSubsection = {
        title: bulletSubMatch[1].trim(),
        level: 3,
        content: "",
      };
      subsectionContent = [];
      const rest = bulletSubMatch[2].trim();
      if (rest) {
        subsectionContent.push(rest);
      }
      continue;
    }
    
    // Regular content (including indented lines and empty lines)
    if (currentSubsection) {
      subsectionContent.push(line);
    } else if (currentSection) {
      // Only skip completely empty lines if we haven't started collecting content
      if (trimmed || currentContent.length > 0) {
        currentContent.push(line);
      }
    }
  }

  // Save last section
  if (currentSection) {
    if (currentContent.length > 0) {
      currentSection.intro = currentContent.join("\n").trim();
    }
    if (currentSubsection) {
      if (!currentSection.subsections) currentSection.subsections = [];
      currentSection.subsections.push({
        ...currentSubsection,
        content: subsectionContent.join("\n").trim(),
      });
    }
    sections.push(currentSection);
  }

  // If no sections were found, try a more aggressive approach: split by double newlines or common patterns
  if (sections.length === 0 && markdown.length > 0) {
    // Try splitting by double newlines and treating each block as a potential section
    const blocks = markdown.split(/\n\s*\n/).filter(block => block.trim().length > 0);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      const firstLine = block.split('\n')[0].trim();
      
      // If first line looks like a title (short, no punctuation at end, or ends with colon)
      if (firstLine.length < 80 && (firstLine.match(/^[A-Z]/) || firstLine.endsWith(':'))) {
        const title = firstLine.replace(/[:\.]$/, '').trim();
        const content = block.split('\n').slice(1).join('\n').trim() || block;
        
        if (title.length > 0 && content.length > 0) {
          sections.push({
            title,
            level: 3,
            intro: content,
            subsections: [],
          });
        }
      } else if (block.length > 50) {
        // If block doesn't have a clear title, create a generic section
        sections.push({
          title: `Section ${i + 1}`,
          level: 3,
          intro: block,
          subsections: [],
        });
      }
    }
  }

  return sections;
}

function getSectionTheme(title = "", index = 0) {
  const lowerTitle = title.toLowerCase();
  
  // Simplified: Use only 2 color schemes for a cleaner, more professional look
  // Alternate between brand (blue) and slate (neutral) with subtle variations
  
  // Primary sections (alternating pattern for visual separation)
  const isEven = index % 2 === 0;
  
  if (lowerTitle.includes("motivation") || lowerTitle.includes("goal") || lowerTitle.includes("objective")) {
    return {
      icon: "🎯",
      border: "border-brand-300 dark:border-brand-600",
      bg: "bg-brand-50 dark:bg-brand-900/20",
      headerBg: "bg-brand-100 dark:bg-brand-900/30",
      text: "text-brand-800 dark:text-brand-300",
      borderColor: "#A5B6E0",
      borderColorDark: "#4C5FA8",
      bgColor: "#E8ECF7",
      bgColorDark: "#1E2A4A",
      headerBgColor: "#D0D9F0",
      headerBgColorDark: "#2A3A5C",
      textColor: "#1B4091",
      textColorDark: "#93B0E8",
    };
  }
  
  // Use neutral slate for most sections - cleaner, more professional
  return {
    icon: isEven ? "📋" : "✨",
    border: "border-slate-300 dark:border-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    headerBg: "bg-slate-100 dark:bg-slate-700/50",
    text: "text-slate-800 dark:text-slate-200",
    borderColor: "#CAD2DA",
    borderColorDark: "#475569",
    bgColor: "#F8FAFC",
    bgColorDark: "#1E293B",
    headerBgColor: "#EEF2F6",
    headerBgColorDark: "#334155",
    textColor: "#47505B",
    textColorDark: "#CBD5E1",
  };
}

function CollapsibleSubsection({ subsection, isOpen, onToggle }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-left">
          {subsection.title}
        </h3>
        <span className={`text-xs transition-transform flex-shrink-0 text-slate-600 dark:text-slate-400 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white dark:bg-slate-800/50">
          {subsection.content ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-3 ml-5" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-3 ml-5" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="leading-relaxed pl-1" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="italic text-slate-600 dark:text-slate-400" {...props} />
                  ),
                }}
              >
                {subsection.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm italic">No content available</p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ section, theme, openSubsections, toggleSubsection, sectionNumber, isOpen, onToggle }) {
  return (
    <div
      className={`rounded-2xl border-2 ${theme.border} ${theme.bg} p-0 overflow-hidden shadow-md dark:shadow-slate-900/50`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-6 py-4 ${theme.headerBg} border-b-2 ${theme.border} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{theme.icon}</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-bold ${theme.text} opacity-70`}>
              {sectionNumber}.
            </span>
            <h2 className={`text-lg font-bold text-left ${theme.text}`}>
              {section.title}
            </h2>
          </div>
        </div>
        <span className={`text-xl transition-transform flex-shrink-0 text-slate-600 dark:text-slate-400 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      
      {isOpen && (
      <div className="p-6 space-y-5 bg-white dark:bg-slate-800/50">
        {section.intro && section.intro.trim() && (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 text-base" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-outside space-y-2.5 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-outside space-y-2.5 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed pl-1" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-slate-600 dark:text-slate-400" {...props} />
                ),
              }}
            >
              {section.intro}
            </ReactMarkdown>
          </div>
        )}
        
        {section.subsections && section.subsections.length > 0 && (
          <div className={`space-y-3 ${section.intro && section.intro.trim() ? 'border-t border-slate-200 dark:border-slate-700 pt-4' : ''}`}>
            {section.subsections.map((subsection, subIndex) => {
              const subsectionKey = `${section.title}-${subIndex}`;
              const isSubOpen = openSubsections.has(subsectionKey);
              
              return (
                <CollapsibleSubsection
                  key={subIndex}
                  subsection={subsection}
                  isOpen={isSubOpen}
                  onToggle={() => toggleSubsection(subsectionKey)}
                />
              );
            })}
          </div>
        )}
        
        {(!section.intro || !section.intro.trim()) && (!section.subsections || section.subsections.length === 0) && (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">No content available for this section</p>
        )}
      </div>
      )}
    </div>
  );
}

// Sample profile analysis data
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

export default function ProfileReport() {
  const { reports, loadRunById } = useReports();
  const query = useQuery();
  const runId = query.get("id");
  const isSample = query.get("sample") === "true";
  const [openSubsections, setOpenSubsections] = useState(new Set());
  const [openSections, setOpenSections] = useState(new Set());

  useEffect(() => {
    // Only load if not in sample mode
    if (!isSample && runId) {
      loadRunById(runId);
    }
  }, [runId, isSample, loadRunById]);

  // Use sample data if in sample mode
  const effectiveProfileAnalysis = isSample ? SAMPLE_PROFILE_ANALYSIS : reports?.profile_analysis;

  const sections = useMemo(() => {
    if (!effectiveProfileAnalysis) {
      return [];
    }
    const parsed = parseProfileSections(effectiveProfileAnalysis);
    return parsed;
  }, [effectiveProfileAnalysis]);

  const toggleSubsection = (subsectionKey) => {
    setOpenSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(subsectionKey)) {
        next.delete(subsectionKey);
      } else {
        next.add(subsectionKey);
      }
      return next;
    });
  };

  const toggleSection = (sectionIndex) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionIndex)) {
        next.delete(sectionIndex);
      } else {
        next.add(sectionIndex);
      }
      return next;
    });
  };

  // All sections start folded by default - user can expand as needed

  return (
    <section className="grid gap-6">
      <Seo
        title="Profile Analysis Report | Startup Idea Advisor"
        description="Detailed analysis of your entrepreneurial profile generated by our AI advisor."
        path="/results/profile"
      />
      
      {isSample && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 p-4 text-center">
          <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            📋 Sample Profile Analysis — This is a demonstration of what you'll receive
          </p>
        </div>
      )}

      <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50 mb-2">Profile Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Comprehensive analysis of your entrepreneurial profile, strengths, and opportunities
            </p>
          </div>
          {isSample && (
            <Link 
              to="/product" 
              className="inline-flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-400"
            >
              <span aria-hidden="true">←</span> Back to product
            </Link>
          )}
        </div>
        
        {!isSample && reports?.personalized_recommendations && (
          <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/20 p-4 text-emerald-800 dark:text-emerald-300 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">✨</span>
              <div>
                <p className="font-semibold text-sm mb-1 dark:text-emerald-300">Your personalized reports are ready!</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  View your <a href={`/results/recommendations${runId ? `?id=${runId}` : ''}`} className="underline font-medium hover:text-emerald-900 dark:hover:text-emerald-300">startup recommendations</a> and detailed analysis reports.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!effectiveProfileAnalysis ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20 p-6 text-amber-800 dark:text-amber-300">
            <p className="text-sm">No profile analysis available. Please run a new analysis first.</p>
            {!isSample && <p className="text-xs mt-2 text-amber-700 dark:text-amber-400">Reports object: {JSON.stringify(reports, null, 2)}</p>}
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20 p-6 text-amber-800 dark:text-amber-300">
            <p className="text-sm mb-4">Could not parse sections from markdown. Displaying raw content:</p>
            <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800/50 p-4 rounded-lg border border-amber-300 dark:border-amber-700">
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-outside space-y-2 text-slate-700 dark:text-slate-300 mb-4 ml-6" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 mt-6" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3 mt-5" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-4" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 mt-3" {...props} />
                  ),
                }}
              >
                {effectiveProfileAnalysis}
              </ReactMarkdown>
            </div>
            <p className="text-xs mt-4 text-amber-700 dark:text-amber-400">Markdown length: {effectiveProfileAnalysis?.length || 0} characters</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sections.map((section, index) => {
              const theme = getSectionTheme(section.title, index);
              const sectionNumber = index + 1;
              const isSectionOpen = openSections.has(index);
              
              return (
                <Section
                  key={index}
                  section={section}
                  theme={theme}
                  openSubsections={openSubsections}
                  toggleSubsection={toggleSubsection}
                  sectionNumber={sectionNumber}
                  isOpen={isSectionOpen}
                  onToggle={() => toggleSection(index)}
                />
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
