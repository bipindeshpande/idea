import { useState, memo } from "react";
import { intakeScreen } from "../../config/intakeScreen.js";

function DashboardSearchTab({
  advancedSearch,
  setAdvancedSearch,
  searchPerformed,
  setSearchPerformed,
  selectedSearchIdeas,
  setSelectedSearchIdeas,
  filteredIdeas,
  filteredValidations,
  allIdeas,
  allValidations,
  dateFilter,
  setDateFilter,
  scoreFilter,
  setScoreFilter,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  searchInput,
  setSearchInput,
  setMainTab,
  setSelectedIdeas,
  setComparisonData,
  setAutoCompareTrigger,
  performComparison,
}) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Advanced Search</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Use multiple search criteria and filters to find exactly what you're looking for.
        </p>
      </div>

      {/* Advanced Search Form - Hide when search performed */}
      {!searchPerformed && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
          <div className="space-y-4">
            {/* Search Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Search Type
              </label>
              <select
                value={advancedSearch.searchType}
                onChange={(e) => {
                  setAdvancedSearch({
                    goalType: "all",
                    interestArea: "all",
                    ideaDescription: "",
                    budgetRange: "all",
                    timeCommitment: "all",
                    workStyle: "all",
                    skillStrength: "all",
                    searchType: e.target.value,
                  });
                  setSearchQuery("");
                  setSearchInput("");
                }}
                className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              >
                <option value="ideas">Ideas</option>
                <option value="validations">Validations</option>
              </select>
            </div>

            {/* Search Fields Grid */}
            {advancedSearch.searchType === "ideas" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Goal Type */}
                {(() => {
                  const goalTypeField = intakeScreen.fields.find(f => f.id === "goal_type");
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Goal Type
                      </label>
                      <select
                        value={advancedSearch.goalType}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, goalType: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      >
                        <option value="all">All Goal Types</option>
                        {goalTypeField?.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Interest Area */}
                {(() => {
                  const interestAreaField = intakeScreen.fields.find(f => f.id === "interest_area");
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Interest Area
                      </label>
                      <select
                        value={advancedSearch.interestArea}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, interestArea: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      >
                        <option value="all">All Interest Areas</option>
                        {interestAreaField?.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Budget Range */}
                {(() => {
                  const budgetField = intakeScreen.fields.find(f => f.id === "budget_range");
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Budget Range
                      </label>
                      <select
                        value={advancedSearch.budgetRange}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, budgetRange: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      >
                        <option value="all">All Budgets</option>
                        {budgetField?.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Time Commitment */}
                {(() => {
                  const timeField = intakeScreen.fields.find(f => f.id === "time_commitment");
                  return (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Time Commitment
                      </label>
                      <select
                        value={advancedSearch.timeCommitment}
                        onChange={(e) => setAdvancedSearch({...advancedSearch, timeCommitment: e.target.value})}
                        className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                      >
                        <option value="all">All Time</option>
                        {timeField?.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Validation Score Range */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Validation Score Range
                  </label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
                  >
                    <option value="all">All Scores</option>
                    <option value="high">High (≥7.0)</option>
                    <option value="medium">Medium (5.0-6.9)</option>
                    <option value="low">Low (&lt;5.0)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  const queryParts = [];
                  if (advancedSearch.goalType && advancedSearch.goalType !== "all") queryParts.push(advancedSearch.goalType);
                  if (advancedSearch.interestArea && advancedSearch.interestArea !== "all") queryParts.push(advancedSearch.interestArea);
                  if (advancedSearch.ideaDescription) queryParts.push(advancedSearch.ideaDescription);
                  setSearchQuery(queryParts.join(" ").trim() || " ");
                  setSearchInput(queryParts.join(" ").trim());
                  setSearchPerformed(true);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setAdvancedSearch({
                    goalType: "all",
                    interestArea: "all",
                    ideaDescription: "",
                    budgetRange: "all",
                    timeCommitment: "all",
                    workStyle: "all",
                    skillStrength: "all",
                    searchType: "ideas",
                  });
                  setSearchInput("");
                  setSearchQuery("");
                  setDateFilter("all");
                  setScoreFilter("all");
                  setSortBy("date");
                  setSearchPerformed(false);
                  setSelectedSearchIdeas(new Set());
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Count and Compare Button */}
      {searchPerformed && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {advancedSearch.searchType === "ideas" && (
              <>Showing {filteredIdeas.length} of {allIdeas.length} ideas</>
            )}
            {advancedSearch.searchType === "validations" && (
              <>Showing {filteredValidations.length} of {allValidations.length} validations</>
            )}
          </div>
          {advancedSearch.searchType === "ideas" && filteredIdeas.length > 0 && selectedSearchIdeas.size > 0 && (
            <button
              onClick={async () => {
                const selectedIdeasData = filteredIdeas.filter(idea => selectedSearchIdeas.has(idea.id));
                const selectedIds = new Set(selectedIdeasData.map(idea => idea.id));
                setSelectedIdeas(selectedIds);
                setComparisonData(null);
                setAutoCompareTrigger(true);
                setMainTab("compare");
                await performComparison(selectedIds);
              }}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30"
            >
              Compare {selectedSearchIdeas.size} Idea{selectedSearchIdeas.size !== 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={() => {
              setSearchPerformed(false);
              setSelectedSearchIdeas(new Set());
            }}
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            New Search
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchPerformed ? (
        <div className="space-y-4">
          {/* Ideas Results */}
          {advancedSearch.searchType === "ideas" && filteredIdeas.length > 0 && (
            <div className="grid gap-4">
              {filteredIdeas.map((idea) => {
                const isSelected = selectedSearchIdeas.has(idea.id);
                return (
                  <div
                    key={idea.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(selectedSearchIdeas);
                          if (newSet.has(idea.id)) {
                            newSet.delete(idea.id);
                          } else {
                            if (newSet.size >= 5) {
                              alert("Maximum 5 ideas can be compared at once");
                              return;
                            }
                            newSet.add(idea.id);
                          }
                          setSelectedSearchIdeas(newSet);
                        }}
                        className="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                          {idea.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {idea.summary}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Validations Results */}
          {advancedSearch.searchType === "validations" && filteredValidations.length > 0 && (
            <div className="grid gap-4">
              {filteredValidations.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4"
                >
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {session.idea_explanation || "Validation"}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    {session.overall_score !== undefined && (
                      <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                        Score: {session.overall_score.toFixed(1)}/10
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ID: {session.validation_id || session.id || "N/A"} • {session.timestamp ? new Date(session.timestamp).toLocaleDateString() : "Unknown date"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {((advancedSearch.searchType === "ideas" && filteredIdeas.length === 0) ||
            (advancedSearch.searchType === "validations" && filteredValidations.length === 0)) && (
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {advancedSearch.searchType === "ideas" ? "No ideas found matching your search criteria." : "No validations found matching your search criteria."}
              </p>
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setDateFilter("all");
                  setScoreFilter("all");
                  setSortBy("date");
                  setSearchPerformed(false);
                  setSelectedSearchIdeas(new Set());
                }}
                className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Start Your Search</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Enter a search term above to find your ideas and validations.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use the filters below to find specific ideas that match your criteria.
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(DashboardSearchTab);

