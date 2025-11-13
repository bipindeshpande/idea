import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Seo from "../components/Seo.jsx";
import { useReports } from "../context/ReportsContext.jsx";
import { trimFromHeading, parseTopIdeas } from "../utils/markdown.js";
import { personalizeCopy } from "../utils/recommendationFormatters.js";

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

  const allIdeas = useMemo(() => parseTopIdeas(markdown, 10), [markdown]);
  const topIdeas = allIdeas.slice(0, 3);
  const secondaryIdeas = allIdeas.slice(3);

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
        {topIdeas.length === 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-amber-800 shadow-soft">
            <h2 className="text-lg font-semibold">Reports not generated yet</h2>
            <p className="mt-2 text-sm">
              The last run produced only a brief summary. Please rerun the crew with richer inputs (professional background, skills, budget, etc.) so the advisor can craft detailed recommendations.
            </p>
          </div>
        )}

        {topIdeas.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">
              Top Startup Ideas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review your three tailored ideas. Click any row to open the full playbook with financial outlook, risk radar, validation questions, and more.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm shadow-brand-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-brand-500/10 text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Idea</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {topIdeas.map((idea) => {
                    const runQuery = runId || currentRunId;
                    const detailPath = runQuery
                      ? `/results/recommendations/${idea.index}?id=${runQuery}`
                      : `/results/recommendations/${idea.index}`;
                    return (
                      <tr key={idea.index} className="transition hover:bg-brand-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-600">{idea.index}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{idea.title}</td>
                        <td className="px-4 py-3 text-slate-600">{personalizeCopy(idea.summary)}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={detailPath}
                            className="mx-auto flex max-w-[8rem] justify-center rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
                          >
                            View details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {topIdeas.length < 3 && (
                    <tr className="bg-slate-50/60 text-slate-500">
                      <td colSpan={4} className="px-4 py-3 text-center italic">
                        Fewer than three ideas generated—rerun with expanded preferences for more options.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {topIdeas.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <Link
              to={
                runId || currentRunId
                  ? `/results/recommendations/full?id=${runId || currentRunId}`
                  : "/results/recommendations/full"
              }
              className="inline-flex items-center gap-2 rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-400 hover:text-brand-800"
            >
              View full recommendation report
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
