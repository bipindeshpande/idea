import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useReports } from "./context/ReportsContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
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
      isActive ? "bg-brand-500/15 text-brand-700 shadow-sm" : "hover:bg-slate-100"
    }`;

  const sessionsLinkClass = ({ isActive }) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
      isActive
        ? "border-brand-400 bg-brand-50 text-brand-700"
        : "border-slate-300 text-slate-700 hover:border-brand-300 hover:text-brand-700"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `rounded-xl px-4 py-2 text-left text-sm font-medium whitespace-nowrap ${
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
            className="text-xl font-semibold tracking-tight text-brand-700 whitespace-nowrap"
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
            {isAuthenticated ? (
              <>
                {subscription && (
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {subscription.days_remaining > 0 ? `${subscription.days_remaining} days left` : "Expired"}
                  </span>
                )}
                <NavLink to="/dashboard" className={sessionsLinkClass} onClick={closeAllMenus}>
                  My Sessions
                </NavLink>
                <Link
                  to="/advisor"
                  onClick={closeAllMenus}
                  className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
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
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeAllMenus}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeAllMenus}
                  className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
                >
                  Get Started
                </Link>
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
            {isAuthenticated ? (
              <div className="space-y-2">
                {subscription && (
                  <div className="px-4 py-2 text-xs text-slate-500">
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
                  className="block w-full rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={closeAllMenus}
                  className="block rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
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
            <Route 
              path="/admin" 
              element={
                <Suspense fallback={<LoadingIndicator simple={true} message="Loading admin panel..." />}>
                  <AdminPage />
                </Suspense>
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
                <ProtectedRoute>
                  <Suspense fallback={<LoadingIndicator simple={true} message="Loading report..." />}>
                    <RecommendationFullReport />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <Footer />
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
