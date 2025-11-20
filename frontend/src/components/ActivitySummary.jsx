import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ActivitySummary() {
  const { user, isAuthenticated, getAuthHeaders } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchActivity = async () => {
      try {
        const response = await fetch("/api/user/activity", {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setActivity(data.activity);
        }
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [isAuthenticated, getAuthHeaders]);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">Sign in to see your activity</p>
        <Link
          to="/login"
          className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Loading activity...</p>
      </div>
    );
  }

  const totalRuns = activity?.total_runs || 0;
  const totalValidations = activity?.total_validations || 0;
  const recentValidations = activity?.validations?.slice(0, 3) || [];
  const recentRuns = activity?.runs?.slice(0, 3) || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Your Activity</h3>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-slate-900">{totalRuns}</div>
            <div className="text-xs text-slate-500">Runs</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-slate-900">{totalValidations}</div>
            <div className="text-xs text-slate-500">Validations</div>
          </div>
        </div>
      </div>

      {totalRuns === 0 && totalValidations === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">No activity yet</p>
          <div className="mt-3 flex gap-2 justify-center">
            <Link
              to="/#intake-form"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Discover Ideas
            </Link>
            <Link
              to="/validate-idea"
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Validate Idea
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recentValidations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent Validations</h4>
              <div className="space-y-2">
                {recentValidations.map((validation) => (
                  <Link
                    key={validation.id}
                    to={`/validate-result?id=${validation.validation_id}`}
                    className="block rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Validation {validation.validation_id.slice(-6)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {validation.created_at
                            ? new Date(validation.created_at).toLocaleDateString()
                            : "Recently"}
                        </p>
                      </div>
                      {validation.overall_score !== undefined && (
                        <div className="rounded-full bg-brand-100 px-3 py-1">
                          <span className="text-sm font-semibold text-brand-700">
                            {validation.overall_score.toFixed(1)}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentRuns.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Recent Idea Discoveries</h4>
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    to={`/results/profile?id=${run.run_id}`}
                    className="block rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Run {run.run_id.slice(-6)}</p>
                        <p className="text-xs text-slate-500">
                          {run.created_at ? new Date(run.created_at).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

