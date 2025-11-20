import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { frameworks } from "../templates/frameworksConfig.js";

// Note: Frameworks are now imported from templates/frameworksConfig.js
// Templates are stored in separate .md files in frontend/src/templates/
  {
    id: 1,
    title: "Problem Validation Checklist",
    description: "A comprehensive checklist to validate that your startup idea solves a real, urgent problem.",
    category: "Validation",
    icon: "🎯",
    content: `# Problem Validation Checklist

## Pre-Validation Questions
- [ ] Can you clearly articulate the problem in one sentence?
- [ ] Is this problem experienced by a specific, identifiable group?
- [ ] How often does this problem occur?
- [ ] What are people currently doing to solve this problem?
- [ ] How much time/money are they spending on current solutions?

## Customer Interview Questions
- [ ] Have you interviewed at least 10 potential customers?
- [ ] Do customers confirm the problem exists?
- [ ] Do customers say they would pay for a solution?
- [ ] What would customers pay for this solution?
- [ ] How urgent is this problem for customers?

## Market Validation
- [ ] Is there existing demand (search volume, forums, complaints)?
- [ ] Are competitors solving this problem?
- [ ] What's the market size?
- [ ] Is the market growing or shrinking?

## Solution Validation
- [ ] Does your solution directly address the problem?
- [ ] Is your solution 10x better than alternatives?
- [ ] Can you build an MVP in 30 days or less?
- [ ] Have you tested willingness to pay?

## Go/No-Go Decision
- [ ] Problem is confirmed by 8+ interviews
- [ ] Customers show willingness to pay
- [ ] Market size is sufficient
- [ ] Solution is feasible
- [ ] You have unfair advantage

**If 4+ items are checked, proceed. If less, refine or pivot.**`,
  },
  {
    id: 2,
    title: "Customer Interview Script",
    description: "Structured questions for post-report discovery calls to validate problem, solution, and willingness to pay.",
    category: "Interviews",
    icon: "💬",
    content: `# Customer Interview Script

## Introduction (2 minutes)
"Hi [Name], thanks for taking the time. I'm exploring [problem area] and would love to understand your experience. This will take about 15 minutes. Is that okay?"

## Problem Discovery (5 minutes)
1. "Tell me about [problem area]. How does it affect your work/life?"
2. "How often does this happen?"
3. "What happens when this problem occurs?"
4. "What are you currently doing to solve this?"
5. "How much time/money does your current solution cost?"

## Solution Validation (5 minutes)
6. "If there was a solution that [your solution], would that help?"
7. "What would that solution need to do for you to use it?"
8. "What would prevent you from using it?"
9. "Who else in your organization would need to approve this?"

## Willingness to Pay (3 minutes)
10. "How much would you pay for this solution?"
11. "Would you pay [suggested price] per month/year?"
12. "What would make you switch from your current solution?"
13. "When would you need this by?"

## Closing (2 minutes)
14. "Is there anything else I should know about this problem?"
15. "Would you be interested in trying an early version?"
16. "Can I follow up in a few weeks?"

## Post-Interview Notes
- Problem confirmed: Yes/No
- Solution fit: Yes/No
- Willingness to pay: $X
- Next steps: [ ]`,
  },
  {
    id: 3,
    title: "Landing Page Test Framework",
    description: "A framework to test your startup idea with a landing page before building anything.",
    category: "Testing",
    icon: "📄",
    content: `# Landing Page Test Framework

## Landing Page Elements

### Headline
- Clear value proposition
- Specific benefit
- Target audience

### Problem Statement
- Describe the problem
- Show you understand it
- Make it relatable

### Solution Overview
- What you're building
- Key features
- How it works

### Social Proof
- Testimonials (even if early)
- Number of signups
- Partner logos

### Call-to-Action
- "Join Waitlist"
- "Get Early Access"
- "Start Free Trial"

## Metrics to Track

### Traffic Metrics
- Page views
- Unique visitors
- Traffic sources
- Bounce rate

### Conversion Metrics
- Signup rate (target: 2-5%)
- Email collection rate
- Time on page
- Scroll depth

### Engagement Metrics
- Click-through rate on CTAs
- Form completion rate
- Exit rate

## Success Criteria

### Minimum Viable Signal
- 100+ visitors
- 2%+ signup rate
- 5+ email addresses
- 1+ person willing to pay

### Strong Signal
- 500+ visitors
- 5%+ signup rate
- 25+ email addresses
- 5+ people willing to pay

## A/B Testing Ideas
- Headlines
- Value propositions
- CTA button text
- Pricing display
- Social proof placement

## Next Steps After Test
- If strong signal: Build MVP
- If weak signal: Refine problem/solution
- If no signal: Pivot or abandon`,
  },
  {
    id: 4,
    title: "Pricing Validation Method",
    description: "How to test willingness to pay before building your product.",
    category: "Pricing",
    icon: "💰",
    content: `# Pricing Validation Method

## Pre-Pricing Research

### Competitive Analysis
- What do competitors charge?
- What's the price range in the market?
- What's the perceived value?

### Customer Research
- What are customers currently paying?
- What would they pay for your solution?
- What's their budget range?

## Pricing Tests

### Method 1: Direct Ask
Ask customers: "What would you pay for this?"
- Pros: Direct feedback
- Cons: May be inaccurate

### Method 2: Price Anchoring
Show multiple price points:
- Basic: $X/month
- Pro: $Y/month
- Enterprise: $Z/month
- See which gets most interest

### Method 3: Pre-Order Test
Offer early access at discount:
- "Pre-order for $X (50% off)"
- Measure conversion rate
- Test different price points

### Method 4: Van Westendorp
Ask four questions:
1. At what price is this too expensive?
2. At what price is this too cheap?
3. At what price is this expensive but worth it?
4. At what price is this a bargain?

## Pricing Validation Checklist
- [ ] Researched competitor pricing
- [ ] Asked 10+ customers about pricing
- [ ] Tested multiple price points
- [ ] Measured conversion at each price
- [ ] Found price point with best conversion
- [ ] Confirmed willingness to pay

## Success Criteria
- 5%+ conversion at target price
- Customers confirm price is fair
- Price covers costs + margin
- Price is competitive in market

## Common Mistakes
- Pricing too low (leaves money on table)
- Pricing too high (no conversions)
- Not testing enough price points
- Ignoring customer feedback`,
  },
  {
    id: 5,
    title: "MVP Prioritization Matrix",
    description: "A framework to decide what to build first in your MVP.",
    category: "MVP",
    icon: "🚀",
    content: `# MVP Prioritization Matrix

## Evaluation Criteria

### Value to Customer
- High: Solves core problem, customers will pay
- Medium: Nice to have, adds value
- Low: Minor benefit, not essential

### Effort to Build
- High: Complex, requires expertise, time-consuming
- Medium: Moderate complexity, some expertise needed
- Low: Simple, quick to build

### Risk Reduction
- High: Validates key assumptions, reduces major risk
- Medium: Validates some assumptions
- Low: Doesn't validate critical assumptions

## Prioritization Framework

### Must Have (Build First)
- High value + Low effort
- High value + High risk reduction
- Solves core problem

### Should Have (Build Second)
- High value + Medium effort
- Medium value + Low effort
- Medium risk reduction

### Could Have (Build Later)
- Medium value + Medium effort
- Low value + Low effort
- Nice to have features

### Won't Have (Don't Build)
- Low value + High effort
- Low value + Low risk reduction
- Features that don't solve core problem

## MVP Feature Checklist

### Core Features (Must Have)
- [ ] Solves the main problem
- [ ] Provides core value
- [ ] Can be built in 30 days
- [ ] Validates key assumptions

### Supporting Features (Should Have)
- [ ] Improves user experience
- [ ] Adds secondary value
- [ ] Can be built in 30-60 days

### Future Features (Could Have)
- [ ] Nice to have
- [ ] Can wait until after launch
- [ ] Requires more validation

## Decision Framework
1. List all potential features
2. Score each on value, effort, risk reduction
3. Prioritize by score
4. Build top 3-5 features
5. Launch and validate
6. Iterate based on feedback`,
  },
  {
    id: 6,
    title: "Competitive Analysis Template",
    description: "A structured approach to analyzing your competition and finding differentiation.",
    category: "Strategy",
    icon: "🔍",
    content: `# Competitive Analysis Template

## Competitor Identification

### Direct Competitors
- Solve the same problem
- Target the same customers
- Similar solution approach

### Indirect Competitors
- Solve similar problems
- Different approach
- Same customer base

### Alternative Solutions
- What customers use instead
- Manual processes
- Workarounds

## Analysis Framework

### For Each Competitor

#### Basic Info
- Company name
- Product name
- Website
- Founded date
- Funding raised

#### Product Analysis
- Key features
- Pricing model
- Target customers
- Strengths
- Weaknesses

#### Market Position
- Market share
- Growth rate
- Customer reviews
- Brand perception

#### Business Model
- Revenue model
- Customer acquisition
- Retention strategy
- Unit economics

## Differentiation Opportunities

### Feature Gaps
- What competitors don't have
- What customers want but don't get
- Underserved segments

### Pricing Opportunities
- Price too high (room for lower)
- Price too low (room for premium)
- Different pricing model

### Market Gaps
- Underserved segments
- Geographic gaps
- Use case gaps

## Competitive Advantage

### What Makes You Different?
- Unique features
- Better pricing
- Better experience
- Faster delivery
- Better support

### Defensibility
- Network effects
- Data advantages
- Brand strength
- Switching costs
- Patents/IP

## Action Items
- [ ] Identified top 5 competitors
- [ ] Analyzed each competitor
- [ ] Found differentiation opportunities
- [ ] Identified competitive advantages
- [ ] Created positioning strategy`,
  },
];

export default function ResourcesPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Resources & Guides | Startup Idea Advisor"
        description="Access AI startup guides, validation templates, and community links to accelerate your next venture."
        path="/resources"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Resources
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Resources to go from insight to traction
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Use these playbooks and templates alongside your reports to keep momentum—run experiments, gather signal, and generate new recommendations when you need fresh direction.
        </p>
      </header>

      {/* Frameworks & Templates Section */}
      <div className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Validation Frameworks & Templates</h2>
          <p className="mt-2 text-slate-600">
            Download free, actionable frameworks to validate your startup idea, test pricing, conduct interviews, and build your MVP.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework, index) => {
            const colorClasses = [
              { border: "border-brand-200", bg: "bg-brand-50" },
              { border: "border-aqua-200", bg: "bg-aqua-50" },
              { border: "border-coral-200", bg: "bg-coral-50" },
              { border: "border-sand-200", bg: "bg-sand-50" },
              { border: "border-brand-200", bg: "bg-brand-50" },
              { border: "border-aqua-200", bg: "bg-aqua-50" },
            ];
            const colors = colorClasses[index % colorClasses.length];

            return (
              <article
                key={framework.id}
                className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-sm transition hover:shadow-md`}
              >
                <div className="mb-4 text-4xl">{framework.icon}</div>
                <div className="mb-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {framework.category}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{framework.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{framework.description}</p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const blob = new Blob([framework.content], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${framework.title.toLowerCase().replace(/\s+/g, "-")}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
                  >
                    Download Framework (.md)
                  </button>
                  <p className="mt-2 text-xs text-slate-500 text-center">
                    Opens in any text editor or markdown viewer
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

