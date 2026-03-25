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
| Framework | Next.js 14 (App Router) | Full-stack, Vercel-native, API routes built-in |
| Language | TypeScript (strict) | Type safety across full stack |
| Database | PostgreSQL via Neon | Relational data, free tier, serverless |
| ORM | Prisma | Type-safe queries, migrations, schema management |
| Auth | NextAuth.js (CredentialsProvider) | Simple email+password, role in JWT |
| Styling | Tailwind CSS + shadcn/ui | Consistent, fast, production-quality UI |
| Charts | Recharts | Already in Ronald's stack, sufficient for MVP |
| Design | Dark theme, Inter font, emerald accent | Defined in `skills/design-system.md` — agent must read before any UI work |
| LLM | Google Gemini 2.5 Flash (primary) | Stable free tier, 250 RPD, no OFAC issues |
| LLM Fallback | OpenRouter (free tier) | Backup if Gemini fails |
| Deploy | Vercel + Neon | Zero config, matches stack |
| Memory | Engram MCP (mem_save, mem_context) | Agent session continuity |

---

## Architecture Decisions

- **Multi-tenant from day 1**: every business entity has `businessId` — adding a second business later requires zero schema changes
- **Soft delete everywhere**: `deletedAt DateTime?` on all entities with relations — historical data is never lost
- **Price stored on visit**: service has a `basePrice`, visit stores `actualPrice` — supports discounts and price changes
- **LLM is async with timeout**: 15s AbortController, Gemini → OpenRouter fallback, never blocks UI
- **Design system**: dark theme only, Inter font, emerald accent (`#10b981`) — full rules in `skills/design-system.md`
- **GET routes**: all Next.js 14 GET handlers use `export const dynamic = 'force-dynamic'` explicitly
- **Roles in JWT**: `admin` | `staff` stored in token — no DB call on every request

---

## Database Schema

```prisma
model Business {
  id        String    @id @default(cuid())
  name      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  users     User[]
  clients   Client[]
  services  Service[]
  visits    Visit[]
  reports   Report[]
}

model User {
  id         String    @id @default(cuid())
  email      String    @unique
  password   String    // bcrypt hashed
  name       String
  role       Role      @default(STAFF)
  businessId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  business   Business  @relation(fields: [businessId], references: [id])
  visits     Visit[]
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
  content    String    // LLM-generated natural language text
  createdAt  DateTime  @default(now())

  business   Business  @relation(fields: [businessId], references: [id])
}

enum Role {
  ADMIN
  STAFF
}
```

**Schema decisions:**
- `Visit` has no `deletedAt` — visits are immutable records. To undo a visit, a correction visit is created (future feature). For MVP: no delete on visits.
- `Report.content` is plain text — no JSON structure needed, the LLM output is the final format
- `Client.notes` is free text — no structured fields, keeps it generic for any business type
- `Service.basePrice` and `Visit.actualPrice` use `Decimal` — never use `Float` for money

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
│   │   ├── page.tsx                # Dashboard — admin only
│   │   ├── clients/
│   │   │   ├── page.tsx            # Client list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Client detail + history
│   │   ├── visits/
│   │   │   └── new/
│   │   │       └── page.tsx        # Register visit — staff + admin
│   │   ├── employees/
│   │   │   └── page.tsx            # Employee list + stats — admin only
│   │   ├── reports/
│   │   │   └── page.tsx            # AI reports — admin only
│   │   └── settings/
│   │       └── page.tsx            # Services + team management — admin only
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       ├── clients/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # GET detail, PATCH update, DELETE soft
│       ├── visits/
│       │   └── route.ts            # GET list, POST create
│       ├── services/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # PATCH update, DELETE soft
│       ├── employees/
│       │   ├── route.ts            # GET list, POST invite
│       │   └── [id]/
│       │       └── route.ts        # PATCH update, DELETE soft
│       ├── dashboard/
│       │   └── route.ts            # GET aggregated metrics
│       └── reports/
│           ├── route.ts            # GET list of past reports
│           └── generate/
│               └── route.ts        # POST generate new report via LLM
├── components/
│   ├── ui/                         # shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   ├── clients/
│   │   ├── client-list.tsx
│   │   ├── client-card.tsx
│   │   └── client-form.tsx
│   ├── visits/
│   │   └── visit-form.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   └── revenue-chart.tsx
│   └── reports/
│       └── report-viewer.tsx
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── auth.ts                     # NextAuth config
│   ├── validations/                # Zod schemas per entity
│   │   ├── client.ts
│   │   ├── visit.ts
│   │   └── service.ts
│   └── prompts/
│       └── weekly-report.ts        # LLM prompt construction
├── hooks/
│   └── use-fetch.ts                # Fetch with AbortController + timeout
├── types/
│   └── next-auth.d.ts              # Augmented session types with role
├── middleware.ts                   # Route protection by role
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
```

---

## Development Phases

### ✅ Phase 0 — Foundation
> Goal: project runs locally, database connected, schema migrated

- [x] Initialize Next.js 14 project with TypeScript and strict mode
- [ ] Configure Tailwind CSS and install shadcn/ui
- [ ] Set up Prisma with Neon connection string
- [ ] Write and migrate the full schema
- [ ] Create Prisma client singleton in `lib/prisma.ts`
- [ ] Set up environment variables
- [ ] Verify: `prisma studio` shows all tables correctly

---

### Phase 1 — Auth
> Goal: users can log in, roles are enforced, routes are protected

- [ ] Install and configure NextAuth.js with CredentialsProvider
- [ ] Hash passwords with bcrypt on registration
- [ ] Include `role` and `businessId` in JWT token and session
- [ ] Augment NextAuth types in `types/next-auth.d.ts`
- [ ] Write middleware to protect `/dashboard/*` routes
- [ ] Redirect unauthenticated users to `/login`
- [ ] Redirect staff away from admin-only routes (dashboard, employees, reports, settings)
- [ ] Build login page UI with shadcn/ui Form
- [ ] Seed one admin user and one staff user for development
- [ ] Verify: admin sees full nav, staff sees only visits

---

### Phase 2 — Settings (Services + Team)
> Goal: admin can define what services the business offers and manage staff

**Services:**
- [ ] `GET /api/services` — list active services for the business
- [ ] `POST /api/services` — create service with name and basePrice
- [ ] `PATCH /api/services/[id]` — update name or price
- [ ] `DELETE /api/services/[id]` — soft delete
- [ ] Settings page UI: service list + add/edit/delete actions

**Team:**
- [ ] `GET /api/employees` — list active staff for the business
- [ ] `POST /api/employees` — create staff user (admin creates accounts, no self-registration)
- [ ] `PATCH /api/employees/[id]` — update name or role
- [ ] `DELETE /api/employees/[id]` — soft delete (deactivate)
- [ ] Settings page UI: team list + add/deactivate actions
- [ ] Verify: services and team data persist correctly, soft delete doesn't break relations

---

### Phase 3 — Clients
> Goal: clients can be created, searched, viewed with full history

- [ ] `GET /api/clients` — paginated list, filterable by name, flag inactive (no visit > 14 days)
- [ ] `POST /api/clients` — create with name and optional phone/notes
- [ ] `GET /api/clients/[id]` — detail with full visit history (client + service + staff name)
- [ ] `PATCH /api/clients/[id]` — update name, phone, notes
- [ ] `DELETE /api/clients/[id]` — soft delete
- [ ] Client list page UI: search bar, inactive flag (⚠️), pagination
- [ ] Client detail page UI: info card + visit history table
- [ ] Inline client creation during visit registration (Phase 4 dependency — prepare the component)
- [ ] Verify: inactive flag appears correctly, history loads with correct relations

---

### Phase 4 — Visits
> Goal: staff and admin can register a service rendered to a client

- [ ] `GET /api/visits` — list visits for the business (filterable by date, staff)
- [ ] `POST /api/visits` — create visit: clientId, serviceId, staffId, actualPrice, notes
- [ ] Register visit page UI:
  - Client search with inline creation if not found
  - Service dropdown (auto-fills actualPrice from basePrice, editable)
  - Staff is auto-set to current user if staff role; dropdown if admin
  - Notes field (optional)
- [ ] Verify: visit appears in client history, correct staff and service linked

---

### Phase 5 — Dashboard
> Goal: admin sees business metrics at a glance

- [ ] `GET /api/dashboard` — returns:
  - Total revenue this week and % change vs last week
  - Total visits this week
  - Best day this week (by revenue)
  - Revenue by day for the last 4 weeks (for chart)
  - Last 10 visits with client, staff, service, price
- [ ] Metric cards UI (3 cards: revenue, visits, best day)
- [ ] Revenue bar chart UI (Recharts, last 4 weeks)
- [ ] Recent activity feed UI
- [ ] All data computed server-side — no client-side aggregation
- [ ] Verify: metrics match raw data in prisma studio

---

### Phase 6 — AI Reports
> Goal: admin generates a natural language weekly report via LLM

- [ ] Build prompt constructor in `lib/prompts/weekly-report.ts`
  - Accepts: week range, revenue totals, visit count, top clients, inactive clients, per-staff breakdown
  - Returns: clean prompt string ready for LLM
- [ ] `POST /api/reports/generate` — collects week data, calls Gemini, saves report, returns content
  - AbortController with 15s timeout
  - `gemini-2.5-flash` primary → OpenRouter fallback → clear error if both fail
  - Never sends raw DB objects to LLM — only prepared summary payload
- [ ] `GET /api/reports` — list of past reports with weekStart, weekEnd, createdAt
- [ ] Reports page UI:
  - "Generate this week's report" button with loading state
  - Generated report displayed as formatted text
  - List of past reports (click to view)
- [ ] Verify: report content is coherent, past reports persist, LLM failure shows user-friendly error

---

### Phase 7 — Polish & Deploy
> Goal: project is production-ready and portfolio-presentable

- [ ] Seed script with realistic barbershop demo data (10 clients, 3 staff, 4 services, 60 visits across 4 weeks)
- [ ] Mobile-responsive layout (sidebar collapses on mobile)
- [ ] Empty states on all list pages
- [ ] 404 and error pages
- [ ] Deploy to Vercel with Neon production database
- [ ] Record demo GIF (visit registration + dashboard + report generation)
- [ ] Write README following SensorWatch standard:
  - Architecture decisions with reasoning
  - Live demo link
  - Demo GIF
  - Tech stack with justifications
  - Setup instructions

---

## Current Status

**Active Phase:** 0 — Foundation
**Last completed task:** none
**Last updated:** project start

---

## Technical Notes

> This section is updated by the agent when a non-obvious decision is made during implementation.

*(empty — updated as development progresses)*
