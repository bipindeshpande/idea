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

  const headingRegex = /(?:^|\n)(?:###\s*)?(\d+)\.\s*(?:\*\*(.+?)\*\*|([^\n]+))/g;
  const matches = [...markdown.matchAll(headingRegex)];

  for (let i = 0; i < matches.length && ideas.length < limit; i += 1) {
    const match = matches[i];
    const index = parseInt(match[1], 10);
    const rawTitle = (match[2] || match[3] || "").trim();
    const nextMatchIndex = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
    const start = match.index !== undefined ? match.index + match[0].length : 0;
    const body = markdown.slice(start, nextMatchIndex).trim();
    const summaryMatch = body.replace(/\s+/g, " ").match(/([^.!?]+[.!?])/);
    let summary = summaryMatch ? summaryMatch[0].trim() : rawTitle;
    
    // Remove "why it fits now" prefix from summary (case-insensitive)
    summary = summary.replace(/^why\s+it\s+fits\s+now[:\s]*/i, "").trim();

    ideas.push({
      index,
      title: rawTitle.replace(/^#+\s*/, ""),
      body,
      summary,
      fullText: markdown.slice(match.index ?? 0, nextMatchIndex).trim(),
    });
  }

  return ideas;
}
