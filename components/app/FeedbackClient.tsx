"use client";

import { useEffect, useState, useCallback } from "react";

type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
type FeedbackStatus = "NEW" | "REVIEWED" | "ACTIONED";

interface FeedbackItem {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: Sentiment;
  sentimentScore: number | null;
  status: FeedbackStatus;
  createdAt: string;
}

interface PaginatedResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  ACTIONED: "Actioned",
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  NEW: "bg-indigo-500/15 text-indigo-400",
  REVIEWED: "bg-amber-500/15 text-amber-400",
  ACTIONED: "bg-emerald-500/15 text-emerald-400",
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "bg-emerald-500/15 text-emerald-400",
  NEUTRAL: "bg-zinc-700 text-zinc-400",
  NEGATIVE: "bg-rose-500/15 text-rose-400",
};

export function FeedbackClient({ workspaceId }: { workspaceId: string }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [filterStatus, setFilterStatus] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-feedback modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addContent, setAddContent] = useState("");
  const [addChannel, setAddChannel] = useState("support");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ workspaceId, page: String(page), pageSize: String(PAGE_SIZE) });
      if (filterStatus) params.set("status", filterStatus);
      if (filterSentiment) params.set("sentiment", filterSentiment);
      if (filterChannel) params.set("channel", filterChannel);
      const res = await fetch(`/api/feedback?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PaginatedResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, page, filterStatus, filterSentiment, filterChannel]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function updateStatus(id: string, status: FeedbackStatus) {
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchItems();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!addContent.trim()) { setAddError("Content is required."); return; }
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, content: addContent.trim(), channel: addChannel }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create");
      }
      setAddContent("");
      setAddChannel("support");
      setShowAdd(false);
      fetchItems();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add feedback.");
    } finally {
      setAddSubmitting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Feedback</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} total entries</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Feedback
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACTIONED">Actioned</option>
        </select>
        <select
          value={filterSentiment}
          onChange={(e) => { setFilterSentiment(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
          aria-label="Filter by sentiment"
        >
          <option value="">All Sentiments</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEUTRAL">Neutral</option>
          <option value="NEGATIVE">Negative</option>
        </select>
        <select
          value={filterChannel}
          onChange={(e) => { setFilterChannel(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
          aria-label="Filter by channel"
        >
          <option value="">All Channels</option>
          <option value="support">Support</option>
          <option value="review">Review</option>
          <option value="survey">Survey</option>
          <option value="social">Social</option>
          <option value="email">Email</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
            <svg className="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-400">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-600">No feedback found. Try adjusting filters or add new entries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 bg-zinc-900/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="max-w-xs px-4 py-3">
                      <p className="line-clamp-2 text-zinc-300">{item.content}</p>
                      {item.customerLabel && (
                        <p className="mt-0.5 text-xs text-zinc-600">{item.customerLabel}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">{item.channel}</td>
                    <td className="px-4 py-3">
                      {item.sentiment ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_COLORS[item.sentiment]}`}>
                          {item.sentiment.toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value as FeedbackStatus)}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                        aria-label={`Update status for feedback ${item.id}`}
                      >
                        <option value="NEW">New</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="ACTIONED">Actioned</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add feedback modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-feedback-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} aria-hidden />
          <div className="relative w-full max-w-lg rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl">
            <h2 id="add-feedback-title" className="mb-4 text-lg font-semibold text-zinc-100">Add Feedback</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{addError}</div>
              )}
              <div>
                <label htmlFor="add-content" className="block text-sm font-medium text-zinc-300 mb-1">Content</label>
                <textarea
                  id="add-content"
                  value={addContent}
                  onChange={(e) => setAddContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  placeholder="Paste or type customer feedback…"
                />
              </div>
              <div>
                <label htmlFor="add-channel" className="block text-sm font-medium text-zinc-300 mb-1">Channel</label>
                <select
                  id="add-channel"
                  value={addChannel}
                  onChange={(e) => setAddChannel(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="support">Support</option>
                  <option value="review">Review</option>
                  <option value="survey">Survey</option>
                  <option value="social">Social</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addSubmitting} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {addSubmitting ? "Adding…" : "Add Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
