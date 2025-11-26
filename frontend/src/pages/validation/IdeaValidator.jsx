import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { validationQuestions } from "../../config/validationQuestions.js";
import ValidationLoadingIndicator from "../../components/validation/ValidationLoadingIndicator.jsx";
import OnboardingTooltip from "../../components/validation/OnboardingTooltip.jsx";

const CATEGORY_QUESTIONS = validationQuestions.category_questions;
const IDEA_EXPLANATION_QUESTIONS = validationQuestions.idea_explanation_questions;

export default function IdeaValidator() {
  const navigate = useNavigate();
  const { validateIdea, loading, error, setError, setCategoryAnswers, setIdeaExplanation, categoryAnswers, ideaExplanation } = useValidation();
  const { inputs, loadRunById } = useReports();
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const [ideaAnswers, setIdeaAnswers] = useState({});
  const [ideaDetails, setIdeaDetails] = useState("");
  const [step, setStep] = useState(0);
  const [loadingIntake, setLoadingIntake] = useState(true);
  const [userIntake, setUserIntake] = useState(null);
  const [dismissedTooltips, setDismissedTooltips] = useState(() => {
    // Check localStorage for dismissed tooltips
    const saved = localStorage.getItem("validation_tooltips_dismissed");
    return saved ? JSON.parse(saved) : [];
  });
  const [isFirstValidation, setIsFirstValidation] = useState(false);

  // Check if this is user's first validation
  useEffect(() => {
    const checkFirstValidation = async () => {
      if (!isAuthenticated) {
        setIsFirstValidation(true); // Assume first for non-authenticated users
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
        // Default to showing tooltips if we can't check
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

      // First try to use inputs from ReportsContext if available
      if (inputs && Object.keys(inputs).length > 0) {
        const hasValidData = inputs.goal_type || inputs.time_commitment || inputs.budget_range || inputs.interest_area;
        if (hasValidData) {
          setUserIntake(inputs);
          setLoadingIntake(false);
          return;
        }
      }

      // Otherwise, fetch from API
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

  const handleCategoryAnswer = (questionId, answer) => {
    setCategoryAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleIdeaAnswer = (questionId, answer) => {
    setIdeaAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (step === 0) {
      // Validate category questions
      const allAnswered = CATEGORY_QUESTIONS.every((q) => categoryAnswers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before continuing.");
        return;
      }
      setError("");
      setStep(1);
    } else if (step === 1) {
      // Validate idea questions
      const allAnswered = IDEA_EXPLANATION_QUESTIONS.every((q) => ideaAnswers[q.id]);
      if (!allAnswered) {
        setError("Please answer all questions before continuing.");
        return;
      }
      setError("");
      // Convert answers to explanation text
      let explanationText = IDEA_EXPLANATION_QUESTIONS.map((q) => {
        return `${q.question}\n${ideaAnswers[q.id]}`;
      }).join("\n\n");
      
      // Add detailed description if provided (optional)
      if (ideaDetails.trim()) {
        explanationText += `\n\n## Detailed Description\n\n${ideaDetails.trim()}`;
      }
      
      setIdeaExplanation(explanationText);
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
    const result = await validateIdea(categoryAnswers, ideaExplanation);
    
    if (result.success) {
      navigate(`/validate-result?id=${result.validation.id}`);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Seo
        title="Validate Your Startup Idea | Free AI-Powered Validation Tool | Startup Idea Advisor"
        description="Validate your startup idea with our free AI-powered tool. Get comprehensive analysis across 10 key parameters: market opportunity, problem-solution fit, competitive landscape, target audience, business model, technical feasibility, financial sustainability, scalability, risk assessment, and go-to-market strategy. Receive critical feedback and actionable recommendations to improve your startup concept."
        keywords="startup idea validation, validate startup idea, business idea validation, startup validation tool, idea validation AI, market validation, startup feasibility, business model validation, startup risk assessment, idea evaluation tool, startup advisor, business idea analyzer, startup validation service, free idea validation"
        path="/validate-idea"
      />

      {/* Loading Overlay */}
      {loading && <ValidationLoadingIndicator />}

      {/* Progress Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step >= 0 ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
            <div className={`h-2.5 rounded-full transition-all duration-300 ${step >= 0 ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm shadow-brand-500/25" : "bg-slate-200 dark:bg-slate-700"}`}></div>
            <p className="mt-3 text-sm font-semibold">Category Questions</p>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-slate-200 dark:bg-slate-700"></div>
          <div className={`flex-1 ${step >= 1 ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
            <div className={`h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-gradient-to-r from-brand-500 to-brand-600 shadow-sm shadow-brand-500/25" : "bg-slate-200 dark:bg-slate-700"}`}></div>
            <p className="mt-3 text-sm font-semibold">Explain Your Idea</p>
          </div>
        </div>
      </div>

      {/* Step 0: Category Questions */}
      {step === 0 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Tell us about your idea</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Help us understand the category and context of your idea by answering these questions.
          </p>

          <div className="space-y-6">
            {CATEGORY_QUESTIONS.map((question, index) => (
              <div key={question.id} className="relative">
                <label htmlFor={question.id} className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                  {question.question}
                </label>
                <select
                  id={question.id}
                  value={categoryAnswers[question.id] || ""}
                  onChange={(e) => handleCategoryAnswer(question.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                >
                  <option value="">Select an option...</option>
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {isFirstValidation && index === 0 && !dismissedTooltips.includes(`category-${question.id}`) && (
                  <OnboardingTooltip
                    id={`category-${question.id}`}
                    message="This will take 2-3 minutes. Answer honestly - your responses help us provide accurate validation."
                    position="bottom"
                    show={true}
                    onDismiss={(id) => {
                      const newDismissed = [...dismissedTooltips, id];
                      setDismissedTooltips(newDismissed);
                      localStorage.setItem("validation_tooltips_dismissed", JSON.stringify(newDismissed));
                    }}
                  />
                )}
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

      {/* Step 1: Idea Explanation */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Tell us about your idea</h1>
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Help us understand your idea by answering these questions.
          </p>

          <div className="space-y-6">
            {IDEA_EXPLANATION_QUESTIONS.map((question) => (
              <div key={question.id}>
                <label htmlFor={question.id} className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                  {question.question}
                </label>
                <select
                  id={question.id}
                  value={ideaAnswers[question.id] || ""}
                  onChange={(e) => handleIdeaAnswer(question.id, e.target.value)}
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
            
            <div className="relative">
              <label htmlFor="ideaDetails" className="mb-2 block text-base font-semibold text-slate-900 dark:text-slate-100">
                Provide details about your idea
              </label>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                Describe your startup idea in detail. Include what problem it solves, how it works, who it's for, and why it's unique.
              </p>
              <textarea
                id="ideaDetails"
                value={ideaDetails}
                onChange={(e) => setIdeaDetails(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 resize-y"
                placeholder="Describe your startup idea in detail. For example: What problem does it solve? How does it work? Who is it for? What makes it unique? What's your business model?"
              />
              {isFirstValidation && !dismissedTooltips.includes("idea-details") && (
                <OnboardingTooltip
                  id="idea-details"
                  message="Be specific! The more detail you provide, the more accurate your validation will be. Include problem, solution, target audience, and business model."
                  position="bottom"
                  show={true}
                  onDismiss={(id) => {
                    const newDismissed = [...dismissedTooltips, id];
                    setDismissedTooltips(newDismissed);
                    localStorage.setItem("validation_tooltips_dismissed", JSON.stringify(newDismissed));
                  }}
                />
              )}
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
              className="rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:-translate-y-0.5 whitespace-nowrap"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Validating..." : "Validate Idea →"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

