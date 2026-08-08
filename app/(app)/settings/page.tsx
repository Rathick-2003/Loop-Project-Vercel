import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsClient } from "@/components/app/SettingsClient";

export const metadata = { title: "Settings — LOOP" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  return (
    <SettingsClient
      workspaceId={session!.user.workspaceId}
      userRole={session!.user.role}
    />
  );
}
