import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateBusinessSchema = z.object({
  name: z.string().min(1, "Business name is required").max(100),
});

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const adminMembership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id, role: "admin" },
  });

  if (!adminMembership) {
    return NextResponse.json(
      { data: null, error: "Forbidden" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = updateBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  const business = await prisma.business.update({
    where: { id: adminMembership.businessId },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ data: { business }, error: null });
}
