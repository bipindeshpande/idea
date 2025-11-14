import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { validationQuestions } from "../config/validationQuestions.js";
import { intakeScreen } from "../config/intakeScreen.js";

const ADMIN_PASSWORD = "admin2024"; // Change this to your desired password
const ADMIN_STORAGE_KEY = "sia_admin_authenticated";

export default function Admin() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("validation");

  // Check if already authenticated
  useEffect(() => {
    const isAuth = localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
    if (isAuth) {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_STORAGE_KEY, "true");
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAuthenticated(false);
    navigate("/");
  };

  if (!authenticated) {
    return (
      <section className="mx-auto max-w-md px-6 py-12">
        <Seo title="Admin Login | Startup Idea Advisor" description="Admin access" path="/admin" />
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {error && (
              <div className="mb-4 rounded-xl border border-coral-200 bg-coral-50 p-3 text-sm text-coral-800">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700"
            >
              Login
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <Seo title="Admin Panel | Startup Idea Advisor" description="Content management" path="/admin" />
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "stats"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "users"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "payments"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "validation"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Validation Questions
        </button>
        <button
          onClick={() => setActiveTab("intake")}
          className={`px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
            activeTab === "intake"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Intake Form Fields
        </button>
      </div>

      {/* Content Management */}
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
  const [prompts, setPrompts] = useState(validationQuestions.idea_explanation_prompts);
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
            idea_explanation_prompts: prompts,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Also save to localStorage as backup
        localStorage.setItem("sia_validation_questions", JSON.stringify({ category_questions: questions, idea_explanation_prompts: prompts }));
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      // Fallback to localStorage
      localStorage.setItem("sia_validation_questions", JSON.stringify({ category_questions: questions, idea_explanation_prompts: prompts }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert("Saved to localStorage. Backend save failed - check console for details.");
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
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Validation Questions</h2>
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

      {/* Idea Explanation Prompts */}
      <div>
        <h3 className="mb-4 text-xl font-semibold text-slate-800">Idea Explanation Prompts</h3>
        <div className="space-y-2">
          {prompts.map((prompt, index) => (
            <input
              key={index}
              type="text"
              value={prompt}
              onChange={(e) => {
                const updated = [...prompts];
                updated[index] = e.target.value;
                setPrompts(updated);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
            />
          ))}
          <button
            onClick={() => setPrompts([...prompts, "New Prompt"])}
            className="mt-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            + Add Prompt
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

      const data = await response.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Also save to localStorage as backup
        localStorage.setItem("sia_intake_fields", JSON.stringify(fields));
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      // Fallback to localStorage
      localStorage.setItem("sia_intake_fields", JSON.stringify(fields));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert("Saved to localStorage. Backend save failed - check console for details.");
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
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Intake Form Fields</h2>
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

  useEffect(() => {
    const loadStats = async () => {
      try {
        const authToken = localStorage.getItem(ADMIN_STORAGE_KEY) === "true" ? ADMIN_PASSWORD : "";
        const response = await fetch("/admin/stats", {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <p className="text-slate-600">Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <p className="text-slate-600">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
      <h2 className="mb-6 text-2xl font-semibold text-slate-900">Statistics</h2>
      
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Active Subscriptions</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.active_subscriptions || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Free Trial Users</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.free_trial_users || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Weekly Subscribers</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.weekly_subscribers || 0}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Monthly Subscribers</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.monthly_subscribers || 0}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Completed Payments</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.total_payments || 0}</p>
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
        <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
          Active
        </span>
      );
    } else if (user.subscription_type === "free_trial") {
      return (
        <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
          Free Trial
        </span>
      );
    } else {
      return (
        <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          Expired
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <p className="text-slate-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Users ({users.length})</h2>
          <button
            onClick={loadUsers}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Subscription</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Days Remaining</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.subscription_type || "N/A"}</td>
                  <td className="px-4 py-3">{getStatusBadge(user)}</td>
                  <td className="px-4 py-3 text-slate-600">{user.days_remaining || 0}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.subscription_started_at ? new Date(user.subscription_started_at).toLocaleDateString() : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => loadUserDetail(user.id)}
                      className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
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
      <div className="mx-4 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">User Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold text-slate-700">Email</h3>
            <p className="text-slate-600">{userDetail.user.email}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">Current Subscription</h3>
            <p className="text-slate-600">
              {userDetail.user.subscription_type || "N/A"} - {userDetail.user.days_remaining || 0} days remaining
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">Update Subscription</h3>
            <div className="space-y-3">
              <select
                value={subscriptionType}
                onChange={(e) => setSubscriptionType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
              >
                <option value="free_trial">Free Trial</option>
                <option value="weekly">Weekly ($5)</option>
                <option value="monthly">Monthly ($15)</option>
              </select>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                placeholder="Duration in days"
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
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
            <h3 className="mb-2 font-semibold text-slate-700">Runs ({userDetail.runs?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.runs?.map((run) => (
                <div key={run.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {run.run_id} - {run.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">Validations ({userDetail.validations?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.validations?.map((validation) => (
                <div key={validation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  {validation.validation_id} - {validation.created_at ? new Date(validation.created_at).toLocaleString() : "N/A"}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-700">Payments ({userDetail.payments?.length || 0})</h3>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {userDetail.payments?.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
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
      completed: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      failed: "bg-coral-100 text-coral-700",
    };
    return (
      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${colors[status] || "bg-slate-100 text-slate-700"}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
        <p className="text-slate-600">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Payments ({payments.length})</h2>
        <button
          onClick={loadPayments}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Stripe ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{payment.user_email}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  ${payment.amount} {payment.currency}
                </td>
                <td className="px-4 py-3 text-slate-600">{payment.subscription_type}</td>
                <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{payment.stripe_payment_intent_id}</td>
                <td className="px-4 py-3 text-slate-500">
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

