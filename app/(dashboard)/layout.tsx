import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { BfcacheGuard } from "@/components/layout/bfcache-guard";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.log("LAYOUT SESSION:", session?.user?.email ?? "NULL");

  if (!session) {
    redirect("/login");
  }

  console.log("USER ID:", session.user.id);

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id },
    include: { business: true },
  });

  console.log("MEMBERSHIP:", membership?.role ?? "NULL");

  if (!membership) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <BfcacheGuard />
      <Sidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
          image: session.user.image ?? null,
        }}
        role={membership.role}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
