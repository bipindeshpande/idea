import { useState } from "react";

const tips = [
  {
    id: 1,
    title: "Start with Problem Validation",
    content: "Before building, validate that your problem is real and urgent. Use customer interviews to confirm pain points.",
    category: "Validation",
    icon: "🎯",
  },
  {
    id: 2,
    title: "Test Willingness to Pay Early",
    content: "Don't wait until launch to test pricing. Create a landing page and see if people will pre-order or sign up.",
    category: "Pricing",
    icon: "💰",
  },
  {
    id: 3,
    title: "Focus on One Idea at a Time",
    content: "It's tempting to explore multiple ideas, but deep focus on one idea yields better validation results.",
    category: "Strategy",
    icon: "🎯",
  },
  {
    id: 4,
    title: "Use 'Discover Related Ideas' After Validation",
    content: "After validating an idea, use the 'Discover Related Ideas' feature to explore similar opportunities with pre-filled data.",
    category: "Platform",
    icon: "💡",
  },
  {
    id: 5,
    title: "Review Your Validation Scores",
    content: "Pay attention to scores below 6 - these indicate areas that need significant improvement before proceeding.",
    category: "Validation",
    icon: "📊",
  },
];

export default function DashboardTips() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const currentTip = tips[currentTipIndex];

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  const prevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  };

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 p-6 shadow-sm" style={{ minHeight: '200px' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{currentTip.icon}</span>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">Tip of the Day</h2>
            <span className="text-xs text-brand-600">{currentTip.category}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={prevTip}
            className="rounded-lg bg-white/60 p-1.5 text-brand-600 hover:bg-white/80 transition"
            aria-label="Previous tip"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextTip}
            className="rounded-lg bg-white/60 p-1.5 text-brand-600 hover:bg-white/80 transition"
            aria-label="Next tip"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{currentTip.title}</h3>
      <p className="text-sm text-slate-700 leading-relaxed">{currentTip.content}</p>
      <div className="mt-4 flex gap-1">
        {tips.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentTipIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === currentTipIndex ? "w-6 bg-brand-500" : "w-1.5 bg-brand-300"
            }`}
            aria-label={`Go to tip ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

