import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().min(1, "Content is required"),
  channel: z.string().min(1, "Channel is required"),
  sourceRef: z.string().optional(),
  customerLabel: z.string().optional(),
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

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const status = searchParams.get("status") ?? undefined;
  const sentiment = searchParams.get("sentiment") ?? undefined;
  const channel = searchParams.get("channel") ?? undefined;

  try {
    const where = {
      workspaceId,
      ...(status ? { status: status as "NEW" | "REVIEWED" | "ACTIONED" } : {}),
      ...(sentiment ? { sentiment: sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE" } : {}),
      ...(channel ? { channel } : {}),
    };

    const [items, total] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error("[feedback] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { workspaceId, content, channel, sourceRef, customerLabel } = parsed.data;

  if (workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const feedback = await db.feedback.create({
      data: {
        content,
        channel,
        sourceRef: sourceRef ?? null,
        customerLabel: customerLabel ?? null,
        workspaceId,
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("[feedback] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
