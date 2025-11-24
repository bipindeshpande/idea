import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

// Lazy load the entire payment modal to avoid loading Stripe until needed
const PaymentModal = lazy(() => {
  return import("./PaymentModal.jsx");
});

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out the service. No credit card required.",
    features: [
      "3 idea validations (lifetime)",
      "1 idea discovery (lifetime)",
      "Full reports",
      "PDF downloads",
    ],
    highlight: false,
    color: "brand",
    duration_days: 0,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$7",
    period: "per month",
    description: "Best for regular users testing ideas.",
    features: [
      "10 validations/month",
      "5 discoveries/month",
      "Full reports",
      "PDF downloads",
      "Email support",
    ],
    highlight: false,
    color: "brand",
    duration_days: 30,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$15",
    period: "per month",
    description: "For power users and serial entrepreneurs.",
    features: [
      "Unlimited validations",
      "Unlimited discoveries",
      "Full reports",
      "PDF downloads",
      "Priority support",
    ],
    highlight: true,
    color: "coral",
    duration_days: 30,
  },
  {
    id: "weekly",
    name: "Weekly",
    price: "$5",
    period: "per week",
    description: "Perfect for short-term projects.",
    features: [
      "Unlimited validations",
      "Unlimited discoveries",
      "Full reports",
      "PDF downloads",
    ],
    highlight: false,
    color: "brand",
    duration_days: 7,
  },
];


export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, subscription, checkSubscription } = useAuth();
  const [selectedTier, setSelectedTier] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (paymentSuccess) {
      checkSubscription();
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedTier(null);
        navigate("/dashboard");
      }, 2000);
    }
  }, [paymentSuccess, checkSubscription, navigate]);

  const handleSubscribe = (tier) => {
    if (!isAuthenticated) {
      navigate("/register", { state: { from: { pathname: "/pricing" } } });
      return;
    }
    setSelectedTier(tier);
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
  };

  const colorClasses = {
    brand: {
      border: "border-brand-300 dark:border-brand-700",
      bg: "bg-brand-50 dark:bg-brand-900/30",
      button: "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700",
    },
    coral: {
      border: "border-coral-300 dark:border-coral-700",
      bg: "bg-coral-50 dark:bg-coral-900/30",
      button: "bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700",
    },
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-6">
      <Seo
        title="Pricing | Startup Idea Advisor"
        description="Start with 3 days free, then choose $5/week or $15/month for unlimited access to startup idea recommendations and validation."
        path="/pricing"
      />

      {/* Hero Section */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
          Start free, upgrade when you need more
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Get 3 free validations and 1 free discovery. No credit card required. Upgrade to unlock more when you're ready.
        </p>
      </header>

      {/* Pricing Tiers */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => {
          const colors = colorClasses[tier.color];
          const isCurrentPlan =
            isAuthenticated &&
            subscription &&
            subscription.type === tier.id &&
            subscription.is_active;

          return (
            <article
              key={tier.id}
              className={`group relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                tier.highlight ? "ring-2 ring-coral-300 dark:ring-coral-700 ring-offset-2" : ""
              }`}
            >
              <div className="mb-3">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{tier.name}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{tier.price}</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{tier.period}</p>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tier.description}</p>
              <ul className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-semibold text-brand-700 dark:text-brand-300">✓</span>
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              {tier.id === "free" ? (
                <div className="rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20 p-4 text-center shadow-sm">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Default Plan</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">No payment required</p>
                </div>
              ) : isCurrentPlan ? (
                <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-700/60 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-4 text-center shadow-sm">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Current Plan</p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Active
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(tier)}
                  className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${colors.button} whitespace-nowrap`}
                >
                  {isAuthenticated ? "Subscribe Now" : "Get Started"}
                </button>
              )}
              {tier.highlight && (
                <div className="mt-3 text-center">
                  <span className="inline-block rounded-full bg-gradient-to-r from-coral-100 to-coral-200 dark:from-coral-900/50 dark:to-coral-800/50 px-4 py-1.5 text-xs font-bold text-coral-700 dark:text-coral-300 shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Payment Modal - Lazy loaded */}
      {selectedTier && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscribe to {selectedTier.name}</h2>
                  <button
                    onClick={() => setSelectedTier(null)}
                    className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-600 dark:text-slate-300">Loading payment form...</div>
                </div>
              </div>
            </div>
          }
        >
          <PaymentModal
            tier={selectedTier}
            onClose={() => setSelectedTier(null)}
            onSuccess={handlePaymentSuccess}
          />
        </Suspense>
      )}

      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 p-8 text-center shadow-xl">
            <div className="mb-4 text-5xl">✓</div>
            <h2 className="mb-2 text-2xl font-bold text-emerald-900 dark:text-emerald-300">Payment Successful!</h2>
            <p className="text-emerald-700 dark:text-emerald-300">Your subscription is now active. Redirecting...</p>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section className="rounded-3xl border border-sand-200 dark:border-sand-800 bg-sand-50/80 dark:bg-sand-900/20 p-6 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Frequently Asked Questions</h2>
        <div className="space-y-3">
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">What's included in the free trial?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The 3-day free trial includes full access to all features: unlimited idea discovery runs, idea validations, full reports, and PDF downloads.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Can I cancel anytime?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">What payment methods do you accept?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We accept all major credit and debit cards through Stripe. Your payment information is securely processed and never stored on our servers.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">What happens after my free trial ends?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              After your 3-day free trial, you'll need to subscribe to continue accessing the platform. Choose between the weekly ($5) or monthly ($15) plan.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
