import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Seo from "../components/Seo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Load Stripe with public key from environment
// For production, set VITE_STRIPE_PUBLIC_KEY in your .env file
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

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

function CheckoutForm({ subscriptionType, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const { sessionToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const response = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ subscription_type: subscriptionType }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        // Map Stripe error codes to user-friendly messages
        let errorMessage = stripeError.message;
        
        if (stripeError.code === "card_declined") {
          errorMessage = "Your card was declined. Please check your card details or try a different payment method.";
        } else if (stripeError.code === "insufficient_funds") {
          errorMessage = "Insufficient funds. Please use a different payment method.";
        } else if (stripeError.code === "expired_card") {
          errorMessage = "Your card has expired. Please use a different payment method.";
        } else if (stripeError.code === "incorrect_cvc") {
          errorMessage = "Your card's security code is incorrect. Please check and try again.";
        } else if (stripeError.code === "incorrect_number") {
          errorMessage = "Your card number is incorrect. Please check and try again.";
        } else if (stripeError.code === "processing_error") {
          errorMessage = "An error occurred while processing your card. Please try again.";
        } else if (stripeError.code === "generic_decline") {
          errorMessage = "Your card was declined. Please contact your bank or try a different payment method.";
        }
        
        throw new Error(errorMessage);
      }

      if (paymentIntent.status === "succeeded") {
        // Confirm payment on backend
        const confirmResponse = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            subscription_type: subscriptionType,
          }),
        });

        const confirmData = await confirmResponse.json();
        if (confirmData.success) {
          onSuccess();
        } else {
          throw new Error(confirmData.error || "Payment confirmation failed");
        }
      }
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>
      {error && (
        <div className="rounded-xl border border-coral-200 bg-coral-50 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-coral-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-coral-800">Payment Error</p>
              <p className="mt-1 text-sm text-coral-700">{error}</p>
              <p className="mt-2 text-xs text-coral-600">
                Need help? Contact us at{" "}
                <a href="mailto:hello@startupideaadvisor.com" className="underline hover:text-coral-800">
                  hello@startupideaadvisor.com
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Subscribe"}
        </button>
      </div>
    </form>
  );
}

function PaymentModal({ tier, onClose, onSuccess }) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Subscribe to {tier.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-sm text-amber-800">
              Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Subscribe to {tier.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-700">{tier.price}</span>
            <span className="text-sm text-brand-600">{tier.period}</span>
          </div>
          <p className="mt-2 text-sm text-brand-700">{tier.description}</p>
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm
            subscriptionType={tier.id}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </Elements>
      </div>
    </div>
  );
}

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
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold text-slate-900 md:text-5xl">
          Start free, then choose your plan
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Get 3 days free access to all features. No credit card required. Then choose the plan that fits your needs.
        </p>
      </header>

      {/* Free Trial Banner */}
      <div className="mb-12 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-8 text-center shadow-soft">
        <h2 className="mb-2 text-2xl font-bold text-emerald-900">✨ 3 Days Free Trial</h2>
        <p className="text-emerald-700">
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
              <p className="text-sm font-semibold text-emerald-800">
                {subscription.days_remaining > 0
                  ? `You have ${subscription.days_remaining} days remaining in your ${subscription.type === "free_trial" ? "free trial" : "subscription"}`
                  : "Your subscription has expired"}
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-800">
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
                <p className="text-lg font-semibold text-slate-900">{tier.name}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-slate-900">{tier.price}</p>
                  <p className="text-sm font-medium text-slate-500">{tier.period}</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-slate-600">{tier.description}</p>
              <ul className="mb-6 space-y-3 text-sm text-slate-600">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-brand-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {isCurrentPlan ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
                  <p className="text-sm font-semibold text-emerald-700">Current Plan</p>
                  <p className="mt-1 text-xs text-emerald-600">
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

      {/* Payment Modal */}
      {selectedTier && (
        <PaymentModal
          tier={selectedTier}
          onClose={() => setSelectedTier(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment Success Message */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-emerald-300 bg-white p-8 text-center shadow-xl">
            <div className="mb-4 text-5xl">✓</div>
            <h2 className="mb-2 text-2xl font-bold text-emerald-900">Payment Successful!</h2>
            <p className="text-emerald-700">Your subscription is now active. Redirecting...</p>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section className="rounded-3xl border border-sand-200 bg-sand-50/80 p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 font-semibold text-slate-900">What's included in the free trial?</h3>
            <p className="text-sm text-slate-600">
              The 3-day free trial includes full access to all features: unlimited idea discovery runs, idea validations, full reports, and PDF downloads.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Can I cancel anytime?</h3>
            <p className="text-sm text-slate-600">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900">What payment methods do you accept?</h3>
            <p className="text-sm text-slate-600">
              We accept all major credit and debit cards through Stripe. Your payment information is securely processed and never stored on our servers.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900">What happens after my free trial ends?</h3>
            <p className="text-sm text-slate-600">
              After your 3-day free trial, you'll need to subscribe to continue accessing the platform. Choose between the weekly ($5) or monthly ($15) plan.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
