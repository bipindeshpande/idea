import { NavLink } from "react-router-dom";

const footerLinks = {
  "Build Your Plan": [
    { label: "Start a New Run", to: "/" },
    { label: "View Dashboard", to: "/dashboard" },
    { label: "Profile Summary", to: "/results/profile" },
  ],
  "Compare & Decide": [
    { label: "Top Product Benefits", to: "/product" },
    { label: "Pricing & Access", to: "/pricing" },
    { label: "Sample Recommendation Report", to: "/results/recommendations/full" },
  ],
  Resources: [
    { label: "How it Works Guide", to: "/product#how-it-works" },
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
    <footer className="mt-16 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-3">
          <p className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent whitespace-nowrap">Idea Bunch</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            An AI-powered companion that helps professionals surface, validate, and prioritize startup ideas matched to their strengths.
          </p>
        </div>
        {Object.entries(footerLinks).map(([group, links]) => (
          <div key={group} className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group}</p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <NavLink className="hover:text-brand-600 dark:hover:text-brand-400" to={to}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Stay in the loop
          </p>
          <div className="flex gap-3 text-slate-500 dark:text-slate-400">
            <a href="https://www.linkedin.com/company/startup-idea-advisor" target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400">
              LinkedIn
            </a>
            <a href="https://twitter.com/startupideaAI" target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400">
              X
            </a>
            <a href="mailto:hello@ideabunch.com" className="hover:text-brand-600 dark:hover:text-brand-400">Email</a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/60 dark:border-slate-800/80 py-5 text-center text-xs text-slate-500 dark:text-slate-500">
        © {new Date().getFullYear()} Idea Bunch. All rights reserved.
      </div>
    </footer>
  );
}

