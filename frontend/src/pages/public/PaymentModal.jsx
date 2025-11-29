import { useState, useEffect } from "react";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "../../context/AuthContext.jsx";

function DevActivationForm({ subscriptionType, onSuccess, onCancel }) {
  const { sessionToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/subscription/activate-dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ subscription_type: subscriptionType }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to activate subscription");
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Activation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Development Mode</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Payment is bypassed in development. Your subscription will be activated immediately without any charge.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-semantic-error-600 dark:text-semantic-error-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-semantic-error-800 dark:text-semantic-error-300">Activation Error</p>
              <p className="mt-1 text-sm text-semantic-error-700 dark:text-semantic-error-300">{error}</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
        >
          {loading ? "Activating..." : "Activate Subscription"}
        </button>
      </div>
    </form>
  );
}

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
        <div className="rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-semantic-error-600 dark:text-semantic-error-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-semantic-error-800 dark:text-semantic-error-300">Payment Error</p>
              <p className="mt-1 text-sm text-semantic-error-700 dark:text-semantic-error-300">{error}</p>
              <p className="mt-2 text-xs text-semantic-error-600 dark:text-semantic-error-400">
                Need help? Contact us at{" "}
                <a href="mailto:hello@startupideaadvisor.com" className="underline hover:text-semantic-error-800 dark:hover:text-semantic-error-300">
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

export default function PaymentModal({ tier, onClose, onSuccess }) {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeInstance, setStripeInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check if we're in development mode by checking for Stripe key
    // If no Stripe key, assume dev mode and use dev activation endpoint
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!stripeKey || stripeKey.trim() === "") {
      // No Stripe key - assume development mode
      setIsDevMode(true);
      setLoading(false);
      return;
    }

    // Stripe key exists - load Stripe for production
    setIsDevMode(false);
    const loadStripeLib = async () => {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(stripeKey);
        setStripeInstance(stripe);
        setStripeLoaded(true);
      } catch (err) {
        setError("Failed to load Stripe. Please try again.");
        console.error("Stripe loading error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStripeLib();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscribe to {tier.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-600 dark:text-slate-300">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Development mode - show simple activation form
  if (isDevMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscribe to {tier.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
          <div className="mb-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-700 dark:text-brand-300">{tier.price}</span>
              <span className="text-sm text-brand-600 dark:text-brand-400">{tier.period}</span>
            </div>
            <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">{tier.description}</p>
          </div>
          <DevActivationForm
            subscriptionType={tier.id}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    );
  }

  // Production mode - show Stripe form
  if (error || !stripeLoaded || !stripeInstance) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscribe to {tier.name}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4 text-center">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {error || "Stripe is not configured. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscribe to {tier.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ×
          </button>
        </div>
        <div className="mb-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-700 dark:text-brand-300">{tier.price}</span>
            <span className="text-sm text-brand-600 dark:text-brand-400">{tier.period}</span>
          </div>
          <p className="mt-2 text-sm text-brand-700 dark:text-brand-300">{tier.description}</p>
        </div>
        <Elements stripe={stripeInstance}>
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

