import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId || workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Total counts
    const [totalFeedback, newFeedback, reviewed, actioned, positive, neutral, negative] =
      await Promise.all([
        db.feedback.count({ where: { workspaceId } }),
        db.feedback.count({ where: { workspaceId, status: "NEW" } }),
        db.feedback.count({ where: { workspaceId, status: "REVIEWED" } }),
        db.feedback.count({ where: { workspaceId, status: "ACTIONED" } }),
        db.feedback.count({ where: { workspaceId, sentiment: "POSITIVE" } }),
        db.feedback.count({ where: { workspaceId, sentiment: "NEUTRAL" } }),
        db.feedback.count({ where: { workspaceId, sentiment: "NEGATIVE" } }),
      ]);

    // Sentiment trend: last 30 days, grouped by day
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentItems = await db.feedback.findMany({
      where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
      select: { sentiment: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Build a day-keyed map
    const trendMap: Record<string, { positive: number; neutral: number; negative: number }> = {};
    for (const item of recentItems) {
      const day = item.createdAt.toISOString().split("T")[0];
      if (!trendMap[day]) trendMap[day] = { positive: 0, neutral: 0, negative: 0 };
      if (item.sentiment === "POSITIVE") trendMap[day].positive++;
      else if (item.sentiment === "NEUTRAL") trendMap[day].neutral++;
      else if (item.sentiment === "NEGATIVE") trendMap[day].negative++;
    }

    const sentimentTrend = Object.entries(trendMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    const statusBreakdown = [
      { name: "New", value: newFeedback },
      { name: "Reviewed", value: reviewed },
      { name: "Actioned", value: actioned },
    ];

    // Recent feedback
    const recentFeedback = await db.feedback.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        content: true,
        channel: true,
        sentiment: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      totalFeedback,
      newFeedback,
      reviewed,
      actioned,
      positive,
      neutral,
      negative,
      sentimentTrend,
      statusBreakdown,
      recentFeedback,
    });
  } catch (error) {
    console.error("[analytics] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
