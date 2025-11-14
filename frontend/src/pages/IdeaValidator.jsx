import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "../components/Seo.jsx";
import { useValidation } from "../context/ValidationContext.jsx";
import { validationQuestions } from "../config/validationQuestions.js";
import ValidationLoadingIndicator from "../components/ValidationLoadingIndicator.jsx";

const CATEGORY_QUESTIONS = validationQuestions.category_questions;
const IDEA_EXPLANATION_PROMPTS = validationQuestions.idea_explanation_prompts;

export default function IdeaValidator() {
  const navigate = useNavigate();
  const { validateIdea, loading, error, setError, setCategoryAnswers, setIdeaExplanation, categoryAnswers, ideaExplanation } = useValidation();
  const [step, setStep] = useState(0);

  const handleCategoryAnswer = (questionId, answer) => {
    setCategoryAnswers((prev) => ({
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
      // Validate idea explanation
      if (!ideaExplanation.trim() || ideaExplanation.trim().length < 50) {
        setError("Please provide a detailed explanation of your idea (at least 50 characters).");
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step >= 0 ? "text-brand-600" : "text-slate-400"}`}>
            <div className={`h-2 rounded-full ${step >= 0 ? "bg-brand-500" : "bg-slate-200"}`}></div>
            <p className="mt-2 text-xs font-medium">Category Questions</p>
          </div>
          <div className="mx-4 h-0.5 w-8 bg-slate-200"></div>
          <div className={`flex-1 ${step >= 1 ? "text-brand-600" : "text-slate-400"}`}>
            <div className={`h-2 rounded-full ${step >= 1 ? "bg-brand-500" : "bg-slate-200"}`}></div>
            <p className="mt-2 text-xs font-medium">Explain Your Idea</p>
          </div>
        </div>
      </div>

      {/* Step 0: Category Questions */}
      {step === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Tell us about your idea</h1>
          <p className="mb-8 text-slate-600">
            Help us understand the category and context of your idea by answering these questions.
          </p>

          <div className="space-y-8">
            {CATEGORY_QUESTIONS.map((question) => (
              <div key={question.id}>
                <label className="mb-3 block text-lg font-semibold text-slate-900">
                  {question.question}
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleCategoryAnswer(question.id, option)}
                      className={`rounded-xl border-2 p-4 text-left text-sm transition ${
                        categoryAnswers[question.id] === option
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/50"
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
            <div className="mt-6 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className={`rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className={`rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Idea Explanation */}
      {step === 1 && (
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Explain your idea</h1>
          <p className="mb-6 text-slate-600">
            Provide a detailed explanation of your startup idea. The more context you provide, the better our validation will be.
          </p>

          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <p className="mb-3 text-sm font-semibold text-brand-900">Consider addressing these points:</p>
            <ul className="space-y-2 text-sm text-brand-700">
              {IDEA_EXPLANATION_PROMPTS.map((prompt, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 text-brand-500">•</span>
                  <span>{prompt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <label htmlFor="idea-explanation" className="mb-2 block text-sm font-semibold text-slate-900">
              Your Idea Explanation
            </label>
            <textarea
              id="idea-explanation"
              value={ideaExplanation}
              onChange={(e) => setIdeaExplanation(e.target.value)}
              disabled={loading}
              placeholder="Describe your startup idea in detail. Include the problem you're solving, your solution, target audience, business model, and what makes it unique..."
              rows={12}
              className={`w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 ${loading ? "cursor-not-allowed opacity-50" : ""}`}
            />
            <p className="mt-2 text-xs text-slate-500">
              {ideaExplanation.length} characters (minimum 50 required)
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 whitespace-nowrap"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "Validating..." : "Validate Idea →"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

