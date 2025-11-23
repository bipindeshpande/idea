import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../../components/common/Seo.jsx";

const posts = [
  {
    slug: "complete-guide-to-problem-validation",
    title: "The Complete Guide to Problem Validation: How to Test if Your Startup Idea Solves a Real Problem",
    description: "Learn how to validate that your startup idea solves a real, urgent problem before building anything. Includes frameworks, interview scripts, and success criteria.",
    date: "2024-11-14",
    tags: ["Validation", "Problem-Solution Fit", "Guide"],
    body: `# The Complete Guide to Problem Validation

Problem validation is the foundation of every successful startup. Before you write a single line of code or design a single feature, you need to confirm that your idea solves a real, urgent problem that people will pay to solve.

## Why Problem Validation Matters

Most startups fail because they build solutions to problems that don't exist, aren't urgent, or that people won't pay to solve. Problem validation helps you avoid this fate by:

- **Saving time and money** - Don't build something nobody wants
- **Finding product-market fit faster** - Start with a validated problem
- **Reducing risk** - Know you're solving a real problem before investing
- **Improving your pitch** - Clear problem statement attracts customers and investors

## The Problem Validation Framework

### Step 1: Define the Problem Clearly

A well-defined problem has three components:

1. **Who** experiences the problem (target customer)
2. **What** the problem is (specific pain point)
3. **Why** it matters (urgency and impact)

**Example:**
- ❌ Bad: "People need better productivity tools"
- ✅ Good: "Product managers spend 5+ hours per week manually prioritizing features from customer feedback, leading to delayed releases and missed opportunities"

### Step 2: Validate Problem Existence

Before building, confirm the problem actually exists:

#### Customer Interviews
- Interview 10-20 potential customers
- Ask open-ended questions about their current process
- Listen for pain points and frustrations
- Don't mention your solution yet

**Key Questions:**
- "Tell me about how you currently handle [problem area]"
- "What's the most frustrating part of [current process]?"
- "How often does this problem occur?"
- "What happens when this problem occurs?"

#### Market Research
- Search forums, Reddit, social media for complaints
- Check if competitors exist (proves market)
- Look for search volume on problem-related keywords
- Review customer reviews of existing solutions

### Step 3: Assess Problem Urgency

Not all problems are urgent. Urgent problems have:
- **Frequency** - Happens often
- **Impact** - Causes significant pain or cost
- **Timing** - Needs to be solved now, not later

**Urgency Test:**
- Would customers pay to solve this today?
- Is this blocking them from achieving important goals?
- Are they actively searching for solutions?

### Step 4: Test Willingness to Pay

A problem isn't validated until people show they'll pay to solve it:

#### Methods to Test Willingness to Pay:
1. **Direct Ask** - "What would you pay for a solution?"
2. **Pre-order Test** - Offer early access at a discount
3. **Landing Page** - Show pricing and measure signups
4. **Van Westendorp** - Four-question pricing survey

### Step 5: Validate Solution Fit

Once the problem is validated, test if your solution fits:

- Does your solution directly address the problem?
- Is it 10x better than current alternatives?
- Can customers understand the value immediately?
- Will customers switch from current solutions?

## Problem Validation Checklist

Use this checklist to validate your problem:

- [ ] Problem is clearly defined (who, what, why)
- [ ] Interviewed 10+ potential customers
- [ ] Customers confirm problem exists
- [ ] Problem occurs frequently
- [ ] Problem has significant impact
- [ ] Customers show urgency
- [ ] Market research confirms demand
- [ ] Customers show willingness to pay
- [ ] Solution directly addresses problem
- [ ] Solution is better than alternatives

**If 8+ items checked, proceed. If less, refine or pivot.**

## Common Mistakes to Avoid

1. **Asking leading questions** - "Don't you think this would be useful?"
2. **Talking about your solution** - Focus on the problem first
3. **Not enough interviews** - Need 10+ to see patterns
4. **Ignoring negative feedback** - It's more valuable than positive
5. **Confirmation bias** - Don't only hear what you want

## Next Steps

Once your problem is validated:

1. **Validate your solution** - Test if your approach solves it
2. **Test pricing** - Confirm willingness to pay at specific price
3. **Build MVP** - Minimum viable product to solve the problem
4. **Iterate** - Continue validating as you build

## Tools and Resources

- **Customer Interview Script** - Download from our Frameworks page
- **Problem Validation Checklist** - Available in our templates
- **Idea Validation Tool** - Use our AI-powered validator to get feedback

Remember: Problem validation is an ongoing process. Continue talking to customers and refining your understanding as you build.

---

*Ready to validate your startup idea? Use our [Idea Validator](/validate-idea) to get comprehensive feedback across 10 key parameters.*`,
  },
  {
    slug: "how-to-test-willingness-to-pay",
    title: "How to Test Willingness to Pay: 5 Methods to Validate Pricing Before Building",
    description: "Learn proven methods to test if customers will pay for your solution, including pre-order tests, landing pages, and pricing surveys.",
    date: "2024-11-13",
    tags: ["Pricing", "Validation", "Revenue"],
    body: `# How to Test Willingness to Pay: 5 Methods to Validate Pricing

Testing willingness to pay is critical before building your product. Here are 5 proven methods to validate pricing.

## Method 1: Direct Customer Ask

**How it works:** Simply ask customers what they would pay.

**Pros:**
- Fast and direct
- Gets immediate feedback
- No technical setup needed

**Cons:**
- Answers may not reflect actual behavior
- Customers may say what they think you want to hear

**Best for:** Early validation, B2B products

**Example Questions:**
- "What would you pay for a solution to this problem?"
- "What's your budget for this type of tool?"
- "What do you currently spend on [alternative solution]?"

## Method 2: Pre-Order Test

**How it works:** Offer early access at a discounted price before building.

**Pros:**
- Tests actual willingness to pay
- Generates early revenue
- Validates demand

**Cons:**
- Requires payment processing
- Need to deliver on promise
- May need to refund if you pivot

**Best for:** Products with clear value proposition

**Example:**
- "Pre-order for $99 (50% off regular price)"
- "Join early access for $49/month"
- "Reserve your spot for $199"

## Method 3: Landing Page with Pricing

**How it works:** Create a landing page showing your product and pricing, measure signups.

**Pros:**
- Tests real behavior
- Can A/B test different prices
- Measures conversion rate

**Cons:**
- Requires traffic
- Need to build landing page
- May need ads to drive traffic

**Best for:** B2C products, SaaS

**Metrics to Track:**
- Signup rate (target: 2-5%)
- Click-through on pricing
- Form completion rate

## Method 4: Van Westendorp Pricing Survey

**How it works:** Ask four questions to find optimal price range.

**Questions:**
1. At what price is this too expensive?
2. At what price is this too cheap?
3. At what price is this expensive but worth it?
4. At what price is this a bargain?

**Pros:**
- Finds optimal price range
- Reveals price sensitivity
- Data-driven approach

**Cons:**
- Requires survey responses
- May not reflect actual behavior
- Takes time to analyze

**Best for:** Products with uncertain pricing

## Method 5: Price Anchoring Test

**How it works:** Show multiple price tiers and see which gets most interest.

**Pros:**
- Tests multiple price points
- Reveals price preferences
- Can find upsell opportunities

**Cons:**
- Requires multiple options
- May confuse customers
- Need to analyze results

**Best for:** Products with tiered pricing

**Example Tiers:**
- Basic: $29/month
- Pro: $99/month
- Enterprise: $299/month

## Success Criteria

Your pricing is validated when:

- ✅ 5%+ conversion at target price
- ✅ Customers confirm price is fair
- ✅ Price covers costs + margin
- ✅ Price is competitive in market
- ✅ Multiple customers willing to pay

## Common Mistakes

1. **Pricing too low** - Leaves money on table, signals low value
2. **Pricing too high** - No conversions, can't validate
3. **Not testing enough** - Need multiple price points
4. **Ignoring feedback** - Customer input is valuable
5. **Setting price too early** - Validate problem first

## Next Steps

1. Choose 2-3 methods to test
2. Run tests with 20+ potential customers
3. Analyze results and find optimal price
4. Validate with actual sales
5. Iterate based on feedback

---

*Download our [Pricing Validation Framework](/frameworks) for a complete guide and templates.*`,
  },
  {
    slug: "customer-interview-best-practices",
    title: "Customer Interview Best Practices: How to Get Honest Feedback That Validates Your Idea",
    description: "Learn how to conduct effective customer interviews that reveal real problems, validate solutions, and test willingness to pay.",
    date: "2024-11-12",
    tags: ["Interviews", "Validation", "Customer Research"],
    body: `# Customer Interview Best Practices

Customer interviews are the most valuable validation tool. Here's how to conduct them effectively.

## Why Customer Interviews Matter

- **Reveal real problems** - Not what you think the problem is
- **Validate solutions** - Test if your approach works
- **Test pricing** - Understand willingness to pay
- **Find early customers** - Build relationships
- **Reduce risk** - Know before you build

## Before the Interview

### Prepare Your Questions

Create a structured script but stay flexible:

1. **Problem discovery** (5-10 min)
2. **Current solution** (5 min)
3. **Solution validation** (5 min)
4. **Willingness to pay** (3-5 min)
5. **Closing** (2 min)

### Find the Right People

- Target your ideal customer profile
- Use LinkedIn, communities, referrals
- Offer small incentive if needed
- Aim for 10-20 interviews

### Set Expectations

- "This will take 15-20 minutes"
- "I'm exploring [problem area]"
- "Your feedback is valuable"
- "No sales pitch, just research"

## During the Interview

### Start with Rapport

- Thank them for their time
- Explain your purpose
- Set expectations
- Make them comfortable

### Ask Open-Ended Questions

**Good Questions:**
- "Tell me about how you currently handle [problem]"
- "What's the most frustrating part?"
- "What would an ideal solution look like?"

**Bad Questions:**
- "Don't you think this would be useful?"
- "Would you pay $X for this?"
- "Do you like my idea?"

### Listen More Than You Talk

- 80% listening, 20% talking
- Let them tell their story
- Don't interrupt
- Take notes

### Dig Deeper

When they mention something interesting:
- "Can you tell me more about that?"
- "Why is that important?"
- "What happens when that occurs?"
- "How often does that happen?"

### Test Your Solution (Later)

Only after understanding the problem:
- "If there was a solution that [your solution], would that help?"
- "What would it need to do for you to use it?"
- "What would prevent you from using it?"

## After the Interview

### Document Immediately

- Write notes within 24 hours
- Capture key quotes
- Note patterns and themes
- Rate problem urgency (1-10)

### Look for Patterns

After 10+ interviews:
- What problems come up repeatedly?
- What solutions do they want?
- What are they willing to pay?
- What objections do they have?

### Follow Up

- Thank them for their time
- Share what you learned
- Ask if they want updates
- Build relationships

## Common Mistakes

1. **Leading questions** - "Don't you think..."
2. **Talking too much** - Should be 80/20
3. **Pitching your solution** - Focus on problem first
4. **Not enough interviews** - Need 10+ for patterns
5. **Ignoring negative feedback** - It's more valuable
6. **Confirmation bias** - Only hearing what you want

## Red Flags

Watch for these warning signs:

- **Vague answers** - Problem may not be real
- **No urgency** - "Maybe someday"
- **No budget** - "I can't pay for this"
- **Happy with current solution** - No need for yours
- **Too many objections** - Solution doesn't fit

## Success Indicators

Your interviews are successful when:

- ✅ Problem confirmed by 8+ people
- ✅ Clear urgency and impact
- ✅ Willingness to pay confirmed
- ✅ Solution fits the problem
- ✅ People want to try it

## Interview Script Template

Download our complete [Customer Interview Script](/frameworks) with:
- Introduction template
- Problem discovery questions
- Solution validation questions
- Willingness to pay questions
- Closing and follow-up

## Next Steps

1. Conduct 10-20 interviews
2. Analyze patterns
3. Validate or refine your idea
4. Test solution with interested customers
5. Build MVP based on feedback

---

*Ready to validate your startup idea? Use our [Idea Validator](/validate-idea) to get comprehensive feedback.*`,
  },
  {
    slug: "ai-startup-ideas-for-product-managers",
    title: "7 AI Startup Ideas for Busy Product Managers",
    description: "Use your product chops to launch AI-powered solutions without leaving your day job.",
    date: "2024-11-07",
    tags: ["AI", "Product", "Side business"],
    body: `### Why this matters
Product leaders already translate customer needs into shipped features. With AI, you can package that skill into:

1. **Workflow copilots** for niche verticals (e.g. legal intake, clinical research).
2. **Insight automation** turning docs and meetings into prioritized backlogs.
3. **Validation as a service**: use your discovery toolkit to offer fast research sprints for founders.

### Quick validation tasks
- Run 5 customer interviews using our validation script.
- Build a landing page with your distinct POV and collect waitlist sign ups.
- Prototype a GPT-based workflow in Retool or Bubble.

### When to move to MVP
Once you see 10+ waitlist sign-ups or a consulting client ready to pay, channel that into a lightweight MVP and generate new recommendations for risk planning.`,
  },
  {
    slug: "validate-a-startup-idea-in-60-minutes",
    title: "Validate a Startup Idea in 60 Minutes",
    description: "A repeatable playbook to go from raw idea to signal without quitting your job.",
    date: "2024-11-04",
    tags: ["Validation", "Playbook"],
    body: `### 60 minute sprint
1. **Minute 0-10:** Run Startup Idea Advisor with your profile.
2. **Minute 10-30:** Pick the top idea and outline assumptions.
3. **Minute 30-45:** Draft a landing page or LinkedIn post testing value prop.
4. **Minute 45-60:** DM 5 people that match the persona and ask for interviews.

### Metrics to track
- Click-through rate on the landing page
- Interview acceptance rate
- Signals of willingness to pay

Keep the loop tight. Generate new recommendations after each learning cycle for updated risks and roadmap.`,
  },
];

function usePost(slug) {
  return useMemo(() => posts.find((post) => post.slug === slug), [slug]);
}

function ShareLinks({ title, slug }) {
  const url = `https://startupideaadvisor.com/blog/${slug}`;
  const text = encodeURIComponent(`${title} - Startup Idea Advisor`);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">Share:</span>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${text}`}
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap rounded-full border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
      >
        LinkedIn
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`}
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap rounded-full border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
      >
        X
      </a>
    </div>
  );
}

export default function BlogPage() {
  const { slug } = useParams();
  const post = usePost(slug);

  if (post) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
          <Seo
            title={`${post.title} | Startup Idea Advisor`}
            description={post.description}
            path={`/blog/${post.slug}`}
            keywords={`startup ideas, ${post.tags.join(", ")}`}
          />
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {new Date(post.date).toLocaleDateString()}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 md:text-4xl">{post.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 dark:bg-brand-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <ShareLinks title={post.title} slug={post.slug} />
          <div className="prose prose-slate dark:prose-invert mt-8 max-w-none">
            <ReactMarkdown>{post.body}</ReactMarkdown>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6 text-sm">
            <Link
              to="/blog"
              className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
            >
              ← Back to blog
            </Link>
            <Link
              to="/advisor"
              className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
            >
              Run a new idea →
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="AI Startup Idea Blog | Startup Idea Advisor"
        description="Insights, playbooks, and weekly ideas generated by our AI advisor to inspire your next venture."
        path="/blog"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 md:text-5xl">
          Ideas & Playbooks
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Weekly insights and curated ideas from Startup Idea Advisor. Subscribe to stay ahead of the curve.
        </p>
      </header>

      {/* Blog Posts */}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post, index) => {
          const colorClasses = [
            { border: "border-brand-200 dark:border-brand-700", bg: "bg-brand-50 dark:bg-brand-900/30" },
            { border: "border-aqua-200 dark:border-aqua-700", bg: "bg-aqua-50 dark:bg-aqua-900/30" },
            { border: "border-coral-200 dark:border-coral-700", bg: "bg-coral-50 dark:bg-coral-900/30" },
            { border: "border-sand-200 dark:border-sand-700", bg: "bg-sand-50 dark:bg-sand-900/30" },
          ];
          const colors = colorClasses[index % colorClasses.length];

          return (
            <article
              key={post.slug}
              className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-sm transition hover:shadow-md`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {new Date(post.date).toLocaleDateString()}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{post.title}</h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{post.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/80 dark:bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Link
                  to={`/blog/${post.slug}`}
                  className="whitespace-nowrap rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                >
                  Read article
                </Link>
                <ShareLinks title={post.title} slug={post.slug} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
