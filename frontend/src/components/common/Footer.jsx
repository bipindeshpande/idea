import { NavLink } from "react-router-dom";

const footerLinks = {
  "Get Started": [
    { label: "Validate Your Idea", to: "/validate-idea" },
    { label: "Discover Ideas", to: "/advisor" },
    { label: "View Sample Report", to: "/results/recommendations/full?sample=true" },
  ],
  "Resources": [
    { label: "Startup Frameworks", to: "/frameworks" },
    { label: "Resources Library", to: "/resources" },
    { label: "Blog & Playbooks", to: "/blog" },
  ],
  "Company": [
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 pt-6 pb-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] lg:gap-6 items-start">
          <div className="space-y-3">
            <p className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent whitespace-nowrap">Idea Bunch</p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              An AI-powered companion that helps professionals surface, validate, and prioritize startup ideas matched to their strengths.
            </p>
          </div>
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group} className="space-y-3 text-center">
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
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Stay in the loop
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <a href="https://www.linkedin.com/company/startup-idea-advisor" target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://twitter.com/startupideaAI" target="_blank" rel="noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                  X
                </a>
              </li>
              <li>
                <a href="mailto:hello@ideabunch.com" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Email</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/60 dark:border-slate-800/80 py-5 text-center text-xs text-slate-500 dark:text-slate-500">
        © {new Date().getFullYear()} Idea Bunch. All rights reserved.
      </div>
    </footer>
  );
}

