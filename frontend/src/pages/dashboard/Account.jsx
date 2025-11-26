import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import LoadingIndicator from "../../components/common/LoadingIndicator.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AccountPage() {
  const { user, isAuthenticated, subscription, getAuthHeaders, refreshSubscription, changePassword } = useAuth();
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  
  // Standard cancellation reasons
  const cancellationReasons = [
    { value: "too_expensive", label: "Too expensive" },
    { value: "not_using_enough", label: "Not using it enough" },
    { value: "found_alternative", label: "Found an alternative solution" },
    { value: "missing_features", label: "Missing features I need" },
    { value: "too_complex", label: "Too complex or difficult to use" },
    { value: "not_what_expected", label: "Not what I expected" },
    { value: "temporary_break", label: "Taking a temporary break" },
    { value: "budget_constraints", label: "Budget constraints" },
    { value: "other", label: "Other (please specify)" },
  ];
  
  // Limit additional comments to 500 characters
  const handleCommentsChange = (e) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setAdditionalComments(value);
    }
  };
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/account" } } });
      return;
    }
    // Clear any previous errors when component mounts
    setError("");
    setSuccess("");
    loadSubscription();
  }, [isAuthenticated, navigate]);

  const loadSubscription = async () => {
    try {
      setError(""); // Clear any previous errors
      const response = await fetch("/api/subscription/status", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubscriptionData(data.subscription);
          setPaymentHistory(data.payment_history || []);
        } else {
          setError(data.error || "Failed to load subscription information");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to load subscription (${response.status})`);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
      setError("Unable to connect to server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
    setSelectedReason("");
    setAdditionalComments("");
    setError("");
  };

  const handleCancelConfirm = async () => {
    if (!selectedReason) {
      setError("Please select a reason for cancellation");
      return;
    }

    // If "other" is selected, require additional comments
    if (selectedReason === "other" && !additionalComments.trim()) {
      setError("Please provide details for 'Other' reason");
      return;
    }

    setCancelling(true);
    setError("");
    setSuccess("");

    try {
      // Build cancellation reason text
      const selectedReasonLabel = cancellationReasons.find(r => r.value === selectedReason)?.label || selectedReason;
      let cancellationReasonText = selectedReasonLabel;
      
      if (additionalComments.trim()) {
        cancellationReasonText += `: ${additionalComments.trim()}`;
      }

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          cancellation_reason: cancellationReasonText,
          cancellation_category: selectedReason,
          additional_comments: additionalComments.trim() || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Subscription cancelled. You'll have access until expiration.");
        setShowCancelModal(false);
        setSelectedReason("");
        setAdditionalComments("");
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
        const planNames = {
          free: "Free",
          starter: "Starter",
          pro: "Pro",
          weekly: "Weekly",
          monthly: "Pro", // Legacy
        };
        const displayName = planNames[newPlan] || newPlan;
        setSuccess(`Subscription changed to ${displayName} plan successfully.`);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setChangingPassword(true);

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        setPasswordSuccess("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordError(result.error || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Map subscription types to display names and prices
  const getPlanInfo = (type) => {
    if (!type) return { name: "Free", price: "Free" };
    switch (type) {
      case "free":
        return { name: "Free", price: "$0 forever" };
      case "starter":
        return { name: "Starter", price: "$7/month" };
      case "pro":
        return { name: "Pro", price: "$15/month" };
      case "weekly":
        return { name: "Weekly", price: "$5/week" };
      case "monthly": // Legacy
        return { name: "Pro", price: "$15/month" };
      case "free_trial": // Legacy
        return { name: "Free", price: "Free" };
      default:
        return { name: type || "Free", price: "Free" };
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <LoadingIndicator simple={true} message="Loading account details..." />
      </section>
    );
  }
  
  const planInfo = getPlanInfo(subscriptionData?.type);
  const planName = planInfo.name;
  const planPrice = planInfo.price;
  const canCancel = subscriptionData?.type && subscriptionData?.type !== "free" && subscriptionData?.type !== "free_trial" && subscriptionData?.status === "active";
  const canChange = subscriptionData?.type && subscriptionData?.type !== "free" && subscriptionData?.type !== "free_trial" && subscriptionData?.status === "active";

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Seo
        title="Account Settings | Startup Idea Advisor"
        description="Manage your account settings, subscription, and password."
        path="/account"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">Account Settings</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Manage your account information and subscription</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-4">
          <p className="text-sm text-semantic-error-800 dark:text-semantic-error-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-semantic-success-200 dark:border-semantic-success-800 bg-semantic-success-50 dark:bg-semantic-success-900/30 p-4">
          <p className="text-sm text-semantic-success-800 dark:text-semantic-success-300">{success}</p>
        </div>
      )}

      {/* User Information */}
      <div className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-50">Account Information</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Account Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              {user?.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          {user?.subscription_type && (
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subscription Type</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50 capitalize">
                {getPlanInfo(user.subscription_type).name}
              </p>
            </div>
          )}
          {user?.subscription_expires_at && (
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Subscription Expires</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {new Date(user.subscription_expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-50">Change Password</h2>
        
        {passwordError && (
          <div className="mb-4 rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-4">
            <p className="text-sm text-semantic-error-800 dark:text-semantic-error-300">{passwordError}</p>
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 rounded-xl border border-semantic-success-200 dark:border-semantic-success-800 bg-semantic-success-50 dark:bg-semantic-success-900/30 p-4">
            <p className="text-sm text-semantic-success-800 dark:text-semantic-success-300">{passwordSuccess}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Must be at least 8 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {changingPassword ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Subscription Management */}
      {subscriptionData ? (
        <div className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Subscription</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage your subscription plan</p>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-semibold ${
              subscriptionData.is_active
                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}>
              {subscriptionData.is_active ? "Active" : subscriptionData.status}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Plan</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{planName}</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{planPrice}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50 capitalize">{subscriptionData.status}</p>
              {subscriptionData.is_active && subscriptionData.days_remaining !== null && (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {subscriptionData.days_remaining} {subscriptionData.days_remaining === 1 ? "day" : "days"} remaining
                </p>
              )}
            </div>
            {subscriptionData.expires_at && (
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Expires</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {new Date(subscriptionData.expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {subscriptionData.started_at && (
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Started</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {new Date(subscriptionData.started_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {canChange && (
            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Change Plan</h3>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Switch to a different plan. Your current plan will remain active until the end of the billing period.
              </p>
              <div className="flex flex-wrap gap-4">
                {subscriptionData.type !== "starter" && (
                  <button
                    onClick={() => handleChangePlan("starter")}
                    disabled={changing}
                    className="rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 disabled:opacity-50"
                  >
                    {changing ? "Processing..." : "Switch to Starter ($7/month)"}
                  </button>
                )}
                {subscriptionData.type !== "pro" && subscriptionData.type !== "monthly" && (
                  <button
                    onClick={() => handleChangePlan("pro")}
                    disabled={changing}
                    className="rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 disabled:opacity-50"
                  >
                    {changing ? "Processing..." : "Switch to Pro ($15/month)"}
                  </button>
                )}
                {subscriptionData.type !== "weekly" && (
                  <button
                    onClick={() => handleChangePlan("weekly")}
                    disabled={changing}
                    className="rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 disabled:opacity-50"
                  >
                    {changing ? "Processing..." : "Switch to Weekly ($5/week)"}
                  </button>
                )}
                {/* Legacy monthly plan - allow switching to pro */}
                {subscriptionData.type === "monthly" && (
                  <button
                    onClick={() => handleChangePlan("pro")}
                    disabled={changing}
                    className="rounded-xl border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 disabled:opacity-50"
                  >
                    {changing ? "Processing..." : "Switch to Pro ($15/month)"}
                  </button>
                )}
              </div>
            </div>
          )}

          {canCancel && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Cancel Subscription</h3>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                You'll continue to have access to all features until your subscription expires on{" "}
                {subscriptionData.expires_at ? new Date(subscriptionData.expires_at).toLocaleDateString() : "the expiration date"}.
              </p>
              <button
                onClick={handleCancelClick}
                disabled={cancelling}
                className="rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 px-6 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            </div>
          )}

          {!subscriptionData.is_active && (
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
      ) : (
        <div className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">No active subscription found.</p>
          <Link
            to="/pricing"
            className="mt-4 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            View Pricing Plans
          </Link>
        </div>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-soft">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-50">Payment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-50">${payment.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 capitalize">{payment.subscription_type}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
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

      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-xl">
            <h3 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">Cancel Subscription</h3>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              We're sorry to see you go. Your subscription will remain active until{" "}
              {subscriptionData?.expires_at ? new Date(subscriptionData.expires_at).toLocaleDateString() : "the expiration date"}.
              Please let us know why you're canceling so we can improve.
            </p>
            
            <div className="mb-6">
              <label htmlFor="cancellation-reason" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <select
                id="cancellation-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                required
              >
                <option value="">Select a reason...</option>
                {cancellationReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="additional-comments" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Additional Comments {selectedReason === "other" && <span className="text-red-500">*</span>}
                {selectedReason && selectedReason !== "other" && <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(Optional)</span>}
              </label>
              <textarea
                id="additional-comments"
                value={additionalComments}
                onChange={handleCommentsChange}
                placeholder={selectedReason === "other" ? "Please provide details..." : "Any additional feedback (optional)"}
                rows={4}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                required={selectedReason === "other"}
                maxLength={500}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {additionalComments.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-3">
                <p className="text-sm text-semantic-error-800 dark:text-semantic-error-300">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedReason("");
                  setAdditionalComments("");
                  setError("");
                }}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling || !selectedReason || (selectedReason === "other" && !additionalComments.trim())}
                className="flex-1 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-6 py-3 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

