/**
 * Test script for optimization functions
 * Tests: Risk Radar parsing, 30/60/90 roadmap extraction, personalizeCopy caching
 */

// Mock the personalizeCopy function with cache
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

const personalizeCache = new Map();
const MAX_CACHE_SIZE = 1000;

function personalizeCopy(text = "") {
  if (!text || typeof text !== "string") return text;
  
  if (personalizeCache.has(text)) {
    return personalizeCache.get(text);
  }
  
  const result = PERSONALIZATION_RULES.reduce(
    (acc, { pattern, replacement }) => acc.replace(pattern, replacement),
    text
  );
  
  if (personalizeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = personalizeCache.keys().next().value;
    personalizeCache.delete(firstKey);
  }
  personalizeCache.set(text, result);
  
  return result;
}

// Test parseRiskRows function
function parseRiskRows(sectionText = "") {
  if (!sectionText) return [];
  
  const tableRows = sectionText.match(/\|.*\|/g);
  if (tableRows && tableRows.length >= 2) {
    const dataRows = tableRows.slice(2);
    const results = [];
    
    for (const row of dataRows) {
      const cells = row.split("|").map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length >= 3) {
        const riskCategory = cells[0] || "";
        const riskDescription = cells[1] || "";
        const mitigation = cells[2] || "";
        
        let riskText = riskCategory;
        if (riskDescription && riskDescription !== riskCategory) {
          riskText = riskCategory ? `${riskCategory}: ${riskDescription}` : riskDescription;
        }
        
        let severity = "MEDIUM";
        const severityMatch =
          (riskText + " " + riskDescription).match(/\b(severe|critical|extreme|high)\b/i) ||
          (riskText + " " + riskDescription).match(/\b(medium|moderate)\b/i) ||
          (riskText + " " + riskDescription).match(/\b(low|minor)\b/i);
        if (severityMatch) {
          const severityText = severityMatch[0].toLowerCase();
          if (severityText.match(/\b(severe|critical|extreme|high)\b/i)) {
            severity = "HIGH";
          } else if (severityText.match(/\b(low|minor)\b/i)) {
            severity = "LOW";
          }
        }
        
        results.push({
          risk: personalizeCopy(riskText.replace(/\*\*/g, "").trim()),
          severity,
          mitigation: personalizeCopy(mitigation.replace(/\*\*/g, "").trim() || "Create a mitigation experiment to reduce this risk within the next sprint."),
        });
      }
    }
    
    if (results.length > 0) {
      return results;
    }
  }
  
  // Fall back to list format
  const items = sectionText.split(/\n/).filter(line => line.trim().match(/^[-*+]\s+/));
  return items.map((item) => {
    let cleaned = item.replace(/\*\*/g, "").trim().replace(/^[-*+]\s+/, "");
    
    const severityInParensMatch = cleaned.match(/\(([^)]*severity[^)]*)\)/i);
    let severity = "MEDIUM";
    let riskText = cleaned;
    let mitigation = "";
    
    if (severityInParensMatch) {
      const severityText = severityInParensMatch[1];
      if (severityText.match(/\b(severe|critical|extreme|high)\b/i)) {
        severity = "HIGH";
      } else if (severityText.match(/\b(medium|moderate)\b/i)) {
        severity = "MEDIUM";
      } else if (severityText.match(/\b(low|minor)\b/i)) {
        severity = "LOW";
      }
      
      const parts = cleaned.split(/\([^)]*severity[^)]*\)/i);
      if (parts.length >= 2) {
        riskText = parts[0].trim();
        mitigation = parts.slice(1).join(":").replace(/^:\s*/, "").trim();
      }
    } else {
      const severityMatch =
        cleaned.match(/\b(severe|critical|extreme|high)\b/i) ||
        cleaned.match(/\b(medium|moderate)\b/i) ||
        cleaned.match(/\b(low|minor)\b/i);
      severity = severityMatch ? severityMatch[0].toUpperCase() : "MEDIUM";
      
      const colonIndex = cleaned.indexOf(":");
      if (colonIndex > 0) {
        riskText = cleaned.slice(0, colonIndex).trim();
        mitigation = cleaned.slice(colonIndex + 1).trim();
      }
    }
    
    riskText = riskText.replace(/^\*\*|\*\*$/g, "").replace(/^[-•]\s*/, "").trim();
    
    if (!mitigation || mitigation.length === 0) {
      mitigation = "Create a mitigation experiment to reduce this risk within the next sprint.";
    }
    
    mitigation = mitigation.replace(/^:\s*/, "").trim();

    return {
      risk: personalizeCopy(riskText),
      severity,
      mitigation: personalizeCopy(mitigation),
    };
  });
}

// Test extractTimelineSlice function
function extractTimelineSlice(markdown = "", segmentIndex = 0) {
  if (!markdown) return "Define clear milestones for this period.";
  
  const rows = markdown.match(/\|.*\|/g);
  if (rows && rows.length >= 3) {
    const dataRows = rows.slice(2);
    const target = dataRows[segmentIndex];
    if (target) {
      const cells = target.split("|").map((cell) => cell.trim()).filter(cell => cell);
      if (cells.length >= 2) {
        const content = cells[cells.length - 1] || cells[1];
        if (content && content !== "Define clear milestones for this period." && content.length > 10) {
          return content;
        }
      }
    }
  }
  
  const segmentPatterns = [
    [/\*\*Days?\s*0[–-]\s*30\*\*:?/i, /\*\*30\s*Days?:\*\*/i],
    [/\*\*Days?\s*30[–-]\s*60\*\*:?/i, /\*\*60\s*Days?:\*\*/i],
    [/\*\*Days?\s*60[–-]\s*90\*\*:?/i, /\*\*90\s*Days?:\*\*/i],
  ];
  
  const currentPatterns = segmentPatterns[segmentIndex] || segmentPatterns[0];
  const nextPatterns = segmentIndex < 2 ? segmentPatterns[segmentIndex + 1] : null;
  
  let startIndex = -1;
  
  for (const pattern of currentPatterns) {
    const match = markdown.match(pattern);
    if (match && match.index !== undefined) {
      startIndex = match.index;
      break;
    }
  }
  
  if (startIndex === -1) {
    return "Define clear milestones for this period.";
  }
  
  let endIndex = markdown.length;
  if (nextPatterns) {
    for (const pattern of nextPatterns) {
      const match = markdown.substring(startIndex + 1).match(pattern);
      if (match && match.index !== undefined) {
        endIndex = startIndex + 1 + match.index;
        break;
      }
    }
  }
  
  let segmentContent = markdown.substring(startIndex, endIndex);
  
  for (const pattern of currentPatterns) {
    segmentContent = segmentContent.replace(pattern, "").trim();
  }
  
  segmentContent = segmentContent.replace(/^[:–\-\s]+/, "").trim();
  
  if (segmentContent && segmentContent.length > 10) {
    return segmentContent;
  }
  
  return "Define clear milestones for this period.";
}

// Test cases
console.log("=".repeat(60));
console.log("OPTIMIZATION TEST SUITE");
console.log("=".repeat(60));

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Risk Radar - Table Format
console.log("\n[TEST 1] Risk Radar - Markdown Table Format");
const riskTableText = `| Risk Category | Risk Description | Mitigation Strategies |
|-------|-------|-------|
| Market Competition | Established players in custom chatbot development | Create unique selling points; build local partnerships |
| Compliance | Healthcare privacy regulations | Collaborate with healthcare professionals for guidance |
| Technology Limitations | Learning curve with new frameworks | Allocate time for training on frameworks like Rasa/Botpress |`;

const riskRows = parseRiskRows(riskTableText);
if (riskRows.length === 3 && riskRows[0].risk.includes("Market Competition") && riskRows[0].mitigation.includes("unique selling points")) {
  console.log("✅ PASS: Table format parsed correctly");
  console.log(`   Found ${riskRows.length} risks`);
  testsPassed++;
} else {
  console.log("❌ FAIL: Table format not parsed correctly");
  console.log(`   Expected 3 risks, got ${riskRows.length}`);
  console.log("   Result:", JSON.stringify(riskRows, null, 2));
  testsFailed++;
}

// Test 2: Risk Radar - List Format
console.log("\n[TEST 2] Risk Radar - List Format");
const riskListText = `#### Risk Radar

- **Market saturation** (Medium severity): Focus on a specific niche
- **Technical complexity** (Low severity): Start with no-code tools
- **Customer acquisition** (High severity): Use content marketing`;

const riskRowsList = parseRiskRows(riskListText);
if (riskRowsList.length >= 2 && riskRowsList[0].severity === "MEDIUM" && riskRowsList[1].severity === "LOW") {
  console.log("✅ PASS: List format parsed correctly");
  console.log(`   Found ${riskRowsList.length} risks with correct severity`);
  testsPassed++;
} else {
  console.log("❌ FAIL: List format not parsed correctly");
  console.log("   Result:", JSON.stringify(riskRowsList, null, 2));
  testsFailed++;
}

// Test 3: 30/60/90 Roadmap - Day Range Format
console.log("\n[TEST 3] 30/60/90 Roadmap - Day Range Format");
const roadmapText = `#### 30/60/90 Day Roadmap

**Days 0–30**: Validate core assumptions, build landing page, get first 10 signups
**Days 30–60**: Build MVP, test with beta users, iterate based on feedback
**Days 60–90**: Launch publicly, measure engagement, define paths for upselling`;

const day0_30 = extractTimelineSlice(roadmapText, 0);
const day30_60 = extractTimelineSlice(roadmapText, 1);
const day60_90 = extractTimelineSlice(roadmapText, 2);

if (day0_30.includes("Validate core assumptions") && 
    day30_60.includes("Build MVP") && 
    day60_90.includes("Launch publicly")) {
  console.log("✅ PASS: Roadmap segments extracted correctly");
  console.log(`   0-30: ${day0_30.substring(0, 50)}...`);
  console.log(`   30-60: ${day30_60.substring(0, 50)}...`);
  console.log(`   60-90: ${day60_90.substring(0, 50)}...`);
  testsPassed++;
} else {
  console.log("❌ FAIL: Roadmap segments not extracted correctly");
  console.log("   0-30:", day0_30);
  console.log("   30-60:", day30_60);
  console.log("   60-90:", day60_90);
  testsFailed++;
}

// Test 4: personalizeCopy Cache
console.log("\n[TEST 4] personalizeCopy Cache");
personalizeCache.clear(); // Reset cache

const testText1 = "The user's goal is to build their startup";
const result1a = personalizeCopy(testText1);
const result1b = personalizeCopy(testText1);

if (result1a === result1b && result1a.includes("your goal") && personalizeCache.size === 1) {
  console.log("✅ PASS: Cache working correctly");
  console.log(`   Cache size: ${personalizeCache.size}`);
  console.log(`   Result: "${result1a}"`);
  testsPassed++;
} else {
  console.log("❌ FAIL: Cache not working correctly");
  console.log(`   Cache size: ${personalizeCache.size}`);
  console.log(`   Result 1: "${result1a}"`);
  console.log(`   Result 2: "${result1b}"`);
  testsFailed++;
}

// Test 5: Cache Size Limit
console.log("\n[TEST 5] Cache Size Limit");
personalizeCache.clear();

// Fill cache beyond limit
for (let i = 0; i < MAX_CACHE_SIZE + 10; i++) {
  personalizeCopy(`Test text ${i}`);
}

if (personalizeCache.size <= MAX_CACHE_SIZE) {
  console.log("✅ PASS: Cache size limit enforced");
  console.log(`   Cache size: ${personalizeCache.size} (max: ${MAX_CACHE_SIZE})`);
  testsPassed++;
} else {
  console.log("❌ FAIL: Cache size limit not enforced");
  console.log(`   Cache size: ${personalizeCache.size} (max: ${MAX_CACHE_SIZE})`);
  testsFailed++;
}

// Test 6: Empty/Edge Cases
console.log("\n[TEST 6] Empty/Edge Cases");
const emptyRisk = parseRiskRows("");
const emptyRoadmap = extractTimelineSlice("", 0);
const emptyPersonalize = personalizeCopy("");

if (emptyRisk.length === 0 && 
    emptyRoadmap === "Define clear milestones for this period." &&
    emptyPersonalize === "") {
  console.log("✅ PASS: Edge cases handled correctly");
  testsPassed++;
} else {
  console.log("❌ FAIL: Edge cases not handled correctly");
  console.log("   Empty risk:", emptyRisk);
  console.log("   Empty roadmap:", emptyRoadmap);
  console.log("   Empty personalize:", emptyPersonalize);
  testsFailed++;
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("TEST SUMMARY");
console.log("=".repeat(60));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
} else {
  console.log("\n⚠️  Some tests failed. Please review the output above.");
  process.exit(1);
}

