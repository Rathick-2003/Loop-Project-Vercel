import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
});

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
    const reports = await db.report.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        generatedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[reports] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden — only Analysts and Admins can generate reports" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });
  }

  const { workspaceId, title, periodStart, periodEnd } = parsed.data;

  if (workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  try {
    // Fetch feedback for the period
    const feedbackItems = await db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        content: true,
        channel: true,
        sentiment: true,
        status: true,
        themes: { include: { theme: { select: { name: true } } } },
      },
      take: 200, // cap to keep prompt manageable
    });

    let contentJson: Record<string, unknown>;

    if (feedbackItems.length === 0) {
      contentJson = {
        summary: "No feedback was recorded in the selected time period.",
        topThemes: [],
        insights: [],
        recommendations: [],
      };
    } else {
      // Build a concise text summary for the AI
      const feedbackText = feedbackItems
        .map((f, i) => {
          const themes = f.themes.map((ft) => ft.theme.name).join(", ");
          return `${i + 1}. [${f.channel}] [${f.sentiment ?? "unanalysed"}] ${f.content}${themes ? ` (themes: ${themes})` : ""}`;
        })
        .join("\n");

      const prompt = `You are an expert Voice of Customer analyst. Analyse the following ${feedbackItems.length} customer feedback items collected between ${periodStart} and ${periodEnd} for a SaaS product.

FEEDBACK:
${feedbackText}

Respond ONLY with a JSON object with this exact structure (no markdown, no code fence):
{
  "summary": "<2–3 sentence executive summary>",
  "topThemes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>", "<insight 4>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

      if (process.env.ANTHROPIC_API_KEY) {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const message = await anthropic.messages.create({
          model: "claude-opus-4-5",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });

        const rawText =
          message.content[0].type === "text" ? message.content[0].text : "";

        try {
          contentJson = JSON.parse(rawText);
        } catch {
          // If Claude returned invalid JSON, store raw text
          contentJson = { rawText };
        }
      } else {
        // No API key — generate a basic statistical summary
        const bySentiment = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, unanalysed: 0 };
        for (const f of feedbackItems) {
          if (f.sentiment === "POSITIVE") bySentiment.POSITIVE++;
          else if (f.sentiment === "NEUTRAL") bySentiment.NEUTRAL++;
          else if (f.sentiment === "NEGATIVE") bySentiment.NEGATIVE++;
          else bySentiment.unanalysed++;
        }

        const channelCounts: Record<string, number> = {};
        for (const f of feedbackItems) {
          channelCounts[f.channel] = (channelCounts[f.channel] ?? 0) + 1;
        }
        const topChannels = Object.entries(channelCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c, n]) => `${c} (${n})`);

        contentJson = {
          summary: `${feedbackItems.length} feedback items were collected between ${periodStart} and ${periodEnd}. Sentiment: ${bySentiment.POSITIVE} positive, ${bySentiment.NEUTRAL} neutral, ${bySentiment.NEGATIVE} negative.`,
          topThemes: topChannels,
          insights: [
            `Total feedback collected: ${feedbackItems.length}`,
            `Positive sentiment: ${Math.round((bySentiment.POSITIVE / feedbackItems.length) * 100)}%`,
            `Negative sentiment: ${Math.round((bySentiment.NEGATIVE / feedbackItems.length) * 100)}%`,
          ],
          recommendations: [
            "Connect an Anthropic API key (ANTHROPIC_API_KEY) to enable AI-generated insights.",
          ],
        };
      }
    }

    const report = await db.report.create({
      data: {
        title,
        periodStart: startDate,
        periodEnd: endDate,
        contentJson,
        workspaceId,
        generatedById: session.user.id,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("[reports] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
