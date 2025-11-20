import { useEffect, useState } from "react";

const steps = [
  "Analyzing your profile",
  "Researching market opportunities",
  "Evaluating risks & finances",
  "Preparing recommendations",
];

export default function LoadingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-6 shadow-soft">
      <div className="flex items-center gap-3 text-brand-700">
        <span className="h-3 w-3 animate-ping rounded-full bg-brand-500"></span>
        <p className="text-sm font-semibold uppercase tracking-wide">
          Generating recommendations (takes ~60 seconds)
        </p>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-full animate-progress bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />
      </div>
      <p className="mt-4 text-sm text-brand-800">{steps[stepIndex]}...</p>
    </div>
  );
}

