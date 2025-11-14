import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useReports } from "./context/ReportsContext.jsx";
import LoadingIndicator from "./components/LoadingIndicator.jsx";
import Seo from "./components/Seo.jsx";
import HomePage from "./pages/Home.jsx";
import ProfileReport from "./pages/ProfileReport.jsx";
import RecommendationsReport from "./pages/RecommendationsReport.jsx";
import RecommendationDetail from "./pages/RecommendationDetail.jsx";
import RecommendationFullReport from "./pages/RecommendationFullReport.jsx";
import ProductPage from "./pages/Product.jsx";
import PricingPage from "./pages/Pricing.jsx";
import ResourcesPage from "./pages/Resources.jsx";
import AboutPage from "./pages/About.jsx";
import ContactPage from "./pages/Contact.jsx";
import Footer from "./components/Footer.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import BlogPage from "./pages/Blog.jsx";
import PrivacyPage from "./pages/Privacy.jsx";
import TermsPage from "./pages/Terms.jsx";

const primaryNavLinks = [
  { label: "Product", to: "/product" },
  { label: "Pricing", to: "/pricing" },
];

const learnNavLinks = [
  { label: "Resources", to: "/resources" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const reportNavLinks = [
  { label: "Profile Summary", to: "/results/profile" },
  { label: "Top Recommendations", to: "/results/recommendations" },
  { label: "Full Recommendation", to: "/results/recommendations/full" },
];

function Navigation() {
  const { reports, inputs } = useReports();
  const hasReports = Boolean(
    reports?.profile_analysis || reports?.personalized_recommendations
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnMenuOpen, setLearnMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const learnMenuRef = useRef(null);
  const reportsMenuRef = useRef(null);

  const summaryChips = hasReports
    ? [
        inputs?.goal_type && `Goal: ${inputs.goal_type}`,
        inputs?.sub_interest_area
          ? `Focus: ${inputs.sub_interest_area}`
          : inputs?.interest_area && `Focus: ${inputs.interest_area}`,
      ].filter(Boolean)
    : [];

  const desktopLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
      isActive ? "bg-brand-500/15 text-brand-700 shadow-sm" : "hover:bg-slate-100"
    }`;

  const sessionsLinkClass = ({ isActive }) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "border-brand-400 bg-brand-50 text-brand-700"
        : "border-slate-300 text-slate-700 hover:border-brand-300 hover:text-brand-700"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `rounded-xl px-4 py-2 text-left text-sm font-medium ${
      isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
    }`;

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setLearnMenuOpen(false);
    setReportsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        learnMenuRef.current &&
        !learnMenuRef.current.contains(event.target) &&
        learnMenuOpen
      ) {
        setLearnMenuOpen(false);
      }
      if (
        reportsMenuRef.current &&
        !reportsMenuRef.current.contains(event.target) &&
        reportsMenuOpen
      ) {
        setReportsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keyup", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keyup", handleEscape);
    };
  }, [learnMenuOpen, reportsMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            className="text-xl font-semibold tracking-tight text-brand-700"
            onClick={closeAllMenus}
          >
            Startup Idea Advisor
          </NavLink>
          {summaryChips.length > 0 && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              {summaryChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-600">
            {primaryNavLinks.map(({ label, to }) => (
              <NavLink key={to} to={to} className={desktopLinkClass} onClick={closeAllMenus}>
                {label}
              </NavLink>
            ))}
            <div className="relative" ref={learnMenuRef}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
                onClick={() => {
                  setLearnMenuOpen((prev) => !prev);
                  setReportsMenuOpen(false);
                }}
                aria-expanded={learnMenuOpen}
              >
                Learn
                <span className="text-xs">▾</span>
              </button>
              <div
                className={`absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg transition-opacity ${
                  learnMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {learnNavLinks.map(({ label, to }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `block rounded-xl px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-brand-50 font-semibold text-brand-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`
                    }
                    onClick={closeAllMenus}
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
            {hasReports && (
              <div className="relative" ref={reportsMenuRef}>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
                  onClick={() => {
                    setReportsMenuOpen((prev) => !prev);
                    setLearnMenuOpen(false);
                  }}
                  aria-expanded={reportsMenuOpen}
                >
                  Reports
                  <span className="text-xs">▾</span>
                </button>
                <div
                  className={`absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg transition-opacity ${
                    reportsMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  {reportNavLinks.map(({ label, to }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `block rounded-xl px-3 py-2 text-sm transition ${
                          isActive
                            ? "bg-brand-50 font-semibold text-brand-700"
                            : "text-slate-600 hover:bg-slate-100"
                        }`
                      }
                      onClick={closeAllMenus}
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <NavLink to="/dashboard" className={sessionsLinkClass} onClick={closeAllMenus}>
              My Sessions
            </NavLink>
            <Link
              to="/"
              onClick={closeAllMenus}
              className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
            >
              Start Run
            </Link>
          </div>
          <button
            type="button"
            className="lg:hidden rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
            onClick={() => {
              const next = !mobileMenuOpen;
              setMobileMenuOpen(next);
              if (!next) {
                setLearnMenuOpen(false);
                setReportsMenuOpen(false);
              }
            }}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            Menu
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white/95 shadow-inner lg:hidden">
          <nav className="grid gap-4 p-4 text-sm">
            <div className="space-y-2">
              {primaryNavLinks.map(({ label, to }) => (
                <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">Learn</p>
              {learnNavLinks.map(({ label, to }) => (
                <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                  {label}
                </NavLink>
              ))}
            </div>
            {hasReports && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Reports</p>
                {reportNavLinks.map(({ label, to }) => (
                  <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <NavLink to="/dashboard" className={mobileLinkClass} onClick={closeAllMenus}>
                My Sessions
              </NavLink>
              <Link
                to="/"
                onClick={closeAllMenus}
                className="block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
              >
                Start Run
              </Link>
            </div>
            {summaryChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summaryChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const { reports, loading } = useReports();
  const hasReports = Boolean(
    reports?.profile_analysis || reports?.personalized_recommendations
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading && <LoadingIndicator />}
        {!loading && (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/results/profile" element={<ProfileReport />} />
            <Route path="/results/recommendations" element={<RecommendationsReport />} />
            <Route
              path="/results/recommendations/:ideaIndex"
              element={<RecommendationDetail />}
            />
            <Route
              path="/results/recommendations/full"
              element={<RecommendationFullReport />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
    </div>
  );
}
