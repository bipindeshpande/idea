import { NavLink } from "react-router-dom";

const footerLinks = {
  "Build Your Plan": [
    { label: "Start a New Run", to: "/" },
    { label: "View Dashboard", to: "/dashboard" },
    { label: "Profile Summary", to: "/results/profile" },
    { label: "Recommendations", to: "/results/recommendations" },
  ],
  "Compare & Decide": [
    { label: "Top Product Benefits", to: "/product" },
    { label: "Pricing & Access", to: "/pricing" },
    { label: "Full Recommendation Report", to: "/results/recommendations/full" },
  ],
  Resources: [
    { label: "How it Works Guide", to: "/resources" },
    { label: "Founder Playbooks", to: "/blog" },
    { label: "Support & Contact", to: "/contact" },
  ],
  Company: [
    { label: "About", to: "/about" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/90">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-brand-700">Startup Idea Advisor</p>
          <p className="text-sm text-slate-500">
            An AI-powered companion that helps professionals surface, validate, and prioritize startup ideas matched to their strengths.
          </p>
        </div>
        {Object.entries(footerLinks).map(([group, links]) => (
          <div key={group} className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{group}</p>
            <ul className="space-y-2 text-sm text-slate-600">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <NavLink className="hover:text-brand-600" to={to}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Stay in the loop
          </p>
          <form className="space-y-2 text-sm">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              className="w-full rounded-lg bg-brand-500 px-3 py-2 text-white shadow hover:bg-brand-600"
            >
              Join Newsletter
            </button>
          </form>
          <div className="flex gap-3 text-slate-500">
            <a href="https://www.linkedin.com/company/startup-idea-advisor" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://twitter.com/startupideaAI" target="_blank" rel="noreferrer">
              X
            </a>
            <a href="mailto:hello@startupideaadvisor.com">Email</a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Startup Idea Advisor. All rights reserved.
      </div>
    </footer>
  );
}

