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
    
    // Count only completed discoveries (runs with valid reports containing ideas)
    // This matches what Dashboard shows - only runs with personalized_recommendations
    const completedRuns = allRuns.filter(run => {
      const reports = run.reports || {};
      return reports.personalized_recommendations && 
             (typeof reports.personalized_recommendations === 'string' ? 
              reports.personalized_recommendations.trim().length > 0 : 
              Object.keys(reports.personalized_recommendations || {}).length > 0);
    });
    const uniqueRunsCount = completedRuns.length;
    const totalIdeasDiscovered = uniqueRunsCount * 3;
    
    // Interest areas from completed runs
    const interestAreas = {};
    completedRuns.forEach(run => {
      const area = run.inputs?.interest_area || run.inputs?.sub_interest_area;
      if (area) {
        interestAreas[area] = (interestAreas[area] || 0) + 1;
      }
    });
    const topInterestArea = Object.entries(interestAreas)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "None";
    
    // Goal types from completed runs
    const goalTypes = {};
    completedRuns.forEach(run => {
      const goal = run.inputs?.goal_type;
      if (goal) {
        goalTypes[goal] = (goalTypes[goal] || 0) + 1;
      }
    });
    const topGoalType = Object.entries(goalTypes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "None";
    
    // Time-based trends for both discoveries and validations
    // Use completedRuns for discovery counts to match what users see
    const now = Date.now();
    const last30DaysValidations = allValidations.filter(v => (v.timestamp || 0) >= now - 30 * 24 * 60 * 60 * 1000);
    const last7DaysValidations = allValidations.filter(v => (v.timestamp || 0) >= now - 7 * 24 * 60 * 60 * 1000);
    const last30DaysDiscoveries = completedRuns.filter(r => (r.timestamp || 0) >= now - 30 * 24 * 60 * 60 * 1000);
    const last7DaysDiscoveries = completedRuns.filter(r => (r.timestamp || 0) >= now - 7 * 24 * 60 * 60 * 1000);
    
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
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-300">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Seo
        title="Analytics Dashboard | Startup Idea Advisor"
        description="View your idea validation and discovery analytics"
        path="/dashboard/analytics"
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Insights into your idea discovery and validation journey
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Split Layout: Discovery on Left, Validations on Right */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        
        {/* DISCOVERY SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span>
            <h2 className="text-lg font-semibold text-slate-900">Discovery Analytics</h2>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Total Sessions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalRuns}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Ideas Discovered</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalIdeasDiscovered}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Last 7 Days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.discoveriesLast7Days}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Last 30 Days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.discoveriesLast30Days}</p>
            </div>
          </div>
        </div>

        {/* VALIDATION SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <h2 className="text-lg font-semibold text-slate-900">Validation Analytics</h2>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Total Validations</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalValidations}</p>
            </div>
            
            {stats.validationsWithScores > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-xs font-medium text-slate-600">Average Score</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.avgScore}<span className="text-base text-slate-500">/10</span>
                </p>
              </div>
            )}
            
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Last 7 Days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.validationsLast7Days}</p>
            </div>
            
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-xs font-medium text-slate-600">Last 30 Days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.validationsLast30Days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Score Distribution - Validation Section */}
      {stats.validationsWithScores > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Score Distribution</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">High (≥7.0)</span>
                <span className="text-slate-600">{stats.highScores}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.highScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Medium (5.0-6.9)</span>
                <span className="text-slate-600">{stats.mediumScores}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.mediumScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Low (&lt;5.0)</span>
                <span className="text-slate-600">{stats.lowScores}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-coral-500 transition-all duration-500"
                  style={{
                    width: `${stats.validationsWithScores > 0 ? (stats.lowScores / stats.validationsWithScores) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights - Modern Compact Design */}
      {(stats.totalRuns > 0 || stats.totalValidations > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Key Insights</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Discovery Insights */}
            {stats.totalRuns > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <h3 className="text-sm font-semibold text-slate-900">Discovery Activity</h3>
                </div>
                <p className="text-sm text-slate-700">
                  You've discovered <strong className="font-semibold text-slate-900">{stats.totalIdeasDiscovered} ideas</strong> across{' '}
                  <strong className="font-semibold text-slate-900">{stats.totalRuns} session{stats.totalRuns !== 1 ? 's' : ''}</strong>.
                  {stats.discoveriesLast7Days > 0 && (
                    <> <strong className="font-semibold text-slate-900">{stats.discoveriesLast7Days}</strong> this week.</>
                  )}
                </p>
                {stats.topInterestArea !== "None" && (
                  <p className="mt-2 text-xs text-slate-600">
                    Primary focus: <span className="font-semibold text-slate-900">{stats.topInterestArea}</span>
                  </p>
                )}
              </div>
            )}

            {/* Validation Insights */}
            {stats.totalValidations > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">🔍</span>
                  <h3 className="text-sm font-semibold text-slate-900">Validation Performance</h3>
                </div>
                {stats.validationsWithScores > 0 ? (
                  <>
                    <p className="text-sm text-slate-700">
                      Average score: <strong className="font-semibold text-slate-900">{stats.avgScore}/10</strong>
                      {stats.highScores > 0 && (
                        <> • <strong className="font-semibold text-slate-900">{stats.highScores}</strong> high-scoring idea{stats.highScores !== 1 ? 's' : ''} (≥7.0)</>
                      )}
                    </p>
                    {stats.validationsLast7Days > 0 && (
                      <p className="mt-2 text-xs text-slate-600">
                        <strong className="font-semibold text-slate-900">{stats.validationsLast7Days}</strong> validation{stats.validationsLast7Days !== 1 ? 's' : ''} this week
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-700">
                    <strong className="font-semibold text-slate-900">{stats.totalValidations}</strong> validation{stats.totalValidations !== 1 ? 's' : ''} completed
                  </p>
                )}
              </div>
            )}

            {/* Activity Trends */}
            {(stats.discoveriesLast30Days > 0 || stats.validationsLast30Days > 0) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <h3 className="text-sm font-semibold text-slate-900">Activity Trends</h3>
                </div>
                <p className="text-sm text-slate-700">
                  Last 30 days: <strong className="font-semibold text-slate-900">{stats.discoveriesLast30Days} discoveries</strong> •{' '}
                  <strong className="font-semibold text-slate-900">{stats.validationsLast30Days} validations</strong>
                </p>
              </div>
            )}

            {/* Goal Insights */}
            {stats.topGoalType !== "None" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-sm font-semibold text-slate-900">Goal Alignment</h3>
                </div>
                <p className="text-sm text-slate-700">
                  Most common goal: <strong className="font-semibold text-slate-900">{stats.topGoalType}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



