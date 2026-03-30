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

  if (!session) {
    redirect("/login");
  }

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id },
    include: { business: true },
  });

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
        businessName={membership.business.name}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="pt-14 lg:pt-0 p-6">{children}</div>
      </main>
    </div>
  );
}
