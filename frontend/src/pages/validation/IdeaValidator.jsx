import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { validationQuestions } from "../../config/validationQuestions.js";
import ValidationLoadingIndicator from "../../components/validation/ValidationLoadingIndicator.jsx";

const CATEGORY_QUESTIONS = validationQuestions.category_questions;
const IDEA_EXPLANATION_QUESTIONS = validationQuestions.idea_explanation_questions;

export default function IdeaValidator() {
  const navigate = useNavigate();
  const { validateIdea, loading, error, setError, setCategoryAnswers, setIdeaExplanation, categoryAnswers, ideaExplanation } = useValidation();
  const [ideaAnswers, setIdeaAnswers] = useState({});
  const [step, setStep] = useState(0);

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
      const explanationText = IDEA_EXPLANATION_QUESTIONS.map((q) => {
        return `${q.question}\n${ideaAnswers[q.id]}`;
      }).join("\n\n");
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
            {CATEGORY_QUESTIONS.map((question) => (
              <div key={question.id}>
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

          <div className="space-y-8">
            {IDEA_EXPLANATION_QUESTIONS.map((question) => (
              <div key={question.id}>
                <label className="mb-3 block text-lg font-semibold text-slate-900">
                  {question.question}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleIdeaAnswer(question.id, option)}
                      className={`rounded-xl border-2 p-4 text-left text-sm font-medium transition-all duration-200 ${
                        ideaAnswers[question.id] === option
                          ? "border-brand-500 dark:border-brand-500 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 text-brand-700 dark:text-brand-300 shadow-md shadow-brand-500/10"
                          : "border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 hover:shadow-sm"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-coral-200/60 dark:border-coral-800/60 bg-gradient-to-br from-coral-50 to-coral-100/50 dark:from-coral-900/30 dark:to-coral-800/20 p-4 text-sm font-semibold text-coral-800 dark:text-coral-300 shadow-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
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

