import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/common/Seo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useValidation } from "../../context/ValidationContext.jsx";
import { parseTopIdeas } from "../../utils/markdown/markdown.js";

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
          if (process.env.NODE_ENV === 'development') {
            console.error("Failed to parse saved runs", error);
          }
        }
      }

      // Load from API
      if (isAuthenticated) {
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
          cache: 'no-cache', // Ensure fresh data
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // API returns data.activity.runs and data.activity.validations
            setApiRuns(data.activity?.runs || []);
            setApiValidations(data.activity?.validations || []);
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to load analytics data:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when component becomes visible (user navigates back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData, isAuthenticated]);

  // Auto-refresh every 30 seconds when component is mounted and visible
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, [isAuthenticated, loadData]);

  // Combine all runs with proper deduplication
  const allRuns = useMemo(() => {
    // Helper to normalize run_id format - handle various formats consistently
    const normalizeRunId = (runId) => {
      if (!runId) return null;
      // Convert to string and normalize
      let normalized = String(runId).trim();
      // Remove "run_" prefix if present
      normalized = normalized.replace(/^run_/, '');
      // Remove any trailing underscores or extra formatting
      normalized = normalized.replace(/[_\s]+$/, '');
      return normalized || null;
    };
    
    // Use a Map to store unique runs by normalized run_id (most efficient deduplication)
    const runsMap = new Map();
    
    // First, add API runs (most authoritative) - prioritize these
    apiRuns.forEach(apiRun => {
      const normalizedId = normalizeRunId(apiRun.run_id);
      if (normalizedId && !runsMap.has(normalizedId)) {
        runsMap.set(normalizedId, {
          id: `run_${normalizedId}`,
          timestamp: apiRun.created_at ? new Date(apiRun.created_at).getTime() : Date.now(),
          inputs: apiRun.inputs || {},
          reports: apiRun.reports || {},
          run_id: normalizedId,
          from_api: true,
        });
      }
    });
    
    // Then add local runs that aren't already in API runs
    localRuns.forEach(localRun => {
      // Skip if this is actually a validation (has validation_id or overall_score)
      if (localRun.validation_id !== undefined || localRun.overall_score !== undefined) {
        return;
      }
      
      // Try to extract and normalize run_id from local run
      const rawRunId = localRun.run_id || localRun.id;
      const normalizedId = normalizeRunId(rawRunId);
      
      // Only add if we haven't seen this normalized ID and it's not null
      if (normalizedId && !runsMap.has(normalizedId)) {
        runsMap.set(normalizedId, {
          ...localRun,
          run_id: normalizedId,
          id: localRun.id || `run_${normalizedId}`,
          from_api: false,
        });
      }
    });
    
    // Convert Map values to array and sort
    const uniqueRuns = Array.from(runsMap.values());
    return uniqueRuns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
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
    
    // Count ideas discovered - each run generates exactly 3 ideas
    // Since allRuns is already deduplicated, just use its length
    const uniqueRunsCount = allRuns.length;
    const totalIdeasDiscovered = uniqueRunsCount * 3;
    
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
    
    // Time-based trends for both discoveries and validations
    const now = Date.now();
    const last30DaysValidations = allValidations.filter(v => (v.timestamp || 0) >= now - 30 * 24 * 60 * 60 * 1000);
    const last7DaysValidations = allValidations.filter(v => (v.timestamp || 0) >= now - 7 * 24 * 60 * 60 * 1000);
    const last30DaysDiscoveries = allRuns.filter(r => (r.timestamp || 0) >= now - 30 * 24 * 60 * 60 * 1000);
    const last7DaysDiscoveries = allRuns.filter(r => (r.timestamp || 0) >= now - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalRuns: uniqueRunsCount,  // Use unique count, not allRuns.length
      totalIdeasDiscovered: totalIdeasDiscovered,  // Always use calculated value
      totalValidations: allValidations.length,
      validationsWithScores: validationsWithScores.length,
      avgScore: avgScore.toFixed(1),
      highScores,
      mediumScores,
      lowScores,
      topInterestArea,
      topGoalType,
      validationsLast30Days: last30DaysValidations.length,
      validationsLast7Days: last7DaysValidations.length,
      discoveriesLast30Days: last30DaysDiscoveries.length,
      discoveriesLast7Days: last7DaysDiscoveries.length,
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
          <div className="flex gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Split Layout: Discovery on Left, Validations on Right */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        
        {/* DISCOVERY SECTION */}
        <div className="rounded-2xl border-2 border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50/50 to-white dark:from-brand-900/20 dark:to-slate-800/50 p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-brand-100 dark:bg-brand-900/30 p-3">
              <span className="text-2xl">💡</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Discovery Analytics</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Sessions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalRuns}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Ideas Discovered</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalIdeasDiscovered}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last 7 Days</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.discoveriesLast7Days}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last 30 Days</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.discoveriesLast30Days}</p>
            </div>
          </div>
          
          {stats.topInterestArea !== "None" && (
            <div className="mt-4 rounded-xl border border-brand-200/60 dark:border-brand-700/60 bg-brand-50/50 dark:bg-brand-900/20 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Top Interest Area</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">{stats.topInterestArea}</p>
            </div>
          )}
          
          {stats.topGoalType !== "None" && (
            <div className="mt-4 rounded-xl border border-brand-200/60 dark:border-brand-700/60 bg-brand-50/50 dark:bg-brand-900/20 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Top Goal Type</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">{stats.topGoalType}</p>
            </div>
          )}
        </div>

        {/* VALIDATION SECTION */}
        <div className="rounded-2xl border-2 border-coral-200/60 dark:border-coral-700/60 bg-gradient-to-br from-coral-50/50 to-white dark:from-coral-900/20 dark:to-slate-800/50 p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-coral-100 dark:bg-coral-900/30 p-3">
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Validation Analytics</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Validations</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.totalValidations}</p>
            </div>
            
            {stats.validationsWithScores > 0 && (
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Score</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
                  {stats.avgScore}
                  <span className="text-lg text-slate-500 dark:text-slate-400">/10</span>
                </p>
              </div>
            )}
            
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last 7 Days</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.validationsLast7Days}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-4 shadow-md">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last 30 Days</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">{stats.validationsLast30Days}</p>
            </div>
          </div>
          
          {stats.highScores > 0 && (
            <div className="mt-4 rounded-xl border border-green-200/60 dark:border-green-700/60 bg-green-50/50 dark:bg-green-900/20 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High Scores (≥7)</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">{stats.highScores}</p>
            </div>
          )}
        </div>
      </div>

      {/* Score Distribution - Validation Section */}
      {stats.validationsWithScores > 0 && (
        <div className="mb-8 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">Score Distribution</h2>
          <div className="grid gap-4 md:grid-cols-3">
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
      )}

      {/* Insights & Recommendations - Balanced */}
      {(stats.totalRuns > 0 || stats.totalValidations > 0) && (
        <div className="rounded-2xl border border-brand-200/60 dark:border-brand-700/60 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:from-brand-900/30 dark:to-brand-800/20 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50">💡 Insights</h2>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            {stats.totalRuns > 0 && (
              <p>
                💡 You've discovered <strong>{stats.totalIdeasDiscovered} ideas</strong> across <strong>{stats.totalRuns} discovery session{stats.totalRuns !== 1 ? 's' : ''}</strong>.
              </p>
            )}
            {stats.topInterestArea !== "None" && (
              <p>
                🎯 Your primary focus area is <strong>{stats.topInterestArea}</strong>. Consider exploring related opportunities.
              </p>
            )}
            {stats.totalValidations > 0 && stats.validationsWithScores > 0 && (
              <>
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
              </>
            )}
            {(stats.discoveriesLast30Days > 0 || stats.validationsLast30Days > 0) && (
              <p>
                📈 You've been active with <strong>{stats.discoveriesLast30Days} discoveries</strong> and <strong>{stats.validationsLast30Days} validations</strong> in the last month. Keep exploring!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


