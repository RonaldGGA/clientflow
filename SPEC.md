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
| Database | PostgreSQL via Neon (prod) / local PostgreSQL 17 (dev) | Relational data |
| ORM | Prisma 7 | Type-safe queries, migrations, schema management |
| Auth | Better Auth | Framework agnostic, standard for Next.js 16 |
| Styling | Tailwind CSS + shadcn/ui | Consistent, fast, production-quality UI |
| Charts | Recharts | Already in Ronald's stack, sufficient for MVP |
| Design | Dark theme, Inter font, emerald accent (#10b981) | Defined below |
| LLM | Google Gemini 2.5 Flash (primary) | Stable free tier, 250 RPD |
| LLM Fallback | OpenRouter (free tier) | Backup if Gemini fails |
| Deploy | Vercel + Neon | Zero config, matches stack |

---

## Architecture Decisions

- **Multi-tenant with BusinessMember**: multi-tenancy via `BusinessMember` model. A user
  belongs to a business through this relation, which stores their `role` for that tenant.
- **Soft delete**: `deletedAt DateTime?` on clients and services — historical data preserved.
- **Hard delete on visits**: visits have no dependents, hard delete is acceptable.
- **Price stored on visit**: service has `basePrice`, visit stores `actualPrice` — supports
  discounts and price changes over time.
- **LLM is async with timeout**: 15s AbortController, Gemini → OpenRouter fallback.
- **Design system**: dark theme only, Inter font, emerald accent (`#10b981`).
- **GET routes**: all Next.js 16 GET handlers use `export const dynamic = 'force-dynamic'`.
- **Auth Proxy**: uses `proxy.ts` (Next.js 16 standard) with full session validation.
- **Better Auth Integration**: catches all auth requests at `/api/auth/[...all]`.
- **Prisma 7 output**: client generated in `./app/generated/prisma/client`.
  All imports use `@/app/generated/prisma/client`.
- **DB environments**: local PostgreSQL 17 for development (no VPN issues, no latency),
  Neon for production only. `DATABASE_URL` and `DIRECT_URL` are equal in local dev.
- **Visits are immutable**: no edit on visits. Delete and re-enter if wrong.
- **staffId on visit create**: always taken from session, never from request body.

---

## Database Schema
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  emailVerified Boolean
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
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
  id         String   @id @default(cuid())
  userId     String
  businessId String
  role       String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
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
  id          String   @id @default(cuid())
  clientId    String
  serviceId   String
  staffId     String
  businessId  String
  actualPrice Decimal  @db.Decimal(10, 2)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  client      Client   @relation(fields: [clientId], references: [id])
  service     Service  @relation(fields: [serviceId], references: [id])
  staff       User     @relation(fields: [staffId], references: [id])
  business    Business @relation(fields: [businessId], references: [id])
}

model Report {
  id         String   @id @default(cuid())
  businessId String
  weekStart  DateTime
  weekEnd    DateTime
  content    String
  createdAt  DateTime @default(now())
  business   Business @relation(fields: [businessId], references: [id])
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
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard /
│   │   ├── clients/
│   │   │   └── page.tsx
│   │   ├── visits/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── services/
│   │           └── page.tsx
│   └── api/
│       ├── auth/
│       │   ├── [...all]/route.ts
│       │   └── session-init/route.ts
│       ├── clients/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── services/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── visits/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── employees/
│       │   └── route.ts
│       ├── dashboard/
│       │   └── route.ts
│       └── reports/
│           └── route.ts
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── sidebar-nav.tsx
│   │   └── user-menu.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── visits-chart.tsx
│   │   └── recent-visits.tsx
│   ├── clients/
│   │   ├── client-form-dialog.tsx
│   │   └── delete-client-dialog.tsx
│   ├── services/
│   │   ├── service-form-dialog.tsx
│   │   └── delete-service-dialog.tsx
│   └── visits/
│       ├── visit-form-dialog.tsx
│       ├── delete-visit-dialog.tsx
│       └── visits-filters.tsx
├── hooks/
│   └── use-debounce.ts
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── auth-client.ts
│   └── prompts/
├── prisma/
│   └── schema.prisma
├── proxy.ts
└── .env.local
```

---

## Environment Variables

```env
# Development (.env.local .env) — local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/clientflow_dev"


# Production (Vercel dashboard) — Neon
# DATABASE_URL="postgresql://...pooler.neon.tech/...?sslmode=verify-full"
# DIRECT_URL="postgresql://...neon.tech/...?sslmode=verify-full"

NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=
```

---

## Development Phases

### ✅ Phase 0 — Foundation
- [x] Initialize Next.js 16 with TypeScript strict mode
- [x] Configure Tailwind CSS and shadcn/ui
- [x] Set up Prisma 7 with database connection
- [x] Write full schema including Better Auth and multitenancy
- [x] Create Prisma client singleton in `lib/prisma.ts`
- [x] Migrate schema to database
- [x] Verify: prisma studio shows all tables

---

### ✅ Phase 1 — Auth
- [x] Configure Better Auth with Prisma adapter
- [x] Set up `api/auth/[...all]` catch-all route
- [x] Implement `proxy.ts` for route protection
- [x] Build login page UI
- [x] Implement role check via BusinessMember
- [x] Redirect unauthenticated users to `/login`
- [x] Redirect staff away from admin-only routes
- [x] Seed admin and staff users
- [x] POST `/api/auth/session-init` sets `cf-role` cookie after login

---

### ✅ Phase 2 — Dashboard & Layout
- [x] Collapsible sidebar with role-aware navigation
- [x] Mobile drawer with Sheet component (hidden below lg breakpoint)
- [x] Profile dropdown in sidebar footer with sign out
- [x] GET /api/dashboard with all metrics (Promise.all, server-side)
- [x] Dashboard page with MetricCard, VisitsChart, RecentVisits
- [x] Verify: staff redirected to /visits, cannot access /

---

### ✅ Phase 3 — Clients & Services
- [x] GET + POST /api/clients (paginated, search by name+phone)
- [x] PATCH + DELETE /api/clients/[id] (soft delete)
- [x] Clients list page with search, pagination, create/edit/delete dialogs
- [x] GET + POST /api/services (duplicate name check, 409 on conflict)
- [x] PATCH + DELETE /api/services/[id] (soft delete)
- [x] Services settings page with full CRUD
- [x] Verify: soft deleted records excluded from lists and metrics

**Pending polish:**

- [ ] Phone field format validation
- [ ] Clients table static width (notes column causes layout shift)

---
### ✅ Phase 4 — Visits

> Goal: staff and admin can log visits, admin can see and filter all visits

**Architecture decisions:**

- Visits link a client, service, staff member, and price at a point in time
- `actualPrice` defaults to service `basePrice`, overridable per visit
- Staff can create visits and see their own. Admin sees all.
- Visits are immutable — no edit. Delete and re-enter if wrong.
- Hard delete on visits — no soft delete, no dependents
- `staffId` always comes from session, never from request body
- Admin can filter by staff member and date. Staff filter is fixed to self.
- Date filters: today, this week, this month, custom range
- List paginated at 20 per page
- **Staff can create clients**: walk-in scenario — if a new client arrives and
  admin is absent, staff must be able to register the client before logging
  the visit. Staff has full CRUD on clients. Admin-only restriction removed
  from `POST /api/clients` and `/api/clients` removed from `ADMIN_ONLY_API_ROUTES`
  in `proxy.ts`.
- **cf-role cookie is not HttpOnly**: role is not sensitive data — authorization
  is always enforced server-side. Client needs to read the cookie to conditionally
  render admin-only UI (staff filter dropdown, delete button). Changed
  `httpOnly: false` in `session-init/route.ts`.

**Completed tasks:**

- [x] GET /api/visits with role-aware filtering and pagination
- [x] POST /api/visits — staffId from session, price defaults to basePrice
- [x] DELETE /api/visits/[id] — hard delete, admin only
- [x] Visits list page with date filter and pagination
- [x] Create visit form — client selector, service selector, price override, notes
- [x] Delete confirmation dialog
- [x] Verify: staff only sees their own visits
- [x] Verify: actualPrice defaults to basePrice on service select
- [x] Verify: admin can filter by staff member (dropdown visible when cf-role=admin)

**Pending polish:**

- [ ] Staff filter dropdown in visits page shows no members until
  GET /api/employees is implemented (Phase 5)

---

### ✅ Phase 5 — Employees
> Goal: admin can view, create, edit role, and remove staff members.

**Architecture decisions:**
- **Option A — Admin creates accounts directly**: admin provides name, email,
  password, and role. No email flow. Credentials handed to employee in person.
  Chosen for MVP simplicity — appropriate for small businesses.
- **Option B (future)**: invite-by-email flow via Resend or SendGrid.
  Revisit post-MVP if needed.
- **Password hashing**: uses `auth.$context` → `ctx.password.hash(password)` —
  the internal Better Auth hasher. Guarantees same scrypt params and format as
  the rest of the auth system. Do NOT use `oslo/password` (deprecated), do NOT
  reimplement scrypt manually.
- **Do NOT use `auth.api.signUpEmail` in route handlers**: that method creates
  a new session and overwrites the calling admin's cookies, logging them out.
  Use Prisma transaction (User + Account + BusinessMember) directly.
- **Account record**: `accountId = userId`, `providerId = "credential"`,
  password hash stored in both `User.password` and `Account.password`.
- **Remove employee = desvincular**: delete `BusinessMember` only. `User` stays
  in DB to preserve visit history. Employee loses access immediately.
- **Guards on PATCH**: admin cannot change their own role.
- **Guards on DELETE**: cannot remove yourself, cannot remove the last admin.
- **Edit = role change only**: name and email are not editable by admin in MVP.
- `cf-role` cookie is not HttpOnly — needed by client to render admin-only UI.
  Authorization always enforced server-side regardless.

**Completed tasks:**

- [x] GET /api/employees — list all business members with user data
- [x] POST /api/employees — create user + account + businessMember in transaction
- [x] PATCH /api/employees/[id] — update role, guard: cannot change own role
- [x] DELETE /api/employees/[id] — desvincular, guards: not self, not last admin
- [x] Employees page with table (name, email, role badge, joined date)
- [x] Create/edit employee dialog
- [x] Delete confirmation dialog
- [x] Verify: staff gets 403 on all /api/employees endpoints
- [x] Verify: cannot change your own role
- [x] Verify: cannot remove the last admin
- [x] Verify: visits staff filter dropdown populates after GET /api/employees

---

### Phase 6 — Reports

> Goal: admin can generate and view AI-powered weekly reports summarizing
> business activity. Reports are stored and can be reviewed later.

**Architecture decisions:**

- **LLM pipeline**: Gemini 2.5 Flash (primary) → OpenRouter free tier (fallback).
  15s AbortController timeout on each call. If both fail, return a clear error —
  never block the UI waiting indefinitely.
- **Prompt lives in `lib/prompts/`**: never inline prompts in route handlers.
  Prompt receives a clean, summarized payload — never raw Prisma objects.
- **Report payload**: computed server-side before calling LLM. Includes:
  total visits, total revenue, top services (name + count + revenue),
  top clients (name + visit count), staff activity (name + visits + revenue),
  comparison vs previous week (visits delta, revenue delta).
- **Report scope**: always one full calendar week (Monday 00:00 → Sunday 23:59).
  Admin selects the week via a date picker. Defaults to last completed week.
- **Reports are stored**: saved to `Report` table after generation.
  `weekStart` + `weekEnd` + `content` (LLM output as markdown string).
- **One report per week**: if a report already exists for that week, return the
  stored one instead of regenerating. Admin can force regenerate with a button.
- **Report format**: LLM returns markdown. Rendered in the UI with a markdown
  renderer (`react-markdown`).
- **Staff cannot access reports**: enforced at middleware and route handler level.

**LLM call chain:**

1. Compute weekly stats from DB (Prisma, server-side)
2. Build clean payload object
3. Inject into prompt template (`lib/prompts/report.ts`)
4. Call Gemini 2.5 Flash with 15s timeout
5. If Gemini fails → call OpenRouter with same prompt and 15s timeout
6. If both fail → return `{ error: "Report generation failed" }`
7. Save result to `Report` table and return to client

**Endpoints:**

- `GET /api/reports?weekStart=` — returns stored report for that week if exists
- `POST /api/reports` — generates report for given week, stores and returns it

**Files to create:**

- `app/api/reports/route.ts`
- `app/(dashboard)/reports/page.tsx`
- `lib/prompts/report.ts`
- `components/reports/report-viewer.tsx`
- `components/reports/week-picker.tsx`

**Tasks:**

- [ ] `lib/prompts/report.ts` — prompt template with typed payload
- [ ] Weekly stats query — visits, revenue, top services, top clients, staff activity
- [ ] Gemini 2.5 Flash call with 15s AbortController
- [ ] OpenRouter fallback with 15s AbortController
- [ ] GET /api/reports?weekStart= — return stored report or null
- [ ] POST /api/reports — generate, store, return
- [ ] Reports page with week picker and report viewer
- [ ] Verify: existing report returned without regenerating
- [ ] Verify: force regenerate overwrites stored report
- [ ] Verify: timeout and fallback work (test by pointing to invalid Gemini key)
- [ ] Verify: staff gets 403 on all /api/reports endpoints

---

## Current Status

**Active Phase:** 6 — Reports
**Last completed phase:** 5 — Employees
**Last updated:** 2026-03-29

---

## Technical Notes

- **Employee creation**: use `auth.$context` → `ctx.password.hash(password)` for
  hashing. Never use `auth.api.signUpEmail` in route handlers — it creates a new
  session and overwrites the caller's cookies.
- **cf-role cookie**: `httpOnly: false` by design. Client reads it to render
  admin-only UI. All authorization is enforced server-side independently.
- **Staff can create clients**: `/api/clients` removed from `ADMIN_ONLY_API_ROUTES`.
  Walk-in scenario — staff must register new clients before logging visits.
- **Employee removal = desvincular**: `BusinessMember` deleted, `User` preserved.
  Visit history integrity maintained via foreign key on `staffId`.
- **Better Auth**: credentials login only. `proxy.ts` handles route protection globally.
- **Multitenancy**: via `BusinessMember`. `User` has no `businessId` or `role` directly.
- **Prisma 7**: client generated in `./app/generated/prisma/client`.
- **middleware.ts**: uses `proxy.ts` naming for Next.js 16 Windows compatibility.
  Exported as both `proxy` and `middleware`.
- **Role cookie**: `cf-role` set by `/api/auth/session-init` POST after login.
  Requires `credentials: "include"` in the fetch from login page.
  Allows middleware to check roles without DB calls.
- **Middleware route split**: `ADMIN_ONLY_PAGE_ROUTES` redirects staff to `/visits`.
  `ADMIN_ONLY_API_ROUTES` returns 403 directly — never redirect API calls.
  `"/"` uses exact match. All others use `startsWith`.
- **SSL**: `sslmode=verify-full` in Neon URLs for pg v9 compatibility.
- **Sidebar collapse**: `useSyncExternalStore` with localStorage.
  `getServerSnapshot` returns `false` to avoid hydration mismatch.
  `window.dispatchEvent(new StorageEvent(...))` notifies same-tab changes.
- **Mobile sidebar**: Sheet drawer, hamburger at `top-4 left-4`, hidden below `lg`.
- **Dashboard fetch**: server component passes `headers()` so session cookie
  travels correctly between server components.
- **key prop on dialogs**: `key={editing ? \`edit-${id}\` : "create"}` forces
  remount — useState initializes from correct data without useEffect.
- **useDebounce(300ms)**: search fires 300ms after user stops typing.
  Page resets to 1 when query changes.
- **Decimal serialization**: Prisma `Decimal` must be cast to `Number` before
  JSON response — not serializable natively.
- **params in Next.js 16**: `params` is `Promise<{id}>` — must `await params`
  before destructuring in route handlers.
- **Logo placeholder**: `Scissors` icon is temporary. Will become dynamic based
  on business type in Settings phase.
- **DB environments**: local PostgreSQL 17 for dev (no VPN dependency),
  Neon for prod. URLs are equal in local (no pooling needed).
- **Visits immutability**: no PATCH on visits by design. Delete + re-enter.
- **getAdminMembership helper**: repeated across route handlers. Candidate for
  extraction to `lib/auth-helpers.ts` in a future refactor pass.
- **Staff can create clients**: `/api/clients` removed from ADMIN_ONLY_API_ROUTES.
  Staff needs to register walk-in clients before logging visits.
- **cf-role cookie**: not HttpOnly by design — role is not sensitive, authorization
  is always enforced server-side. Client reads it to render admin-only UI elements.
