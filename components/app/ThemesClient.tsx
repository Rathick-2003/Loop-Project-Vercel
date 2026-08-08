"use client";

import { useEffect, useState, useCallback } from "react";

interface Theme {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count?: { feedback: number };
}

const PRESET_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16"];

export function ThemesClient({ workspaceId }: { workspaceId: string }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Theme | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/themes?workspaceId=${workspaceId}`);
      const data = await res.json();
      setThemes(data.themes ?? []);
    } catch {
      setError("Failed to load themes.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchThemes(); }, [fetchThemes]);

  function openCreate() {
    setEditTarget(null);
    setFormName("");
    setFormDesc("");
    setFormColor(PRESET_COLORS[0]);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(theme: Theme) {
    setEditTarget(theme);
    setFormName(theme.name);
    setFormDesc(theme.description ?? "");
    setFormColor(theme.color ?? PRESET_COLORS[0]);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setFormSubmitting(true);
    try {
      if (editTarget) {
        const res = await fetch(`/api/themes/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || null, color: formColor }),
        });
        if (!res.ok) throw new Error("Failed to update theme");
      } else {
        const res = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, name: formName.trim(), description: formDesc.trim() || null, color: formColor }),
        });
        if (!res.ok) throw new Error("Failed to create theme");
      }
      setShowForm(false);
      fetchThemes();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this theme? Feedback associations will be removed.")) return;
    await fetch(`/api/themes/${id}`, { method: "DELETE" });
    fetchThemes();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Themes</h1>
          <p className="mt-1 text-sm text-zinc-500">Group feedback by topic to identify trends.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Theme
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
          <svg className="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300 text-sm">{error}</div>
      ) : themes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 py-20 text-center">
          <p className="text-zinc-500 text-sm">No themes yet. Create your first theme to start grouping feedback.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <div key={theme.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ background: theme.color ?? "#10b981" }}
                    aria-hidden
                  />
                  <h3 className="font-medium text-zinc-100 text-sm">{theme.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(theme)}
                    className="rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                    aria-label={`Edit ${theme.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(theme.id)}
                    className="rounded p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    aria-label={`Delete ${theme.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              {theme.description && (
                <p className="text-xs text-zinc-500 line-clamp-2">{theme.description}</p>
              )}
              {theme._count !== undefined && (
                <p className="text-xs text-zinc-600">
                  {theme._count.feedback} feedback item{theme._count.feedback !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Theme form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="theme-form-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl">
            <h2 id="theme-form-title" className="mb-4 text-lg font-semibold text-zinc-100">
              {editTarget ? "Edit Theme" : "New Theme"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{formError}</div>
              )}
              <div>
                <label htmlFor="theme-name" className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
                <input
                  id="theme-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. Onboarding, Performance, Pricing"
                />
              </div>
              <div>
                <label htmlFor="theme-desc" className="block text-sm font-medium text-zinc-300 mb-1">Description (optional)</label>
                <textarea
                  id="theme-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  placeholder="Brief description of this theme"
                />
              </div>
              <div>
                <p className="block text-sm font-medium text-zinc-300 mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`h-6 w-6 rounded-full transition-all ${formColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : "hover:scale-105"}`}
                      style={{ background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {formSubmitting ? "Saving…" : editTarget ? "Save Changes" : "Create Theme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
