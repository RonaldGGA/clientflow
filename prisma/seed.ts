import { auth } from "@/lib/auth";
import { PrismaClient } from "../app/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// ─── Helper: create a user + account + business member ───────────────────────
// Follows the spec pattern: ctx.password.hash + Prisma transaction.
// Never use auth.api.signUpEmail — it hijacks sessions and is unreliable
// outside HTTP context.

async function createUser({
  email,
  name,
  password,
  role,
  businessId,
}: {
  email: string;
  name: string;
  password: string;
  role: string;
  businessId: string;
}) {
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, emailVerified: true },
    });
    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashed,
      },
    });
    await tx.businessMember.create({
      data: { businessId, userId: user.id, role },
    });
    return user;
  });
}

// ─── Helper: date N days ago ──────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Spread visits throughout the day so charts look natural
  d.setHours(9 + Math.floor(Math.random() * 9)); // between 9am and 6pm
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Business ────────────────────────────────────────────────────────────────
  const business = await prisma.business.create({
    data: {
      name: "Elite Cuts Barbershop",
      slug: "elite-cuts",
    },
  });
  console.log(`✅ Business: ${business.name}`);

  // ── Admin ───────────────────────────────────────────────────────────────────
  await createUser({
    email: "admin@clientflow.demo",
    name: "Alex Rivera",
    password: "admin1234",
    role: "admin",
    businessId: business.id,
  });
  console.log("✅ Admin created");

  // ── Staff (3) ───────────────────────────────────────────────────────────────
  const carlos = await createUser({
    email: "carlos@clientflow.demo",
    name: "Carlos Rodríguez",
    password: "staff1234",
    role: "staff",
    businessId: business.id,
  });
  const miguel = await createUser({
    email: "miguel@clientflow.demo",
    name: "Miguel Santos",
    password: "staff1234",
    role: "staff",
    businessId: business.id,
  });
  const alejandro = await createUser({
    email: "alejandro@clientflow.demo",
    name: "Alejandro Pérez",
    password: "staff1234",
    role: "staff",
    businessId: business.id,
  });
  const staff = [carlos, miguel, alejandro];
  console.log("✅ 3 staff members created");

  // ── Services (15) ───────────────────────────────────────────────────────────
  const serviceData = [
    { name: "Classic Cut", basePrice: 15 },
    { name: "Cut + Beard Trim", basePrice: 25 },
    { name: "Classic Shave", basePrice: 12 },
    { name: "Beard Design", basePrice: 15 },
    { name: "Beard Trim", basePrice: 10 },
    { name: "Hair Color", basePrice: 35 },
    { name: "Bleach", basePrice: 45 },
    { name: "Hair Treatment", basePrice: 20 },
    { name: "Kids Cut", basePrice: 10 },
    { name: "Fade Cut", basePrice: 18 },
    { name: "Razor Cut", basePrice: 22 },
    { name: "Keratin Treatment", basePrice: 50 },
    { name: "Facial Mask", basePrice: 18 },
    { name: "Braids", basePrice: 30 },
    { name: "Cut + Wash + Style", basePrice: 28 },
  ];

  const services = await Promise.all(
    serviceData.map((s) =>
      prisma.service.create({
        data: { name: s.name, basePrice: s.basePrice, businessId: business.id },
      }),
    ),
  );
  console.log(`✅ ${services.length} services created`);

  // ── Clients (22) ────────────────────────────────────────────────────────────
  const clientData = [
    { name: "James Wilson", phone: "+1-555-0101" },
    { name: "Robert Martinez", phone: "+1-555-0102" },
    { name: "David Johnson", phone: "+1-555-0103" },
    { name: "Michael Brown", phone: "+1-555-0104" },
    { name: "William Davis", phone: "+1-555-0105" },
    { name: "Richard Garcia", phone: "+1-555-0106" },
    { name: "Joseph Anderson", phone: "+1-555-0107" },
    { name: "Thomas Taylor", phone: "+1-555-0108" },
    { name: "Charles Lee", phone: "+1-555-0109" },
    { name: "Daniel White", phone: "+1-555-0110" },
    { name: "Matthew Harris", phone: "+1-555-0111" },
    { name: "Anthony Clark", phone: "+1-555-0112" },
    { name: "Mark Lewis", phone: "+1-555-0113" },
    { name: "Donald Robinson", phone: "+1-555-0114" },
    { name: "Steven Walker", phone: "+1-555-0115" },
    { name: "Paul Hall", phone: "+1-555-0116" },
    { name: "Andrew Young", phone: "+1-555-0117" },
    { name: "Kenneth Allen", phone: "+1-555-0118" },
    { name: "Joshua King", phone: "+1-555-0119" },
    { name: "Kevin Wright", phone: "+1-555-0120" },
    { name: "Brian Scott", phone: "+1-555-0121" },
    { name: "George Green", phone: "+1-555-0122" },
  ];

  const clients = await Promise.all(
    clientData.map((c) =>
      prisma.client.create({
        data: { name: c.name, phone: c.phone, businessId: business.id },
      }),
    ),
  );
  console.log(`✅ ${clients.length} clients created`);

  // ── Visits (25) ─────────────────────────────────────────────────────────────
  // Spread across the last 60 days so the dashboard chart looks meaningful.
  // clientIdx, serviceIdx, staffIdx reference the arrays above.
  // priceOverride: null = use basePrice, number = custom actual price.

  const visitPlan: Array<{
    clientIdx: number;
    serviceIdx: number;
    staffIdx: number;
    priceOverride: number | null;
    day: number; // days ago
    notes?: string;
  }> = [
    { clientIdx: 0, serviceIdx: 0, staffIdx: 0, priceOverride: null, day: 1 },
    { clientIdx: 1, serviceIdx: 1, staffIdx: 1, priceOverride: null, day: 2 },
    { clientIdx: 2, serviceIdx: 4, staffIdx: 2, priceOverride: null, day: 3 },
    {
      clientIdx: 3,
      serviceIdx: 9,
      staffIdx: 0,
      priceOverride: 15,
      day: 4,
      notes: "First-time discount",
    },
    { clientIdx: 4, serviceIdx: 2, staffIdx: 1, priceOverride: null, day: 5 },
    { clientIdx: 5, serviceIdx: 3, staffIdx: 2, priceOverride: null, day: 6 },
    { clientIdx: 6, serviceIdx: 14, staffIdx: 0, priceOverride: null, day: 8 },
    {
      clientIdx: 7,
      serviceIdx: 5,
      staffIdx: 1,
      priceOverride: 40,
      day: 10,
      notes: "Added highlights",
    },
    { clientIdx: 8, serviceIdx: 7, staffIdx: 2, priceOverride: null, day: 12 },
    { clientIdx: 9, serviceIdx: 10, staffIdx: 0, priceOverride: null, day: 14 },
    { clientIdx: 10, serviceIdx: 0, staffIdx: 1, priceOverride: null, day: 16 },
    { clientIdx: 11, serviceIdx: 8, staffIdx: 2, priceOverride: null, day: 18 },
    { clientIdx: 12, serviceIdx: 1, staffIdx: 0, priceOverride: null, day: 20 },
    {
      clientIdx: 13,
      serviceIdx: 11,
      staffIdx: 1,
      priceOverride: null,
      day: 22,
    },
    {
      clientIdx: 14,
      serviceIdx: 6,
      staffIdx: 2,
      priceOverride: 40,
      day: 25,
      notes: "Loyalty discount applied",
    },
    { clientIdx: 15, serviceIdx: 4, staffIdx: 0, priceOverride: null, day: 28 },
    {
      clientIdx: 16,
      serviceIdx: 13,
      staffIdx: 1,
      priceOverride: null,
      day: 30,
    },
    { clientIdx: 17, serviceIdx: 9, staffIdx: 2, priceOverride: null, day: 33 },
    { clientIdx: 0, serviceIdx: 1, staffIdx: 0, priceOverride: null, day: 36 },
    { clientIdx: 1, serviceIdx: 12, staffIdx: 1, priceOverride: null, day: 38 },
    { clientIdx: 2, serviceIdx: 0, staffIdx: 2, priceOverride: null, day: 41 },
    { clientIdx: 3, serviceIdx: 14, staffIdx: 0, priceOverride: null, day: 44 },
    { clientIdx: 4, serviceIdx: 7, staffIdx: 1, priceOverride: null, day: 47 },
    {
      clientIdx: 5,
      serviceIdx: 3,
      staffIdx: 2,
      priceOverride: 12,
      day: 51,
      notes: "Returning client discount",
    },
    { clientIdx: 6, serviceIdx: 5, staffIdx: 0, priceOverride: null, day: 55 },
  ];

  for (const v of visitPlan) {
    const service = services[v.serviceIdx];
    const actualPrice =
      v.priceOverride !== null ? v.priceOverride : Number(service.basePrice);

    await prisma.visit.create({
      data: {
        clientId: clients[v.clientIdx].id,
        serviceId: service.id,
        staffId: staff[v.staffIdx].id,
        businessId: business.id,
        actualPrice,
        notes: v.notes ?? null,
        createdAt: daysAgo(v.day),
      },
    });
  }
  console.log(`✅ ${visitPlan.length} visits created`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`
────────────────────────────────────────
  🏪 Business : Elite Cuts Barbershop
────────────────────────────────────────
  👑 Admin    : admin@clientflow.demo
               password: admin1234

  ✂️  Staff 1  : carlos@clientflow.demo
               password: staff1234

  ✂️  Staff 2  : miguel@clientflow.demo
               password: staff1234

  ✂️  Staff 3  : alejandro@clientflow.demo
               password: staff1234
────────────────────────────────────────
  👥 Clients  : ${clients.length}
  🛎  Services : ${services.length}
  📋 Visits   : ${visitPlan.length} (spread over ~55 days)
────────────────────────────────────────
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
