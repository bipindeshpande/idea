import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useReports } from "./context/ReportsContext.jsx";
import LoadingIndicator from "./components/LoadingIndicator.jsx";
import Seo from "./components/Seo.jsx";
import HomePage from "./pages/Home.jsx";
import ProfileReport from "./pages/ProfileReport.jsx";
import RecommendationsReport from "./pages/RecommendationsReport.jsx";
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

const navLinks = [
  { label: "Product", to: "/product" },
  { label: "Pricing", to: "/pricing" },
  { label: "Resources", to: "/resources" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Dashboard", to: "/dashboard" },
];

function Navigation() {
  const { reports } = useReports();
  const hasReports = Boolean(
    reports?.profile_analysis || reports?.personalized_recommendations
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <NavLink
          to="/"
          className="text-xl font-semibold tracking-tight text-brand-700"
        >
          Startup Idea Advisor
        </NavLink>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
          {navLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
                  isActive
                    ? "bg-brand-500/15 text-brand-700 shadow-sm"
                    : "hover:bg-slate-100"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-full px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
                isActive
                  ? "bg-brand-500/15 text-brand-700 shadow-sm"
                  : "hover:bg-slate-100"
              }`
            }
          >
            New Request
          </NavLink>
          <NavLink
            to="/results/profile"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
                isActive
                  ? "bg-brand-500/15 text-brand-700 shadow-sm"
                  : "hover:bg-slate-100"
              } ${hasReports ? "" : "pointer-events-none opacity-30"}`
            }
          >
            Profile Report
          </NavLink>
          <NavLink
            to="/results/recommendations"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-300 ${
                isActive
                  ? "bg-brand-500/15 text-brand-700 shadow-sm"
                  : "hover:bg-slate-100"
              } ${hasReports ? "" : "pointer-events-none opacity-30"}`
            }
          >
            Recommendations
          </NavLink>
        </nav>
      </div>
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
            <Route
              path="/results/profile"
              element={
                hasReports ? <ProfileReport /> : <Navigate to="/" replace />
              }
            />
            <Route
              path="/results/recommendations"
              element={
                hasReports ? (
                  <RecommendationsReport />
                ) : (
                  <Navigate to="/" replace />
                )
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
