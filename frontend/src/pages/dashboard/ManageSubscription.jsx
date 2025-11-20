import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ManageSubscriptionPage() {
  const { user, isAuthenticated, getAuthHeaders, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/manage-subscription" } } });
      return;
    }
    loadSubscription();
  }, [isAuthenticated, navigate]);

  const loadSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/status", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setPaymentHistory(data.payment_history || []);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You'll continue to have access until your subscription expires.")) {
      return;
    }

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Subscription cancelled. You'll have access until expiration.");
        await refreshSubscription();
        await loadSubscription();
      } else {
        setError(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePlan = async (newPlan) => {
    if (!window.confirm(`Switch to ${newPlan === "weekly" ? "Weekly ($5/week)" : "Monthly ($15/month)"} plan?`)) {
      return;
    }

    setChanging(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ subscription_type: newPlan }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Subscription changed to ${newPlan} plan successfully.`);
        await refreshSubscription();
        await loadSubscription();
      } else {
        setError(data.error || "Failed to change subscription");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-center">
          <p className="text-slate-600">Loading subscription details...</p>
        </div>
      </section>
    );
  }

  if (!subscription) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No active subscription found.</p>
          <Link
            to="/pricing"
            className="mt-4 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            View Pricing Plans
          </Link>
        </div>
      </section>
    );
  }

  const planName = subscription.type === "weekly" ? "Weekly Plan" : subscription.type === "monthly" ? "Monthly Plan" : "Free Trial";
  const planPrice = subscription.type === "weekly" ? "$5/week" : subscription.type === "monthly" ? "$15/month" : "Free";
  const canCancel = subscription.type !== "free_trial" && subscription.status === "active";
  const canChange = subscription.type !== "free_trial" && subscription.status === "active";

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Seo
        title="Manage Subscription | Startup Idea Advisor"
        description="Manage your subscription, view payment history, and update your plan."
        path="/manage-subscription"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Manage Subscription</h1>
        <p className="mt-2 text-slate-600">View and manage your subscription details</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-coral-200 bg-coral-50 p-4">
          <p className="text-sm text-coral-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">{success}</p>
        </div>
      )}

      {/* Current Subscription */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Current Plan</h2>
            <p className="mt-1 text-sm text-slate-600">Your active subscription details</p>
          </div>
          <div className={`rounded-full px-4 py-2 text-sm font-semibold ${
            subscription.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-700"
          }`}>
            {subscription.is_active ? "Active" : subscription.status}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Plan</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{planName}</p>
            <p className="mt-1 text-slate-600">{planPrice}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 capitalize">{subscription.status}</p>
            {subscription.is_active && subscription.days_remaining !== null && (
              <p className="mt-1 text-slate-600">
                {subscription.days_remaining} {subscription.days_remaining === 1 ? "day" : "days"} remaining
              </p>
            )}
          </div>
          {subscription.expires_at && (
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Expires</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {new Date(subscription.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
          {subscription.started_at && (
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Started</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {new Date(subscription.started_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {canChange && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Change Plan</h3>
            <div className="flex gap-4">
              {subscription.type !== "weekly" && (
                <button
                  onClick={() => handleChangePlan("weekly")}
                  disabled={changing}
                  className="rounded-xl border border-brand-300 bg-white px-6 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                >
                  {changing ? "Processing..." : "Switch to Weekly ($5/week)"}
                </button>
              )}
              {subscription.type !== "monthly" && (
                <button
                  onClick={() => handleChangePlan("monthly")}
                  disabled={changing}
                  className="rounded-xl border border-brand-300 bg-white px-6 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                >
                  {changing ? "Processing..." : "Switch to Monthly ($15/month)"}
                </button>
              )}
            </div>
          </div>
        )}

        {canCancel && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Cancel Subscription</h3>
            <p className="mb-4 text-sm text-slate-600">
              You'll continue to have access to all features until your subscription expires on{" "}
              {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "the expiration date"}.
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-xl border border-red-300 bg-white px-6 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Subscription"}
            </button>
          </div>
        )}

        {!subscription.is_active && (
          <div className="mt-6">
            <Link
              to="/pricing"
              className="inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Resubscribe
            </Link>
          </div>
        )}
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">Payment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">${payment.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{payment.subscription_type}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

