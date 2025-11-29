import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { validationQuestions } from "../../config/validationQuestions.js";
import ValidationLoadingIndicator from "../../components/validation/ValidationLoadingIndicator.jsx";
import OnboardingTooltip from "../../components/validation/OnboardingTooltip.jsx";

const SCREEN1_QUESTIONS = validationQuestions.screen1_questions || validationQuestions.category_questions || [];
const SCREEN2_QUESTIONS = validationQuestions.screen2_questions || validationQuestions.idea_explanation_questions || [];
const OPTIONAL_FIELDS = validationQuestions.optional_fields || [];

export default function IdeaValidator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { validateIdea, loading, error, setError, setCategoryAnswers, setIdeaExplanation, categoryAnswers } = useValidation();
  const { inputs, loadRunById } = useReports();
  const { getAuthHeaders, isAuthenticated } = useAuth();
  
  // Screen 1 state (About Your Idea - 4 dropdowns)
  const [screen1Answers, setScreen1Answers] = useState({});
  
  // Screen 2 state (How Your Idea Works - 5 dropdowns)
  const [screen2Answers, setScreen2Answers] = useState({});
  
  // Screen 3 state (Tell Us More)
  const [structuredDescription, setStructuredDescription] = useState("");
  const [optionalAnswers, setOptionalAnswers] = useState({
    initial_budget: "",
    constraints: [],
    competitors: "",
  });
  
  const [step, setStep] = useState(0);
  const [loadingIntake, setLoadingIntake] = useState(true);
  const [userIntake, setUserIntake] = useState(null);
  const [dismissedTooltips, setDismissedTooltips] = useState(() => {
    const saved = localStorage.getItem("validation_tooltips_dismissed");
    return saved ? JSON.parse(saved) : [];
  });
  const [isFirstValidation, setIsFirstValidation] = useState(false);
  const [previousValidationData, setPreviousValidationData] = useState(null);
  const isRevalidate = searchParams.get("revalidate") === "true";

  // Check if this is user's first validation
  useEffect(() => {
    const checkFirstValidation = async () => {
      if (!isAuthenticated) {
        setIsFirstValidation(true);
        return;
      }
      try {
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          const validationCount = data.activity?.validations?.length || 0;
          setIsFirstValidation(validationCount === 0);
        }
      } catch (err) {
        setIsFirstValidation(true);
      }
    };
    checkFirstValidation();
  }, [isAuthenticated, getAuthHeaders]);

  // Load user's latest intake data
  useEffect(() => {
    const loadUserIntake = async () => {
      if (!isAuthenticated) {
        setLoadingIntake(false);
        return;
      }

      if (inputs && Object.keys(inputs).length > 0) {
        const hasValidData = inputs.goal_type || inputs.time_commitment || inputs.budget_range || inputs.interest_area;
        if (hasValidData) {
          setUserIntake(inputs);
          setLoadingIntake(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.activity && data.activity.runs && data.activity.runs.length > 0) {
            const latestRun = data.activity.runs[0];
            if (latestRun.inputs && Object.keys(latestRun.inputs).length > 0) {
              setUserIntake(latestRun.inputs);
            }
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to load user intake:", err);
        }
      } finally {
        setLoadingIntake(false);
      }
    };

    loadUserIntake();
  }, [isAuthenticated, getAuthHeaders, inputs]);

  const handleScreen1Answer = (questionId, answer) => {
    setScreen1Answers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleScreen2Answer = (questionId, answer) => {
    setScreen2Answers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleOptionalAnswer = (fieldId, value) => {
    setOptionalAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleConstraintToggle = (constraint) => {
    setOptionalAnswers((prev) => ({
      ...prev,
      constraints: prev.constraints.includes(constraint)
        ? prev.constraints.filter((c) => c !== constraint)
        : [...prev.constraints, constraint],
    }));
  };

  const handleNext = () => {
    if (step === 0) {
      // Validate Screen 1 (4 required dropdowns)
      const allAnswered = SCREEN1_QUESTIONS.every((q) => screen1Answers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before continuing.");
        return;
      }
      setError("");
      setStep(1);
    } else if (step === 1) {
      // Validate Screen 2 (5 required dropdowns)
      const allAnswered = SCREEN2_QUESTIONS.every((q) => screen2Answers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before continuing.");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      // Validate Screen 3 (structured description required)
      if (!structuredDescription.trim()) {
        setError("Please provide a structured description of your idea.");
        return;
      }
      setError("");
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError("");
    } else {
      navigate("/");
    }
  };

  const handleSubmit = async () => {
    // Merge all answers into category_answers for backend
    const mergedCategoryAnswers = {
      ...screen1Answers,
      ...screen2Answers,
      initial_budget: optionalAnswers.initial_budget,
      constraints: optionalAnswers.constraints,
      competitors: optionalAnswers.competitors,
    };
    
    setCategoryAnswers(mergedCategoryAnswers);
    setIdeaExplanation(structuredDescription);
    
    const result = await validateIdea(mergedCategoryAnswers, structuredDescription);
    
    if (result.success) {
      if (isRevalidate && previousValidationData) {
        navigate(`/validate-result?id=${result.validation.id}&previous=${previousValidationData.previousValidationId}&previousScore=${previousValidationData.previousScore}`);
        localStorage.removeItem("revalidate_data");
      } else {
        navigate(`/validate-result?id=${result.validation.id}`);
      }
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Seo
        title="Validate Your Startup Idea | Free AI-Powered Validation Tool | Startup Idea Advisor"
        description="Validate your startup idea with our free AI-powered tool. Get comprehensive analysis across 10 key parameters."
        keywords="startup idea validation, validate startup idea, business idea validation"
        path="/validate-idea"
      />

      {loading && <ValidationLoadingIndicator />}

      {/* Progress Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step >= 0 ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
            <div className={`h-2.5 rounded-full transition-all duration-300 ${step >= 0 ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm shadow-brand-500/25" : "bg-slate-200 dark:bg-slate-700"}`}></div>
            <p className="mt-3 text-sm font-semibold">About Your Idea</p>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-slate-200 dark:bg-slate-700"></div>
          <div className={`flex-1 ${step >= 1 ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
            <div className={`h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm shadow-brand-500/25" : "bg-slate-200 dark:bg-slate-700"}`}></div>
            <p className="mt-3 text-sm font-semibold">How It Works</p>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-slate-200 dark:bg-slate-700"></div>
          <div className={`flex-1 ${step >= 2 ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
            <div className={`h-2.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm shadow-brand-500/25" : "bg-slate-200 dark:bg-slate-700"}`}></div>
            <p className="mt-3 text-sm font-semibold">Tell Us More</p>
          </div>
        </div>
      </div>

      {/* SCREEN 1: About Your Idea */}
      {step === 0 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">About Your Idea</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Set context and market boundaries.
          </p>

          <div className="space-y-6">
            {SCREEN1_QUESTIONS.map((question, index) => (
              <div key={question.id} className="relative">
                <label htmlFor={question.id} className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                  {question.question}
                </label>
                <select
                  id={question.id}
                  value={screen1Answers[question.id] || ""}
                  onChange={(e) => handleScreen1Answer(question.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                >
                  <option value="">Select an option...</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50 to-coral-100/50 dark:from-coral-900/30 dark:to-coral-800/20 p-4 text-sm font-semibold text-coral-800 dark:text-coral-300 shadow-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className={`rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: How Your Idea Works */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">How Your Idea Works</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Capture mechanics, value proposition, monetization.
          </p>

          <div className="space-y-6">
            {SCREEN2_QUESTIONS.map((question) => (
              <div key={question.id}>
                <label htmlFor={question.id} className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                  {question.question}
                </label>
                <select
                  id={question.id}
                  value={screen2Answers[question.id] || ""}
                  onChange={(e) => handleScreen2Answer(question.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                >
                  <option value="">Select an option...</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50 to-coral-100/50 dark:from-coral-900/30 dark:to-coral-800/20 p-4 text-sm font-semibold text-coral-800 dark:text-coral-300 shadow-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className={`rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 3: Tell Us More */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Tell Us More</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Capture the narrative + constraints that shape risk assessment.
          </p>

          <div className="space-y-6">
            {/* Structured Description (Required) */}
            <div className="relative">
              <label htmlFor="structuredDescription" className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Describe your idea using the structure below:
              </label>
              <textarea
                id="structuredDescription"
                value={structuredDescription}
                onChange={(e) => setStructuredDescription(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 resize-y"
                placeholder={`1. Problem: 
2. Solution:
3. User:
4. Differentiation:
5. Monetization:
6. Scope/Region:`}
              />
            </div>

            {/* Optional Fields */}
            {OPTIONAL_FIELDS.map((field) => {
              if (field.id === "initial_budget") {
                return (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                      {field.question}
                    </label>
                    <select
                      id={field.id}
                      value={optionalAnswers[field.id] || ""}
                      onChange={(e) => handleOptionalAnswer(field.id, e.target.value)}
                      className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                    >
                      <option value="">Select an option...</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              } else if (field.id === "constraints" && field.multiSelect) {
                return (
                  <div key={field.id}>
                    <label className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                      {field.question}
                    </label>
                    <div className="space-y-2">
                      {field.options.map((option) => (
                        <label key={option} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={optionalAnswers.constraints.includes(option)}
                            onChange={() => handleConstraintToggle(option)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Competitors (Optional Textbox) */}
            <div>
              <label htmlFor="competitors" className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Any competitors you already know? (Optional)
              </label>
              <input
                type="text"
                id="competitors"
                value={optionalAnswers.competitors || ""}
                onChange={(e) => handleOptionalAnswer("competitors", e.target.value)}
                placeholder="List websites, apps, or companies (optional)"
                className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50 to-coral-100/50 dark:from-coral-900/30 dark:to-coral-800/20 p-4 text-sm font-semibold text-coral-800 dark:text-coral-300 shadow-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className={`rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap`}
            >
              {loading ? "Validating..." : "Validate Idea →"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

