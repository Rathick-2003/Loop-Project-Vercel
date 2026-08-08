"use client";

import { useEffect, useState, useCallback } from "react";

interface Report {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentJson: unknown;
  createdAt: string;
}

interface ReportContent {
  summary?: string;
  topThemes?: string[];
  insights?: string[];
  recommendations?: string[];
  rawText?: string;
}

export function ReportsClient({
  workspaceId,
  userRole,
}: {
  workspaceId: string;
  userRole: string;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Generate form state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const canGenerate = userRole === "ADMIN" || userRole === "ANALYST";

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?workspaceId=${workspaceId}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError(null);
    if (!genTitle.trim() || !genStart || !genEnd) {
      setGenError("All fields are required.");
      return;
    }
    if (new Date(genStart) > new Date(genEnd)) {
      setGenError("Start date must be before end date.");
      return;
    }
    setGenLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: genTitle.trim(),
          periodStart: genStart,
          periodEnd: genEnd,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to generate report");
      }
      setShowGenerate(false);
      setGenTitle("");
      setGenStart("");
      fetchReports();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setGenLoading(false);
    }
  }

  async function openReport(report: Report) {
    if (!report.contentJson) {
      const res = await fetch(`/api/reports/${report.id}`);
      const data = await res.json();
      setSelectedReport(data.report);
    } else {
      setSelectedReport(report);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">AI-generated feedback analysis and insights.</p>
        </div>
        {canGenerate && (
          <button
            onClick={() => { setShowGenerate(true); setGenError(null); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Report
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
          <svg className="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 py-20 text-center">
          <p className="text-zinc-500 text-sm">No reports yet.{canGenerate ? " Generate your first AI report above." : ""}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => openReport(report)}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 text-left hover:border-emerald-500/30 hover:bg-zinc-800/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-zinc-100 text-sm group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {report.title}
                </h3>
                <svg className="h-4 w-4 flex-shrink-0 text-zinc-600 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {new Date(report.periodStart).toLocaleDateString()} – {new Date(report.periodEnd).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-zinc-600">Generated {new Date(report.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}

      {/* Generate report modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="gen-report-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowGenerate(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl">
            <h2 id="gen-report-title" className="mb-4 text-lg font-semibold text-zinc-100">Generate Report</h2>
            {genLoading ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <svg className="h-8 w-8 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-zinc-400">Analysing feedback with AI… this may take a moment.</p>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4">
                {genError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{genError}</div>
                )}
                <div>
                  <label htmlFor="gen-title" className="block text-sm font-medium text-zinc-300 mb-1">Report Title</label>
                  <input
                    id="gen-title"
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. Q3 2026 Customer Insights"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="gen-start" className="block text-sm font-medium text-zinc-300 mb-1">Period Start</label>
                    <input
                      id="gen-start"
                      type="date"
                      value={genStart}
                      onChange={(e) => setGenStart(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="gen-end" className="block text-sm font-medium text-zinc-300 mb-1">Period End</label>
                    <input
                      id="gen-end"
                      type="date"
                      value={genEnd}
                      onChange={(e) => setGenEnd(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowGenerate(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors">
                    Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Report viewer modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16" role="dialog" aria-modal="true" aria-labelledby="report-view-title">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedReport(null)} aria-hidden />
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl mb-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 id="report-view-title" className="text-lg font-semibold text-zinc-100">{selectedReport.title}</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(selectedReport.periodStart).toLocaleDateString()} – {new Date(selectedReport.periodEnd).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ReportContent content={selectedReport.contentJson as ReportContent} />
          </div>
        </div>
      )}
    </div>
  );
}

function ReportContent({ content }: { content: ReportContent }) {
  if (!content) return <p className="text-sm text-zinc-500">No content available.</p>;

  if (content.rawText) {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">{content.rawText}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {content.summary && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Summary</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{content.summary}</p>
        </section>
      )}
      {content.topThemes && content.topThemes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Top Themes</h3>
          <ul className="space-y-1">
            {content.topThemes.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
      {content.insights && content.insights.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Key Insights</h3>
          <ul className="space-y-2">
            {content.insights.map((ins, i) => (
              <li key={i} className="rounded-lg bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300">{ins}</li>
            ))}
          </ul>
        </section>
      )}
      {content.recommendations && content.recommendations.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Recommendations</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {content.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-zinc-300">{rec}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
