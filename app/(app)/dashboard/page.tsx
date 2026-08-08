import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "@/components/app/DashboardClient";

export const metadata = { title: "Dashboard — LOOP" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <DashboardClient workspaceId={session!.user.workspaceId} />;
}
