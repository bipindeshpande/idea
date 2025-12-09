import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Seo from "../../components/common/Seo.jsx";
import Toast from "../../components/common/Toast.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Dropdown options - Updated to match new requirements
const MOTIVATION_OPTIONS = [
  "Financial Freedom",
  "Creative Expression",
  "Personal Identity / Meaning",
  "Helping People / Impact",
  "Proving Myself",
  "Building a Long-Term Asset",
  "Other"
];

const FEAR_OPTIONS = [
  "Fear of Failure",
  "Fear of Wasting Time",
  "Fear of Financial Loss",
  "Fear of Choosing Wrong",
  "Fear of Judgment / Criticism",
  "Imposter Syndrome",
  "Analysis Paralysis",
  "Other"
];

const DECISION_STYLE_OPTIONS = [
  "Fast / Intuitive",
  "Slow / Analytical",
  "Mixed"
];

const ENERGY_PATTERN_OPTIONS = [
  "Short Bursts",
  "Steady Daily Energy",
  "Long Deep-Focus Sessions",
  "Variable"
];

const CONSISTENCY_PATTERN_OPTIONS = [
  "Strong Start, Weak Finish",
  "Slow Start, Strong Finish",
  "Consistent but Slow",
  "Need External Accountability",
  "Highly Variable"
];

const RISK_APPROACH_OPTIONS = [
  "Conservative",
  "Balanced",
  "High-Risk / Experimentation",
  "Risky Early, Cautious Later"
];

const SUCCESS_DEFINITION_OPTIONS = [
  "Financial Stability / Wealth",
  "Work-Life Balance / Stability",
  "Impact / Helping Others",
  "Creative Fulfillment",
  "Personal Growth",
  "Recognition / Achievement",
  "Building Something Lasting",
  "Other"
];

const ARCHETYPE_OPTIONS = [
  "Visionary",
  "Builder",
  "Operator",
  "Integrator",
  "Rebel",
  "Caregiver"
];

const fieldClasses =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 p-3 text-slate-800 dark:text-slate-200 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900";

const textInputClasses =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 p-3 text-slate-800 dark:text-slate-200 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900";

export default function FounderPsychology() {
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Form state - Updated to match new schema
  const [formData, setFormData] = useState({
    motivation: "",
    motivation_other: "",
    fear: "",
    fear_other: "",
    decision_style: "",
    energy_pattern: "",
    consistency_pattern: "",
    risk_approach: "",
    success_definition: "",
    success_other: "",
    archetype: ""
  });

  // Load existing psychology data
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadPsychology = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/founder/psychology`, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Map old field names to new ones for backward compatibility
            const loadedData = data.data;
            setFormData(prev => ({
              ...prev,
              motivation: loadedData.motivation || "",
              motivation_other: loadedData.motivation_other || "",
              fear: loadedData.fear || loadedData.biggest_fear || "", // Support old field name
              fear_other: loadedData.fear_other || loadedData.biggest_fear_other || "",
              decision_style: loadedData.decision_style || "",
              energy_pattern: loadedData.energy_pattern || "",
              consistency_pattern: loadedData.consistency_pattern || "",
              risk_approach: loadedData.risk_approach || "",
              success_definition: loadedData.success_definition || "",
              success_other: loadedData.success_other || loadedData.success_definition_other || "",
              archetype: loadedData.archetype || ""
            }));
          }
        }
      } catch (error) {
        console.error("Error loading psychology:", error);
        setToast({
          show: true,
          message: "Failed to load psychology data",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    };

    loadPsychology();
  }, [isAuthenticated, navigate, getAuthHeaders]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear "other" field when not "Other"
      if (field === "motivation" && value !== "Other") {
        newData.motivation_other = "";
      } else if (field === "fear" && value !== "Other") {
        newData.fear_other = "";
      } else if (field === "success_definition" && value !== "Other") {
        newData.success_other = "";
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.archetype) {
      setToast({
        show: true,
        message: "Founder Archetype is required",
        type: "error"
      });
      return;
    }

    try {
      setSaving(true);
      
      // Build payload (only include non-empty fields)
      const payload = {};
      if (formData.motivation) payload.motivation = formData.motivation;
      if (formData.motivation === "Other" && formData.motivation_other) {
        payload.motivation_other = formData.motivation_other.trim();
      }
      if (formData.fear) payload.fear = formData.fear;
      if (formData.fear === "Other" && formData.fear_other) {
        payload.fear_other = formData.fear_other.trim();
      }
      if (formData.decision_style) payload.decision_style = formData.decision_style;
      if (formData.energy_pattern) payload.energy_pattern = formData.energy_pattern;
      if (formData.consistency_pattern) payload.consistency_pattern = formData.consistency_pattern;
      if (formData.risk_approach) payload.risk_approach = formData.risk_approach;
      if (formData.success_definition) payload.success_definition = formData.success_definition;
      if (formData.success_definition === "Other" && formData.success_other) {
        payload.success_other = formData.success_other.trim();
      }
      if (formData.archetype) payload.archetype = formData.archetype;

      const response = await fetch(`${API_BASE}/api/founder/psychology`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToast({
          show: true,
          message: "Founder psychology saved successfully!",
          type: "success"
        });
        // Optionally navigate back after a delay
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      } else {
        setToast({
          show: true,
          message: data.error || "Failed to save psychology data",
          type: "error"
        });
      }
    } catch (error) {
      console.error("Error saving psychology:", error);
      setToast({
        show: true,
        message: "An error occurred while saving",
        type: "error"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Founder Psychology Assessment"
        description="Complete your founder psychology profile for personalized startup recommendations"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Founder Psychology Assessment
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Help us understand your founder profile for more personalized startup recommendations.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Motivation */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  1. What is your primary motivation for starting a business?
                </label>
                <select
                  value={formData.motivation}
                  onChange={(e) => handleChange("motivation", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {MOTIVATION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {formData.motivation === "Other" && (
                  <input
                    type="text"
                    value={formData.motivation_other}
                    onChange={(e) => handleChange("motivation_other", e.target.value)}
                    placeholder="Please specify your motivation"
                    maxLength={200}
                    className={`${textInputClasses} mt-3`}
                  />
                )}
              </div>

              {/* 2. Biggest Fear / Psychological Barrier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  2. What is your biggest fear or psychological barrier?
                </label>
                <select
                  value={formData.fear}
                  onChange={(e) => handleChange("fear", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {FEAR_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {formData.fear === "Other" && (
                  <input
                    type="text"
                    value={formData.fear_other}
                    onChange={(e) => handleChange("fear_other", e.target.value)}
                    placeholder="Please specify your fear"
                    maxLength={200}
                    className={`${textInputClasses} mt-3`}
                  />
                )}
              </div>

              {/* 3. Decision-Making Style */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  3. What is your decision-making style?
                </label>
                <select
                  value={formData.decision_style}
                  onChange={(e) => handleChange("decision_style", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {DECISION_STYLE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* 4. Energy Pattern */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  4. What is your energy pattern?
                </label>
                <select
                  value={formData.energy_pattern}
                  onChange={(e) => handleChange("energy_pattern", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {ENERGY_PATTERN_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* 5. Consistency Pattern */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  5. What is your consistency pattern?
                </label>
                <select
                  value={formData.consistency_pattern}
                  onChange={(e) => handleChange("consistency_pattern", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {CONSISTENCY_PATTERN_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* 6. Risk Approach */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  6. What is your risk approach?
                </label>
                <select
                  value={formData.risk_approach}
                  onChange={(e) => handleChange("risk_approach", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {RISK_APPROACH_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* 7. Success Definition */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  7. How do you define success?
                </label>
                <select
                  value={formData.success_definition}
                  onChange={(e) => handleChange("success_definition", e.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select an option</option>
                  {SUCCESS_DEFINITION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {formData.success_definition === "Other" && (
                  <input
                    type="text"
                    value={formData.success_other}
                    onChange={(e) => handleChange("success_other", e.target.value)}
                    placeholder="Please specify your definition of success"
                    maxLength={200}
                    className={`${textInputClasses} mt-3`}
                  />
                )}
              </div>

              {/* 8. Founder Archetype */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  8. Which founder archetype best describes you? <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.archetype}
                  onChange={(e) => handleChange("archetype", e.target.value)}
                  className={fieldClasses}
                  required
                >
                  <option value="">Select an option</option>
                  {ARCHETYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.archetype}
                  className="flex-1 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save Psychology Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
}
