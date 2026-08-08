import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FeedbackClient } from "@/components/app/FeedbackClient";

export const metadata = { title: "Feedback — LOOP" };

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);
  return <FeedbackClient workspaceId={session!.user.workspaceId} />;
}
