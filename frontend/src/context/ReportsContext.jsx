import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { intakeScreen } from "../config/intakeScreen.js";

const ReportsContext = createContext(null);
const STORAGE_KEY = "sia_saved_runs";

function loadSavedRuns() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load saved runs", error);
    return [];
  }
}

function saveRun(run) {
  const runs = loadSavedRuns();
  runs.unshift(run);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, 20)));
}

function buildDefaultInputs() {
  const defaults = {};

  intakeScreen.fields.forEach((field) => {
    if (field.type === "picklist") {
      const firstOption = field.required ? field.options?.[0] ?? "" : "";
      defaults[field.id] = firstOption;

      if (field.sub_field) {
        const optionsByParent = field.sub_field.options_by_parent ?? {};
        const parentValue = defaults[field.id];
        const subOptions = optionsByParent[parentValue] ?? [];
        const firstSubOption =
          subOptions.length === 1 && subOptions[0] === "Custom Sub-Area Text Field"
            ? ""
            : subOptions[0] ?? "";
        defaults[field.sub_field.id] = firstSubOption ?? "";
      }
    } else {
      defaults[field.id] = "";
    }
  });

  return defaults;
}

const defaultInputs = buildDefaultInputs();

function normalizeInputs(overrides = {}) {
  const merged = { ...defaultInputs, ...overrides };
  const interestField = intakeScreen.fields.find((field) => field.id === "interest_area");

  if (interestField?.sub_field) {
    const optionsByParent = interestField.sub_field.options_by_parent ?? {};
    const parentValue = merged[interestField.id];
    const subOptions = optionsByParent[parentValue] ?? [];

    if (subOptions.length === 1 && subOptions[0] === "Custom Sub-Area Text Field") {
      const overrideValue = overrides[interestField.sub_field.id];
      merged[interestField.sub_field.id] =
        typeof overrideValue === "string" ? overrideValue : merged[interestField.sub_field.id] ?? "";
    } else if (!subOptions.includes(merged[interestField.sub_field.id])) {
      merged[interestField.sub_field.id] = subOptions[0] ?? "";
    }
  }

  return merged;
}

export function ReportsProvider({ children }) {
  const [inputs, setInputsState] = useState(defaultInputs);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRunId, setCurrentRunId] = useState(null);

  const setInputs = useCallback((nextInputs) => {
    setInputsState(normalizeInputs(nextInputs));
  }, []);

  const runCrew = useCallback(async (formInputs) => {
    const normalizedInputs = normalizeInputs(formInputs);
    const payload = Object.fromEntries(
      Object.entries(normalizedInputs).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    );

    setInputsState(normalizedInputs);
    setLoading(true);
    setError(null);
    setReports(null);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Crew run failed");
      }

      const result = await response.json();
      const run = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        inputs: payload,
        outputs: result.outputs || {},
      };
      saveRun(run);
      setCurrentRunId(run.id);
      setReports(run.outputs);
      return { success: true, runId: run.id };
    } catch (err) {
      setError(err.message || "Unexpected error");
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRunById = useCallback((runId) => {
    const runs = loadSavedRuns();
    const match = runs.find((run) => run.id === runId);
    if (match) {
      setCurrentRunId(match.id);
      setInputsState(normalizeInputs(match.inputs));
      setReports(match.outputs);
    }
    return match;
  }, []);

  const deleteRun = useCallback((runId) => {
    const runs = loadSavedRuns();
    const filtered = runs.filter((run) => run.id !== runId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // If deleting the current run, clear state
    if (currentRunId === runId) {
      setCurrentRunId(null);
      setReports(null);
      setInputsState(defaultInputs);
    }
    
    return filtered;
  }, [currentRunId]);

  const value = useMemo(
    () => ({ inputs, setInputs, reports, loading, error, runCrew, loadRunById, currentRunId, deleteRun }),
    [inputs, reports, loading, error, runCrew, loadRunById, currentRunId, deleteRun, setInputs]
  );

  return (
    <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error("useReports must be used within a ReportsProvider");
  }
  return context;
}
