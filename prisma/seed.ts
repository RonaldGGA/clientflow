import { auth } from "@/lib/auth";
import { PrismaClient } from "../app/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function createUserWithCredentials(
  email: string,
  password: string,
  name: string,
) {
  // Si ya existe, lo devolvemos sin crear nada
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⏭️  User already exists: ${email}`);
    return existing;
  }

  // Mismo patrón que POST /api/employees
  // User + Account en una transacción, sin auth.api.signUpEmail
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        password: hashedPassword,
      },
    });

    await tx.account.create({
      data: {
        accountId: newUser.id,
        providerId: "credential",
        userId: newUser.id,
        password: hashedPassword,
      },
    });

    return newUser;
  });

  console.log(`✅ User created: ${email}`);
  return user;
}

async function main() {
  console.log("🌱 Seeding database...");

  const business = await prisma.business.upsert({
    where: { id: "demo-business-id" },
    update: {},
    create: {
      id: "demo-business-id",
      name: "The Sharp Blade Barbershop",
      slug: "the-sharp-blade-barbershop",
    },
  });

  console.log(`✅ Business: ${business.name}`);

  const PASSWORD = "password123";

  const admin = await createUserWithCredentials(
    "admin@clientflow.com",
    PASSWORD,
    "Admin User",
  );

  const staff = await createUserWithCredentials(
    "staff@clientflow.com",
    PASSWORD,
    "Staff Member",
  );

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: admin.id } },
    update: {},
    create: { businessId: business.id, userId: admin.id, role: "admin" },
  });

  console.log(`✅ Admin linked as 'admin'`);

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: staff.id } },
    update: {},
    create: { businessId: business.id, userId: staff.id, role: "staff" },
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
