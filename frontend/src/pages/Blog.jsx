import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Seo from "../components/Seo.jsx";

const posts = [
  {
    slug: "ai-startup-ideas-for-product-managers",
    title: "7 AI Startup Ideas for Busy Product Managers",
    description: "Use your product chops to launch AI-powered solutions without leaving your day job.",
    date: "2025-11-07",
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
Once you see 10+ waitlist sign-ups or a consulting client ready to pay, channel that into a lightweight MVP and run the crew again for risk planning.`,
  },
  {
    slug: "validate-a-startup-idea-in-60-minutes",
    title: "Validate a Startup Idea in 60 Minutes",
    description: "A repeatable playbook to go from raw idea to signal without quitting your job.",
    date: "2025-11-04",
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

Keep the loop tight. Rerun the crew after each learning cycle for updated risks and roadmap.`,
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
      <span className="text-slate-500">Share:</span>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${text}`}
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
      >
        LinkedIn
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`}
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
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
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <Seo
            title={`${post.title} | Startup Idea Advisor`}
            description={post.description}
            path={`/blog/${post.slug}`}
            keywords={`startup ideas, ${post.tags.join(", ")}`}
          />
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {new Date(post.date).toLocaleDateString()}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{post.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <ShareLinks title={post.title} slug={post.slug} />
          <div className="prose prose-slate mt-8 max-w-none">
            <ReactMarkdown>{post.body}</ReactMarkdown>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 text-sm">
            <Link
              to="/blog"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              ← Back to blog
            </Link>
            <Link
              to="/"
              className="font-semibold text-brand-600 hover:text-brand-700"
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
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Blog
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Ideas & Playbooks
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Weekly insights and curated ideas from the Startup Idea Advisor crew. Subscribe to stay ahead of the curve.
        </p>
      </header>

      {/* Blog Posts */}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post, index) => {
          const colorClasses = [
            { border: "border-brand-200", bg: "bg-brand-50" },
            { border: "border-aqua-200", bg: "bg-aqua-50" },
            { border: "border-coral-200", bg: "bg-coral-50" },
            { border: "border-sand-200", bg: "bg-sand-50" },
          ];
          const colors = colorClasses[index % colorClasses.length];

          return (
            <article
              key={post.slug}
              className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-sm transition hover:shadow-md`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {new Date(post.date).toLocaleDateString()}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{post.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Link
                  to={`/blog/${post.slug}`}
                  className="whitespace-nowrap rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:bg-brand-50"
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
