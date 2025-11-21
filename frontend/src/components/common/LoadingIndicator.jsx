import { useEffect, useState } from "react";

const aiSteps = [
  "Analyzing your profile",
  "Researching market opportunities",
  "Evaluating risks & finances",
  "Preparing recommendations",
];

export default function LoadingIndicator({ 
  type = "ai", 
  message = null,
  simple = false 
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (type === "ai" && !simple) {
      const interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % aiSteps.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [type, simple]);

  // Simple spinner for non-AI loading
  if (simple || type !== "ai") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
          {message && (
            <p className="text-sm text-slate-600">{message}</p>
          )}
        </div>
      </div>
    );
  }

  // Full AI loading indicator
  return (
    <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-6 shadow-soft">
      <div className="flex items-center gap-3 text-brand-700">
        <span className="h-3 w-3 animate-ping rounded-full bg-brand-500"></span>
        <p className="text-sm font-semibold uppercase tracking-wide">
          {message || "Generating recommendations (takes ~60 seconds)"}
        </p>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-full animate-progress bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
      </div>
      <p className="mt-4 text-sm text-brand-800">{aiSteps[stepIndex]}...</p>
    </div>
  );
}

