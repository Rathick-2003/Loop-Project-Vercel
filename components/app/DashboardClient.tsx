"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  totalFeedback: number;
  newFeedback: number;
  reviewed: number;
  actioned: number;
  positive: number;
  neutral: number;
  negative: number;
  sentimentTrend: { date: string; positive: number; neutral: number; negative: number }[];
  statusBreakdown: { name: string; value: number }[];
  recentFeedback: { id: string; content: string; channel: string; sentiment: string | null; status: string; createdAt: string }[];
}

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#10b981",
  NEUTRAL: "#6366f1",
  NEGATIVE: "#f43f5e",
};

const STATUS_COLORS = ["#10b981", "#6366f1", "#f59e0b"];

function StatCard({
  label,
  value,
  sub,
  color = "emerald",
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: "emerald" | "indigo" | "amber" | "rose";
}) {
  const ring: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    indigo: "border-indigo-500/30 bg-indigo-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    rose: "border-rose-500/30 bg-rose-500/5",
  };
  const text: Record<string, string> = {
    emerald: "text-emerald-400",
    indigo: "text-indigo-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className={`rounded-xl border p-5 ${ring[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${text[color]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export function DashboardClient({ workspaceId }: { workspaceId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/analytics?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <svg className="h-6 w-6 animate-spin mr-3" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading dashboard…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
        {error ?? "No data available."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Voice of Customer overview for your workspace.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Feedback" value={stats.totalFeedback} color="emerald" />
        <StatCard label="New" value={stats.newFeedback} sub="Awaiting review" color="indigo" />
        <StatCard label="Positive" value={stats.positive} sub="Sentiment" color="emerald" />
        <StatCard label="Negative" value={stats.negative} sub="Sentiment" color="rose" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sentiment trend */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Sentiment Trend (30 days)</h2>
          {stats.sentimentTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-600">No trend data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.sentimentTrend}>
                <defs>
                  <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#colorPos)" strokeWidth={2} name="Positive" />
                <Area type="monotone" dataKey="neutral" stroke="#6366f1" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Neutral" />
                <Area type="monotone" dataKey="negative" stroke="#f43f5e" fill="url(#colorNeg)" strokeWidth={2} name="Negative" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">Status Breakdown</h2>
          {stats.statusBreakdown.every((s) => s.value === 0) ? (
            <p className="py-12 text-center text-sm text-zinc-600">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.statusBreakdown.map((_, index) => (
                    <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "#a1a1aa", fontSize: 12 }}>{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent feedback */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50">
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-300">Recent Feedback</h2>
        </div>
        {stats.recentFeedback.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-600">No feedback yet. Import or add your first entry.</p>
        ) : (
          <ul className="divide-y divide-zinc-800/40">
            {stats.recentFeedback.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <p className="flex-1 text-sm text-zinc-300 line-clamp-2">{item.content}</p>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {item.sentiment && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${SENTIMENT_COLORS[item.sentiment]}20`,
                        color: SENTIMENT_COLORS[item.sentiment],
                      }}
                    >
                      {item.sentiment.toLowerCase()}
                    </span>
                  )}
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {item.channel}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
