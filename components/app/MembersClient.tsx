"use client";

import { useEffect, useState, useCallback } from "react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-emerald-500/15 text-emerald-400",
  ANALYST: "bg-indigo-500/15 text-indigo-400",
  VIEWER: "bg-zinc-700 text-zinc-400",
};

export function MembersClient({
  workspaceId,
  currentUserId,
}: {
  workspaceId: string;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/members?workspaceId=${workspaceId}`);
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      setError("Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function updateRole(memberId: string, role: Role) {
    await fetch(`/api/workspace/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchMembers();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    await fetch(`/api/workspace/members/${memberId}`, { method: "DELETE" });
    fetchMembers();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword) {
      setInviteError("All fields are required.");
      return;
    }
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/workspace/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          password: invitePassword,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to add member");
      }
      setShowInvite(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("VIEWER");
      fetchMembers();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setInviteSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Members</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage who has access to this workspace.</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteError(null); }}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Member
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
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-900/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {members.map((member) => {
                const isSelf = member.id === currentUserId;
                return (
                  <tr key={member.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold uppercase text-zinc-300">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">{member.name}{isSelf && <span className="ml-1 text-xs text-zinc-600">(you)</span>}</p>
                          <p className="text-xs text-zinc-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                          {member.role}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => updateRole(member.id, e.target.value as Role)}
                          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                          aria-label={`Change role for ${member.name}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-xs text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add member modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="invite-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInvite(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-700/60 bg-zinc-900 p-6 shadow-2xl">
            <h2 id="invite-title" className="mb-4 text-lg font-semibold text-zinc-100">Add Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{inviteError}</div>
              )}
              <div>
                <label htmlFor="inv-name" className="block text-sm font-medium text-zinc-300 mb-1">Full Name</label>
                <input
                  id="inv-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label htmlFor="inv-email" className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                <input
                  id="inv-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label htmlFor="inv-password" className="block text-sm font-medium text-zinc-300 mb-1">Initial Password</label>
                <input
                  id="inv-password"
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Temporary password for the new member"
                />
              </div>
              <div>
                <label htmlFor="inv-role" className="block text-sm font-medium text-zinc-300 mb-1">Role</label>
                <select
                  id="inv-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="VIEWER">Viewer — Read-only access</option>
                  <option value="ANALYST">Analyst — Can review and act on feedback</option>
                  <option value="ADMIN">Admin — Full access</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={inviteSubmitting} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {inviteSubmitting ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
