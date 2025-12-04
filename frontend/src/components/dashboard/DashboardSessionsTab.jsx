import { useState, memo } from "react";
import { Link } from "react-router-dom";
import SessionCard from "./SessionCard.jsx";

function DashboardSessionsTab({
  activeTab,
  setActiveTab,
  filteredRuns,
  filteredValidations,
  loadingRuns,
  sessionHasOpenActions,
  sessionHasNotes,
  handleDelete,
  handleNewRequest,
  handleEditValidation,
}) {
  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage your idea discovery runs and validations - revisit previous recommendations or generate new ones.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200/60 dark:border-slate-700/60">
        <nav className="flex gap-2" aria-label="Session tabs">
          <button
            onClick={() => setActiveTab("ideas")}
            className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
              activeTab === "ideas"
                ? "border-brand-500 text-brand-700 dark:text-brand-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            Ideas Search ({filteredRuns.length})
          </button>
          <button
            onClick={() => setActiveTab("validations")}
            className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
              activeTab === "validations"
                ? "border-brand-500 text-brand-700 dark:text-brand-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            Validations ({filteredValidations.length})
          </button>
        </nav>
      </div>
      
      {loadingRuns ? (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading sessions...</p>
        </div>
      ) : (
        <>
          {/* Ideas Search Tab */}
          {activeTab === "ideas" && (
            <>
              {filteredRuns.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No idea discovery sessions yet.</p>
                  <Link
                    to="/advisor#intake-form"
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Discover Ideas
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRuns.map((session) => {
                    const hasOpenActions = sessionHasOpenActions(session);
                    const hasNotes = sessionHasNotes(session);
                    
                    return (
                      <SessionCard
                        key={session.id}
                        session={session}
                        hasOpenActions={hasOpenActions}
                        hasNotes={hasNotes}
                        onDelete={handleDelete}
                        onEdit={handleNewRequest}
                        isValidation={false}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Validations Tab */}
          {activeTab === "validations" && (
            <>
              {filteredValidations.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">No validations yet.</p>
                  <Link
                    to="/validate-idea"
                    className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
                  >
                    Validate Idea
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredValidations.map((session) => {
                    const hasOpenActions = sessionHasOpenActions(session);
                    const hasNotes = sessionHasNotes(session);
                    
                    return (
                      <SessionCard
                        key={session.id}
                        session={session}
                        hasOpenActions={hasOpenActions}
                        hasNotes={hasNotes}
                        onDelete={handleDelete}
                        onEdit={handleEditValidation}
                        isValidation={true}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export default memo(DashboardSessionsTab);

