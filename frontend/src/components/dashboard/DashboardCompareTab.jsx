import { memo } from "react";

function DashboardCompareTab({
  allIdeas,
  selectedIdeas,
  setSelectedIdeas,
  comparisonData,
  setComparisonData,
  comparing,
  performComparison,
}) {
  // Define all comparison rows with their data extraction logic
  const comparisonRows = [
    {
      label: "1. Summary",
      getValue: (idea) => idea.summary || idea.fullData?.summary || "N/A",
      bgClass: "",
    },
    {
      label: "2. Startup Cost",
      getValue: (idea) => idea.metrics?.startupCost || "N/A",
      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
    },
    {
      label: "3. Monthly Revenue Potential",
      getValue: (idea) => idea.metrics?.monthlyRevenue || "N/A",
      bgClass: "",
    },
    {
      label: "4. Market Size",
      getValue: (idea) => idea.metrics?.marketSize || "N/A",
      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
    },
    {
      label: "5. Competition Level",
      getValue: (idea) => idea.metrics?.competitionLevel || "N/A",
      bgClass: "",
      isBadge: true,
    },
    {
      label: "6. Risk Level",
      getValue: (idea) => idea.metrics?.riskLevel || "N/A",
      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
      isBadge: true,
    },
    {
      label: "7. Time to Market",
      getValue: (idea) => idea.metrics?.timeToMarket || "N/A",
      bgClass: "",
    },
    {
      label: "8. Target Customer Segment",
      getValue: (idea) => idea.metrics?.customerSegment || "N/A",
      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
    },
    {
      label: "9. Key Strengths",
      getValue: (idea) => idea.metrics?.keyStrengths || idea.summary?.substring(0, 80) || "N/A",
      bgClass: "",
    },
    {
      label: "10. Scalability Potential",
      getValue: (idea) => idea.metrics?.scalability || "N/A",
      bgClass: "bg-slate-50/50 dark:bg-slate-900/50",
      isBadge: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-2">Compare Ideas</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select up to 5 ideas to compare side-by-side. Compare different ideas from your discovery sessions to see their differences and similarities.
        </p>
      </div>

      {!comparisonData ? (
        <div className="space-y-6">
          {/* Ideas List */}
          <section className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Select Ideas to Compare</h4>
            </div>
            {allIdeas.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No ideas found. Create some idea discovery sessions first.</p>
            ) : (
              <div className="space-y-2">
                {allIdeas.map((idea) => {
                  const isSelected = selectedIdeas.has(idea.id);
                  return (
                    <label
                      key={idea.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(selectedIdeas);
                          if (newSet.has(idea.id)) {
                            newSet.delete(idea.id);
                          } else {
                            if (newSet.size >= 5) {
                              alert("Maximum 5 ideas can be compared at once");
                              return;
                            }
                            newSet.add(idea.id);
                          }
                          setSelectedIdeas(newSet);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          {idea.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {idea.summary}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : "Unknown date"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {/* Compare Button */}
          <div className="flex justify-center">
            <button
              onClick={async () => {
                if (selectedIdeas.size === 0) {
                  alert("Please select at least one idea to compare");
                  return;
                }

                if (selectedIdeas.size > 5) {
                  alert("Maximum 5 ideas can be compared at once");
                  return;
                }

                await performComparison(selectedIdeas);
              }}
              disabled={comparing || selectedIdeas.size === 0}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {comparing ? "Comparing..." : `Compare ${selectedIdeas.size} Idea${selectedIdeas.size !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-slate-900 dark:text-slate-50">Comparison Results</h4>
            <button
              onClick={() => {
                setComparisonData(null);
                setSelectedIdeas(new Set());
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Compare Different Ideas
            </button>
          </div>

          {/* Ideas Comparison Table */}
          {comparisonData && comparisonData.ideas && comparisonData.ideas.length > 0 && (() => {
            // Filter rows to only show those where at least one idea has non-N/A data
            const visibleRows = comparisonRows.filter(row => {
              return comparisonData.ideas.some(idea => {
                const value = row.getValue(idea);
                return value && value !== "N/A" && value.trim() !== "";
              });
            });

            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Parameter</th>
                      {comparisonData.ideas.map((idea, idx) => (
                        <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                          <div className="font-bold">{idea.title || `Idea ${idx + 1}`}</div>
                          <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
                            {idea.runCreatedAt ? new Date(idea.runCreatedAt).toLocaleDateString() : ""}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className={`border-b border-slate-100 dark:border-slate-800 ${row.bgClass}`}>
                        <td className={`px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-50 sticky left-0 ${row.bgClass || "bg-white dark:bg-slate-800"} z-10`}>
                          {row.label}
                        </td>
                        {comparisonData.ideas.map((idea, idx) => {
                          const value = row.getValue(idea);
                          return (
                            <td key={idx} className={`px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${row.label.includes("Revenue") ? "font-semibold text-green-600 dark:text-green-400" : row.label.includes("Startup Cost") ? "font-semibold" : ""} ${row.label.includes("Summary") ? "max-w-md" : ""}`}>
                              {row.isBadge ? (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                  value === "Low" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                  value === "Medium" || value === "Moderate" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                  value === "High" || value === "Intense" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                  value === "Excellent" || value === "Good" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                  "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}>
                                  {value}
                                </span>
                              ) : (
                                value
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default memo(DashboardCompareTab);

