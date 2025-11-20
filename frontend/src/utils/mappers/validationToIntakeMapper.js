/**
 * Maps validation category answers to intake form fields
 */
export function mapValidationToIntake(categoryAnswers) {
  const mapped = {};

  // Map industry to interest_area
  if (categoryAnswers.industry) {
    const industryMap = {
      "Technology / Software": { interest: "AI / Automation", sub: "Workflow Automation" },
      "Healthcare / Wellness": { interest: "Healthcare / Wellness", sub: "Mental Health" },
      "E-commerce / Retail": { interest: "E-commerce / Retail", sub: "D2C Brand" },
      "Education / EdTech": { interest: "Education / EdTech", sub: "Online Courses" },
      "Finance / FinTech": { interest: "Finance / Investment", sub: "Personal Finance" },
      "Food & Beverage": { interest: "Lifestyle / Travel / Food", sub: "Food Delivery" },
      "Real Estate": { interest: "Other (Custom)", sub: "Custom Sub-Area Text Field" },
      "Entertainment / Media": { interest: "Content / Media / Creator Economy", sub: "AI-Generated Content" },
      "Transportation / Logistics": { interest: "Other (Custom)", sub: "Custom Sub-Area Text Field" },
      "Other": { interest: "Other (Custom)", sub: "Custom Sub-Area Text Field" },
    };
    const mapping = industryMap[categoryAnswers.industry] || { interest: "Other (Custom)", sub: "Custom Sub-Area Text Field" };
    mapped.interest_area = mapping.interest;
    mapped.sub_interest_area = mapping.sub;
  }

  // Map target_audience to work_style (infer from audience type)
  if (categoryAnswers.target_audience) {
    const audienceMap = {
      "Individual consumers (B2C)": "Solo",
      "Small businesses (B2B SMB)": "Small Team",
      "Enterprise companies (B2B Enterprise)": "Small Team",
      "Non-profits / Organizations": "Community-Based",
      "Students / Educational institutions": "Community-Based",
      "Other": "Solo",
    };
    mapped.work_style = audienceMap[categoryAnswers.target_audience] || "Solo";
  }

  // Map business_model - can't directly map, but we can add it to experience_summary
  // This will be handled separately when setting the form

  return mapped;
}

/**
 * Gets a default experience summary based on validation answers
 */
export function getExperienceSummaryFromValidation(categoryAnswers, ideaExplanation) {
  const parts = [];
  
  if (categoryAnswers.industry) {
    parts.push(`Industry: ${categoryAnswers.industry}`);
  }
  if (categoryAnswers.business_model) {
    parts.push(`Business model: ${categoryAnswers.business_model}`);
  }
  if (categoryAnswers.target_audience) {
    parts.push(`Target: ${categoryAnswers.target_audience}`);
  }
  if (ideaExplanation && ideaExplanation.length > 0) {
    // Take first 80 characters of idea explanation
    const summary = ideaExplanation.substring(0, 80).trim();
    if (summary.length > 0) {
      parts.push(`Idea: ${summary}${ideaExplanation.length > 80 ? "..." : ""}`);
    }
  }
  
  return parts.join(" | ");
}

