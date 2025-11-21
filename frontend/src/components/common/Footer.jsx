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
    <footer className="mt-12 border-t border-slate-200 bg-white/90">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <p className="text-lg font-semibold text-brand-700 whitespace-nowrap">Startup Idea Advisor</p>
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
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Startup Idea Advisor. All rights reserved.
      </div>
    </footer>
  );
}

