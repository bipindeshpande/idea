import { createContext, useContext, useMemo, useState } from "react";

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

const defaultInputs = {
  goals: "Build a side business that complements my skills",
  time_commitment: "10-15 hours per week",
  interests: "AI, SaaS, automation",
  professional_background: "Product manager with 8 years in B2B SaaS",
  skills: "Product strategy, go-to-market, stakeholder management",
  budget_range: "$5k - $15k",
  risk_tolerance: "Moderate",
  preferred_model: "Subscription SaaS or digital products",
  resources: "Strong startup network, access to fractional designers",
  learning_goals: "Grow revenue leadership and experiment with AI tooling",
};

export function ReportsProvider({ children }) {
  const [inputs, setInputs] = useState(defaultInputs);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentRunId, setCurrentRunId] = useState(null);

  const runCrew = async (formInputs) => {
    const payload = Object.fromEntries(
      Object.entries({ ...defaultInputs, ...formInputs }).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    );

    setInputs(payload);
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
  };

  const loadRunById = (runId) => {
    const runs = loadSavedRuns();
    const match = runs.find((run) => run.id === runId);
    if (match) {
      setCurrentRunId(match.id);
      setInputs({ ...defaultInputs, ...match.inputs });
      setReports(match.outputs);
    }
    return match;
  };

  const value = useMemo(
    () => ({ inputs, setInputs, reports, loading, error, runCrew, loadRunById, currentRunId }),
    [inputs, reports, loading, error, currentRunId]
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
