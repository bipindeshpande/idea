export function extractHighlights(markdown = "", count = 3) {
  const lines = markdown.split(/\r?\n/);
  const bullets = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      bullets.push(trimmed.replace(/^[\-•]\s*/, ""));
    }
    if (bullets.length === count) {
      break;
    }
  }
  return bullets;
}

export function trimFromHeading(markdown = "", headingStart = "###") {
  if (!markdown) return "";
  const idx = markdown.indexOf(headingStart);
  return idx >= 0 ? markdown.slice(idx) : markdown;
}

export function parseTopIdeas(markdown = "", limit = 5) {
  const ideas = [];
  if (!markdown) return ideas;

  // Try multiple patterns to find ideas
  // Pattern 1: Numbered with bold: "1. **Idea Name**" or "### 1. **Idea Name**"
  let headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*(?:\*\*(.+?)\*\*|([^\n]+))/g;
  let matches = [...markdown.matchAll(headingRegex)];

  // Pattern 2: If no matches, try just numbered: "1. Idea Name" (without bold)
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s+([^\n]+)/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 3: If still no matches, try markdown headers: "### Idea Name" or "## Idea Name"
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(#{2,3})\s+([^\n]+)/g;
    const headerMatches = [...markdown.matchAll(headingRegex)];
    // Assign sequential numbers to header-based matches
    matches = headerMatches.map((match, idx) => {
      const newMatch = [...match];
      newMatch[1] = String(idx + 1); // Use index as number
      newMatch[2] = match[2]; // Title
      newMatch.index = match.index;
      return newMatch;
    });
  }

  // Pattern 4: If still no matches, try finding any bold text that looks like a title
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)\*\*([^*]+?)\*\*/g;
    const boldMatches = [...markdown.matchAll(headingRegex)];
    // Only use bold matches that are on their own line and look like titles (not too long)
    matches = boldMatches
      .filter(match => {
        const title = match[1].trim();
        return title.length < 100 && title.length > 3 && !title.match(/^(and|or|the|a|an)\s/i);
      })
      .map((match, idx) => {
        const newMatch = [...match];
        newMatch[1] = String(idx + 1);
        newMatch[2] = match[1];
        newMatch.index = match.index;
        return newMatch;
      });
  }

  // Pattern 5: If still no matches, try to find any lines that look like idea titles
  // Look for lines that start with capital letters and are relatively short
  if (matches.length === 0) {
    const lines = markdown.split(/\n/);
    const potentialTitles = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for lines that:
      // - Start with capital letter
      // - Are between 10 and 80 characters
      // - Don't start with common markdown or list markers
      // - Are followed by content (not just standalone)
      if (
        line.length >= 10 &&
        line.length <= 80 &&
        /^[A-Z]/.test(line) &&
        !line.match(/^(#{1,6}|[-*+]|\d+\.)\s/) &&
        !line.match(/^(The|This|That|These|Those|And|Or|But)\s/i) &&
        lines[i + 1] && lines[i + 1].trim().length > 20 // Has content after
      ) {
        potentialTitles.push({
          index: i,
          title: line,
          matchIndex: markdown.indexOf(line),
        });
      }
    }
    
    // Take first few potential titles as ideas
    if (potentialTitles.length > 0) {
      matches = potentialTitles.slice(0, limit).map((item, idx) => {
        const newMatch = [];
        newMatch[1] = String(idx + 1);
        newMatch[2] = item.title;
        newMatch.index = item.matchIndex;
        return newMatch;
      });
    }
  }

  // Pattern 6: Last resort - split by major sections and create ideas from them
  if (matches.length === 0 && markdown.length > 200) {
    // Split by double newlines or major section breaks
    const sections = markdown.split(/\n\s*\n\s*\n/).filter(s => s.trim().length > 50);
    if (sections.length >= 2) {
      matches = sections.slice(0, limit).map((section, idx) => {
        // Try to extract a title from first line or first sentence
        const firstLine = section.split('\n')[0].trim();
        const title = firstLine.length < 80 && firstLine.length > 10 
          ? firstLine.replace(/^[#*\-]\s*/, '').substring(0, 60)
          : `Idea ${idx + 1}`;
        
        const newMatch = [];
        newMatch[1] = String(idx + 1);
        newMatch[2] = title;
        newMatch.index = markdown.indexOf(section);
        return newMatch;
      });
    }
  }

  for (let i = 0; i < matches.length && ideas.length < limit; i += 1) {
    const match = matches[i];
    const index = parseInt(match[1], 10) || i + 1;
    const rawTitle = (match[2] || match[3] || "").trim();
    
    if (!rawTitle) continue;

    const nextMatchIndex = i + 1 < matches.length && matches[i + 1].index !== undefined 
      ? matches[i + 1].index 
      : markdown.length;
    const start = match.index !== undefined ? match.index + match[0].length : 0;
    const body = markdown.slice(start, nextMatchIndex).trim();
    const summaryMatch = body.replace(/\s+/g, " ").match(/([^.!?]+[.!?])/);
    let summary = summaryMatch ? summaryMatch[0].trim() : rawTitle;
    
    // Remove "why it fits now" prefix from summary (case-insensitive)
    summary = summary.replace(/^why\s+it\s+fits\s+now[:\s]*/i, "").trim();

    ideas.push({
      index,
      title: rawTitle.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim(),
      body: body || summary,
      summary: summary || rawTitle,
      fullText: markdown.slice(match.index ?? 0, nextMatchIndex).trim(),
    });
  }

  return ideas;
}
