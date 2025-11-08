import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo.jsx";

const STORAGE_KEY = "sia_saved_runs";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRuns(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse saved runs", error);
      }
    }
  }, []);

  return (
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
      <Seo
        title="Dashboard | Startup Idea Advisor"
        description="Access your saved AI-generated startup reports, compare runs, and revisit recommendations."
        path="/dashboard"
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Saved Sessions</h1>
          <p className="text-slate-600">
            Revisit previous AI crew runs, compare recommendations, or rerun with updated context.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-600"
        >
          New request
        </Link>
      </div>
      {runs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-slate-600">
          No sessions saved yet. Run a new request to populate your dashboard.
        </div>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => (
            <article key={run.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{new Date(run.timestamp).toLocaleString()}</p>
                  <h2 className="text-lg font-semibold text-slate-800">{run.inputs.goals}</h2>
                  <p className="text-sm text-slate-600">
                    Time: {run.inputs.time_commitment} • Budget: {run.inputs.budget_range} • Risk: {run.inputs.risk_tolerance}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/results/profile?id=${run.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:border-brand-300"
                  >
                    View profile
                  </Link>
                  <Link
                    to={`/results/recommendations?id=${run.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm hover:border-brand-300"
                  >
                    View recommendations
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

