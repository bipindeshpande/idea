import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const ValidationContext = createContext(null);
const STORAGE_KEY = "sia_validations";

function loadSavedValidations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load saved validations", error);
    return [];
  }
}

function saveValidation(validation) {
  const validations = loadSavedValidations();
  validations.unshift(validation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validations.slice(0, 20)));
}

export function ValidationProvider({ children }) {
  const [currentValidation, setCurrentValidation] = useState(null);
  const [categoryAnswers, setCategoryAnswersState] = useState({});
  const [ideaExplanation, setIdeaExplanationState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { getAuthHeaders } = useAuth();

  const setCategoryAnswers = useCallback((valueOrUpdater) => {
    if (typeof valueOrUpdater === "function") {
      setCategoryAnswersState((prev) => valueOrUpdater(prev));
    } else {
      setCategoryAnswersState(valueOrUpdater);
    }
  }, []);

  const setIdeaExplanation = useCallback((valueOrUpdater) => {
    if (typeof valueOrUpdater === "function") {
      setIdeaExplanationState((prev) => valueOrUpdater(prev));
    } else {
      setIdeaExplanationState(valueOrUpdater);
    }
  }, []);

  const validateIdea = useCallback(async (answers, explanation) => {
    setLoading(true);
    setError("");
    setCategoryAnswers(answers);
    setIdeaExplanation(explanation);

    try {
      const response = await fetch("/api/validate-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          category_answers: answers,
          idea_explanation: explanation,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to validate idea");
      }

      const data = await response.json();
      
      // Only save if we have valid validation data
      if (!data.validation || typeof data.validation !== 'object') {
        throw new Error("No validation data received from server");
      }

      const validation = {
        id: data.validation_id || Date.now().toString(),
        timestamp: Date.now(),
        categoryAnswers: answers,
        ideaExplanation: explanation,
        validation: data.validation,
      };

      // Only save successful validations with valid data
      saveValidation(validation);
      setCurrentValidation(validation);
      return { success: true, validation };
    } catch (err) {
      setError(err.message || "Unexpected error");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const loadValidationById = useCallback((validationId) => {
    const validations = loadSavedValidations();
    const validation = validations.find((v) => v.id === validationId);
    if (validation) {
      setCurrentValidation(validation);
      setCategoryAnswers(validation.categoryAnswers || {});
      setIdeaExplanation(validation.ideaExplanation || "");
      return validation;
    }
    return null;
  }, []);

  const getSavedValidations = useCallback(() => {
    return loadSavedValidations();
  }, []);

  const deleteValidation = useCallback((validationId) => {
    const validations = loadSavedValidations();
    const filtered = validations.filter((v) => v.id !== validationId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (currentValidation?.id === validationId) {
      setCurrentValidation(null);
      setCategoryAnswers({});
      setIdeaExplanation("");
    }
  }, [currentValidation]);

  const clearCurrentValidation = useCallback(() => {
    setCurrentValidation(null);
    setCategoryAnswers({});
    setIdeaExplanation("");
    setError("");
  }, []);

  const value = useMemo(
    () => ({
      currentValidation,
      categoryAnswers,
      ideaExplanation,
      loading,
      error,
      validateIdea,
      loadValidationById,
      getSavedValidations,
      deleteValidation,
      clearCurrentValidation,
      setCategoryAnswers,
      setIdeaExplanation,
      setError,
    }),
    [
      currentValidation,
      categoryAnswers,
      ideaExplanation,
      loading,
      error,
      validateIdea,
      loadValidationById,
      getSavedValidations,
      deleteValidation,
      clearCurrentValidation,
      setCategoryAnswers,
      setIdeaExplanation,
    ]
  );

  return <ValidationContext.Provider value={value}>{children}</ValidationContext.Provider>;
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error("useValidation must be used within ValidationProvider");
  }
  return context;
}

