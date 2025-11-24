import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useReports } from "./context/ReportsContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import LoadingIndicator from "./components/common/LoadingIndicator.jsx";
import Seo from "./components/common/Seo.jsx";
// Public pages
import LandingPage from "./pages/public/Landing.jsx";
import AboutPage from "./pages/public/About.jsx";
import ContactPage from "./pages/public/Contact.jsx";
import PricingPage from "./pages/public/Pricing.jsx";
import ProductPage from "./pages/public/Product.jsx";
import PrivacyPage from "./pages/public/Privacy.jsx";
import TermsPage from "./pages/public/Terms.jsx";

// Discovery pages
import HomePage from "./pages/discovery/Home.jsx";
import ProfileReport from "./pages/discovery/ProfileReport.jsx";
import RecommendationsReport from "./pages/discovery/RecommendationsReport.jsx";
import RecommendationDetail from "./pages/discovery/RecommendationDetail.jsx";
// Lazy load heavy pages
const RecommendationFullReport = lazy(() => import("./pages/discovery/RecommendationFullReport.jsx"));

// Validation pages
import IdeaValidator from "./pages/validation/IdeaValidator.jsx";
import ValidationResult from "./pages/validation/ValidationResult.jsx";

// Resources pages
import ResourcesPage from "./pages/resources/Resources.jsx";
import BlogPage from "./pages/resources/Blog.jsx";
import FrameworksPage from "./pages/resources/Frameworks.jsx";

// Dashboard pages
import DashboardPage from "./pages/dashboard/Dashboard.jsx";
// Lazy load heavy pages
const AccountPage = lazy(() => import("./pages/dashboard/Account.jsx"));

// Auth pages
import RegisterPage from "./pages/auth/Register.jsx";
import LoginPage from "./pages/auth/Login.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPassword.jsx";
import ResetPasswordPage from "./pages/auth/ResetPassword.jsx";

// Admin pages - lazy load
const AdminPage = lazy(() => import("./pages/admin/Admin.jsx"));
const AdminForgotPasswordPage = lazy(() => import("./pages/admin/AdminForgotPassword.jsx"));
const AdminResetPasswordPage = lazy(() => import("./pages/admin/AdminResetPassword.jsx"));

// Components
import Footer from "./components/common/Footer.jsx";

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
  const { user, isAuthenticated, subscription, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const hasReports = Boolean(
    reports?.profile_analysis || reports?.personalized_recommendations
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnMenuOpen, setLearnMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const learnMenuRef = useRef(null);
  const reportsMenuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    closeAllMenus();
    window.location.href = "/";
  };

  const desktopLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
      isActive ? "bg-brand-500/15 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
    }`;

  const sessionsLinkClass = ({ isActive }) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
      isActive
        ? "border-brand-400 dark:border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
        : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-400"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `rounded-xl px-4 py-2 text-left text-sm font-medium whitespace-nowrap ${
      isActive ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
    <header className="sticky top-0 z-40 border-b border-slate-200/60 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
        <NavLink
          to="/"
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent whitespace-nowrap transition-opacity hover:opacity-80"
            onClick={closeAllMenus}
        >
          Startup Idea Advisor
        </NavLink>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-600">
            {primaryNavLinks.map(({ label, to }) => (
              <NavLink key={to} to={to} className={desktopLinkClass} onClick={closeAllMenus}>
                {label}
              </NavLink>
            ))}
            <div className="group relative" ref={learnMenuRef}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
                onClick={() => {
                  setLearnMenuOpen((prev) => !prev);
                  setReportsMenuOpen(false);
                }}
                onMouseEnter={() => {
                  setLearnMenuOpen(true);
                  setReportsMenuOpen(false);
                }}
                aria-expanded={learnMenuOpen}
              >
                Learn
                <span className="text-xs">▾</span>
              </button>
              <div
                className={`absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 shadow-lg transition-all duration-200 ${
                  learnMenuOpen ? "pointer-events-auto opacity-100 visible" : "pointer-events-none opacity-0 invisible"
                } group-hover:pointer-events-auto group-hover:opacity-100 group-hover:visible`}
                onMouseEnter={() => setLearnMenuOpen(true)}
                onMouseLeave={() => setLearnMenuOpen(false)}
              >
                {learnNavLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                      `block rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                          ? "bg-brand-50 dark:bg-brand-900/30 font-semibold text-brand-700 dark:text-brand-400"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
              <div className="group relative" ref={reportsMenuRef}>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300"
                  onClick={() => {
                    setReportsMenuOpen((prev) => !prev);
                    setLearnMenuOpen(false);
                  }}
                  onMouseEnter={() => {
                    setReportsMenuOpen(true);
                    setLearnMenuOpen(false);
                  }}
                  aria-expanded={reportsMenuOpen}
                >
                  Reports
                  <span className="text-xs">▾</span>
                </button>
                <div
                className={`absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-2 shadow-lg transition-all duration-200 ${
                  reportsMenuOpen ? "pointer-events-auto opacity-100 visible" : "pointer-events-none opacity-0 invisible"
                } group-hover:pointer-events-auto group-hover:opacity-100 group-hover:visible`}
                onMouseEnter={() => setReportsMenuOpen(true)}
                onMouseLeave={() => setReportsMenuOpen(false)}
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
            {isAuthenticated ? (
              <>
                {subscription && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {subscription.days_remaining > 0 ? `${subscription.days_remaining} days left` : "Expired"}
                  </span>
                )}
                <NavLink to="/dashboard" className={sessionsLinkClass} onClick={closeAllMenus}>
                  My Sessions
          </NavLink>
                <Link
                  to="/advisor"
                  onClick={closeAllMenus}
                  className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Start Run
                </Link>
                <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                  <span className="text-xs text-slate-600 max-w-[150px] truncate">{user?.email}</span>
                  <Link
                    to="/account"
                    className="rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 whitespace-nowrap"
                    onClick={closeAllMenus}
                  >
                    Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    Logout
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="rounded-full border border-slate-300 dark:border-slate-600 px-2.5 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                    aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                    title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                  >
                    {theme === "light" ? (
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeAllMenus}
                  className="rounded-full border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeAllMenus}
                  className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Get Started
                </Link>
                <button
                  onClick={toggleTheme}
                  className="rounded-full border border-slate-300 dark:border-slate-600 px-2.5 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
                  aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                  title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  {theme === "light" ? (
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>
              </>
            )}
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
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-inner lg:hidden">
          <nav className="grid gap-4 p-4 text-sm">
            <div className="space-y-2">
              {primaryNavLinks.map(({ label, to }) => (
                <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                  {label}
                </NavLink>
              ))}
            </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Learn</p>
              {learnNavLinks.map(({ label, to }) => (
                <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                  {label}
                </NavLink>
              ))}
            </div>
            {hasReports && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Reports</p>
                {reportNavLinks.map(({ label, to }) => (
                  <NavLink key={to} to={to} className={mobileLinkClass} onClick={closeAllMenus}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
            {isAuthenticated ? (
              <div className="space-y-2">
                {subscription && (
                  <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {subscription.days_remaining > 0 ? `${subscription.days_remaining} days remaining` : "Subscription expired"}
                  </div>
                )}
                <div className="px-4 py-2 text-xs text-slate-600 border-b border-slate-200">
                  {user?.email}
                </div>
                <NavLink to="/dashboard" className={mobileLinkClass} onClick={closeAllMenus}>
                  My Sessions
                </NavLink>
                <NavLink to="/account" className={mobileLinkClass} onClick={closeAllMenus}>
                  Account Settings
          </NavLink>
                <Link
                  to="/advisor"
                  onClick={closeAllMenus}
                  className="block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
                >
                  Start Run
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Logout
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  {theme === "light" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Light Mode</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={closeAllMenus}
                  className="block rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeAllMenus}
                  className="block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
                >
                  Get Started
                </Link>
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  {theme === "light" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Light Mode</span>
                    </>
                  )}
                </button>
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
  const { pathname } = useLocation();
  const hasReports = Boolean(
    reports?.profile_analysis || reports?.personalized_recommendations
  );

  // Check if current route is an admin route
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Don't show navigation for admin routes */}
      {!isAdminRoute && <Navigation />}
      <main className={isAdminRoute ? "min-h-screen bg-slate-100 dark:bg-slate-900" : "mx-auto max-w-6xl px-6 py-10 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100"}>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/advisor"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/validate-idea"
              element={
                <ProtectedRoute>
                  <IdeaValidator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/validate-result"
              element={
                <ProtectedRoute>
                  <ValidationResult />
                </ProtectedRoute>
              }
            />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingIndicator simple={true} message="Loading account..." />}>
                    <AccountPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPage />} />
            <Route path="/frameworks" element={<FrameworksPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            {/* Admin routes - completely separate, no navigation links visible to regular users */}
            <Route 
              path="/admin" 
              element={
                <AdminRouteWrapper>
                  <Suspense fallback={<LoadingIndicator simple={true} message="Loading admin panel..." />}>
                    <AdminPage />
                  </Suspense>
                </AdminRouteWrapper>
              } 
            />
            <Route 
              path="/admin/forgot-password" 
              element={
                <AdminRouteWrapper>
                  <Suspense fallback={<LoadingIndicator simple={true} message="Loading..." />}>
                    <AdminForgotPasswordPage />
                  </Suspense>
                </AdminRouteWrapper>
              } 
            />
            <Route 
              path="/admin/reset-password" 
              element={
                <AdminRouteWrapper>
                  <Suspense fallback={<LoadingIndicator simple={true} message="Loading..." />}>
                    <AdminResetPasswordPage />
                  </Suspense>
                </AdminRouteWrapper>
              } 
            />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route
              path="/results/profile"
              element={
                <ProtectedRoute>
                  <ProfileReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/recommendations"
              element={
                <ProtectedRoute>
                  <RecommendationsReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/recommendations/:ideaIndex"
              element={
                <ProtectedRoute>
                  <RecommendationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/recommendations/full"
              element={
                <Suspense fallback={<LoadingIndicator simple={true} message="Loading report..." />}>
                  <SampleReportRoute>
                    <RecommendationFullReport />
                  </SampleReportRoute>
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        {loading && !isAdminRoute && <LoadingIndicator />}
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function SampleReportRoute({ children }) {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const isSample = query.get("sample") === "true";
  
  // If it's a sample report, allow access without authentication
  if (isSample) {
    return <>{children}</>;
  }
  
  // Otherwise, require authentication
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}

function AdminRouteWrapper({ children }) {
  // Admin routes are completely isolated - no navigation, no header/footer
  // This wrapper ensures admin pages are separate from the main app
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {children}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isSubscriptionActive, subscription, loading } = useAuth();
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Will redirect via Navigate
    } else if (!loading && isAuthenticated && !isSubscriptionActive) {
      setShowPaymentPrompt(true);
    }
  }, [loading, isAuthenticated, isSubscriptionActive]);

  if (loading) {
    return <LoadingIndicator simple={true} message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: window.location.pathname } }} replace />;
  }

  if (!isSubscriptionActive) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/80 p-8 text-center shadow-soft">
          <h2 className="mb-4 text-2xl font-bold text-amber-900">Subscription Expired</h2>
          <p className="mb-2 text-amber-800">
            {subscription?.days_remaining === 0
              ? "Your free trial has ended."
              : `Your subscription expires in ${subscription?.days_remaining || 0} days.`}
          </p>
          <p className="mb-6 text-sm text-amber-700">
            Subscribe now to continue accessing all features and get personalized startup recommendations.
          </p>
          <Link
            to="/pricing"
            className="inline-block rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-amber-600 hover:to-amber-700"
          >
            View Pricing & Subscribe
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
