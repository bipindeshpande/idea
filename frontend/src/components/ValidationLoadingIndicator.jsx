import { useEffect, useState } from "react";

const validationSteps = [
  "Analyzing your idea",
  "Evaluating market opportunity",
  "Assessing competitive landscape",
  "Reviewing business model viability",
  "Analyzing risks & feasibility",
  "Preparing critical feedback",
];

export default function ValidationLoadingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % validationSteps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border-2 border-brand-300 bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-slate-900">Validating Your Idea</h3>
          <p className="mb-6 text-sm text-slate-600">
            This typically takes 15-30 seconds
          </p>
          
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
            <div className="h-full w-full animate-progress bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
          </div>
          
          <p className="text-sm font-medium text-brand-700">
            {validationSteps[stepIndex]}...
          </p>
        </div>
      </div>
    </div>
  );
}

