import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MembersClient } from "@/components/app/MembersClient";

export const metadata = { title: "Members — LOOP" };

export default async function MembersPage() {
  const session = await getServerSession(authOptions);

  // Only ADMINs may access member management
  if (session!.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <MembersClient
      workspaceId={session!.user.workspaceId}
      currentUserId={session!.user.id}
    />
  );
}
