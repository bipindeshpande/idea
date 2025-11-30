export const VALIDATION_PARAMETERS = [
  "Market Opportunity",
  "Problem-Solution Fit",
  "Competitive Landscape",
  "Target Audience Clarity",
  "Business Model Viability",
  "Technical Feasibility",
  "Financial Sustainability",
  "Scalability Potential",
  "Risk Assessment",
  "Go-to-Market Strategy",
];

export const PARAMETER_GROUPS_LAYOUT = [
  {
    id: "market",
    title: "Market Viability",
    description: "Is there demand, reachability, and audience clarity?",
    parameters: [
      "Market Opportunity",
      "Target Audience Clarity",
      "Go-to-Market Strategy",
    ],
  },
  {
    id: "product",
    title: "Core Product & Moat",
    description: "Is your solution compelling, defensible, and buildable?",
    parameters: [
      "Problem-Solution Fit",
      "Competitive Landscape",
      "Technical Feasibility",
      "Scalability Potential",
    ],
  },
  {
    id: "execution",
    title: "Execution & Risk",
    description: "Can you build, scale, and operate this idea realistically?",
    parameters: [
      "Business Model Viability",
      "Financial Sustainability",
      "Risk Assessment",
    ],
  },
];

export const RADAR_AXES = [
  { label: "Market Opportunity", parameter: "Market Opportunity" },
  { label: "Target Audience", parameter: "Target Audience Clarity" },
  { label: "Go to Market", parameter: "Go-to-Market Strategy" },
  { label: "Problem-Solution Fit", parameter: "Problem-Solution Fit" },
  { label: "Competitive Landscape", parameter: "Competitive Landscape" },
  { label: "Technical Feasibility", parameter: "Technical Feasibility" },
  { label: "Scalability", parameter: "Scalability Potential" },
  { label: "Business Model", parameter: "Business Model Viability" },
  { label: "Financials", parameter: "Financial Sustainability" },
  { label: "Risk Assessment", parameter: "Risk Assessment" },
];

export const SCORE_LEGEND = [
  { range: "0 – 3", label: "Needs Work", color: "bg-coral-500" },
  { range: "4 – 6", label: "Fair", color: "bg-amber-500" },
  { range: "7 – 8", label: "Strong", color: "bg-emerald-500" },
  { range: "9 – 10", label: "Excellent", color: "bg-emerald-700" },
];

export const FALLBACK_DETAIL =
  "See detailed analysis in the 'Detailed Analysis & Recommendations' tab for the complete breakdown.";

export const SCORE_BUCKETS = [
  { min: 9, label: "Excellent", badge: "bg-emerald-100 text-emerald-700", progress: "bg-emerald-600" },
  { min: 7, label: "Strong", badge: "bg-emerald-100 text-emerald-700", progress: "bg-emerald-500" },
  { min: 6, label: "Good", badge: "bg-amber-100 text-amber-700", progress: "bg-amber-500" },
  { min: 4, label: "Fair", badge: "bg-amber-100 text-amber-700", progress: "bg-amber-400" },
  { min: 0, label: "Needs Work", badge: "bg-coral-100 text-coral-700", progress: "bg-coral-500" },
];

