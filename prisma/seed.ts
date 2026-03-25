import { auth } from "@/lib/auth";
import { PrismaClient } from "../app/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function createUserIfNotExists(
  email: string,
  password: string,
  name: string,
) {
  const existing = await prisma.user.findMany({ where: { email } });
  if (existing.length !== 0) {
    console.log(`⏭️  User already exists: ${email}`);
    return existing[0];
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  const created = await prisma.user.findMany({ where: { email } });
  if (created.length === 0) throw new Error(`Failed to create user: ${email}`);

  console.log(`✅ User created: ${email}`);
  return created[0];
}

async function main() {
  console.log("🌱 Seeding database...");

  // Business — slug is the URL-friendly version of the name
  const business = await prisma.business.upsert({
    where: { id: "demo-business-id" },
    update: {},
    create: {
      id: "demo-business-id",
      name: "The Sharp Blade Barbershop",
      slug: "the-sharp-blade-barbershop",
    },
  });

  console.log(`✅ Business: ${business.name} (/${business.slug})`);

  const PASSWORD = "password123";

  const admin = await createUserIfNotExists(
    "admin@clientflow.com",
    PASSWORD,
    "Admin User",
  );

  const staff = await createUserIfNotExists(
    "staff@clientflow.com",
    PASSWORD,
    "Staff Member",
  );

  // BusinessMember has @@unique([businessId, userId]) — upsert works cleanly
  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: admin.id,
      role: "admin",
    },
  });

  console.log(`✅ Admin linked as 'admin'`);

  await prisma.businessMember.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: staff.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: staff.id,
      role: "staff",
    },
  });

  console.log(`✅ Staff linked as 'staff'`);

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("  admin@clientflow.com  /  password123");
  console.log("  staff@clientflow.com  /  password123");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
