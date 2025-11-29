import { useState } from "react";

/**
 * Lightweight expandable details component
 * Shows a small link that expands inline content on click
 * Perfect for adding depth without cluttering the page
 */
export default function ExpandableDetails({ 
  triggerText = "Learn more", 
  children, 
  className = "",
  icon = "→" 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
        aria-expanded={isOpen}
      >
        <span>{triggerText}</span>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>{icon}</span>
      </button>
      {isOpen && (
        <div className="mt-2 rounded-lg border border-brand-200/60 dark:border-brand-700/60 bg-brand-50/50 dark:bg-brand-900/20 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

