import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ThemesClient } from "@/components/app/ThemesClient";

export const metadata = { title: "Themes — LOOP" };

export default async function ThemesPage() {
  const session = await getServerSession(authOptions);
  return <ThemesClient workspaceId={session!.user.workspaceId} />;
}
