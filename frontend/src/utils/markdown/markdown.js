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

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[parseTopIdeas] Markdown preview:', markdown.substring(0, 500));
  }

  // Try multiple patterns to find ideas
  // Pattern 1: Numbered with bold: "1. **Idea Name**" or "### 1. **Idea Name**"
  // This is the expected format from the API
  let headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*(?:\*\*(.+?)\*\*|([^\n]+))/g;
  let matches = [...markdown.matchAll(headingRegex)];

  // Pattern 1a: More flexible - allow for extra spaces or formatting
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s+\*\*([^*]+?)\*\*/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 1b: Also try with em dash or other separators: "1. - **Idea Name**"
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*[-–]\s*(?:\*\*(.+?)\*\*|([^\n]+))/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 1c: Try with colon: "1. **Idea Name:**" or "1. Idea Name:"
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*(?:\*\*(.+?)\*\*:|([^:\n]+):)/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 2: If no matches, try just numbered: "1. Idea Name" (without bold)
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s+([^\n]+)/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 2b: Try numbered with dash: "1. - Idea Name"
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*[-–]\s+([^\n]+)/g;
    matches = [...markdown.matchAll(headingRegex)];
  }

  // Pattern 3: If still no matches, try markdown headers: "### Idea Name" or "## Idea Name"
  if (matches.length === 0) {
    headingRegex = /(?:^|\n)(#{2,3})\s+([^\n]+)/g;
    const headerMatches = [...markdown.matchAll(headingRegex)];
    // Filter out common non-idea headers
    const filteredHeaders = headerMatches.filter(match => {
      const title = match[2].toLowerCase().trim();
      const excludePatterns = [
        'recommendation matrix', 'financial outlook', 'risk radar', 'customer persona',
        'validation questions', '30/60/90', 'roadmap', 'decision checklist',
        'comprehensive recommendation report', 'profile analysis', 'research'
      ];
      return !excludePatterns.some(pattern => title.includes(pattern));
    });
    // Assign sequential numbers to header-based matches
    matches = filteredHeaders.map((match, idx) => {
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
    // Exclude common section headers
    matches = boldMatches
      .filter(match => {
        const title = match[1].trim();
        const titleLower = title.toLowerCase();
        const excludePatterns = [
          'recommendation matrix', 'financial outlook', 'risk radar', 'customer persona',
          'validation questions', '30/60/90', 'roadmap', 'decision checklist',
          'startup costs', 'monthly operating', 'revenue potential', 'breakeven',
          'primary', 'secondary', 'days', 'mitigation'
        ];
        return title.length < 100 && 
               title.length > 3 && 
               !title.match(/^(and|or|the|a|an)\s/i) &&
               !excludePatterns.some(pattern => titleLower.includes(pattern));
      })
      .slice(0, limit) // Limit early to avoid too many matches
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
    const sections = markdown.split(/\n\s*\n\s*\n/).filter(s => {
      const trimmed = s.trim();
      // Filter out sections that are clearly not ideas (too short, or contain section headers)
      if (trimmed.length < 50) return false;
      const lower = trimmed.toLowerCase();
      const excludePatterns = [
        'recommendation matrix', 'financial outlook', 'risk radar', 'customer persona',
        'validation questions', '30/60/90', 'roadmap', 'decision checklist'
      ];
      return !excludePatterns.some(pattern => lower.includes(pattern));
    });
    if (sections.length >= 2) {
      matches = sections.slice(0, limit).map((section, idx) => {
        // Try to extract a title from first line or first sentence
        const firstLine = section.split('\n')[0].trim();
        // Look for bold text or numbered items in first few lines
        const firstFewLines = section.split('\n').slice(0, 3).join(' ');
        const boldMatch = firstFewLines.match(/\*\*([^*]+?)\*\*/);
        const numberedMatch = firstFewLines.match(/(\d+)\.\s+([^\n]+)/);
        
        let title = `Idea ${idx + 1}`;
        if (boldMatch && boldMatch[1].trim().length < 80 && boldMatch[1].trim().length > 5) {
          title = boldMatch[1].trim();
        } else if (numberedMatch && numberedMatch[2].trim().length < 80) {
          title = numberedMatch[2].trim();
        } else if (firstLine.length < 80 && firstLine.length > 10) {
          title = firstLine.replace(/^[#*\-]\s*/, '').substring(0, 60);
        }
        
        const newMatch = [];
        newMatch[1] = String(idx + 1);
        newMatch[2] = title;
        newMatch.index = markdown.indexOf(section);
        return newMatch;
      });
    }
  }

  // Pattern 7: Very last resort - look for any substantial paragraphs that might be ideas
  if (matches.length === 0 && markdown.length > 300) {
    // Split by double newlines
    const paragraphs = markdown.split(/\n\s*\n/).filter(p => {
      const trimmed = p.trim();
      return trimmed.length > 100 && 
             trimmed.length < 2000 &&
             !trimmed.match(/^(#{1,6}|###|##)\s+(recommendation|financial|risk|customer|validation|roadmap|decision)/i);
    });
    
    if (paragraphs.length >= 2) {
      matches = paragraphs.slice(0, limit).map((para, idx) => {
        // Extract first sentence or first 60 chars as title
        const firstSentence = para.match(/^([^.!?]+[.!?])/);
        const title = firstSentence 
          ? firstSentence[1].trim().substring(0, 60)
          : para.trim().substring(0, 60).replace(/\n/g, ' ');
        
        const newMatch = [];
        newMatch[1] = String(idx + 1);
        newMatch[2] = title;
        newMatch.index = markdown.indexOf(para);
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

  // If still no ideas found, try one more aggressive approach: look for any numbered items
  // that might be ideas, even if they don't match the exact format
  if (ideas.length === 0 && markdown.length > 100) {
    // Look for any numbered list items (1., 2., 3.) that have substantial content after them
    const numberedItems = markdown.matchAll(/(?:^|\n)(\d+)\.\s+([^\n]+)/g);
    const potentialIdeas = [];
    for (const match of numberedItems) {
      const num = parseInt(match[1], 10);
      const text = match[2].trim();
      // Skip if it's clearly not an idea (too short, or looks like a section header)
      if (text.length < 10 || 
          text.length > 200 ||
          text.toLowerCase().match(/^(recommendation|financial|risk|customer|validation|roadmap|decision|profile|matrix)/i)) {
        continue;
      }
      // Extract title (remove bold markers, take first part)
      const title = text.replace(/\*\*/g, '').split(/[:\-–]/)[0].trim();
      if (title.length >= 5 && title.length <= 100) {
        potentialIdeas.push({
          index: num,
          title: title,
          matchIndex: match.index,
          fullMatch: match[0]
        });
      }
    }
    
    // If we found potential ideas, use them
    if (potentialIdeas.length >= 2) {
      for (let i = 0; i < Math.min(potentialIdeas.length, limit); i++) {
        const item = potentialIdeas[i];
        const nextItem = potentialIdeas[i + 1];
        const start = item.matchIndex + item.fullMatch.length;
        const end = nextItem ? nextItem.matchIndex : markdown.length;
        const body = markdown.slice(start, end).trim();
        
        ideas.push({
          index: item.index,
          title: item.title,
          body: body || item.title,
          summary: body.split(/[.!?]/)[0] || item.title,
          fullText: markdown.slice(item.matchIndex, end).trim(),
        });
      }
    }
  }

  // Debug logging if no ideas found
  if (ideas.length === 0 && process.env.NODE_ENV === 'development') {
    console.log('[parseTopIdeas] No ideas found. Markdown length:', markdown.length);
    console.log('[parseTopIdeas] First 1000 chars:', markdown.substring(0, 1000));
    console.log('[parseTopIdeas] Matches found:', matches.length);
    if (matches.length > 0) {
      console.log('[parseTopIdeas] First match:', matches[0]);
    }
    // Try to find what might be ideas
    const numberedLines = markdown.split('\n').filter(line => /^\d+\./.test(line.trim()));
    console.log('[parseTopIdeas] Numbered lines found:', numberedLines.slice(0, 5));
  }

  return ideas;
}
