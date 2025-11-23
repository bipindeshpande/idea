import { useState } from "react";
import Seo from "../../components/common/Seo.jsx";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    topic: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({
          name: "",
          email: "",
          company: "",
          topic: "",
          message: "",
        });
      } else {
        setError(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <Seo
        title="Contact | Idea Bunch"
        description="Reach the Startup Idea Advisor team for pilots, partnerships, or support."
        path="/contact"
      />
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-8 shadow-lg">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Contact</h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Interested in pilots, partnerships, or press? Drop us a note and we'll get back within one business day.
        </p>
        
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-300/60 dark:border-emerald-700/60 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-4 shadow-sm">
            <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
              ✓ Thank you for your message! We'll get back to you soon.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300/60 dark:border-red-700/60 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 p-4 shadow-sm">
            <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
          <input
            type="email"
            name="email"
            placeholder="Work Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
          <input
            type="text"
            name="company"
            placeholder="Company / Organization"
            value={formData.company}
            onChange={handleChange}
            className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
          <input
            type="text"
            name="topic"
            placeholder="Topic"
            value={formData.topic}
            onChange={handleChange}
            className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
          <textarea
            name="message"
            placeholder="How can we help?"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            required
            className="md:col-span-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 p-3.5 text-sm text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Prefer email? Reach us at <span className="font-semibold text-brand-600 dark:text-brand-400">hello@ideabunch.com</span>
        </div>
      </div>
    </section>
  );
}

