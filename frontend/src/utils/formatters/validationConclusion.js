/**
 * Generates a final conclusion with decision and rationale based on validation scores
 */
export function buildValidationConclusion(validation, categoryAnswers = {}, ideaExplanation = "") {
  if (!validation || !validation.scores) {
    return null;
  }

  const scores = validation.scores;
  const overallScore = validation.overall_score || 0;
  const details = validation.details || {};

  // Calculate average score
  const scoreValues = Object.values(scores).filter(v => typeof v === 'number');
  const avgScore = scoreValues.length > 0 
    ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length 
    : overallScore;

  // Identify strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  const parameters = [
    { key: "market_opportunity", label: "Market Opportunity" },
    { key: "problem_solution_fit", label: "Problem-Solution Fit" },
    { key: "competitive_landscape", label: "Competitive Landscape" },
    { key: "target_audience_clarity", label: "Target Audience Clarity" },
    { key: "business_model_viability", label: "Business Model Viability" },
    { key: "technical_feasibility", label: "Technical Feasibility" },
    { key: "financial_sustainability", label: "Financial Sustainability" },
    { key: "scalability_potential", label: "Scalability Potential" },
    { key: "risk_assessment", label: "Risk Assessment" },
    { key: "go_to_market_strategy", label: "Go-to-Market Strategy" },
  ];

  parameters.forEach(({ key, label }) => {
    const score = scores[key] || 0;
    if (score >= 8) {
      strengths.push({ label, score });
    } else if (score <= 5) {
      weaknesses.push({ label, score });
    }
  });

  // Determine recommendation
  let recommendation = "";
  let decision = "";
  let rationale = "";

  if (overallScore >= 8) {
    recommendation = "**Strong Recommendation: Proceed with Validation & Refinement**";
    decision = "Your idea shows strong potential across multiple dimensions. You should move forward with validation and refinement.";
    rationale = `With an overall score of ${overallScore}/10, your idea demonstrates solid market opportunity, problem-solution fit, and execution feasibility. The main focus should be on validating assumptions and refining the go-to-market strategy.`;
  } else if (overallScore >= 6) {
    recommendation = "**Conditional Recommendation: Proceed with Caution & Key Improvements**";
    decision = "Your idea has good potential but needs work in specific areas before moving forward.";
    rationale = `With an overall score of ${overallScore}/10, your idea shows promise but has some critical gaps that need addressing. Focus on strengthening the weaker areas before committing significant resources.`;
  } else {
    recommendation = "**Recommendation: Significant Refinement Required**";
    decision = "Your idea needs substantial refinement before it's ready to pursue. Consider pivoting or addressing fundamental gaps.";
    rationale = `With an overall score of ${overallScore}/10, your idea faces significant challenges that need to be addressed. Consider whether a pivot or major refinement would better serve your goals.`;
  }

  // Build conclusion text
  let conclusion = `## Final Validation Conclusion & Decision\n\n`;
  
  conclusion += `${recommendation}\n\n`;
  conclusion += `### Decision\n\n`;
  conclusion += `${decision}\n\n`;
  
  conclusion += `### Rationale\n\n`;
  conclusion += `${rationale}\n\n`;

  if (strengths.length > 0) {
    conclusion += `### Key Strengths\n\n`;
    strengths.forEach(({ label, score }) => {
      conclusion += `- **${label}** (${score}/10)\n`;
    });
    conclusion += `\nThese are your strongest areas. Leverage them to differentiate your idea and build your competitive advantage. See the "Detailed Analysis & Recommendations" tab for comprehensive insights.\n\n`;
  }

  if (weaknesses.length > 0) {
    conclusion += `### Critical Areas for Improvement\n\n`;
    weaknesses.forEach(({ label, score }) => {
      conclusion += `- **${label}** (${score}/10)\n`;
    });
    conclusion += `\nThese areas require immediate attention before moving forward. See the "Detailed Analysis & Recommendations" tab above for detailed analysis of each area and specific recommendations for improvement.\n\n`;
  }

  conclusion += `### Next Steps\n\n`;
  
  if (overallScore >= 8) {
    conclusion += `1. **Validate core assumptions** through customer interviews and market research\n`;
    conclusion += `2. **Refine your go-to-market strategy** based on competitive analysis\n`;
    conclusion += `3. **Build an MVP** to test problem-solution fit with real users\n`;
    conclusion += `4. **Secure early adopters** or beta testers to validate demand\n`;
    conclusion += `5. **Develop a detailed execution plan** with milestones and metrics\n\n`;
  } else if (overallScore >= 6) {
    conclusion += `1. **Address critical weaknesses** identified above before proceeding\n`;
    conclusion += `2. **Conduct deeper market research** to validate assumptions\n`;
    conclusion += `3. **Refine your value proposition** to improve problem-solution fit\n`;
    conclusion += `4. **Re-validate the idea** after making improvements\n`;
    conclusion += `5. **Consider pivoting** if fundamental issues cannot be resolved\n\n`;
  } else {
    conclusion += `1. **Reassess the core concept** - consider if a pivot is needed\n`;
    conclusion += `2. **Address fundamental gaps** in market opportunity or problem-solution fit\n`;
    conclusion += `3. **Research successful alternatives** in your space to learn from them\n`;
    conclusion += `4. **Refine or pivot the idea** based on market feedback\n`;
    conclusion += `5. **Re-validate** once major improvements are made\n\n`;
  }

  conclusion += `### Remember\n\n`;
  if (overallScore >= 8) {
    conclusion += `A high score doesn't guarantee success, but it indicates strong fundamentals. Focus on execution and continuous validation.`;
  } else if (overallScore >= 6) {
    conclusion += `Many successful startups started with lower scores but improved through iteration. Use this feedback to strengthen your idea.`;
  } else {
    conclusion += `A low score isn't a death sentence—it's valuable feedback. Use it to refine your idea or consider pivoting to a stronger concept.`;
  }

  return conclusion;
}

