const EXECUTION_TEMPLATES = [
  "Define the success metrics you will track for {{idea}} so progress maps cleanly to your goal of {{goalType}}.",
  "Map the end-to-end customer journey for {{idea}}, highlighting where your {{skillStrength}} strengths create outsized value.",
  "Break work into weekly sprints that respect your availability of {{timeCommitment}}, and assign a focus theme to each sprint.",
  "Line up at least five discovery conversations with {{focus}} prospects to validate demand before you build further.",
  "Prototype the core experience for {{idea}} and gather feedback using lightweight tools that fit your {{budgetRange}} budget.",
  "Run two pricing experiments that reflect how {{idea}} monetizes, keeping each test under {{budgetRange}} per month.",
  "Design a launch playbook that matches your preferred {{workStyle}} work style and existing distribution channels.",
  "Outline tooling, partners, or contractors required for {{idea}}, then secure one quick-win collaboration this month.",
  "Schedule bi-weekly reviews to check traction, cost, and energy levels so {{idea}} stays aligned with your goal of {{goalType}}.",
  "Identify the first collaborator who complements your {{skillStrength}} strengths and draft how they would accelerate {{idea}}.",
  "Document a fallback scenario that keeps {{idea}} moving even if key assumptions fail, protecting your {{budgetRange}} commitment.",
];

const FINANCIAL_TEMPLATES = [
  {
    focus: "Launch runway",
    estimate:
      "Baseline monthly spend for {{idea}} stays inside your current budget band.",
    metric: "{{monthlyBurn}} / month",
  },
  {
    focus: "Break-even horizon",
    estimate:
      "Projected break-even lands in month {{breakevenMonths}} if you reinvest a share of early revenue.",
    metric: "Reinvest {{reinvestmentPercent}}",
  },
  {
    focus: "Startup capital",
    estimate:
      "You can launch {{idea}} with lean upfront investment while keeping a healthy runway buffer.",
    metric: "Initial outlay {{startupCost}}",
  },
  {
    focus: "Upside scenario",
    estimate:
      "If traction holds, monthly profit potential for {{idea}} can reach a meaningful revenue floor.",
    metric: "Upside {{upsideRevenue}} / month",
  },
  {
    focus: "Safety reserve",
    estimate:
      "Maintain a fallback reserve so unexpected delays do not jeopardize your baseline finances.",
    metric: "Reserve {{fallbackReserve}} ({{cashBufferPercent}} of savings)",
  },
];

const VALIDATION_TEMPLATES = [
  {
    question: "What signal would convince you that {{idea}} solves a burning pain for {{audience}}?",
    listenFor: "Watch for specific moments where the pain shows up, and which workaround they rely on today.",
    actOn: "Use their answer to prioritize problem statements in your landing page or interview script.",
  },
  {
    question: "How would your ideal customer describe success after using {{idea}} for a month?",
    listenFor: "Look for tangible outcomes or metrics they expect to improve, not vague feelings.",
    actOn: "Translate their desired outcome into your product promise and onboarding checklist.",
  },
  {
    question: "Which paid channel or partnership can prove traction for {{idea}} without exceeding your budget?",
    listenFor: "Note channels they already trust or partners who can introduce them to new audiences quickly.",
    actOn: "Use the responses to shape your first acquisition experiment and outreach list.",
  },
  {
    question: "What outcome must happen in the next 30 days for you to double down on {{idea}}?",
    listenFor: "Identify the minimum viable proof they need—usage, lead volume, or revenue threshold.",
    actOn: "Convert that outcome into an experiment metric so you know when to scale or pivot.",
  },
  {
    question: "What makes {{idea}} the best use of your time compared with other paths toward {{goal}}?",
    listenFor: "Listen for advantages that differentiate you—speed, domain expertise, or available assets.",
    actOn: "Highlight those advantages in your pitch and deprioritize activities that don't leverage them.",
  },
  {
    question: "Who can give you the fastest, most honest feedback on the core promise of {{idea}}?",
    listenFor: "Names of customer segments, advisors, or distribution partners who influence decisions.",
    actOn: "Reach out to the people mentioned and structure interviews around their decision criteria.",
  },
  {
    question: "What retention or repeat behavior will show {{idea}} is building long-term value?",
    listenFor: "Seek concrete behaviors—monthly usage, renewals, referrals—rather than general satisfaction.",
    actOn: "Track the behavior they cite as your north-star metric during pilot tests.",
  },
];

const PERSONALIZATION_RULES = [
  { pattern: /\bthe user's\b/gi, replacement: "your" },
  { pattern: /\bthe users\b/gi, replacement: "your" },
  { pattern: /\bthe user\b/gi, replacement: "you" },
  { pattern: /\buser's\b/gi, replacement: "your" },
  { pattern: /\busers\b/gi, replacement: "customers" },
  { pattern: /\buser\b/gi, replacement: "you" },
  { pattern: /\btheir goal\b/gi, replacement: "your goal" },
  { pattern: /\btheir goals\b/gi, replacement: "your goals" },
  { pattern: /\btheir\b/gi, replacement: "your" },
];

export function personalizeCopy(text = "") {
  return PERSONALIZATION_RULES.reduce(
    (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
    text
  );
}

export function splitIdeaSections(body = "") {
  if (!body) return {};
  const sections = { intro: [] };
  let current = "intro";
  body.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.trim().match(/^\*\*(.+?)\*\*:?$/);
    if (headingMatch) {
      current = headingMatch[1].trim().toLowerCase();
      sections[current] = sections[current] || [];
    } else {
      sections[current].push(line.replace(/\*\*/g, ""));
    }
  });
  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key, personalizeCopy(value.join("\n").trim())])
  );
}

export function formatSectionHeading(raw = "") {
  const cleaned = personalizeCopy(raw)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractListFromText(text = "") {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const items = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^[-*+]\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*+]\s+/, "").trim());
    } else if (/^\d+[\.\)]\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^\d+[\.\)]\s+/, "").trim());
    }
  });

  if (items.length > 0) {
    return items.map((item) => personalizeCopy(item));
  }

  // Fallback: split into sentences if bullets are missing.
  const sentenceItems = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  return sentenceItems.map((sentence) => personalizeCopy(sentence));
}

export function extractWhyFit(sectionText = "") {
  return extractListFromText(sectionText);
}

export function buildExecutionSteps(
  sectionText = "",
  ideaTitle = "",
  {
    goalType = "your goal",
    timeCommitment = "10–15 hrs/week",
    budgetRange = "a lean launch budget",
    workStyle = "your preferred work style",
    skillStrength = "core strengths",
    focus = "target customers",
  } = {}
) {
  const items = extractListFromText(sectionText);
  const normalizedTitle = ideaTitle || "this idea";
  const steps = [];

  const seen = new Set();
  items.forEach((item) => {
    const cleaned = personalizeCopy(item);
    const fingerprint = cleaned.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      steps.push(cleaned);
    }
  });

  // Create idea-specific variations by using idea title to seed template selection
  // This ensures different ideas get different step orders and variations
  const ideaHash = normalizedTitle.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shuffledTemplates = [...EXECUTION_TEMPLATES];
  
  // Shuffle templates based on idea title to vary the order
  for (let i = shuffledTemplates.length - 1; i > 0; i--) {
    const j = (ideaHash + i) % (i + 1);
    [shuffledTemplates[i], shuffledTemplates[j]] = [shuffledTemplates[j], shuffledTemplates[i]];
  }

  let templateIndex = 0;
  while (steps.length < 10 && templateIndex < shuffledTemplates.length) {
    const template = shuffledTemplates[templateIndex];
    
    // Add idea-specific variations to make steps more unique
    const ideaVariations = {
      "ai": "Leverage AI tools and APIs",
      "platform": "Set up your platform infrastructure",
      "marketplace": "Build your marketplace foundation",
      "service": "Design your service delivery model",
      "app": "Develop your app architecture",
      "saas": "Build your SaaS infrastructure",
    };
    
    let ideaSpecificPrefix = "";
    for (const [keyword, prefix] of Object.entries(ideaVariations)) {
      if (normalizedTitle.toLowerCase().includes(keyword)) {
        ideaSpecificPrefix = prefix;
        break;
      }
    }
    
    const filled = template
      .replace(/{{idea}}/g, normalizedTitle)
      .replace(/{{goalType}}/g, goalType)
      .replace(/{{timeCommitment}}/g, timeCommitment)
      .replace(/{{budgetRange}}/g, budgetRange)
      .replace(/{{workStyle}}/g, workStyle)
      .replace(/{{skillStrength}}/g, skillStrength)
      .replace(/{{focus}}/g, focus)
      .replace(/{{categoryPlan}}/g, focusSpecificPlan(focus));
    
    // Add idea-specific context to make steps more unique
    let enhancedStep = filled;
    if (ideaSpecificPrefix && templateIndex < 3) {
      enhancedStep = `${ideaSpecificPrefix} for ${normalizedTitle}. ${filled}`;
    }
    
    const cleaned = personalizeCopy(enhancedStep);
    const fingerprint = cleaned.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      steps.push(cleaned);
    }
    templateIndex += 1;
  }
  
  // Add more idea-specific fallbacks
  while (steps.length < 10) {
    const ideaSpecificFallbacks = [
      `Research competitors in the ${normalizedTitle} space and identify your unique positioning.`,
      `Create a minimum viable version of ${normalizedTitle} that you can test with real users.`,
      `Set up analytics and tracking to measure how ${normalizedTitle} performs.`,
      `Build a waitlist or early access program for ${normalizedTitle}.`,
      `Develop a go-to-market strategy specifically for ${normalizedTitle}.`,
    ];
    const fallbackIndex = (ideaHash + steps.length) % ideaSpecificFallbacks.length;
    const fallback = ideaSpecificFallbacks[fallbackIndex]
      .replace(/{{idea}}/g, normalizedTitle)
      .replace(/{{goalType}}/g, goalType);
    const fingerprint = fallback.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      steps.push(fallback);
    } else {
      break;
    }
  }
  return steps.slice(0, Math.max(10, steps.length));
}

// Extract numeric value from text (e.g., "$25K" -> 25000, "$120,000" -> 120000)
function extractCurrency(text) {
  const match = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/i);
  if (!match) return null;
  let value = match[0].replace(/[$,]/g, "");
  if (/K/i.test(value)) {
    value = parseFloat(value) * 1000;
  } else if (/M/i.test(value)) {
    value = parseFloat(value) * 1000000;
  } else if (/B/i.test(value)) {
    value = parseFloat(value) * 1000000000;
  }
  return Math.round(parseFloat(value));
}

// Extract time period (e.g., "Year 1", "month 6", "within 12 months")
function extractTimeframe(text) {
  const yearMatch = text.match(/(?:within\s+)?(?:year|yr)\s*(\d+)/i);
  if (yearMatch) return `Year ${yearMatch[1]}`;
  const monthMatch = text.match(/(?:within\s+)?(?:month|mo)\s*(\d+)/i);
  if (monthMatch) return `Month ${monthMatch[1]}`;
  const monthsMatch = text.match(/(\d+)\s*(?:months?|mos?)/i);
  if (monthsMatch) return `${monthsMatch[1]} months`;
  return null;
}

// Parse budget range to get max budget value
function parseBudgetRange(budgetRange = "") {
  if (!budgetRange) return null;
  
  // Extract numbers from budget range strings like "Up to $5 K", "$20 K and Above", etc.
  const match = budgetRange.match(/\$?\s*(\d+(?:,\d+)?)\s*K/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, "")) * 1000;
  }
  
  // Handle "Free" or "$0"
  if (/free|sweat|0/i.test(budgetRange)) {
    return 0;
  }
  
  // Handle ranges like "$1 K" to "$5 K"
  const rangeMatch = budgetRange.match(/\$?\s*(\d+(?:,\d+)?)\s*K\s*(?:to|-)\s*\$?\s*(\d+(?:,\d+)?)\s*K/i);
  if (rangeMatch) {
    return parseInt(rangeMatch[2].replace(/,/g, "")) * 1000;
  }
  
  // Handle "$20 K and Above"
  if (/and\s+above/i.test(budgetRange)) {
    const aboveMatch = budgetRange.match(/\$?\s*(\d+(?:,\d+)?)\s*K/i);
    if (aboveMatch) {
      return parseInt(aboveMatch[1].replace(/,/g, "")) * 1000;
    }
  }
  
  return null;
}

export function buildFinancialSnapshots(sectionText = "", ideaTitle = "", budgetRange = "") {
  const normalizedTitle = ideaTitle || "this idea";
  const entries = [];
  const seen = new Set();

  // Parse actual financial data from agent output
  const text = sectionText.toLowerCase();
  
  // Extract startup costs
  const startupCostMatch = sectionText.match(/startup\s+costs?[:\-]?\s*(.+?)(?:\n|$)/i);
  if (startupCostMatch) {
    const costText = startupCostMatch[1];
    const costValue = extractCurrency(costText);
    if (costValue) {
      entries.push({
        focus: "Startup costs",
        estimate: personalizeCopy(startupCostMatch[1].trim()),
        metric: formatCurrency(costValue),
      });
      seen.add("startup costs");
    }
  }

  // Extract revenue projections
  const revenueMatch = sectionText.match(/revenue\s+projections?[:\-]?\s*(.+?)(?:\n|$)/i);
  if (revenueMatch) {
    const revenueText = revenueMatch[1];
    const revenueValue = extractCurrency(revenueText);
    const timeframe = extractTimeframe(revenueText);
    if (revenueValue) {
      entries.push({
        focus: "Revenue potential",
        estimate: personalizeCopy(revenueMatch[1].trim()),
        metric: timeframe ? `${formatCurrency(revenueValue)} (${timeframe})` : formatCurrency(revenueValue),
      });
      seen.add("revenue");
    }
  }

  // Extract breakeven
  const breakevenMatch = sectionText.match(/breakeven[:\-]?\s*(.+?)(?:\n|$)/i);
  if (breakevenMatch) {
    const breakevenText = breakevenMatch[1];
    const timeframe = extractTimeframe(breakevenText);
    entries.push({
      focus: "Breakeven timeline",
      estimate: personalizeCopy(breakevenMatch[1].trim()),
      metric: timeframe || "TBD",
    });
    seen.add("breakeven");
  }

  // Extract monthly burn/operating costs
  const burnMatch = sectionText.match(/(?:monthly\s+)?(?:burn|operating\s+costs?|monthly\s+costs?)[:\-]?\s*(.+?)(?:\n|$)/i);
  if (burnMatch) {
    const burnValue = extractCurrency(burnMatch[1]);
    if (burnValue) {
      entries.push({
        focus: "Monthly operating costs",
        estimate: personalizeCopy(burnMatch[1].trim()),
        metric: formatCurrency(burnValue) + "/month",
      });
      seen.add("burn");
    }
  }

  // Extract profit margins or unit economics if mentioned
  const marginMatch = sectionText.match(/(?:profit\s+)?margin[:\-]?\s*(.+?)(?:\n|$)/i);
  if (marginMatch && !seen.has("margin")) {
    entries.push({
      focus: "Profit margin",
      estimate: personalizeCopy(marginMatch[1].trim()),
      metric: marginMatch[1].match(/\d+%/) ? marginMatch[1].match(/\d+%/)[0] : "TBD",
    });
    seen.add("margin");
  }

  // If we have real data, return it. Otherwise, use minimal fallbacks only
  if (entries.length >= 3) {
    return entries;
  }

  // Only add fallbacks if agent didn't provide enough data
  // Use realistic estimates based on user's actual budget, not arbitrary caps
  const ideaType = normalizedTitle.toLowerCase();
  const userMaxBudget = parseBudgetRange(budgetRange);
  
  // Only add fallbacks if we have less than 3 entries (agent didn't provide enough)
  // And make them realistic based on the user's actual budget range
  if (entries.length < 3) {
    // Determine realistic estimates based on budget range, not idea type
    let estimatedStartupCost = null;
    let estimatedMonthlyRevenue = null;
    
    if (userMaxBudget !== null) {
      // Use realistic percentages of the budget based on typical startup cost breakdowns
      if (userMaxBudget <= 1000) {
        // Very lean budget - focus on minimal viable setup
        estimatedStartupCost = Math.floor(userMaxBudget * 0.8); // Use 80% for tools/setup
        estimatedMonthlyRevenue = 500; // Conservative for lean startups
      } else if (userMaxBudget <= 5000) {
        // Small budget - can cover basic tools, some marketing
        estimatedStartupCost = Math.floor(userMaxBudget * 0.7); // 70% for setup, 30% buffer
        estimatedMonthlyRevenue = 1000; // Realistic for small budget ideas
      } else if (userMaxBudget <= 10000) {
        // Medium budget - more room for tools, development, marketing
        estimatedStartupCost = Math.floor(userMaxBudget * 0.6); // 60% for setup
        estimatedMonthlyRevenue = 2000;
      } else if (userMaxBudget <= 20000) {
        // Larger budget - can support more development
        estimatedStartupCost = Math.floor(userMaxBudget * 0.5); // 50% for initial setup
        estimatedMonthlyRevenue = 3000;
      } else {
        // Large budget - significant investment possible
        estimatedStartupCost = Math.floor(userMaxBudget * 0.4); // 40% for setup, rest for runway
        estimatedMonthlyRevenue = 5000;
      }
    } else {
      // No budget specified - use conservative defaults
      estimatedStartupCost = 3000;
      estimatedMonthlyRevenue = 1000;
    }

    // Add startup cost estimate only if agent didn't provide it
    if (!seen.has("startup costs") && estimatedStartupCost !== null) {
      entries.push({
        focus: "Estimated startup investment",
        estimate: `Based on your ${budgetRange || "budget"}, initial setup costs for ${normalizedTitle}`,
        metric: formatCurrency(estimatedStartupCost),
      });
    }
    
    // Add revenue estimate only if agent didn't provide it
    if (!seen.has("revenue") && estimatedMonthlyRevenue !== null) {
      entries.push({
        focus: "Revenue potential",
        estimate: `Conservative monthly revenue projection for ${normalizedTitle} based on typical early-stage performance`,
        metric: formatCurrency(estimatedMonthlyRevenue) + "/month",
      });
    }
  }

  return entries.slice(0, 5);
}

function fakerNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatCurrency(amount) {
  return `$${amount.toLocaleString()}`;
}

export function parseRiskRows(sectionText = "") {
  const items = extractListFromText(sectionText);
  return items.map((item) => {
    const severityMatch =
      item.match(/\b(severe|critical|extreme|high)\b/i) ||
      item.match(/\b(medium|moderate)\b/i) ||
      item.match(/\b(low|minor)\b/i);
    const severity = severityMatch ? severityMatch[0].toUpperCase() : "MEDIUM";

    const mitigationMatch = item.match(/mitigation[:\-]?\s*(.+)$/i);
    let mitigation = mitigationMatch ? mitigationMatch[1].trim() : "";

    let riskText = item;
    if (mitigationMatch) {
      riskText = item.slice(0, mitigationMatch.index).trim().replace(/[—–-]\s*$/u, "");
    } else if (item.includes("—") || item.includes("–")) {
      const split = item.split(/[—–]/u);
      riskText = split[0].trim();
      mitigation = split.slice(1).join("—").trim();
    } else if (item.includes("-")) {
      const split = item.split("-");
      riskText = split[0].trim();
      mitigation = split.slice(1).join("-").trim();
    }

    if (!mitigation) {
      mitigation = "Create a mitigation experiment to reduce this risk within the next sprint.";
    }

    return {
      risk: personalizeCopy(riskText),
      severity,
      mitigation: personalizeCopy(mitigation),
    };
  });
}

export function extractValidationQuestions(sectionText = "") {
  return extractListFromText(sectionText);
}

export function buildValidationQuestions(sectionText = "", ideaTitle = "", audience = "", goal = "") {
  const list = extractValidationQuestions(sectionText);
  const combined = [];
  const seen = new Set();

  list.forEach((item) => {
    const cleaned = personalizeCopy(item);
    const fingerprint = cleaned.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      combined.push({
        question: cleaned,
        listenFor: "Note concrete answers that reveal urgency, existing workarounds, and budget authority.",
        actOn: "Use the response to refine positioning, pricing, or your next experiment.",
      });
    }
  });

  const normalizedIdea = ideaTitle || "this idea";
  const normalizedAudience = audience || "your target customers";
  const normalizedGoal = goal || "your primary goal";

  let templateIndex = 0;
  while (combined.length < 6 && templateIndex < VALIDATION_TEMPLATES.length) {
    const template = VALIDATION_TEMPLATES[templateIndex];
    const question = personalizeCopy(
      template.question
        .replace(/{{idea}}/g, normalizedIdea)
        .replace(/{{audience}}/g, normalizedAudience)
        .replace(/{{goal}}/g, normalizedGoal)
    );
    const listenFor = personalizeCopy(
      template.listenFor
        .replace(/{{idea}}/g, normalizedIdea)
        .replace(/{{audience}}/g, normalizedAudience)
        .replace(/{{goal}}/g, normalizedGoal)
    );
    const actOn = personalizeCopy(
      template.actOn
        .replace(/{{idea}}/g, normalizedIdea)
        .replace(/{{audience}}/g, normalizedAudience)
        .replace(/{{goal}}/g, normalizedGoal)
    );
    const fingerprint = question.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      combined.push({
        question,
        listenFor,
        actOn,
      });
    }
    templateIndex += 1;
  }

  return combined;
}

export function extractOtherSection(sectionText = "") {
  return personalizeCopy(sectionText);
}

export function parseProfileSummary(sectionText = "") {
  if (!sectionText) return [];

  const lines = sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = lines.length > 0 ? lines : extractListFromText(sectionText);
  const results = [];

  items.forEach((item) => {
    const cleaned = personalizeCopy(item.replace(/\*\*/g, ""));
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex > 0) {
      const label = cleaned.slice(0, colonIndex).trim();
      const value = cleaned.slice(colonIndex + 1).trim();
      results.push({
        label: formatSectionHeading(label),
        value: value || "Not specified",
      });
    } else {
      results.push({
        label: "Insight",
        value: cleaned,
      });
    }
  });

  return results;
}

export function splitFullReportSections(markdown = "") {
  if (!markdown) return {};
  const sections = {};
  let current = "";
  markdown.split(/\r?\n/).forEach((line) => {
    const headingMatch = line.trim().match(/^####\s+(.+)$/);
    if (headingMatch) {
      current = headingMatch[1].trim().toLowerCase();
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  });
  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key, personalizeCopy(value.join("\n").trim())])
  );
}

export function parseRecommendationMatrix(matrixText = "") {
  if (!matrixText) return [];
  
  const lines = matrixText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const rows = [];
  
  // First, try to parse as markdown table (primary format)
  let tableStartIndex = -1;
  let headerLine = null;
  let separatorLine = null;
  
  // Find the table header and separator
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this looks like a table header (contains | and common column names)
    if (line.includes('|') && (
      line.toLowerCase().includes('idea') || 
      line.toLowerCase().includes('goal') || 
      line.toLowerCase().includes('time') || 
      line.toLowerCase().includes('budget')
    )) {
      headerLine = line;
      // Check if next line is a separator
      if (i + 1 < lines.length && lines[i + 1].match(/^\|[\s\-:]+\|/)) {
        separatorLine = lines[i + 1];
        tableStartIndex = i;
        break;
      }
    }
  }
  
  // If we found a markdown table, parse it
  if (tableStartIndex >= 0 && headerLine) {
    const headerCells = headerLine.split('|').map(c => c.trim()).filter(c => c);
    
    // Find column indices
    const ideaCol = headerCells.findIndex(c => c.toLowerCase().includes('idea'));
    const goalCol = headerCells.findIndex(c => c.toLowerCase().includes('goal') || c.toLowerCase().includes('alignment'));
    const timeCol = headerCells.findIndex(c => c.toLowerCase().includes('time') || c.toLowerCase().includes('commitment'));
    const budgetCol = headerCells.findIndex(c => c.toLowerCase().includes('budget'));
    const skillCol = headerCells.findIndex(c => c.toLowerCase().includes('skill') || c.toLowerCase().includes('fit'));
    const workStyleCol = headerCells.findIndex(c => c.toLowerCase().includes('work') || c.toLowerCase().includes('style'));
    
    // Parse data rows (skip header and separator, stop at empty line or next heading)
    for (let i = tableStartIndex + 2; i < lines.length; i++) {
      const line = lines[i];
      
      // Stop if we hit a new section (heading) or empty line
      if (line.startsWith('#') || line.startsWith('###') || line === '') {
        break;
      }
      
      // Skip separator lines
      if (line.match(/^\|[\s\-:]+\|/)) continue;
      
      // Parse table row
      if (line.includes('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        
        if (cells.length > 0) {
          const idea = cells[ideaCol] || cells[0] || '';
          const goal = cells[goalCol] || '';
          const time = cells[timeCol] || '';
          const budget = cells[budgetCol] || '';
          const skill = cells[skillCol] || '';
          const workStyle = cells[workStyleCol] || '';
          
          // Extract idea number and name
          const ideaMatch = idea.match(/(\d+)\.\s*(.+)/) || idea.match(/\*\*(\d+)\.\s*(.+?)\*\*/);
          const order = ideaMatch ? parseInt(ideaMatch[1], 10) : rows.length + 1;
          const ideaName = ideaMatch ? ideaMatch[2] : idea.replace(/\*\*/g, '').trim();
          
          rows.push({
            order,
            idea: personalizeCopy(ideaName),
            goal: personalizeCopy(goal.replace(/\*\*/g, '').trim() || 'Strong'),
            time: personalizeCopy(time.replace(/\*\*/g, '').trim() || 'Aligned'),
            budget: personalizeCopy(budget.replace(/\*\*/g, '').trim() || 'Within range'),
            skill: personalizeCopy(skill.replace(/\*\*/g, '').trim() || 'Leverages strengths'),
            workStyle: personalizeCopy(workStyle.replace(/\*\*/g, '').trim() || 'Matches preferences'),
            notes: '', // Notes column not typically in the table
          });
        }
      }
    }
    
    if (rows.length > 0) {
      return rows;
    }
  }
  
  // Fallback: try to parse as bullet list format (legacy)
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Stop if we hit a new section
    if (trimmed.startsWith('#') || trimmed.startsWith('###')) {
      if (current) {
        rows.push(current);
        current = null;
      }
      return;
    }
    
    if (/^[-*+]\s*\*\*(.+?)\*\*/.test(trimmed)) {
      if (current) {
        rows.push(current);
      }
      const ideaMatch = trimmed.match(/^[-*+]\s*\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/u);
      const ideaText = ideaMatch ? ideaMatch[1].trim() : trimmed.replace(/^[-*+]\s*/, "").trim();
      const ideaNumMatch = ideaText.match(/(\d+)\.\s*(.+)/);
      const order = ideaNumMatch ? parseInt(ideaNumMatch[1], 10) : rows.length + 1;
      const ideaName = ideaNumMatch ? ideaNumMatch[2] : ideaText;
      
      current = {
        idea: ideaName,
        goal: "",
        time: "",
        budget: "",
        skill: "",
        workStyle: "",
        notes: "",
        order,
      };
      const extra = ideaMatch && ideaMatch[2] ? ideaMatch[2].trim() : "";
      if (extra) {
        parseMatrixAttributes(extra, current);
      }
    } else if (/^[-*+]\s+/.test(trimmed) && current) {
      const attribute = trimmed.replace(/^[-*+]\s+/, "");
      parseMatrixAttributes(attribute, current);
    } else if (trimmed && current && !trimmed.match(/^\|[\s\-:]+\|/)) {
      // Don't add table separators or markdown table content to notes
      if (!trimmed.startsWith('|') || trimmed.split('|').length <= 2) {
        current.notes = current.notes ? `${current.notes} ${trimmed}` : trimmed;
      }
    }
  });

  if (current) {
    rows.push(current);
  }

  return rows.map((row, idx) => ({
    order: row.order ?? idx + 1,
    idea: personalizeCopy(row.idea),
    goal: row.goal || "Strong",
    time: row.time || "Aligned",
    budget: row.budget || "Within range",
    skill: row.skill || "Leverages strengths",
    workStyle: row.workStyle || "Matches preferences",
    notes: truncateText(sanitizeMatrixNotes(row.notes), 160),
  }));
}

function parseMatrixAttributes(attribute, row) {
  const segments = attribute.split(/\s*\|\s*/);
  segments.forEach((segment) => {
    const [rawKey, rawValue] = segment.split(/[:\-–—]/, 2);
    if (!rawKey) return;
    const key = rawKey.trim().toLowerCase();
    const value = rawValue ? rawValue.trim() : "";
    if (key.includes("goal")) {
      row.goal = value || row.goal;
    } else if (key.includes("time")) {
      row.time = value || row.time;
    } else if (key.includes("budget")) {
      row.budget = value || row.budget;
    } else if (key.includes("skill")) {
      row.skill = value || row.skill;
    } else if (key.includes("work")) {
      row.workStyle = value || row.workStyle;
    } else if (!row.notes) {
      row.notes = segment.trim();
    } else {
      row.notes = `${row.notes}; ${segment.trim()}`;
    }
  });
}

function sanitizeMatrixNotes(notes = "") {
  if (!notes) return "";
  const stripped = notes
    .replace(/^#+\s+/gm, "") // Remove markdown headings
    .replace(/###\s+30\/60\/90\s+Day\s+Roadmap.*$/gmi, "") // Remove roadmap tables
    .replace(/###\s+Decision\s+Checklist.*$/gmi, "") // Remove decision checklist
    .replace(/\|[\s\-:]+\|/g, "") // Remove table separators
    .replace(/\|/g, " ") // Replace remaining pipes with spaces
    .replace(/\*\*/g, "") // Remove bold markers
    .replace(/Days\s*\|\s*Milestones/g, "") // Remove table headers
    .replace(/\d+-\d+\s*\|\s*[^\|]+/g, "") // Remove table rows (e.g., "0-30 | Define business model")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  return personalizeCopy(stripped);
}

export function extractTimelineSlice(markdown = "", segmentIndex = 0) {
  if (!markdown) return "Add specific milestones for this window.";
  const rows = markdown.match(/\|.*\|/g);
  if (rows && rows.length >= 3) {
    const headers = rows.slice(1); // skip header row
    const target = headers[segmentIndex];
    if (target) {
      const cells = target.split("|").map((cell) => cell.trim());
      if (cells.length >= 3) {
        return cells[2] || "Define clear milestones for this period.";
      }
    }
  }
  const sections = markdown.split(/###\s+/).filter(Boolean);
  if (sections[segmentIndex]) {
    return sections[segmentIndex].replace(/^[0-9\-]+\s*Days?:?\s*/i, "").trim();
  }
  return "Define clear milestones for this period.";
}

function truncateText(value = "", maxLength = 140) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength).trimEnd()}…`;
}

function focusSpecificPlan(focus = "") {
  const topic = focus.toLowerCase();
  if (topic.includes("ai") || topic.includes("automation")) {
    return "Launch a proof-of-concept demo using low/no-code AI tooling and publish a before/after case study";
  }
  if (topic.includes("consulting")) {
    return "Create a signature diagnostic workshop and map outreach to three warm prospects";
  }
  if (topic.includes("education") || topic.includes("edtech")) {
    return "Design a pilot curriculum outline and recruit five beta learners for feedback";
  }
  if (topic.includes("health") || topic.includes("wellness")) {
    return "Validate compliance needs, partner with a domain expert, and schedule initial practitioner interviews";
  }
  if (topic.includes("finance")) {
    return "Prepare a lightweight financial model and test trust signals with two target customer segments";
  }
  if (topic.includes("e-commerce") || topic.includes("retail")) {
    return "Source initial inventory partners, build a landing page with top three SKUs, and set up retargeting audiences";
  }
  if (topic.includes("content") || topic.includes("media")) {
    return "Draft a content calendar, produce a flagship piece, and run hooks across two distribution channels";
  }
  if (topic.includes("sustainability") || topic.includes("green")) {
    return "Document measurable impact metrics and align them with potential partners or certification bodies";
  }
  if (topic.includes("lifestyle") || topic.includes("travel") || topic.includes("food")) {
    return "Curate packages with local partners and run a concierge-style pilot to collect testimonials";
  }
  return "Document the most critical milestone for your niche and map how it ladders to revenue or traction goals";
}

export function cleanNarrativeMarkdown(markdown = "") {
  if (!markdown) return "";
  const personalized = personalizeCopy(markdown);
  const sentences = personalized.split(/(?<=[.!?])\s+/);
  const filtered = sentences.filter((sentence, index) => {
    const trimmed = sentence.trim();
    if (!trimmed) return false;
    if (
      index === 0 &&
      (/^given\b/i.test(trimmed) ||
        /^overall\b/i.test(trimmed) ||
        /^in summary\b/i.test(trimmed) ||
        /^in conclusion\b/i.test(trimmed))
    ) {
      return false;
    }
    return true;
  });
  if (filtered.length === 0) {
    return personalized;
  }
  const cleaned = filtered.join(" ").replace(/\bthe user'?s?\b/gi, (match) => {
    if (/users/i.test(match)) return "customers";
    if (/user's/i.test(match)) return "your";
    return "you";
  });
  return cleaned
    .replace(/\byou can leverage\b/gi, "you can use")
    .replace(/\bleverage\b/gi, "use")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeStrings(items = []) {
  const seen = new Set();
  return items
    .map((item) => personalizeCopy(item).trim())
    .filter((item) => {
      if (!item) return false;
      const normalized = item.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}



