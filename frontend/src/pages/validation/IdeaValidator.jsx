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
  
  console.log('🔗 [IdeaValidator] URL search params:', Object.fromEntries(searchParams.entries()));
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
    console.log('⚡ [IdeaValidator] useEffect triggered for edit mode');
    console.log('⚡ [IdeaValidator] editValidationId:', editValidationId);
    console.log('⚡ [IdeaValidator] isAuthenticated:', isAuthenticated);
    
    const loadValidationForEdit = async () => {
      console.log('🚀 [Edit Mode] loadValidationForEdit started');
      console.log('🔑 [Edit Mode] editValidationId:', editValidationId);
      console.log('👤 [Edit Mode] isAuthenticated:', isAuthenticated);
      
      if (!editValidationId) {
        console.log('⏭️ [Edit Mode] No editValidationId provided, skipping load');
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
        // Use cached activityData if available, otherwise fetch
        let validations = [];
        if (activityData?.validations) {
          console.log('✅ [Edit Mode] Using cached activity data');
          validations = activityData.validations;
        } else {
          console.log('🌐 [Edit Mode] Fetching from /api/user/activity (cache miss)...');
          try {
            const response = await fetch(`/api/user/activity`, {
              headers: getAuthHeaders(),
            });
            console.log('📥 [Edit Mode] Response status:', response.status, response.ok ? 'OK' : 'ERROR');

            if (response.ok) {
              const data = await response.json();
              validations = data.activity?.validations || [];
              // Cache the data for future use
              setActivityData(data.activity);
            }
          } catch (err) {
            console.error("❌ Failed to fetch validation data:", err);
          }
        }
        
        // Always log for debugging
        console.log('📡 [Edit Mode] API Response received');
        console.log('📊 [Edit Mode] Total validations returned:', validations.length);
        console.log('📋 [Edit Mode] Available validations:', validations.map(v => ({ 
          validation_id: v.validation_id,
          id: v.id,
          overall_score: v.overall_score
        })));
        console.log('🔍 [Edit Mode] Searching for validation_id:', editValidationId);
        console.log('🔍 [Edit Mode] ID type:', typeof editValidationId);
        
        // If no validations found at all, check if it's an authentication issue
        if (validations.length === 0) {
          console.warn('⚠️ [Edit Mode] No validations returned from API. Possible reasons:');
          console.warn('  - User has no validations');
          console.warn('  - Authentication issue');
          console.warn('  - All validations are filtered out (not completed or deleted)');
        }
        
        // Find the validation we want to edit
        // editValidationId is already stripped of "val_" prefix
        let validationToEdit = null;
        if (editValidationId) {
          const searchId = String(editValidationId).trim();
          console.log('🔍 [Edit Mode] Searching for validation with cleaned ID:', searchId);
          
          validationToEdit = validations.find(v => {
            // API returns validation_id as the actual ID (string or number)
            const vid = v.validation_id ? String(v.validation_id).trim() : null;
            const dbId = v.id ? String(v.id).trim() : null;
            
            // Strategy 1: Direct match on validation_id (most common case)
            if (vid && vid === searchId) {
              console.log('✅ [Edit Mode] Found by validation_id match:', vid);
              return true;
            }
            
            // Strategy 2: Match by database ID (strip prefix if present)
            if (dbId) {
              const cleanDbId = dbId.replace(/^val_/, '');
              if (cleanDbId === searchId) {
                console.log('✅ [Edit Mode] Found by id match (stripped):', dbId, '->', cleanDbId);
                return true;
              }
            }
            
            // Strategy 3: Match by numeric value (handle string vs number conversion)
            try {
              const searchNum = Number(searchId);
              if (!isNaN(searchNum)) {
                if (vid && Number(vid) === searchNum) {
                  console.log('✅ [Edit Mode] Found by numeric validation_id match:', vid);
                  return true;
                }
                if (dbId) {
                  const cleanDbId = dbId.replace(/^val_/, '');
                  if (Number(cleanDbId) === searchNum) {
                    console.log('✅ [Edit Mode] Found by numeric id match:', dbId);
                    return true;
                  }
                }
              }
            } catch (e) {
              // Ignore number conversion errors
            }
            
            return false;
          });
        }
        
        // Always log for debugging (remove NODE_ENV check)
        console.log('🔍 [Edit Mode] Searching for validation_id:', editValidationId);
        console.log('📊 [Edit Mode] Total validations available:', validations.length);
        console.log('📋 [Edit Mode] Available validation_ids:', validations.map(v => ({
          id: v.id,
          validation_id: v.validation_id,
          has_category_answers: !!v.category_answers
        })));
        console.log('✅ [Edit Mode] Found validation:', validationToEdit ? 'YES' : 'NO');
        if (validationToEdit) {
          console.log('📝 [Edit Mode] Validation details:', {
            id: validationToEdit.id,
            validation_id: validationToEdit.validation_id,
            has_category_answers: !!validationToEdit.category_answers,
            category_answers_type: typeof validationToEdit.category_answers
          });
        } else {
          console.warn('⚠️ [Edit Mode] Validation NOT FOUND! Check if:');
          console.warn('  - Validation exists in database');
          console.warn('  - Validation belongs to current user');
          console.warn('  - Validation status is "completed"');
          console.warn('  - Validation is not deleted');
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
        
        // Always log for debugging
        console.log('📦 [Edit Mode] Raw category_answers from API:', validationToEdit.category_answers);
        console.log('🔓 [Edit Mode] Parsed categoryAnswersData:', categoryAnswersData);

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
        
        // Always log for debugging
        console.log('📝 [Edit Mode] Screen 1 data to set:', screen1Data);
        
        // Set screen1 answers - set immediately even if only partial data
        // This ensures dropdowns show values as soon as they're loaded
        if (Object.keys(screen1Data).length > 0) {
          setScreen1Answers(prev => ({ ...prev, ...screen1Data }));
          console.log('✅ [Edit Mode] Set screen1Answers:', screen1Data);
        } else {
          console.warn('⚠️ [Edit Mode] No screen1 data found in category_answers');
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
        
        // Always log for debugging
        console.log('📝 [Edit Mode] Screen 2 data to set:', screen2Data);
        
        // Set screen2 answers - set immediately even if only partial data
        if (Object.keys(screen2Data).length > 0) {
          setScreen2Answers(prev => ({ ...prev, ...screen2Data }));
          console.log('✅ [Edit Mode] Set screen2Answers:', screen2Data);
        } else {
          console.warn('⚠️ [Edit Mode] No screen2 data found in category_answers');
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
        
        // Always log for debugging
        console.log('✅ [Edit Mode] Pre-filled data summary:', {
          categoryAnswersData,
          screen1Answers: screen1Data,
          screen2Answers: screen2Data,
          structuredDescription: validationToEdit.idea_explanation,
          optionalAnswers
        });
      } else {
        console.error('❌ [Edit Mode] Validation not found for ID:', editValidationId);
        console.error('🔍 [Edit Mode] This could mean:');
        console.error('  1. Validation does not exist (may have been deleted)');
        console.error('  2. Validation belongs to different user');
        console.error('  3. Validation status is not "completed"');
        console.error('  4. Validation is deleted (is_deleted=True)');
        console.error('  5. ID format mismatch');
        console.error('📊 [Edit Mode] Available validation IDs:', validations.map(v => v.validation_id || v.id));
        
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
        console.error('💥 [Edit Mode] Exception caught while loading validation:', err);
        console.error('💥 [Edit Mode] Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError("Failed to load validation data. Please try again.");
      } finally {
        console.log('🏁 [Edit Mode] loadValidationForEdit finished');
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

