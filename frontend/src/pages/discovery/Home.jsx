import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useReports } from "../../context/ReportsContext.jsx";
import Seo from "../../components/common/Seo.jsx";
import DiscoveryLoadingIndicator from "../../components/discovery/DiscoveryLoadingIndicator.jsx";
import { intakeScreen } from "../../config/intakeScreen.js";

const fieldClasses =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 p-4 text-slate-800 dark:text-slate-200 shadow-sm transition focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900";

const STEP_STRUCTURE = [
  ["goal_type", "time_commitment", "budget_range"],
  ["interest_area", "work_style"],
  ["skill_strength", "experience_summary"],
];

const TOTAL_STEPS = STEP_STRUCTURE.length;

const FIELD_MAP = intakeScreen.fields.reduce((acc, field) => {
  acc[field.id] = field;
  if (field.sub_field) {
    acc[field.sub_field.id] = { ...field.sub_field, parentId: field.id };
  }
  return acc;
}, {});

export default function HomePage() {
  const navigate = useNavigate();
  const { inputs, setInputs, loading, error, runCrew, reports } = useReports();
  const [localInputs, setLocalInputs] = useState(inputs);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocalInputs(inputs);
    setStep(0);
    setTouched(false);
  }, [inputs]);

  // Handle scroll to form when navigating from Dashboard (Edit button)
  useEffect(() => {
    const scrollToForm = () => {
      const formElement = document.getElementById("intake-form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // Check if we have a hash or if inputs were just loaded (from Edit button)
    const hash = window.location.hash;
    if (hash === "#intake-form") {
      setTimeout(scrollToForm, 300);
      // Clear hash after scrolling
      window.history.replaceState(null, "", window.location.pathname);
    } else if (inputs && Object.keys(inputs).length > 0 && Object.values(inputs).some(v => v && v !== "")) {
      // If inputs were loaded (e.g., from Edit button), scroll to form
      setTimeout(scrollToForm, 300);
    }
  }, [inputs]);

  const requiredFieldIds = useMemo(() => {
    const ids = new Set();
    intakeScreen.fields.forEach((field) => {
      if (field.required) {
        ids.add(field.id);
      }
      if (field.sub_field?.required) {
        ids.add(field.sub_field.id);
      }
    });
    return ids;
  }, []);

  const getFieldsForStep = (stepIndex) => {
    const fieldIds = STEP_STRUCTURE[stepIndex] ?? [];
    return fieldIds.flatMap((id) => {
      const field = FIELD_MAP[id];
      if (!field) {
        return [];
      }
      if (field.sub_field) {
        return [id, field.sub_field.id];
      }
      return [id];
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "interest_area") {
      const interestField = FIELD_MAP[name];
      if (interestField?.sub_field) {
        const optionsByParent = interestField.sub_field.options_by_parent ?? {};
        const subOptions = optionsByParent[value] ?? [];
        const nextSubValue =
          subOptions.length === 1 && subOptions[0] === "Custom Sub-Area Text Field"
            ? ""
            : subOptions[0] ?? "";

        setLocalInputs((prev) => ({
          ...prev,
          [name]: value,
          [interestField.sub_field.id]: nextSubValue,
        }));
        return;
      }
    }

    setLocalInputs((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    const fields = getFieldsForStep(step);
    return fields.every((fieldId) => {
      if (!requiredFieldIds.has(fieldId)) {
        return true;
      }
      const value = localInputs[fieldId];
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== "";
    });
  };

  const handleNext = () => {
    if (validateStep()) {
      setTouched(false);
      setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    } else {
      setTouched(true);
    }
  };

  const handleBack = () => {
    setTouched(false);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep()) {
      setTouched(true);
      return;
    }
    setInputs(localInputs);
    const { success, runId } = await runCrew(localInputs);
    if (success) {
      navigate(runId ? `/results/profile?id=${runId}` : "/results/profile");
    }
  };

  const fieldValue = (fieldId) => localInputs[fieldId] ?? "";

  const showError = (fieldId) => {
    if (!touched || !requiredFieldIds.has(fieldId)) {
      return false;
    }
    const value = fieldValue(fieldId);
    if (typeof value === "string") {
      return value.trim().length === 0;
    }
    return !value;
  };

  const renderSubField = (parentField) => {
    if (!parentField.sub_field) {
      return null;
    }

    const subField = parentField.sub_field;
    const parentValue = fieldValue(parentField.id);
    const optionsByParent = subField.options_by_parent ?? {};
    const subOptions = optionsByParent[parentValue] ?? [];
    const isCustomInput =
      subOptions.length === 1 && subOptions[0] === "Custom Sub-Area Text Field";

    if (isCustomInput) {
      return (
        <div className="grid gap-2" key={subField.id}>
          <label htmlFor={subField.id} className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {subField.label}
            {subField.required && <span className="text-brand-500"> *</span>}
          </label>
          <input
            id={subField.id}
            name={subField.id}
            type="text"
            className={fieldClasses}
            value={fieldValue(subField.id)}
            onChange={handleChange}
            placeholder="Describe your focus area"
          />
          {showError(subField.id) && (
            <p className="text-xs text-red-500">Please add a sub-interest focus.</p>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-2" key={subField.id}>
        <label htmlFor={subField.id} className="text-sm font-semibold text-slate-700">
          {subField.label}
          {subField.required && <span className="text-brand-500"> *</span>}
        </label>
        <select
          id={subField.id}
          name={subField.id}
          className={fieldClasses}
          value={fieldValue(subField.id)}
          onChange={handleChange}
        >
          {subOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {showError(subField.id) && (
          <p className="text-xs text-red-500">Select the sub-interest that fits best.</p>
        )}
      </div>
    );
  };

  const renderField = (field) => {
    if (!field) {
      return null;
    }

    if (field.id === "interest_area") {
      return (
        <div className="grid gap-4" key={field.id}>
          <div className="grid gap-2">
            <label htmlFor={field.id} className="text-sm font-semibold text-slate-700">
              {field.label}
              {field.required && <span className="text-brand-500"> *</span>}
            </label>
            <select
              id={field.id}
              name={field.id}
              className={fieldClasses}
              value={fieldValue(field.id)}
              onChange={handleChange}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {showError(field.id) && (
              <p className="text-xs text-red-500">Choose the area that best matches your interest.</p>
            )}
          </div>
          {renderSubField(field)}
        </div>
      );
    }

    if (field.type === "picklist") {
      return (
        <div className="grid gap-2" key={field.id}>
          <label htmlFor={field.id} className="text-sm font-semibold text-slate-700">
            {field.label}
            {field.required && <span className="text-brand-500"> *</span>}
          </label>
          <select
            id={field.id}
            name={field.id}
            className={fieldClasses}
            value={fieldValue(field.id)}
            onChange={handleChange}
          >
            {!field.required && (
              <option value="">No preference</option>
            )}
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {showError(field.id) && (
            <p className="text-xs text-red-500">Please select an option.</p>
          )}
        </div>
      );
    }

    if (field.type === "short_text") {
      return (
        <div className="grid gap-2" key={field.id}>
          <label htmlFor={field.id} className="text-sm font-semibold text-slate-700">
            {field.label}
            {field.required && <span className="text-brand-500"> *</span>}
          </label>
          <input
            id={field.id}
            name={field.id}
            type="text"
            className={fieldClasses}
            value={fieldValue(field.id)}
            onChange={handleChange}
            maxLength={field.max_length}
            placeholder={field.placeholder}
          />
          {field.max_length && (
            <p className="text-xs text-slate-500">
              {fieldValue(field.id).length}/{field.max_length} characters
            </p>
          )}
          {showError(field.id) && (
            <p className="text-xs text-red-500">This field is required.</p>
          )}
        </div>
      );
    }

    return null;
  };

  const renderStepContent = () => {
    const fieldsForStep = STEP_STRUCTURE[step]
      .map((fieldId) => FIELD_MAP[fieldId])
      .filter(Boolean);

    return <div className="grid gap-6">{fieldsForStep.map((field) => renderField(field))}</div>;
  };

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className="grid gap-12">
      {loading && <DiscoveryLoadingIndicator />}
      <Seo
        title="AI Startup Idea Generator | Startup Idea Advisor"
        description="Provide your goals, availability, and expertise—our AI advisor researches markets and delivers personalized startup recommendations."
        path="/"
        keywords="ai startup idea generator, business idea advisor, personalized startup recommendations"
      >
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Startup Idea Advisor",
            url: "https://startupideaadvisor.com",
            logo: "https://startupideaadvisor.com/logo.png",
            sameAs: [
              "https://www.linkedin.com/company/startup-idea-advisor",
              "https://twitter.com/startupideaAI",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              email: "hello@startupideaadvisor.com",
              contactType: "customer support",
            },
          })}
        </script>
      </Seo>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/90 via-brand-600 to-brand-800 p-[1px] shadow-soft">
        <div className="relative rounded-[calc(1.5rem-1px)] bg-white/95 dark:bg-slate-800/95 px-6 py-12 sm:px-10">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-900/30 px-4 py-1 text-sm font-medium text-brand-700 dark:text-brand-400">
              AI co-pilot for side hustles & founders
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
              Turn your profile into vetted startup ideas
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Share your goals, time, and strengths. Our AI advisor researches markets, evaluates risks, and hands you advisor-grade recommendations within minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#start"
                className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-600"
              >
                Start your free beta run
              </a>
              <Link
                to="/pricing"
                className="rounded-xl border border-white/70 dark:border-slate-600 bg-white/70 dark:bg-slate-700/70 px-5 py-3 text-sm font-semibold text-brand-700 dark:text-brand-400 shadow-sm transition hover:border-brand-300 dark:hover:border-brand-500"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Why founders use Startup Idea Advisor</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Personalized insight",
              body: "Ideas are tailored to your skills, budget, time, and appetite for risk—no generic lists.",
            },
            {
              title: "Advisor-grade analysis",
              body: "Each report includes market research, financial outlook, and risk mitigation steps.",
            },
            {
              title: "Faster validation",
              body: "Iterate quickly with saved runs, PDF exports, and 30/60/90 day roadmaps.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <form
        id="intake-form"
        onSubmit={handleSubmit}
        className="grid gap-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-8 shadow-soft backdrop-blur"
      >
        <header className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{intakeScreen.screen_title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{intakeScreen.description}</p>
        </header>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {renderStepContent()}

        <div className="flex flex-wrap items-center gap-4">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:border-brand-300 dark:hover:border-brand-500 whitespace-nowrap"
            >
              Back
            </button>
          )}
          {step < TOTAL_STEPS - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2 text-sm font-medium text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 whitespace-nowrap"
            >
              Continue
            </button>
          )}
          {step === TOTAL_STEPS - 1 && (
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-white shadow-md transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:from-brand-300 disabled:to-brand-300 whitespace-nowrap"
            >
              {loading ? "Generating recommendations..." : "Generate recommendations"}
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <p className="text-xs text-slate-500">
          We never store your inputs. <Link to="/privacy" className="text-brand-600 underline">Read our privacy promises.</Link>
        </p>
      </form>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-slate-900">Trusted by builders at</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              quote: "It distilled my 12-year finance career into side-hustle ideas I can test on weekends.",
              name: "Priya S.",
              title: "VP Strategy, FinTech",
            },
            {
              quote: "The platform nailed ideas that fit my budget and network—without me spending weeks researching.",
              name: "Daniel M.",
              title: "Product Lead, HealthTech",
            },
            {
              quote: "Finally an advisor-grade ideation process I can rerun whenever my focus shifts.",
              name: "Lina R.",
              title: "Solo Founder",
            },
          ].map((item) => (
            <blockquote
              key={item.name}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 text-sm text-slate-600 dark:text-slate-300 shadow-sm"
            >
              <p className="italic">"{item.quote}"</p>
              <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.title}</p>
            </blockquote>
          ))}
        </div>
      </section>

      {reports && (
        <section className="rounded-3xl border border-brand-200 dark:border-brand-700 bg-brand-50/80 dark:bg-brand-900/30 p-6 text-brand-900 dark:text-brand-300 shadow-inner">
          <h2 className="text-lg font-semibold">Latest report saved</h2>
          <p className="mt-1 text-sm text-brand-700 dark:text-brand-400">
            Visit the dashboard or the tabs above to review your profile summary and recommendations anytime.
          </p>
        </section>
      )}
    </div>
  );
}
