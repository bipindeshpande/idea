import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Seo from "../components/Seo.jsx";
import { useReports } from "../context/ReportsContext.jsx";
import { trimFromHeading, parseTopIdeas } from "../utils/markdown.js";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RecommendationsReport() {
  const { reports, loadRunById, currentRunId } = useReports();
  const query = useQuery();
  const runId = query.get("id");
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (runId) {
      loadRunById(runId);
    }
  }, [runId, loadRunById]);

  const markdown = useMemo(
    () => trimFromHeading(reports?.personalized_recommendations ?? "", "### Comprehensive Recommendation Report"),
    [reports]
  );

  const ideas = useMemo(() => parseTopIdeas(markdown, 5), [markdown]);
  const [activeIdeaIndex, setActiveIdeaIndex] = useState(ideas[0]?.index ?? null);

  useEffect(() => {
    if (ideas.length > 0) {
      setActiveIdeaIndex(ideas[0].index);
    }
  }, [ideas]);

  const activeIdea = ideas.find((idea) => idea.index === activeIdeaIndex);

  const remainderMarkdown = useMemo(() => {
    if (!markdown) return "";
    if (ideas.length === 0) return markdown;
    let remainder = markdown;
    ideas.forEach((idea) => {
      if (idea.fullText) {
        remainder = remainder.replace(idea.fullText, "");
      }
    });
    return remainder.trim();
  }, [markdown, ideas]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current || downloading) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`startup-idea-advisor-${runId || currentRunId || Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="grid gap-6">
      <Seo
        title="Personalized Startup Recommendations | Startup Idea Advisor"
        description="Review AI-generated startup ideas, financial outlook, and execution roadmap tailored to your profile."
        path="/results/recommendations"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Recommendation Report</h1>
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={downloading || !markdown}
          className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:border-brand-400 hover:text-brand-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          {downloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>

      <div ref={reportRef} className="grid gap-6">
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
          <div className="prose prose-slate">
            <ReactMarkdown>{markdown ? markdown.split("\n\n")[0] : "No recommendations available."}</ReactMarkdown>
          </div>
        </article>

        {ideas.length === 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
            <h2 className="text-lg font-semibold">Reports not generated yet</h2>
            <p className="mt-2 text-sm">
              The last run produced only a brief summary. Please rerun the crew with richer inputs (professional background, skills, budget, etc.) so the advisor can craft detailed recommendations.
            </p>
          </div>
        )}

        {ideas.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">
              Top Startup Ideas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select an idea below to view the detailed recommendation.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Idea</th>
                    <th className="px-4 py-3">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ideas.map((idea) => (
                    <tr
                      key={idea.index}
                      className={`cursor-pointer transition hover:bg-brand-50/60 ${
                        idea.index === activeIdeaIndex ? "bg-brand-50/80" : ""
                      }`}
                      onClick={() => setActiveIdeaIndex(idea.index)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-600">{idea.index}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{idea.title}</td>
                      <td className="px-4 py-3 text-slate-600">{idea.summary}</td>
                    </tr>
                  ))}
                  {ideas.length < 5 && (
                    <tr className="bg-slate-50/60 text-slate-500">
                      <td colSpan={3} className="px-4 py-3 text-center italic">
                        Awaiting additional ideas—try rerunning with broader preferences.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeIdea && (
          <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
            <h3 className="text-2xl font-semibold text-slate-900">
              {activeIdea.index}. {activeIdea.title}
            </h3>
            <div className="mt-4 prose prose-slate">
              <ReactMarkdown>{activeIdea.body || "Details coming soon."}</ReactMarkdown>
            </div>
          </article>
        )}

        {remainderMarkdown && (
          <article className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-soft">
            <div className="prose prose-slate">
              <ReactMarkdown>{remainderMarkdown}</ReactMarkdown>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
