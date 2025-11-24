import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function AnalyticsPage() {
  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const { getSavedValidations } = useValidation();
  const [apiRuns, setApiRuns] = useState([]);
  const [apiValidations, setApiValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localRuns, setLocalRuns] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setLocalRuns(JSON.parse(stored));
        } catch (error) {
          console.error("Failed to parse saved runs", error);
        }
      }

      // Load from API
      if (isAuthenticated) {
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setApiRuns(data.runs || []);
            setApiValidations(data.validations || []);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine all runs
  const allRuns = useMemo(() => {
    const merged = [...localRuns];
    const existingIds = new Set(localRuns.map(r => r.id));
    
    apiRuns.forEach(apiRun => {
      const apiRunId = `run_${apiRun.run_id}`;
      if (!existingIds.has(apiRunId)) {
        merged.push({
          id: apiRunId,
          timestamp: apiRun.created_at ? new Date(apiRun.created_at).getTime() : Date.now(),
          inputs: apiRun.inputs || {},
          run_id: apiRun.run_id,
          from_api: true,
        });
      }
    });
    
    return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [localRuns, apiRuns]);

  // Combine all validations
  const allValidations = useMemo(() => {
    const apiVals = apiValidations.map(v => ({
      id: `val_${v.validation_id}`,
      validation_id: v.validation_id,
      timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
      overall_score: v.overall_score,
      idea_explanation: v.idea_explanation,
      from_api: true,
    }));

    const localValidations = getSavedValidations();
    const localVals = localValidations.map(v => ({
      id: v.id || `local_${v.timestamp}`,
      validation_id: v.id || `local_${v.timestamp}`,
      timestamp: v.timestamp || Date.now(),
      overall_score: v.validation?.overall_score,
      idea_explanation: v.ideaExplanation || v.idea_explanation,
      from_api: false,
    }));

    const combined = [...apiVals];
    const apiIds = new Set(apiVals.map(v => v.validation_id));
    localVals.forEach(localVal => {
      if (!apiIds.has(localVal.validation_id)) {
        combined.push(localVal);
      }
    });

    return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [apiValidations, getSavedValidations]);

  // Calculate statistics
  const stats = useMemo(() => {
    const validationsWithScores = allValidations.filter(v => v.overall_score !== undefined && v.overall_score !== null);
    const scores = validationsWithScores.map(v => v.overall_score);
    
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;
    
    const highScores = scores.filter(s => s >= 7).length;
    const mediumScores = scores.filter(s => s >= 5 && s < 7).length;
    const lowScores = scores.filter(s => s < 5).length;
    
    // Interest areas from runs
    const interestAreas = {};
    allRuns.forEach(run => {
      const area = run.inputs?.interest_area || run.inputs?.sub_interest_area;
      if (area) {
        interestAreas[area] = (interestAreas[area] || 0) + 1;
      }
    });
    const topInterestArea = Object.entries(interestAreas)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "None";
    
    // Goal types
    const goalTypes = {};
    allRuns.forEach(run => {
      const goal = run.inputs?.goal_type;
      if (goal) {
        goalTypes[goal] = (goalTypes[goal] || 0) + 1;
      }
    });
    const topGoalType = Object.entries(goalTypes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "None";
    
    // Time-based trends
    const now = Date.now();
    const last30Days = allValidations.filter(v => (v.timestamp || 0) >= now - 30 * 24 * 60 * 60 * 1000);
    const last7Days = allValidations.filter(v => (v.timestamp || 0) >= now - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalRuns: allRuns.length,
      totalValidations: allValidations.length,
      validationsWithScores: validationsWithScores.length,
      avgScore: avgScore.toFixed(1),
      highScores,
      mediumScores,
      lowScores,
      topInterestArea,
      topGoalType,
      validationsLast30Days: last30Days.length,
      validationsLast7Days: last7Days.length,
      scores,
    };
  }, [allRuns, allValidations]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Seo
        title="Analytics Dashboard | Startup Idea Advisor"
        description="View your idea validation and discovery analytics"
        path="/dashboard/analytics"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Analytics Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Insights into your idea discovery and validation journey
            </p>
          </div>
          <Link
            to="/dashboard"
            className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Ideas Discovered</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalRuns}</p>
            </div>
            <div className="rounded-full bg-brand-100 dark:bg-brand-900/30 p-3">
              <span className="text-2xl">💡</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Validations</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalValidations}</p>
            </div>
            <div className="rounded-full bg-coral-100 dark:bg-coral-900/30 p-3">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Score</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
                {stats.avgScore}
                <span className="text-lg text-slate-500 dark:text-slate-400">/10</span>
              </p>
            </div>
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High Scores (≥7)</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.highScores}</p>
            </div>
            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-3">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Score Distribution</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">High (≥7.0)</span>
                <span className="text-slate-600 dark:text-slate-400">{stats.highScores}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.highScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Medium (5.0-6.9)</span>
                <span className="text-slate-600 dark:text-slate-400">{stats.mediumScores}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.mediumScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">Low (&lt;5.0)</span>
                <span className="text-slate-600 dark:text-slate-400">{stats.lowScores}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.lowScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Activity Trends</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Last 7 Days</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Validations created</p>
              </div>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.validationsLast7Days}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Last 30 Days</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Validations created</p>
              </div>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.validationsLast30Days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Top Interest Area</h2>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-brand-100 dark:bg-brand-900/30 p-3">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats.topInterestArea}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Most explored area</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Top Goal Type</h2>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-coral-100 dark:bg-coral-900/30 p-3">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{stats.topGoalType}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Primary goal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      {stats.validationsWithScores > 0 && (
        <div className="rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">💡 Insights</h2>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            {parseFloat(stats.avgScore) >= 7 && (
              <p>
                ✨ Great job! Your average validation score is <strong>{stats.avgScore}/10</strong>, indicating strong idea quality.
              </p>
            )}
            {stats.highScores > 0 && (
              <p>
                🎯 You have <strong>{stats.highScores} high-scoring ideas</strong> (≥7.0). Consider focusing on these for development.
              </p>
            )}
            {stats.validationsLast30Days > 5 && (
              <p>
                📈 You've been very active with <strong>{stats.validationsLast30Days} validations</strong> in the last month. Keep exploring!
              </p>
            )}
            {stats.topInterestArea !== "None" && (
              <p>
                🔍 Your primary focus area is <strong>{stats.topInterestArea}</strong>. Consider exploring related opportunities.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

