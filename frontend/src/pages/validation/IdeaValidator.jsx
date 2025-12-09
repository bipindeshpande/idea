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
  
  const { validateIdea, loading, error, setError, setCategoryAnswers, setIdeaExplanation, categoryAnswers, loadValidationById } = useValidation();
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
    delivery_channel: "",
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
  const [activityData, setActivityData] = useState(null); // Store activity data for reuse
  const isRevalidate = searchParams.get("revalidate") === "true";
  const editValidationIdRaw = searchParams.get("edit");
  // Strip "val_" prefix if present - backend and API return validation_id without prefix
  const editValidationId = editValidationIdRaw ? editValidationIdRaw.replace(/^val_/, '') : null;
  const [isEditMode, setIsEditMode] = useState(!!editValidationId);
  const [loadingValidationData, setLoadingValidationData] = useState(false);

  // Consolidated loader: Check first validation, load user intake, and cache activity data in one call
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) {
        setIsFirstValidation(true);
        setLoadingIntake(false);
        return;
      }

      // Check if we already have inputs from context
      if (inputs && Object.keys(inputs).length > 0) {
        const hasValidData = inputs.goal_type || inputs.time_commitment || inputs.budget_range || inputs.interest_area;
        if (hasValidData) {
          setUserIntake(inputs);
          setLoadingIntake(false);
        }
      }

      try {
        // Single API call to get all needed data (reused by edit mode)
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Store activity data for reuse (including by edit mode)
          setActivityData(data.activity);
          
          // Check if first validation
          const validationCount = data.activity?.validations?.length || 0;
          setIsFirstValidation(validationCount === 0);
          
          // Load user intake from latest run (if not already set from context)
          if (!userIntake && data.success && data.activity && data.activity.runs && data.activity.runs.length > 0) {
            const latestRun = data.activity.runs[0];
            if (latestRun.inputs && Object.keys(latestRun.inputs).length > 0) {
              setUserIntake(latestRun.inputs);
            }
          }
        }
      } catch (err) {
        console.error("❌ Failed to load user data:", err);
        setIsFirstValidation(true);
      } finally {
        setLoadingIntake(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, getAuthHeaders, inputs, userIntake]);

  // Load validation data when editing - uses cached activityData if available
  useEffect(() => {
    const loadValidationForEdit = async () => {
      if (!editValidationId) {
        return;
      }
      
      if (!isAuthenticated) {
        console.warn('🔒 [Edit Mode] User not authenticated, cannot load validation');
        setError("You must be logged in to edit validations. Please log in and try again.");
        return;
      }

      setLoadingValidationData(true);
      setError(null); // Clear any previous errors
      
      try {
        const searchId = String(editValidationId).trim();
        let validationToEdit = null;
        
        // Strategy 1: Try from activity data (but without status filter when include_all_statuses=true)
        // First check cache
        if (!validationToEdit && activityData?.validations) {
          validationToEdit = activityData.validations.find(v => {
            const vid = v.validation_id ? String(v.validation_id).trim() : null;
            const dbId = v.id ? String(v.id).trim() : null;
            return (vid && vid === searchId) || 
                   (dbId && dbId.replace(/^val_/, '') === searchId) ||
                   (vid && Number(vid) === Number(searchId)) ||
                   (dbId && Number(dbId.replace(/^val_/, '')) === Number(searchId));
          });
        }
        
        // Strategy 3: Fetch from activity endpoint with larger page size and include all statuses
        // This is important for newly created validations that might not be COMPLETED yet
        if (!validationToEdit) {
          const response = await fetch(`/api/user/activity?per_page=100&include_all_statuses=true`, {
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            const validations = data.activity?.validations || [];
            setActivityData(data.activity);
            
            validationToEdit = validations.find(v => {
              const vid = v.validation_id ? String(v.validation_id).trim() : null;
              const dbId = v.id ? String(v.id).trim() : null;
              
              if (vid && vid === searchId) return true;
              if (dbId && dbId.replace(/^val_/, '') === searchId) return true;
              
              try {
                const searchNum = Number(searchId);
                if (!isNaN(searchNum)) {
                  if (vid && Number(vid) === searchNum) return true;
                  if (dbId && Number(dbId.replace(/^val_/, '')) === searchNum) return true;
                }
              } catch (e) {
                // Ignore conversion errors
              }
              
              return false;
            });
          }
        }
        
        if (!validationToEdit) {
          console.warn('Validation not found for edit');
        }

        if (validationToEdit) {
        // Parse category_answers if it's a string
        let categoryAnswersData = {};
        if (validationToEdit.category_answers) {
          if (typeof validationToEdit.category_answers === 'string') {
            try {
              categoryAnswersData = JSON.parse(validationToEdit.category_answers);
            } catch (e) {
              console.error("Failed to parse category_answers", e);
            }
          } else {
            categoryAnswersData = validationToEdit.category_answers;
          }
        }

        // Pre-fill Screen 1 answers (About Your Idea - 4 dropdowns)
        // Direct mapping - use exact field names from form
        const screen1Data = {};
        const screen1Fields = ['industry', 'geography', 'stage', 'commitment'];
        
        screen1Fields.forEach(field => {
          // Try direct match first
          if (categoryAnswersData[field]) {
            screen1Data[field] = categoryAnswersData[field];
          }
        });
        
        // Set screen1 answers - set immediately even if only partial data
        // This ensures dropdowns show values as soon as they're loaded
        if (Object.keys(screen1Data).length > 0) {
          setScreen1Answers(prev => ({ ...prev, ...screen1Data }));
        }

        // Pre-fill Screen 2 answers (How Your Idea Works - 5 dropdowns)
        // Direct mapping with fallbacks for legacy field names
        const screen2Data = {};
        const screen2FieldMap = {
          'problem_category': ['problem_category', 'problem'],
          'solution_type': ['solution_type', 'solution'],
          'user_type': ['user_type', 'target_audience', 'user'],
          'revenue_model': ['revenue_model', 'business_model', 'revenue'],
          'unique_moat': ['unique_moat', 'uniqueness', 'unique_value'],
          'business_archetype': ['business_archetype', 'business_type', 'business_nature'],
        };
        
        Object.keys(screen2FieldMap).forEach(standardField => {
          const possibleNames = screen2FieldMap[standardField];
          for (const fieldName of possibleNames) {
            if (categoryAnswersData[fieldName]) {
              screen2Data[standardField] = categoryAnswersData[fieldName];
              break; // Use first match
            }
          }
        });
        
        // Set screen2 answers - set immediately even if only partial data
        if (Object.keys(screen2Data).length > 0) {
          setScreen2Answers(prev => ({ ...prev, ...screen2Data }));
        }

        // Pre-fill Screen 3 (Tell Us More)
        if (validationToEdit.idea_explanation) {
          setStructuredDescription(validationToEdit.idea_explanation);
        }

        // Pre-fill optional fields with all possible field name variations
        setOptionalAnswers({
          initial_budget: categoryAnswersData.initial_budget || categoryAnswersData.budget || categoryAnswersData.budget_range || "",
          delivery_channel: categoryAnswersData.delivery_channel || "",
          constraints: Array.isArray(categoryAnswersData.constraints) 
            ? categoryAnswersData.constraints 
            : (categoryAnswersData.constraints ? [categoryAnswersData.constraints] : []),
          competitors: categoryAnswersData.competitors || categoryAnswersData.competition || "",
        });

        // Set category answers in context
        setCategoryAnswers(categoryAnswersData);
        setIdeaExplanation(validationToEdit.idea_explanation || "");
      } else {
        console.error('Validation not found for ID:', editValidationId);
        
        // Show the original ID from URL in error message for user clarity
        const originalId = editValidationIdRaw || editValidationId;
        const availableIds = validations.map(v => v.validation_id || v.id).join(', ');
        setError(
          `Validation not found or access denied. The validation with ID "${originalId}" could not be loaded. ` +
          `This validation may have been deleted or doesn't belong to your account. ` +
          (validations.length > 0 
            ? `Available validations: ${availableIds}` 
            : 'You have no validations available to edit.')
        );
      }
        } catch (err) {
        console.error('Exception caught while loading validation:', err);
        setError("Failed to load validation data. Please try again.");
      } finally {
        setLoadingValidationData(false);
      }
    };

    if (editValidationId && isAuthenticated) {
      loadValidationForEdit();
    }
  }, [editValidationId, isAuthenticated, getAuthHeaders, setCategoryAnswers, setIdeaExplanation, activityData]);

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
      delivery_channel: optionalAnswers.delivery_channel,
      constraints: optionalAnswers.constraints,
      competitors: optionalAnswers.competitors,
    };
    
    setCategoryAnswers(mergedCategoryAnswers);
    setIdeaExplanation(structuredDescription);
    
    // Use edit mode if validation ID is present
    const result = await validateIdea(mergedCategoryAnswers, structuredDescription, editValidationId || undefined);
    
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

      {loadingValidationData && (
        <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Loading validation data...</p>
        </div>
      )}

      {isEditMode && editValidationId && !loadingValidationData && (
        <div className="mb-6 rounded-2xl border border-brand-200/60 bg-brand-50/80 dark:bg-brand-900/20 p-4">
          <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">
            ✏️ Editing Validation: {editValidationId}
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="mb-6 rounded-2xl border border-red-200/60 bg-red-50/80 dark:bg-red-900/20 p-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">⚠️ {error}</p>
        </div>
      )}

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
              if (["initial_budget", "delivery_channel"].includes(field.id)) {
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

