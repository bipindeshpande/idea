import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { validationQuestions } from "../../config/validationQuestions.js";
import { intakeScreen } from "../../config/intakeScreen.js";

const ADMIN_PASSWORD = "admin2024"; // Change this to your desired password
const ADMIN_STORAGE_KEY = "sia_admin_authenticated";
const ADMIN_MFA_SECRET = "JBSWY3DPEHPK3PXP"; // Base32 encoded secret for TOTP

export default function Admin() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("validation");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Always require fresh authentication - always show login screen first
  useEffect(() => {
    // Always start with login screen - don't auto-authenticate
    // This ensures admin must authenticate every time they visit /admin
    setCheckingAuth(false);
    setAuthenticated(false);
    // Clear any stale authentication to force fresh login
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }, []);

  const verifyAdminSession = async () => {
    try {
      // Check if admin session is still valid by trying to access a protected endpoint
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/stats", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        // Session is valid
        return true;
      } else {
        // Session invalid, clear and show login
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        setAuthenticated(false);
        return false;
      }
    } catch (error) {
      // On error, clear and show login
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      setAuthenticated(false);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!showMfa) {
      // First step: verify password via API
      try {
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();
        if (data.success) {
          setShowMfa(true);
          setPassword("");
        } else {
          setError(data.error || "Incorrect password");
          setPassword("");
        }
      } catch (err) {
        // Fallback to local check for backward compatibility
        if (password === ADMIN_PASSWORD) {
          setShowMfa(true);
          setPassword("");
        } else {
          setError("Incorrect password");
          setPassword("");
        }
      }
    } else {
      // Second step: verify MFA code
      // Development mode: Accept hardcoded code "2538"
      // Production: Will use proper TOTP validation
      if (mfaCode === "2538") {
        localStorage.setItem(ADMIN_STORAGE_KEY, "true");
        setAuthenticated(true);
        setError("");
        setMfaCode("");
        setShowMfa(false);
      } else {
        setError("Invalid MFA code. Please enter the correct code.");
        setMfaCode("");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAuthenticated(false);
    setShowMfa(false);
    setPassword("");
    setMfaCode("");
    setError("");
    // Redirect to admin login (not home page)
    navigate("/admin");
  };

  // Verify authentication on mount and when authenticated state changes
  useEffect(() => {
    if (authenticated) {
      // Periodically verify session is still valid
      const interval = setInterval(() => {
        verifyAdminSession();
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [authenticated]);

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <section className="mx-auto max-w-md px-6 py-12">
        <Seo title="Admin Login | Startup Idea Advisor" description="Admin access" path="/admin" />
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-600 dark:text-slate-400">Checking authentication...</div>
          </div>
        </div>
      </section>
    );
  }

  // Always show login screen first - require authentication
  if (!authenticated) {
    return (
      <section className="mx-auto max-w-md px-6 py-12">
        <Seo title="Admin Login | Startup Idea Advisor" description="Admin access" path="/admin" />
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
          <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Login</h1>
          <form onSubmit={handleLogin}>
            {!showMfa ? (
              <>
                <div className="mb-4">
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-slate-800 dark:text-slate-100 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                    placeholder="Enter admin password"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="mb-4 rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-3 text-sm text-semantic-error-800 dark:text-semantic-error-300">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
                >
                  Continue
                </button>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/forgot-password")}
                    className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="mfaCode" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Two-Factor Authentication Code
                  </label>
                  <input
                    type="text"
                    id="mfaCode"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 text-slate-800 dark:text-slate-100 text-center text-2xl tracking-widest shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                    placeholder="Enter MFA code"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                    Development mode: Enter MFA code
                  </p>
                </div>
                {error && (
                  <div className="mb-4 rounded-xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-3 text-sm text-semantic-error-800 dark:text-semantic-error-300">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMfa(false);
                      setMfaCode("");
                      setError("");
                    }}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-600"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
                  >
                    Verify & Login
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <Seo title="Admin Panel | Startup Idea Advisor" description="Content management" path="/admin" />
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-600"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "reports"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "stats"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "users"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "payments"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "validation"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Validation Questions
        </button>
        <button
          onClick={() => setActiveTab("intake")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "intake"
              ? "border-b-2 border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Intake Form Fields
        </button>
      </div>

      {/* Content Management */}
      {activeTab === "dashboard" && <AdminDashboard />}
      {activeTab === "reports" && <AdminReports />}
      {activeTab === "stats" && <AdminStats />}
      {activeTab === "users" && <UsersManagement />}
      {activeTab === "payments" && <PaymentsManagement />}
      {activeTab === "validation" && <ValidationQuestionsEditor />}
      {activeTab === "intake" && <IntakeFieldsEditor />}
    </section>
  );
}

function ValidationQuestionsEditor() {
  const [questions, setQuestions] = useState(validationQuestions.category_questions);
  const [ideaQuestions, setIdeaQuestions] = useState(validationQuestions.idea_explanation_questions || []);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/save-validation-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          questions: {
            category_questions: questions,
            idea_explanation_questions: ideaQuestions,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to save (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText.includes("<!doctype") 
            ? "Backend route not found. Please check server configuration."
            : errorText || errorMessage;
        }
        alert(errorMessage);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Also save to localStorage as backup
        localStorage.setItem("sia_validation_questions", JSON.stringify({ category_questions: questions, idea_explanation_questions: ideaQuestions }));
      } else {
        alert(`Failed to save: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage = error.message || "Network error";
      alert(`Backend save failed: ${errorMessage}. Data saved to localStorage as backup.`);
      // Fallback to localStorage
      localStorage.setItem("sia_validation_questions", JSON.stringify({ category_questions: questions, idea_explanation_questions: ideaQuestions }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `question_${Date.now()}`,
        question: "New Question",
        options: ["Option 1", "Option 2"],
      },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    if (confirm("Are you sure you want to delete this question?")) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const addOption = (questionIndex) => {
    const updated = [...questions];
    updated[questionIndex].options = [...updated[questionIndex].options, "New Option"];
    setQuestions(updated);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const deleteOption = (questionIndex, optionIndex) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Validation Questions</h2>
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {/* Category Questions */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-800">Category Questions</h3>
          <button
            onClick={addQuestion}
            className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            + Add Question
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, qIndex) => (
            <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Question ID</label>
                  <input
                    type="text"
                    value={question.id}
                    onChange={(e) => updateQuestion(qIndex, "id", e.target.value)}
                    className="mb-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Question Text</label>
                  <input
                    type="text"
                    value={question.question}
                    onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => deleteQuestion(qIndex)}
                  className="rounded-lg border border-coral-300 bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700 transition hover:bg-coral-100"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Options</label>
                  <button
                    onClick={() => addOption(qIndex)}
                    className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm"
                      />
                      <button
                        onClick={() => deleteOption(qIndex, oIndex)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Idea Explanation Questions */}
      <div>
        <h3 className="mb-4 text-xl font-semibold text-slate-800">Idea Explanation Questions</h3>
        <div className="space-y-6">
          {ideaQuestions.map((q, index) => (
            <div key={q.id || index} className="rounded-lg border border-slate-200 bg-white p-4">
              <input
                type="text"
                value={q.question}
                onChange={(e) => {
                  const updated = [...ideaQuestions];
                  updated[index] = { ...updated[index], question: e.target.value };
                  setIdeaQuestions(updated);
                }}
                placeholder="Question text"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-semibold"
              />
              <div className="space-y-2">
                {q.options.map((opt, optIndex) => (
                  <input
                    key={optIndex}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...ideaQuestions];
                      updated[index].options[optIndex] = e.target.value;
                      setIdeaQuestions(updated);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                    placeholder={`Option ${optIndex + 1}`}
                  />
                ))}
                <button
                  onClick={() => {
                    const updated = [...ideaQuestions];
                    updated[index].options.push("New Option");
                    setIdeaQuestions(updated);
                  }}
                  className="mt-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                >
                  + Add Option
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setIdeaQuestions([...ideaQuestions, { id: `idea_${Date.now()}`, question: "New Question", options: ["Option 1", "Option 2"] }])}
            className="mt-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            + Add Question
          </button>
        </div>
      </div>
    </div>
  );
}

function IntakeFieldsEditor() {
  const [screenTitle, setScreenTitle] = useState(intakeScreen.screen_title);
  const [screenDescription, setScreenDescription] = useState(intakeScreen.description);
  const [fields, setFields] = useState(intakeScreen.fields);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/save-intake-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          screen_id: intakeScreen.screen_id,
          screen_title: screenTitle,
          description: screenDescription,
          fields: fields,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to save (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText.includes("<!doctype") 
            ? "Backend route not found. Please check server configuration."
            : errorText || errorMessage;
        }
        alert(errorMessage);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Also save to localStorage as backup
        localStorage.setItem("sia_intake_fields", JSON.stringify(fields));
      } else {
        alert(`Failed to save: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage = error.message || "Network error";
      alert(`Backend save failed: ${errorMessage}. Data saved to localStorage as backup.`);
      // Fallback to localStorage
      localStorage.setItem("sia_intake_fields", JSON.stringify(fields));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: "New Field",
        type: "picklist",
        options: ["Option 1"],
        required: false,
      },
    ]);
  };

  const updateField = (index, field, value) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [field]: value };
    setFields(updated);
  };

  const deleteField = (index) => {
    if (confirm("Are you sure you want to delete this field?")) {
      setFields(fields.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Intake Form Fields</h2>
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Screen Title</label>
          <input
            type="text"
            value={screenTitle}
            onChange={(e) => setScreenTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Screen Description</label>
          <textarea
            value={screenDescription}
            onChange={(e) => setScreenDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-800">Form Fields</h3>
        <button
          onClick={addField}
          className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          + Add Field
        </button>
      </div>

      <div className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Field ID</label>
                <input
                  type="text"
                  value={field.id}
                  onChange={(e) => updateField(index, "id", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Label</label>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, "label", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Type</label>
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, "type", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                >
                  <option value="picklist">Picklist</option>
                  <option value="short_text">Short Text</option>
                  <option value="long_text">Long Text</option>
                </select>
              </div>
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) => updateField(index, "required", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">Required</span>
                </label>
              </div>
            </div>

            {field.type === "picklist" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Options</label>
                <div className="space-y-2">
                  {(field.options || []).map((option, oIndex) => (
                    <div key={oIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updated = [...fields];
                          updated[index].options[oIndex] = e.target.value;
                          setFields(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm"
                      />
                      <button
                        onClick={() => {
                          const updated = [...fields];
                          updated[index].options = updated[index].options.filter((_, i) => i !== oIndex);
                          setFields(updated);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const updated = [...fields];
                      if (!updated[index].options) updated[index].options = [];
                      updated[index].options.push("New Option");
                      setFields(updated);
                    }}
                    className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => deleteField(index)}
                className="rounded-lg border border-coral-300 bg-coral-50 px-4 py-2 text-sm font-semibold text-coral-700 transition hover:bg-coral-100"
              >
                Delete Field
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      // Only load if authenticated
      if (localStorage.getItem(ADMIN_STORAGE_KEY) !== "true") {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const authToken = ADMIN_PASSWORD;
        const response = await fetch("/api/admin/stats", {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.stats) {
            setStats(data.stats);
            setError(null);
          } else {
            setError(data.error || "Invalid response format");
            console.error("Invalid response format:", data);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || `Failed to load statistics (${response.status})`);
          console.error("Failed to load stats:", response.status, errorData);
        }
      } catch (error) {
        setError(`Network error: ${error.message}`);
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-8 shadow-soft">
        <p className="text-semantic-error-800 dark:text-semantic-error-300 font-semibold">Error loading statistics</p>
        <p className="mt-2 text-sm text-semantic-error-700 dark:text-semantic-error-300">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
      <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Statistics</h2>
      
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Total Users</h3>
          <p className="text-3xl font-bold text-brand-900">{stats.total_users || 0}</p>
          <p className="mt-2 text-xs text-brand-600">Registered users</p>
        </div>

        <div className="rounded-2xl border border-coral-200 bg-coral-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-coral-700">Total Runs</h3>
          <p className="text-3xl font-bold text-coral-900">{stats.total_runs || 0}</p>
          <p className="mt-2 text-xs text-coral-600">Idea discovery sessions</p>
        </div>

        <div className="rounded-2xl border border-aqua-200 bg-aqua-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-aqua-700">Total Validations</h3>
          <p className="text-3xl font-bold text-aqua-900">{stats.total_validations || 0}</p>
          <p className="mt-2 text-xs text-aqua-600">Idea validations completed</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Total Revenue</h3>
          <p className="text-3xl font-bold text-emerald-900">${(stats.total_revenue || 0).toFixed(2)}</p>
          <p className="mt-2 text-xs text-emerald-600">From completed payments</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Active Subscriptions</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.active_subscriptions || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Free Trial Users</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.free_trial_users || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Weekly Subscribers</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.weekly_subscribers || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly Subscribers</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.monthly_subscribers || 0}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Completed Payments</h3>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total_payments || 0}</p>
        </div>
      </div>
    </div>
  );
}

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetail = async (userId) => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch(`/api/admin/user/${userId}`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserDetail(data);
        setSelectedUser(userId);
      }
    } catch (error) {
      console.error("Failed to load user detail:", error);
    }
  };

  const getStatusBadge = (user) => {
    if (user.is_subscription_active) {
      return (
        <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Active
        </span>
      );
    } else if (user.subscription_type === "free_trial") {
      return (
        <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Free Trial
        </span>
      );
    } else {
      return (
        <span className="inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Expired
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Users ({users.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Subscription</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Days Remaining</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.subscription_type || "N/A"}</td>
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.days_remaining || 0}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {user.subscription_started_at ? new Date(user.subscription_started_at).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => loadUserDetail(user.id)}
                      className="rounded-lg border border-brand-300 dark:border-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 transition hover:bg-brand-100 dark:hover:bg-brand-900/50"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {userDetail && (
        <UserDetailModal
          userDetail={userDetail}
          onClose={() => {
            setUserDetail(null);
            setSelectedUser(null);
          }}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}

function UserDetailModal({ userDetail, onClose, onUpdate }) {
  const [subscriptionType, setSubscriptionType] = useState(userDetail.user.subscription_type || "free_trial");
  const [durationDays, setDurationDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const handleUpdateSubscription = async () => {
    setSaving(true);
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch(`/api/admin/user/${userDetail.user.id}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          subscription_type: subscriptionType,
          duration_days: durationDays,
        }),
      });

      if (response.ok) {
        alert("Subscription updated successfully");
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to update: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Email</h3>
            <p className="text-slate-600 dark:text-slate-400">{userDetail.user.email}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Current Subscription</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {userDetail.user.subscription_type || "N/A"} - {userDetail.user.days_remaining || 0} days remaining
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Update Subscription</h3>
            <div className="space-y-3">
              <select
                value={subscriptionType}
                onChange={(e) => setSubscriptionType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="free_trial">Free Trial</option>
                <option value="weekly">Weekly ($5)</option>
                <option value="starter">Starter ($7/month)</option>
                <option value="pro">Pro ($15/month)</option>
              </select>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                placeholder="Duration in days"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-sm text-slate-900 dark:text-slate-100"
              />
              <button
                onClick={handleUpdateSubscription}
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
              >
                {saving ? "Updating..." : "Update Subscription"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Runs ({userDetail.runs?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.runs?.map((run) => (
                <div key={run.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-700 dark:text-slate-300">
                  {run.run_id} - {run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Validations ({userDetail.validations?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.validations?.map((validation) => (
                <div key={validation.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-700 dark:text-slate-300">
                  {validation.validation_id} - {validation.created_at ? new Date(validation.created_at).toLocaleString() : "N/A"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Payments ({userDetail.payments?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.payments?.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-700 dark:text-slate-300">
                  ${payment.amount} {payment.currency} - {payment.subscription_type} - {payment.status} -{" "}
                  {payment.created_at ? new Date(payment.created_at).toLocaleString() : "N/A"}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsManagement() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/payments", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Failed to load payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      completed: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
      pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
      failed: "bg-coral-100 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300",
    };
    return (
      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${colors[status] || "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Payments ({payments.length})</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Stripe ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{payment.user_email}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                  ${payment.amount} {payment.currency}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{payment.subscription_type}</td>
                <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">{payment.stripe_payment_intent_id}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {payment.created_at ? new Date(payment.created_at).toLocaleString() : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    // Only load if authenticated
    if (localStorage.getItem(ADMIN_STORAGE_KEY) !== "true") {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const authToken = ADMIN_PASSWORD;
      const response = await fetch(`/api/admin/stats?time_range=${timeRange}`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
          setError(null);
        } else {
          setError(data.error || "Invalid response format");
          console.error("Invalid response format:", data);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to load dashboard data (${response.status})`);
        console.error("Failed to load dashboard data:", response.status, errorData);
      }
    } catch (error) {
      setError(`Network error: ${error.message}`);
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-semantic-error-200 dark:border-semantic-error-800 bg-semantic-error-50 dark:bg-semantic-error-900/30 p-8 shadow-soft">
        <p className="text-semantic-error-800 dark:text-semantic-error-300 font-semibold">Error loading dashboard</p>
        <p className="mt-2 text-sm text-semantic-error-700 dark:text-semantic-error-300">{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 rounded-xl bg-semantic-error-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-semantic-error-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <p className="text-slate-600 dark:text-slate-400">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Dashboard Overview</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Total Users</h3>
            <p className="text-4xl font-bold text-brand-900">{stats.total_users || 0}</p>
            <p className="mt-2 text-xs text-brand-600">Registered accounts</p>
          </div>

          <div className="rounded-2xl border border-coral-200 bg-gradient-to-br from-coral-50 to-coral-100 p-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-coral-700">Total Revenue</h3>
            <p className="text-4xl font-bold text-coral-900">${(stats.total_revenue || 0).toFixed(2)}</p>
            <p className="mt-2 text-xs text-coral-600">From completed payments</p>
          </div>

          <div className="rounded-2xl border border-aqua-200 bg-gradient-to-br from-aqua-50 to-aqua-100 p-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-aqua-700">Active Subscriptions</h3>
            <p className="text-4xl font-bold text-aqua-900">{stats.active_subscriptions || 0}</p>
            <p className="mt-2 text-xs text-aqua-600">Currently active</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-700">Total Runs</h3>
            <p className="text-4xl font-bold text-emerald-900">{stats.total_runs || 0}</p>
            <p className="mt-2 text-xs text-emerald-600">Discovery sessions</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Free Users</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.free_trial_users || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Weekly Subscribers</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.weekly_subscribers || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Starter Subscribers</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.starter_subscribers || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Pro Subscribers</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.pro_subscribers || 0}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Validations</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.total_validations || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Completed Payments</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{stats.total_payments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {stats.total_users > 0 ? ((stats.active_subscriptions / stats.total_users) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Revenue Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Average Revenue per User</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ${stats.total_users > 0 ? (stats.total_revenue / stats.total_users).toFixed(2) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Recurring Revenue</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ${((stats.pro_subscribers || 0) * 15 + (stats.starter_subscribers || 0) * 7).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Weekly Recurring Revenue</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ${((stats.weekly_subscribers || 0) * 5).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
          <SystemSettingsPanel />
        </div>
      </div>
    </div>
  );
}

function SystemSettingsPanel() {
  const [debugMode, setDebugMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/settings", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setDebugMode(data.settings.debug_mode || false);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to load settings:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDebug = async () => {
    setSaving(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          debug_mode: !debugMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDebugMode(!debugMode);
          setMessage(`Debug mode ${!debugMode ? "enabled" : "disabled"}. Server restart required for changes to take effect.`);
          setTimeout(() => setMessage(""), 5000);
        }
      } else {
        setMessage("Failed to update settings");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to update settings:", error);
      }
      setMessage("Failed to update settings");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">System Settings</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">System Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Debug Mode</h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Enable Flask debug mode. Shows detailed error tracebacks. <strong>Warning:</strong> Disable in production for security.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={handleToggleDebug}
              disabled={saving}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800"></div>
          </label>
        </div>
        {message && (
          <div className={`rounded-lg border p-3 text-sm ${
            message.includes("enabled") || message.includes("disabled")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
              : "border-coral-200 bg-coral-50 text-coral-800 dark:border-coral-800 dark:bg-coral-900/30 dark:text-coral-200"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminReports() {
  const exportReport = async (reportType) => {
    try {
      const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
      const response = await fetch(`/api/admin/reports/export?type=${reportType}`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export report");
      }
    } catch (error) {
      console.error("Failed to export report:", error);
      alert("Failed to export report");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Reports</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-brand-900 dark:text-brand-300">User Report</h3>
            <p className="mb-4 text-sm text-brand-700 dark:text-brand-400 flex-grow">Export all user data with subscription details</p>
            <button
              onClick={() => exportReport("users")}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 mt-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-coral-200 dark:border-coral-700 bg-coral-50 dark:bg-coral-900/30 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-coral-900 dark:text-coral-300">Payment Report</h3>
            <p className="mb-4 text-sm text-coral-700 dark:text-coral-400 flex-grow">Export all payment transactions</p>
            <button
              onClick={() => exportReport("payments")}
              className="w-full rounded-lg bg-coral-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-700 mt-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-aqua-200 dark:border-aqua-700 bg-aqua-50 dark:bg-aqua-900/30 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-aqua-900 dark:text-aqua-300">Activity Report</h3>
            <p className="mb-4 text-sm text-aqua-700 dark:text-aqua-400 flex-grow">Export runs and validations</p>
            <button
              onClick={() => exportReport("activity")}
              className="w-full rounded-lg bg-aqua-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-aqua-700 mt-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-emerald-900 dark:text-emerald-300">Subscription Report</h3>
            <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400 flex-grow">Export subscription analytics</p>
            <button
              onClick={() => exportReport("subscriptions")}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 mt-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-amber-900 dark:text-amber-300">Revenue Report</h3>
            <p className="mb-4 text-sm text-amber-700 dark:text-amber-400 flex-grow">Export revenue breakdown by period</p>
            <button
              onClick={() => exportReport("revenue")}
              className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 mt-auto"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col">
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-300">Full Report</h3>
            <p className="mb-4 text-sm text-slate-700 dark:text-slate-400 flex-grow">Export comprehensive data dump</p>
            <button
              onClick={() => exportReport("full")}
              className="w-full rounded-lg bg-slate-600 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-slate-600 mt-auto"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

