import Seo from "../../components/common/Seo.jsx";

export default function ContactPage() {
  return (
    <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
      <Seo
        title="Contact | Startup Idea Advisor"
        description="Reach the Startup Idea Advisor team for pilots, partnerships, or support."
        path="/contact"
      />
      <h1 className="text-3xl font-semibold text-slate-900">Contact</h1>
      <p className="text-slate-600">
        Interested in pilots, partnerships, or press? Drop us a note and we’ll get back within one business day.
      </p>
      <form className="grid gap-4 md:grid-cols-2">
        <input
          type="text"
          placeholder="Name"
          className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
        />
        <input
          type="email"
          placeholder="Work Email"
          className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Company / Organization"
          className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Topic"
          className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
        />
        <textarea
          placeholder="How can we help?"
          rows={4}
          className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          type="button"
          className="md:col-span-2 w-full rounded-xl bg-brand-500 px-5 py-3 text-white shadow transition hover:bg-brand-600"
        >
          Send Message
        </button>
      </form>
      <div className="text-sm text-slate-500">
        Prefer email? Reach us at <span className="text-brand-600">hello@startupideaadvisor.com</span>
      </div>
    </section>
  );
}

