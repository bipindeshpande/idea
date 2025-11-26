import Seo from "../../components/common/Seo.jsx";
import WhatsNew from "../../components/dashboard/WhatsNew.jsx";

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="About | Startup Idea Advisor"
        description="Learn why we built Startup Idea Advisor and how our AI advisor empowers founders to validate ideas faster."
        path="/about"
      />
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">About</h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              We built Startup Idea Advisor after watching countless professionals struggle to translate their strengths into
              viable ventures. Our mission is to combine founder empathy with AI-assisted research so you can explore
              opportunities confidently and efficiently.
            </p>
            {/* Founder Story Section */}
            <div className="mt-8 rounded-2xl border-2 border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/80 via-white to-white dark:from-brand-900/30 dark:via-slate-800/50 p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-800/50 text-2xl shadow-md">
                  👨‍💼
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Built by Entrepreneurs, for Entrepreneurs</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Our founder's story</p>
                </div>
              </div>
              
              <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                <p>
                  After years of working in startups and watching countless entrepreneurs struggle with the same problem—<strong>how do I know if my idea is worth pursuing?</strong>—I decided to build something different.
                </p>
                <p>
                  I've been there: spending weeks researching markets, analyzing competitors, and trying to validate ideas manually. The process was time-consuming, expensive, and often left me with more questions than answers. That's when I realized: <strong>what if AI could do the heavy lifting?</strong>
                </p>
                <p>
                  Startup Idea Advisor was born from a simple belief: <strong>every entrepreneur deserves access to professional-grade validation</strong>, regardless of budget or connections. We combine AI-powered research with founder empathy to give you the insights you need—in minutes, not weeks.
                </p>
                <p>
                  This isn't just another AI tool. It's built by someone who understands the startup journey, the uncertainty, and the need for honest, actionable feedback. <strong>We're here to help you make better decisions, faster.</strong>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="group relative overflow-hidden rounded-xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/80 via-brand-50/40 to-white dark:from-brand-900/30 dark:via-brand-900/10 dark:to-slate-800/50 p-5 text-sm shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <h2 className="text-base font-bold text-brand-900 dark:text-brand-300">Why we exist</h2>
                <p className="mt-2 leading-relaxed text-brand-800 dark:text-brand-400">
                  Traditional ideation services are expensive, slow, and rarely personalized. By orchestrating multiple
                  specialist agents, we give founders advisor-grade analysis on demand.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-emerald-200/60 dark:border-emerald-700/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-white dark:from-emerald-900/30 dark:via-emerald-900/10 dark:to-slate-800/50 p-5 text-sm shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-300">What we believe</h2>
                <p className="mt-2 leading-relaxed text-emerald-800 dark:text-emerald-400">
                  The best ideas start with the founder. Understanding your goals, skills, and constraints is essential to
                  crafting opportunities that are aligned and executable.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What's New Sidebar */}
        <div className="lg:col-span-1">
          <WhatsNew />
        </div>
      </div>
    </section>
  );
}

