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
    id: "weekly",
    name: "Weekly Plan",
    price: "$5",
    period: "per week",
    description: "Perfect for short-term projects and testing multiple ideas quickly.",
    features: [
      "Unlimited idea discovery runs",
      "Unlimited idea validations",
      "Full access to all reports",
      "PDF downloads",
      "Priority support",
    ],
    highlight: false,
    color: "brand",
    duration_days: 7,
  },
  {
    id: "monthly",
    name: "Monthly Plan",
    price: "$15",
    period: "per month",
    description: "Best value for ongoing ideation and validation work.",
    features: [
      "Unlimited idea discovery runs",
      "Unlimited idea validations",
      "Full access to all reports",
      "PDF downloads",
      "Priority support",
      "Save 25% vs weekly plan",
    ],
    highlight: true,
    color: "coral",
    duration_days: 30,
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
      border: "border-brand-300",
      bg: "bg-brand-50",
      button: "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700",
    },
    coral: {
      border: "border-coral-300",
      bg: "bg-coral-50",
      button: "bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700",
    },
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Seo
        title="Pricing | Startup Idea Advisor"
        description="Start with 3 days free, then choose $5/week or $15/month for unlimited access to startup idea recommendations and validation."
        path="/pricing"
      />

      {/* Hero Section */}
      <header className="mb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          Pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 dark:text-slate-100 md:text-5xl">
          Start free, then choose your plan
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Get 3 days free access to all features. No credit card required. Then choose the plan that fits your needs.
        </p>
      </header>

      {/* Free Trial Banner */}
      <div className="mb-12 rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 to-white dark:to-slate-800 p-8 text-center shadow-soft">
        <h2 className="mb-2 text-2xl font-bold text-emerald-900 dark:text-emerald-300">✨ 3 Days Free Trial</h2>
        <p className="text-emerald-700 dark:text-emerald-300">
          Try all features for free. No credit card required. Cancel anytime.
        </p>
        {!isAuthenticated && (
          <Link
            to="/register"
            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-emerald-600 hover:to-emerald-700"
          >
            Start Free Trial
          </Link>
        )}
        {isAuthenticated && subscription && (
          <div className="mt-4">
            {subscription.is_active ? (
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {subscription.days_remaining > 0
                  ? `You have ${subscription.days_remaining} days remaining in your ${subscription.type === "free_trial" ? "free trial" : "subscription"}`
                  : "Your subscription has expired"}
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Your free trial has ended. Subscribe to continue.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      <div className="mb-16 grid gap-6 md:grid-cols-2">
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
              className={`rounded-3xl border-2 ${colors.border} ${colors.bg} p-8 shadow-soft ${
                tier.highlight ? "ring-2 ring-offset-2 ring-coral-300" : ""
              }`}
            >
              {tier.highlight && (
                <div className="mb-4 inline-block rounded-full bg-coral-100 px-3 py-1 text-xs font-semibold text-coral-700">
                  Most Popular
                </div>
              )}
              <div className="mb-4">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tier.name}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-slate-900 dark:text-slate-100">{tier.price}</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{tier.period}</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{tier.description}</p>
              <ul className="mb-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-brand-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {isCurrentPlan ? (
                <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Current Plan</p>
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {subscription.days_remaining > 0 ? `${subscription.days_remaining} days remaining` : "Expired"}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(tier)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition ${colors.button} whitespace-nowrap`}
                >
                  {isAuthenticated ? "Subscribe Now" : "Get Started"}
                </button>
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
      <section className="rounded-3xl border border-sand-200 dark:border-sand-800 bg-sand-50/80 dark:bg-sand-900/20 p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Frequently Asked Questions</h2>
        <div className="space-y-6">
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
