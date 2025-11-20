// Frameworks configuration
// This file defines metadata for each downloadable template

import problemValidationChecklist from "./problem-validation-checklist.md?raw";
import customerInterviewScript from "./customer-interview-script.md?raw";
import landingPageTestFramework from "./landing-page-test-framework.md?raw";
import pricingValidationMethod from "./pricing-validation-method.md?raw";
import mvpPrioritizationMatrix from "./mvp-prioritization-matrix.md?raw";
import competitiveAnalysisTemplate from "./competitive-analysis-template.md?raw";

export const frameworks = [
  {
    id: 1,
    title: "Problem Validation Checklist",
    description: "A comprehensive checklist to validate that your startup idea solves a real, urgent problem.",
    category: "Validation",
    icon: "🎯",
    download: true,
    content: problemValidationChecklist,
  },
  {
    id: 2,
    title: "Customer Interview Script",
    description: "Structured questions for post-report discovery calls to validate problem, solution, and willingness to pay.",
    category: "Interviews",
    icon: "💬",
    download: true,
    content: customerInterviewScript,
  },
  {
    id: 3,
    title: "Landing Page Test Framework",
    description: "A framework to test your startup idea with a landing page before building anything.",
    category: "Testing",
    icon: "📄",
    download: true,
    content: landingPageTestFramework,
  },
  {
    id: 4,
    title: "Pricing Validation Method",
    description: "How to test willingness to pay before building your product.",
    category: "Pricing",
    icon: "💰",
    download: true,
    content: pricingValidationMethod,
  },
  {
    id: 5,
    title: "MVP Prioritization Matrix",
    description: "A framework to decide what to build first in your MVP.",
    category: "MVP",
    icon: "🚀",
    download: true,
    content: mvpPrioritizationMatrix,
  },
  {
    id: 6,
    title: "Competitive Analysis Template",
    description: "A structured approach to analyzing your competition and finding differentiation.",
    category: "Strategy",
    icon: "🔍",
    download: true,
    content: competitiveAnalysisTemplate,
  },
];

