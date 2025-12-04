// Import from JSON file (updated by admin panel)
// Fallback to default values if JSON file doesn't exist or is invalid
import validationQuestionsData from "./validationQuestions.json";

// Default fallback data
const defaultValidationQuestions = {
  // SCREEN 1 — "About Your Idea" (4 Required Dropdowns)
  screen1_questions: [
    {
      id: "industry",
      question: "What industry does your idea belong to?",
      options: [
        "Food & Beverage",
        "Retail / E-commerce",
        "Local Services",
        "Healthcare / Wellness",
        "Education",
        "Real Estate",
        "Entertainment / Media",
        "Transportation / Logistics",
        "Manufacturing / Physical Products",
        "Consulting / Professional Services",
        "SaaS / Software",
        "Fintech",
        "Healthtech",
        "Other",
      ],
    },
    {
      id: "geography",
      question: "Which region are you targeting first?",
      options: [
        "US",
        "EU",
        "India",
        "Global",
        "Other",
      ],
    },
    {
      id: "stage",
      question: "What stage is your idea currently in?",
      options: [
        "Raw Idea",
        "Early Research",
        "Prototype",
        "MVP Launched",
        "Revenue Stage",
      ],
    },
    {
      id: "commitment",
      question: "How serious are you about building this idea?",
      options: [
        "Side Hustle",
        "Lifestyle Business",
        "Full-time Startup",
        "High-Growth/Fundable",
      ],
    },
  ],
  
  // SCREEN 2 — "How Your Idea Works" (6 Required Dropdowns)
  screen2_questions: [
    {
      id: "problem_category",
      question: "What problem does your idea solve?",
      options: [
        "Inefficiency",
        "High Cost",
        "Complexity",
        "Lack of Access",
        "Trust/Quality Gap",
        "Poor Transparency",
        "Fragmented Market",
      ],
    },
    {
      id: "solution_type",
      question: "How would you best describe your solution type?",
      options: [
        "SaaS / Online Platform",
        "Marketplace / Platform",
        "AI Automation",
        "E-commerce Platform",
        "Physical Service / Local Business",
        "Physical Product / Manufacturing",
        "Food Service / Restaurant",
        "Retail / Brick & Mortar",
        "Consulting / Professional Service",
        "Content / Education / Creator",
        "On-demand Service",
        "Aggregator / Comparison",
        "Other",
      ],
    },
    {
      id: "user_type",
      question: "Who will primarily use your product or service?",
      options: [
        "Consumers",
        "SMBs",
        "Enterprises",
        "Freelancers / Creators",
        "Students",
        "Professionals (medical, legal, finance)",
      ],
    },
    {
      id: "revenue_model",
      question: "How will your business make money?",
      options: [
        "Subscription",
        "Commission / Transaction Fee",
        "One-time Purchase",
        "Freemium → Upgrade",
        "Advertising",
        "Lead Generation",
      ],
    },
    {
      id: "unique_moat",
      question: "What makes your idea different or unique?",
      options: [
        "Better Price",
        "Superior UX",
        "Proprietary Tech",
        "Niche Focus",
        "Network Effects",
        "Faster / More Reliable",
      ],
    },
    {
      id: "business_archetype",
      question: "What best describes the type of business you want to build?",
      options: [
        "Online software / AI product (SaaS / app / tool)",
        "Local service business",
        "Food & beverage / restaurant / stall / catering",
        "Retail / physical shop",
        "Physical product brand",
        "Content / creator / education",
        "Marketplace / platform",
      ],
    },
  ],
  
  // SCREEN 3 — Optional fields
  optional_fields: [
    {
      id: "initial_budget",
      question: "What is your expected initial budget? (Optional)",
      options: [
        "$0",
        "Under $1k",
        "$1k–$10k",
        "$10k+",
      ],
    },
    {
      id: "delivery_channel",
      question: "How will customers mainly interact with your business? (Optional)",
      options: [
        "Online only",
        "Mostly online",
        "Mostly offline / in-person",
        "Mixed online & offline",
      ],
    },
    {
      id: "constraints",
      question: "Do you have any constraints? (Optional - Multi-select)",
      options: [
        "Limited Time",
        "Limited Skills",
        "Limited Budget",
        "Limited Network",
        "None",
      ],
      multiSelect: true,
    },
  ],
};

// Merge JSON data with defaults (JSON takes precedence, but only if it has content)
export const validationQuestions = {
  // Legacy support - map to new structure
  category_questions: (validationQuestionsData?.category_questions && validationQuestionsData.category_questions.length > 0) 
    ? validationQuestionsData.category_questions 
    : defaultValidationQuestions.screen1_questions,
  idea_explanation_questions: (validationQuestionsData?.idea_explanation_questions && validationQuestionsData.idea_explanation_questions.length > 0)
    ? validationQuestionsData.idea_explanation_questions
    : defaultValidationQuestions.screen2_questions,
  // New 3-screen structure
  screen1_questions: (validationQuestionsData?.screen1_questions && validationQuestionsData.screen1_questions.length > 0)
    ? validationQuestionsData.screen1_questions
    : defaultValidationQuestions.screen1_questions,
  screen2_questions: (validationQuestionsData?.screen2_questions && validationQuestionsData.screen2_questions.length > 0)
    ? validationQuestionsData.screen2_questions
    : defaultValidationQuestions.screen2_questions,
  optional_fields: (validationQuestionsData?.optional_fields && validationQuestionsData.optional_fields.length > 0)
    ? validationQuestionsData.optional_fields
    : defaultValidationQuestions.optional_fields,
};
