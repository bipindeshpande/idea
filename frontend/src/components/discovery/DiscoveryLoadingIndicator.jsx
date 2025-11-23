import { useEffect, useState } from "react";

const discoverySteps = [
  { step: 1, total: 4, text: "Analyzing your profile", description: "Understanding your goals, skills, and constraints" },
  { step: 2, total: 4, text: "Researching market opportunities", description: "Identifying trends and viable startup ideas" },
  { step: 3, total: 4, text: "Evaluating risks & finances", description: "Assessing feasibility and financial outlook" },
  { step: 4, total: 4, text: "Preparing recommendations", description: "Creating personalized action plans and next steps" },
];

export default function DiscoveryLoadingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Progress through steps (don't cycle back)
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < discoverySteps.length - 1) {
          return prev + 1;
        }
        return prev; // Stay on last step
      });
    }, 15000); // Change step every 15 seconds (longer for discovery)

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(timeInterval);
    };
  }, [startTime]);

  const currentStep = discoverySteps[stepIndex];
  const estimatedTotalSeconds = 90;
  const estimatedRemaining = Math.max(0, estimatedTotalSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / estimatedTotalSeconds) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl border-2 border-brand-300 bg-white p-8 shadow-2xl">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
            </div>
          </div>
          
          <h3 className="mb-2 text-xl font-bold text-slate-900">Generating Recommendations</h3>
          <p className="mb-2 text-sm text-slate-600">
            Step {currentStep.step} of {currentStep.total}
          </p>
          
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-brand-100">
            <div 
              className="h-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <p className="mb-1 text-base font-semibold text-brand-700">
            {currentStep.text}...
          </p>
          <p className="text-xs text-slate-500">
            {currentStep.description}
          </p>
          
          <div className="mt-4 space-y-1">
            <p className="text-xs text-slate-500">
              Time elapsed: {elapsedSeconds}s
            </p>
            <p className="text-xs font-medium text-brand-600">
              Estimated time remaining: {estimatedRemaining}s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

