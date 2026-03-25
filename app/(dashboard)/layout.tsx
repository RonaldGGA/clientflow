import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Protected dashboard layout.
 * Secondary line of defense after proxy.ts.
 * Validates session server-side on every render.
 */
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return <div className="min-h-screen bg-zinc-950">{children}</div>;
}
