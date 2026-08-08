"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  _count?: { users: number; feedback: number };
}

export function SettingsClient({
  workspaceId,
  userRole,
}: {
  workspaceId: string;
  userRole: string;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN";

  useEffect(() => {
    fetch(`/api/workspace?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        setWorkspace(d.workspace);
        setName(d.workspace?.name ?? "");
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!name.trim()) { setSaveError("Workspace name cannot be empty."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: name.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
        <svg className="h-5 w-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your workspace configuration.</p>
      </div>

      {/* Workspace info */}
      <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6 space-y-5">
        <h2 className="text-base font-semibold text-zinc-100">Workspace</h2>

        {workspace && (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-zinc-800/40 p-4 text-sm">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Created</p>
              <p className="text-zinc-300">{new Date(workspace.createdAt).toLocaleDateString()}</p>
            </div>
            {workspace._count && (
              <>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Members</p>
                  <p className="text-zinc-300">{workspace._count.users}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Feedback entries</p>
                  <p className="text-zinc-300">{workspace._count.feedback}</p>
                </div>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {saveError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{saveError}</div>
          )}
          {saved && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Workspace name saved.
            </div>
          )}
          <div>
            <label htmlFor="ws-name" className="block text-sm font-medium text-zinc-300 mb-1">Workspace Name</label>
            <input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {!isAdmin && (
              <p className="mt-1 text-xs text-zinc-600">Only admins can rename the workspace.</p>
            )}
          </div>
          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Member management link */}
      {isAdmin && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Members</h2>
              <p className="mt-1 text-sm text-zinc-500">Manage team members and their roles.</p>
            </div>
            <Link
              href="/settings/members"
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              Manage Members
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
