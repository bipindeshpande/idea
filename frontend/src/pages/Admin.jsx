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
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("validation")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "validation"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Validation Questions
        </button>
        <button
          onClick={() => setActiveTab("intake")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "intake"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Intake Form Fields
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "stats"
              ? "border-b-2 border-brand-500 text-brand-700"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Content Management */}
      {activeTab === "validation" && <ValidationQuestionsEditor />}
      {activeTab === "intake" && <IntakeFieldsEditor />}
      {activeTab === "stats" && <AdminStats />}
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
        const response = await fetch("/api/admin/stats", {
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

  // Get stats from localStorage as fallback
  const savedRuns = JSON.parse(localStorage.getItem("sia_saved_runs") || "[]");
  const savedValidations = JSON.parse(localStorage.getItem("sia_validations") || "[]");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
      <h2 className="mb-6 text-2xl font-semibold text-slate-900">Statistics</h2>
      
      {loading && <p className="text-slate-600">Loading statistics...</p>}
      
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">Total Runs</h3>
          <p className="text-3xl font-bold text-brand-900">{savedRuns.length}</p>
          <p className="mt-2 text-xs text-brand-600">Idea discovery sessions</p>
        </div>

        <div className="rounded-2xl border border-coral-200 bg-coral-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-coral-700">Total Validations</h3>
          <p className="text-3xl font-bold text-coral-900">{savedValidations.length}</p>
          <p className="mt-2 text-xs text-coral-600">Idea validations completed</p>
        </div>

        <div className="rounded-2xl border border-aqua-200 bg-aqua-50 p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-aqua-700">Total Users</h3>
          <p className="text-3xl font-bold text-aqua-900">{new Set([...savedRuns.map(r => r.id), ...savedValidations.map(v => v.id)]).size}</p>
          <p className="mt-2 text-xs text-aqua-600">Unique sessions</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold text-slate-800">Recent Activity</h3>
        <div className="space-y-2">
          {savedRuns.slice(0, 5).map((run) => (
            <div key={run.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Idea Discovery Run</span>
                <span className="text-slate-500">{new Date(run.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {savedValidations.slice(0, 5).map((validation) => (
            <div key={validation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Idea Validation</span>
                <span className="text-slate-500">{new Date(validation.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {savedRuns.length === 0 && savedValidations.length === 0 && (
            <p className="text-slate-500">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

