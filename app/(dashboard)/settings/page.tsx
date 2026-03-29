import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id },
    include: { business: { select: { name: true } } },
  });

  if (!membership) {
    redirect("/login");
  }

  const isAdmin = membership.role === "admin";
  const businessName = membership.business.name;
  const userName = session.user.name ?? "";
  const userEmail = session.user.email ?? "";

  return (
    <SettingsClient
      isAdmin={isAdmin}
      businessName={businessName}
      userName={userName}
      userEmail={userEmail}
    />
  );
}
