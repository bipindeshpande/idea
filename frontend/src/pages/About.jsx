import Seo from "../components/Seo.jsx";

export default function AboutPage() {
  return (
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
      <Seo
        title="About | Startup Idea Advisor"
        description="Learn why we built Startup Idea Advisor and how our AI advisor empowers founders to validate ideas faster."
        path="/about"
      />
      <h1 className="text-3xl font-semibold text-slate-900">About</h1>
      <p className="text-slate-600">
        We built Startup Idea Advisor after watching countless professionals struggle to translate their strengths into
        viable ventures. Our mission is to combine founder empathy with AI-assisted research so you can explore
        opportunities confidently and efficiently.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-brand-50/70 p-5 text-sm text-brand-900">
          <h2 className="text-lg font-semibold">Why we exist</h2>
          <p className="mt-2">
            Traditional ideation services are expensive, slow, and rarely personalized. By orchestrating multiple
            specialist agents, we give founders advisor-grade analysis on demand.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50/70 p-5 text-sm text-emerald-900">
          <h2 className="text-lg font-semibold">What we believe</h2>
          <p className="mt-2">
            The best ideas start with the founder. Understanding your goals, skills, and constraints is essential to
            crafting opportunities that are aligned and executable.
          </p>
        </div>
      </div>
    </section>
  );
}

