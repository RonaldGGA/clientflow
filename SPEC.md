# SPEC.md — ClientFlow

> **Living document.** The agent updates this file after every completed task.
> This is the source of truth for project state. When in doubt, follow this file.

---

## Project Overview

ClientFlow is a generic client and service management system for small businesses.
It allows businesses to register clients, track services rendered, manage staff,
and generate AI-powered weekly reports in natural language.

Target users: barbershops, clinics, repair shops, nail salons, personal trainers.
The system is business-agnostic — the demo uses barbershop data.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Latest full-stack, Vercel-native, proxy support |
| Language | TypeScript (strict) | Type safety across full stack |
| Database | PostgreSQL via Neon | Relational data, free tier, serverless |
| ORM | Prisma 7 | Type-safe queries, migrations, schema management |
| Auth | Better Auth | Framework agnostic, standard for Next.js 16 |
| Styling | Tailwind CSS + shadcn/ui | Consistent, fast, production-quality UI |
| Charts | Recharts | Already in Ronald's stack, sufficient for MVP |
| Design | Dark theme, Inter font, emerald accent | Defined in `skills/design-system.md` — agent must read before any UI work |
| LLM | Google Gemini 2.5 Flash (primary) | Stable free tier, 250 RPD, no OFAC issues |
| LLM Fallback | OpenRouter (free tier) | Backup if Gemini fails |
| Deploy | Vercel + Neon | Zero config, matches stack |
| Memory | Engram MCP (mem_save, mem_context) | Agent session continuity |

---

## Architecture Decisions

- **Multi-tenant with BusinessMember**: multi-tenancy is handled via the `BusinessMember` model. A user belongs to a business through this relation, which also stores their specific `role` for that tenant.
- **Soft delete**: `deletedAt DateTime?` on relevant entities — historical data is preserved.
- **Price stored on visit**: service has a `basePrice`, visit stores `actualPrice` — supports discounts and price changes.
- **LLM is async with timeout**: 15s AbortController, Gemini → OpenRouter fallback, never blocks UI.
- **Design system**: dark theme only, Inter font, emerald accent (`#10b981`) — full rules in `skills/design-system.md`.
- **GET routes**: all Next.js 16 GET handlers use `export const dynamic = 'force-dynamic'` explicitly.
- **Auth Proxy**: uses `proxy.ts` (Next.js 16 standard) with full session validation in Node.js runtime.
- **Better Auth Integration**: catches all auth requests at `/api/auth/[...all]`. Credentials login only.

---

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified Boolean
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  password      String?
  
  sessions      Session[]
  accounts      Account[]
  businessMembers BusinessMember[]
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Business {
  id        String    @id @default(cuid())
  name      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  members   BusinessMember[]
  clients   Client[]
  services  Service[]
  visits    Visit[]
  reports   Report[]
}

model BusinessMember {
  id         String    @id @default(cuid())
  userId     String
  businessId String
  role       String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  business   Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  createdAt  DateTime  @default(now())
}

model Client {
  id         String    @id @default(cuid())
  name       String
  phone      String?
  notes      String?
  businessId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  business   Business  @relation(fields: [businessId], references: [id])
  visits     Visit[]
}

model Service {
  id         String    @id @default(cuid())
  name       String
  basePrice  Decimal   @db.Decimal(10, 2)
  businessId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  business   Business  @relation(fields: [businessId], references: [id])
  visits     Visit[]
}

model Visit {
  id          String    @id @default(cuid())
  clientId    String
  serviceId   String
  staffId     String
  businessId  String
  actualPrice Decimal   @db.Decimal(10, 2)
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  client    Client    @relation(fields: [clientId], references: [id])
  service   Service   @relation(fields: [serviceId], references: [id])
  staff     User      @relation(fields: [staffId], references: [id])
  business  Business  @relation(fields: [businessId], references: [id])
}

model Report {
  id         String    @id @default(cuid())
  businessId String
  weekStart  DateTime
  weekEnd    DateTime
  content    String
  createdAt  DateTime  @default(now())

  business   Business  @relation(fields: [businessId], references: [id])
}
```

---

## Folder Structure

```
clientflow/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Protected layout, checks session
│   │   ├── page.tsx                # Dashboard
│   │   ├── clients/
│   │   ├── visits/
│   │   ├── employees/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
│       ├── auth/
│       │   └── [...all]/
│       │       └── route.ts        # Better Auth catch-all
│       ├── clients/
│       ├── visits/
│       ├── services/
│       ├── employees/
│       ├── dashboard/
│       └── reports/
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/
│   ├── clients/
│   ├── visits/
│   ├── dashboard/
│   └── reports/
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── auth.ts                     # Better Auth server config
│   ├── auth-client.ts              # Better Auth react client
│   ├── validations/
│   └── prompts/
├── hooks/
│   └── use-fetch.ts
├── types/
├── proxy.ts                        # Route protection (Next.js 16 standard)
├── prisma/
│   └── schema.prisma
└── .env.local
```

---

## Environment Variables

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
```

---

## Development Phases

### ✅ Phase 0 — Foundation
> Goal: project runs locally, database connected, schema migrated

- [x] Initialize Next.js 16 project with TypeScript and strict mode
- [x] Configure Tailwind CSS and install shadcn/ui
- [x] Set up Prisma 7 with Neon connection string
- [x] Write the full schema including Better Auth and multitenancy
- [x] Create Prisma client singleton in `lib/prisma.ts`
- [x] Set up environment variables
- [x] Migrate the schema to Neon
- [x] Verify: `prisma studio` shows all tables correctly

---

### Phase 1 — Auth (Better Auth)
> Goal: users can log in, roles are enforced, routes are protected

- [x] Configure Better Auth with Prisma adapter and nextCookies plugin
- [x] Set up `api/auth/[...all]` catch-all route
- [ ] Implement `proxy.ts` for route protection and session validation
- [ ] Build login page UI using Better Auth client
- [ ] Implement logic to check `BusinessMember` role for route authorization
- [ ] Redirect unauthenticated users to `/login`
- [ ] Redirect staff away from admin-only routes
- [ ] Seed one admin user and one staff user
- [ ] Verify: admin sees full nav, staff sees only visits

---

## Current Status

**Active Phase:** 1 — Auth
**Last completed task:** Better Auth and Route Handler setup
**Last updated:** 2026-03-25

---

## Technical Notes

- **Next.js 16 Proxy**: Switched from `middleware.ts` to `proxy.ts` following Next.js 16 standards.
- **Better Auth**: Replaced NextAuth for framework-agnostic stability and better Next.js 16 support.
- **Multitenancy**: Handled via `BusinessMember`. `User` does not store `businessId` or `role` directly.
- **Prisma 7**: Leveraging latest Prisma features.
