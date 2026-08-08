import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ReportsClient } from "@/components/app/ReportsClient";

export const metadata = { title: "Reports — LOOP" };

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  return (
    <ReportsClient
      workspaceId={session!.user.workspaceId}
      userRole={session!.user.role}
    />
  );
}
