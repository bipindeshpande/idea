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

  let templateIndex = 0;
  while (steps.length < 10 && templateIndex < EXECUTION_TEMPLATES.length) {
    const template = EXECUTION_TEMPLATES[templateIndex];
    const filled = template
      .replace(/{{idea}}/g, normalizedTitle)
      .replace(/{{goalType}}/g, goalType)
      .replace(/{{timeCommitment}}/g, timeCommitment)
      .replace(/{{budgetRange}}/g, budgetRange)
      .replace(/{{workStyle}}/g, workStyle)
      .replace(/{{skillStrength}}/g, skillStrength)
      .replace(/{{focus}}/g, focus)
      .replace(/{{categoryPlan}}/g, focusSpecificPlan(focus));
    const cleaned = personalizeCopy(filled);
    const fingerprint = cleaned.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      steps.push(cleaned);
    }
    templateIndex += 1;
  }
  while (steps.length < 10) {
    const fallback = `Add a custom execution step tailored to how you want to launch ${normalizedTitle}.`;
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

export function buildFinancialSnapshots(sectionText = "", ideaTitle = "") {
  const items = extractListFromText(sectionText);
  const normalizedTitle = ideaTitle || "this idea";

  const entries = [];
  const seen = new Set();

  items.forEach((item) => {
    const cleaned = personalizeCopy(item);
    const fingerprint = cleaned.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      entries.push(cleaned);
    }
  });

  let templateIndex = 0;
  while (entries.length < 5 && templateIndex < FINANCIAL_TEMPLATES.length) {
    const template = FINANCIAL_TEMPLATES[templateIndex];
    const filledEstimate = template.estimate
      .replace(/{{idea}}/g, normalizedTitle)
      .replace(/{{breakevenMonths}}/g, `${fakerNumber(4, 9)}`)
      .replace(/{{reinvestmentPercent}}/g, `${fakerNumber(25, 40)}%`)
      .replace(/{{startupCost}}/g, formatCurrency(fakerNumber(1500, 6000)))
      .replace(/{{cashBufferPercent}}/g, `${fakerNumber(30, 60)}%`)
      .replace(/{{monthlyBurn}}/g, formatCurrency(fakerNumber(600, 1500)))
      .replace(/{{upsideRevenue}}/g, formatCurrency(fakerNumber(3000, 8000)))
      .replace(/{{fallbackReserve}}/g, formatCurrency(fakerNumber(5000, 12000)));
    const cleanedEstimate = personalizeCopy(filledEstimate);
    const fingerprint = `${template.focus}:${cleanedEstimate}`.toLowerCase();
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      const metricFilled = template.metric
        .replace(/{{breakevenMonths}}/g, `${fakerNumber(4, 9)}`)
        .replace(/{{reinvestmentPercent}}/g, `${fakerNumber(20, 40)}%`)
        .replace(/{{startupCost}}/g, formatCurrency(fakerNumber(1500, 6000)))
        .replace(/{{cashBufferPercent}}/g, `${fakerNumber(30, 60)}%`)
        .replace(/{{monthlyBurn}}/g, formatCurrency(fakerNumber(600, 1500)))
        .replace(/{{upsideRevenue}}/g, formatCurrency(fakerNumber(3000, 8000)))
        .replace(/{{fallbackReserve}}/g, formatCurrency(fakerNumber(5000, 12000)));
      entries.push({
        focus: template.focus,
        estimate: cleanedEstimate,
        metric: personalizeCopy(metricFilled),
      });
    }
    templateIndex += 1;
  }

  return entries;
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
  const lines = matrixText.split(/\r?\n/);
  const rows = [];
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^[-*+]\s*\*\*(.+?)\*\*/.test(trimmed)) {
      if (current) {
        rows.push(current);
      }
      const ideaMatch = trimmed.match(/^[-*+]\s*\*\*(.+?)\*\*\s*[:\-–—]?\s*(.*)$/u);
      current = {
        idea: ideaMatch ? ideaMatch[1].trim() : trimmed.replace(/^[-*+]\s*/, "").trim(),
        goal: "",
        time: "",
        budget: "",
        skill: "",
        workStyle: "",
        notes: "",
        order: rows.length + 1,
      };
      const extra = ideaMatch && ideaMatch[2] ? ideaMatch[2].trim() : "";
      if (extra) {
        parseMatrixAttributes(extra, current);
      }
    } else if (/^[-*+]\s+/.test(trimmed) && current) {
      const attribute = trimmed.replace(/^[-*+]\s+/, "");
      parseMatrixAttributes(attribute, current);
    } else if (/^\d+[\.\)]\s+/.test(trimmed)) {
      // Handle numbered lists as backups.
      const attribute = trimmed.replace(/^\d+[\.\)]\s+/, "");
      if (!current) {
        current = {
          idea: "Idea",
          goal: "",
          time: "",
          budget: "",
          skill: "",
          workStyle: "",
          notes: "",
        };
      }
      parseMatrixAttributes(attribute, current);
    } else if (trimmed && current) {
      current.notes = current.notes ? `${current.notes} ${trimmed}` : trimmed;
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
    .replace(/^#+\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
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



