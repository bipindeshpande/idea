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
    loadSubscription();
  }, [isAuthenticated, navigate]);

  const loadSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/status", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data.subscription);
        setPaymentHistory(data.payment_history || []);
      }
    } catch (error) {
      console.error("Failed to load subscription:", error);
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

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-12">
        <LoadingIndicator simple={true} message="Loading account details..." />
      </section>
    );
  }

  const planName = subscriptionData?.type === "weekly" ? "Weekly Plan" : subscriptionData?.type === "monthly" ? "Monthly Plan" : "Free Trial";
  const planPrice = subscriptionData?.type === "weekly" ? "$5/week" : subscriptionData?.type === "monthly" ? "$15/month" : "Free";
  const canCancel = subscriptionData?.type !== "free_trial" && subscriptionData?.status === "active";
  const canChange = subscriptionData?.type !== "free_trial" && subscriptionData?.status === "active";

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Seo
        title="Account Settings | Startup Idea Advisor"
        description="Manage your account settings, subscription, and password."
        path="/account"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Account Settings</h1>
        <p className="mt-2 text-slate-600">Manage your account information and subscription</p>
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

      {/* User Information */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">Account Information</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Email</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Account Status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {user?.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          {user?.subscription_type && (
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Subscription Type</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 capitalize">
                {user.subscription_type.replace("_", " ")}
              </p>
            </div>
          )}
          {user?.subscription_expires_at && (
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Subscription Expires</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {new Date(user.subscription_expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h2 className="mb-6 text-2xl font-semibold text-slate-900">Change Password</h2>
        
        {passwordError && (
          <div className="mb-4 rounded-xl border border-coral-200 bg-coral-50 p-4">
            <p className="text-sm text-coral-800">{passwordError}</p>
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">{passwordSuccess}</p>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Subscription</h2>
              <p className="mt-1 text-sm text-slate-600">Manage your subscription plan</p>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-semibold ${
              subscriptionData.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}>
              {subscriptionData.is_active ? "Active" : subscriptionData.status}
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
              <p className="mt-2 text-lg font-semibold text-slate-900 capitalize">{subscriptionData.status}</p>
              {subscriptionData.is_active && subscriptionData.days_remaining !== null && (
                <p className="mt-1 text-slate-600">
                  {subscriptionData.days_remaining} {subscriptionData.days_remaining === 1 ? "day" : "days"} remaining
                </p>
              )}
            </div>
            {subscriptionData.expires_at && (
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Expires</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {new Date(subscriptionData.expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {subscriptionData.started_at && (
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Started</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {new Date(subscriptionData.started_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {canChange && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Change Plan</h3>
              <div className="flex gap-4">
                {subscriptionData.type !== "weekly" && (
                  <button
                    onClick={() => handleChangePlan("weekly")}
                    disabled={changing}
                    className="rounded-xl border border-brand-300 bg-white px-6 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {changing ? "Processing..." : "Switch to Weekly ($5/week)"}
                  </button>
                )}
                {subscriptionData.type !== "monthly" && (
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
                {subscriptionData.expires_at ? new Date(subscriptionData.expires_at).toLocaleDateString() : "the expiration date"}.
              </p>
              <button
                onClick={handleCancelClick}
                disabled={cancelling}
                className="rounded-xl border border-red-300 bg-white px-6 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
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
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">No active subscription found.</p>
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

      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <h3 className="mb-4 text-2xl font-semibold text-slate-900">Cancel Subscription</h3>
            <p className="mb-6 text-sm text-slate-600">
              We're sorry to see you go. Your subscription will remain active until{" "}
              {subscriptionData?.expires_at ? new Date(subscriptionData.expires_at).toLocaleDateString() : "the expiration date"}.
              Please let us know why you're canceling so we can improve.
            </p>
            
            <div className="mb-6">
              <label htmlFor="cancellation-reason" className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <select
                id="cancellation-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
              <label htmlFor="additional-comments" className="block text-sm font-semibold text-slate-700 mb-2">
                Additional Comments {selectedReason === "other" && <span className="text-red-500">*</span>}
                {selectedReason && selectedReason !== "other" && <span className="text-slate-400 text-xs font-normal">(Optional)</span>}
              </label>
              <textarea
                id="additional-comments"
                value={additionalComments}
                onChange={handleCommentsChange}
                placeholder={selectedReason === "other" ? "Please provide details..." : "Any additional feedback (optional)"}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                required={selectedReason === "other"}
                maxLength={500}
              />
              <p className="mt-2 text-xs text-slate-500">
                {additionalComments.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-coral-200 bg-coral-50 p-3">
                <p className="text-sm text-coral-800">{error}</p>
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
                className="flex-1 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling || !selectedReason || (selectedReason === "other" && !additionalComments.trim())}
                className="flex-1 rounded-xl border border-red-300 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
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

