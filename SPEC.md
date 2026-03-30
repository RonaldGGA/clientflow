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
| i18n | next-intl | Standard for Next.js App Router, supports Server + Client Components |
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
- **Staff can create clients**: walk-in scenario. `/api/clients` removed from
  `ADMIN_ONLY_API_ROUTES`. Staff has full CRUD on clients.
- **cf-role cookie**: `httpOnly: false` by design. Client reads it to render admin-only
  UI elements. Authorization always enforced server-side independently.
- **Employee creation**: use `auth.$context` → `ctx.password.hash(password)`.
  Never use `auth.api.signUpEmail` anywhere — it requires HTTP context and does not
  reliably create the Account record with hashed credentials outside route handlers.
  In route handlers it also overwrites the caller's session cookies, logging them out.
- **Seed uses same pattern as employee creation**: Prisma transaction with
  `ctx.password.hash` creates User + Account + BusinessMember. Never use
  `auth.api.signUpEmail` in seed scripts.
- **Employee removal = desvincular**: delete `BusinessMember` only. `User` stays in DB
  to preserve visit history. Employee loses access immediately.
- **Settings page = Server Component + Client Component split**: `page.tsx` is a Server
  Component that reads session, role, and business name server-side and passes them as
  props to `settings-client.tsx`. Avoids hydration mismatch from reading cookies client-side.
- **oslo/password is deprecated**: do not use. Use `auth.$context.password.hash`.
- **Sign out uses window.location.href**: `router.push` is a soft navigation — the browser
  does not send a fresh HTTP request, so the session cookie is still present when the
  middleware runs. `window.location.href` forces a full HTTP request with clean state.
  `cf-role` must also be manually cleared on sign out via `document.cookie`.
- **Login form handler type**: use `React.FormEvent<HTMLFormElement>`, not
  `React.SubmitEvent` (does not exist in React types). Wrong type silently prevents
  `e.preventDefault()` from running, causing native HTML form submit (page reload).
- **i18n — static vs dynamic content**: next-intl translates UI strings (buttons, labels,
  errors). Dynamic content from the database (client names, service names, notes) is
  NOT translated — businesses write content in their own language from day one.
  AI reports are generated in the correct language by passing the locale to the prompt.
- **i18n — locale storage**: `cf-locale` cookie, not HttpOnly. Readable by client and
  server. Falls back to `NEXT_PUBLIC_DEFAULT_LOCALE` env var if cookie absent.
- **i18n — URL strategy**: no locale prefix in URLs (`/dashboard` not `/es/dashboard`).
  Locale is carried by cookie only. Simpler routing, no middleware complexity.

---

## Database Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma/client"
}

datasource db {
  provider = "postgresql"
}

model Business {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  members  BusinessMember[]
  clients  Client[]
  services Service[]
  visits   Visit[]
  reports  Report[]
}

model BusinessMember {
  id         String   @id @default(cuid())
  businessId String
  userId     String
  role       String   @default("staff")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([businessId, userId])
  @@index([businessId])
  @@index([userId])
  @@index([businessId, role])
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified Boolean   @default(false)
  image         String?
  password      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  sessions    Session[]
  accounts    Account[]
  memberships BusinessMember[]
  visits      Visit[]
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

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
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

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  visits   Visit[]

  @@index([businessId])
}

model Service {
  id         String    @id @default(cuid())
  name       String
  basePrice  Decimal   @db.Decimal(10, 2)
  businessId String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  visits   Visit[]

  @@index([businessId])
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

  client   Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  service  Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  staff    User     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@index([clientId])
  @@index([serviceId])
  @@index([staffId])
}

model Report {
  id         String   @id @default(cuid())
  businessId String
  weekStart  DateTime
  weekEnd    DateTime
  content    String
  createdAt  DateTime @default(now())

  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId])
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
│   │   ├── page.tsx
│   │   ├── clients/
│   │   │   └── page.tsx
│   │   ├── visits/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       ├── page.tsx              # Server Component
│   │       ├── settings-client.tsx   # Client Component
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
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── settings/
│       │   ├── business/route.ts
│       │   └── account/route.ts
│       ├── dashboard/
│       │   └── route.ts
│       └── reports/
│           └── route.ts
├── components/
│   ├── ui/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── sidebar-nav.tsx
│   │   ├── user-menu.tsx
│   │   ├── locale-switcher.tsx       # NEW — flag + text language selector
│   │   └── bfcache-guard.tsx
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
│   ├── visits/
│   │   ├── visit-form-dialog.tsx
│   │   ├── delete-visit-dialog.tsx
│   │   └── visits-filters.tsx
│   ├── employees/
│   │   ├── employee-form-dialog.tsx
│   │   └── delete-employee-dialog.tsx
│   └── reports/
│       ├── report-viewer.tsx
│       └── week-picker.tsx
├── hooks/
│   └── use-debounce.ts
├── i18n/
│   └── request.ts                    # NEW — next-intl locale detection
├── messages/
│   ├── en.json                       # NEW — all UI strings in English
│   └── es.json                       # NEW — all UI strings in Spanish
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── auth-client.ts
│   └── prompts/
│       └── report.ts
├── prisma/
│   └── schema.prisma
├── proxy.ts
└── .env.local
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/clientflow_dev"

NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_AI_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_DEFAULT_LOCALE=en   # "en" or "es" — controls default language per deployment
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
- [x] Mobile drawer with Sheet component
- [x] Profile dropdown in sidebar footer with sign out
- [x] GET /api/dashboard with all metrics
- [x] Dashboard page with MetricCard, VisitsChart, RecentVisits
- [x] Verify: staff redirected to /visits, cannot access /

---

### ✅ Phase 3 — Clients & Services
- [x] GET + POST /api/clients (paginated, search)
- [x] PATCH + DELETE /api/clients/[id] (soft delete)
- [x] Clients list page with search, pagination, CRUD dialogs
- [x] GET + POST /api/services (duplicate name check)
- [x] PATCH + DELETE /api/services/[id] (soft delete)
- [x] Services settings page with full CRUD

---

### ✅ Phase 4 — Visits
- [x] GET /api/visits with role-aware filtering and pagination
- [x] POST /api/visits — staffId from session, price defaults to basePrice
- [x] DELETE /api/visits/[id] — hard delete, admin only
- [x] Visits list page with date filter and pagination
- [x] Create visit form — client selector, service selector, price override, notes
- [x] Delete confirmation dialog
- [x] Verify: staff only sees their own visits
- [x] Verify: actualPrice defaults to basePrice on service select
- [x] Verify: admin can filter by staff member

---

### ✅ Phase 5 — Employees
- [x] GET /api/employees — list all business members
- [x] POST /api/employees — create with hashed password via ctx.password.hash
- [x] PATCH /api/employees/[id] — update role, guard: cannot change own role
- [x] DELETE /api/employees/[id] — desvincular, guards: not self, not last admin
- [x] Employees page with table
- [x] Create/edit employee dialog
- [x] Delete confirmation dialog
- [x] Verify: staff gets 403 on all /api/employees endpoints
- [x] Verify: visits staff filter dropdown populates

---

### ✅ Phase 6 — Reports
- [x] lib/prompts/report.ts — prompt template with typed payload
- [x] Weekly stats query — visits, revenue, top services, top clients, staff
- [x] Gemini 2.5 Flash call with 15s AbortController
- [x] OpenRouter fallback with 15s AbortController
- [x] GET /api/reports?weekStart= — return stored report or null
- [x] POST /api/reports — generate, store, return
- [x] Reports page with week picker and report viewer (react-markdown)
- [x] Verify: existing report returned without regenerating
- [x] Verify: force regenerate overwrites stored report

---

### ✅ Phase 7 — Settings
- [x] PATCH /api/settings/business — update business name, admin only
- [x] PATCH /api/settings/account — update name, email, password (any user)
- [x] Settings page — Server Component reads session + role + business name,
      passes as props to settings-client.tsx (Client Component)
- [x] Business section — read-only with inline edit, admin only
- [x] Account section — profile card + password card, read-only with inline edit
- [x] Password change verifies current password via ctx.password.verify

---

### ✅ Phase 8 — UI Polish & Bug Fixes
> Goal: fix known inconsistencies and bugs before deploy.

**Tasks:**

- [x] Fix UserMenu DropdownMenuLabel error (`MenuGroupRootContext is missing`)
      Root cause: shadcn/ui updated DropdownMenu to use Base UI which changed
      how DropdownMenuLabel works inside triggers. Solution: replace
      DropdownMenuLabel with a plain div styled to match.
- [x] Fix infinite redirect loop on sign out
      Root cause: `router.push("/login")` is a soft navigation — browser still
      held the session cookie in memory when middleware ran. Solution: use
      `window.location.href` for a full HTTP request + manually clear `cf-role`
      cookie via `document.cookie = "cf-role=; Max-Age=0; path=/"`.
- [x] Fix login form handler not running
      Root cause: `React.SubmitEvent` is not a valid React type. `e.preventDefault()`
      never ran, causing native HTML form submit (page reload). Solution: use
      `React.FormEvent<HTMLFormElement>`.
- [x] Fix seed creating users without valid credentials
      Root cause: `auth.api.signUpEmail` requires full HTTP context and does not
      reliably create the Account record outside route handlers. Better Auth
      could not verify credentials on login and created duplicate users with
      different IDs, breaking BusinessMember lookup. Solution: rewrite seed
      using `auth.$context.password.hash` + Prisma transaction, same pattern
      as POST /api/employees.
- [X] Fix hamburger button overlap with page titles on mobile
      Root cause: inconsistent top padding across pages. Solution: enforce
      `pt-14 lg:pt-0` on every page wrapper so the hamburger (positioned
      `top-4 left-4`, `lg:hidden`) always has space on mobile.
- [X] Fix business name in sidebar showing "ClientFlow" instead of actual name
      Root cause: sidebar receives user data but not business name. Solution:
      read business name in dashboard layout server component and pass as prop
      to sidebar.
- [X] Phone field format validation on client form
- [X] Clients table static width (notes column causes layout shift)
- [X] Business name in sidebar does not update after saving in Settings without
      a full page reload. Requires router.refresh() after successful PATCH
      or a shared server state solution.

---

### Phase 9 — Internationalization (i18n)

> Goal: full Spanish/English support. Locale chosen by user, remembered across sessions.

**Stack:** next-intl (standard for Next.js App Router, works in Server + Client Components)

**Design decisions:**

- No locale prefix in URLs — `/dashboard` not `/es/dashboard`. Locale via cookie only.
- `cf-locale` cookie, not HttpOnly — readable by both client and server.
- Falls back to `NEXT_PUBLIC_DEFAULT_LOCALE` env var — allows different default per deployment.
- Dynamic content (client names, service names, notes) is NOT translated — businesses
  write in their own language from day one.
- AI reports generated in the correct language by passing locale to the Gemini prompt.
- Selector shows flag + text (🇺🇸 EN / 🇨🇺 ES). Available on login page and settings page.

**Tasks:**

- [x] Install next-intl
- [x] Add `NEXT_PUBLIC_DEFAULT_LOCALE=en` to `.env.local`
- [x] Create `messages/en.json` with all UI strings in English
- [x] Create `messages/es.json` with all UI strings in Spanish
- [x] Create `i18n/request.ts` — reads `cf-locale` cookie, falls back to env var
- [x] Update `next.config.ts` — wrap with next-intl plugin
- [x] Update root layout — wrap with `NextIntlClientProvider`
- [x] Create `components/layout/locale-switcher.tsx` — flag + text selector,
      sets `cf-locale` cookie via useState + useEffect, calls `window.location.reload()`
- [x] Add locale switcher to login page
- [x] Update login page — all strings use `t('key')`
- [x] Update sidebar + user menu — all strings use `t('key')`
- [x] Update dashboard page + VisitsChart + RecentVisits — all strings use `t('key')`
- [x] Update visits page + all dialogs + filters — all strings use `t('key')`
- [x] Update clients dialogs — all strings use `t('key')`
- [x] Update employees page + dialogs — all strings use `t('key')`
- [x] Update reports page — all strings use `t('key')`
- [x] Update settings page — all strings use `t('key')`
- [x] Update report prompt in `lib/prompts/report.ts` — pass locale,
      instruct Gemini to generate in the correct language
- [x] Verify: changing locale on login page persists after login
- [x] Verify: changing locale in settings takes effect immediately
- [x] Verify: AI report generates in the selected language

---

### Phase 10 — Deploy

> Goal: ship to production on Vercel + Neon.

**Tasks:**

- [ ] Create Neon database and get connection strings
- [ ] Set all environment variables in Vercel dashboard
- [ ] Set `NEXT_PUBLIC_DEFAULT_LOCALE` per deployment in Vercel env vars
- [ ] Update DATABASE_URL and DIRECT_URL for production (sslmode=verify-full)
- [ ] Run prisma migrate deploy on Neon
- [ ] Create production seed (admin account only, no demo data)
- [ ] Deploy to Vercel and verify all routes work
- [ ] Verify: Better Auth cookies work on production domain
- [ ] Verify: Gemini API key works in production environment

---

## Future Improvements

### AI — Expanded Usage

The current AI usage (weekly report) is the foundation. Natural next steps:

- **Client history summary**: when opening a client's profile, generate a short
  AI summary of their visit history — what services they prefer, how often they
  come, any notes pattern. Useful for staff to personalize service.
- **Anomaly alerts**: after report generation, AI flags if revenue dropped more
  than 20% vs previous week and suggests possible reasons (fewer visits, lower
  prices, specific staff absent).
- **Client churn detection**: AI identifies clients who haven't visited in
  longer than their usual cycle and generates a "at risk" list for the admin.
- **Price optimization suggestions**: based on service demand and revenue data,
  AI suggests which services could support a price increase.
- **Natural language search**: let admin ask "how much did we make last month
  from haircuts" in a chat interface instead of navigating filters.

### Product — Post-MVP Features

- **Multi-business onboarding**: UI flow to create a new business account.
  Schema already supports it — only the onboarding flow is missing.
- **Invite by email (Option B for employees)**: admin enters email, system
  sends invite link via Resend. Employee sets own password. Requires email
  infrastructure.
- **Report export to PDF**: download the weekly report as a formatted PDF.
  Use a library like `@react-pdf/renderer` or generate via Puppeteer on the server.
- **Client profile page**: dedicated page per client showing full visit history,
  total spend, last visit date, and AI-generated summary.
- **Dashboard comparison**: show current week vs previous week delta on all
  metric cards, not just totals.
- **Notifications**: in-app or email alert when a weekly report is ready, or
  when a client hasn't visited in over 30 days.
- **Mobile app**: the data model and API are already built. A React Native
  frontend could reuse all endpoints directly.

---

## Current Status

**Active Phase:** 10 — Deployment
**Last completed phase:** 8 
**Last updated:** 2026-03-30
---

## Technical Notes

- **Better Auth**: credentials login only. `proxy.ts` handles route protection globally.
- **Multitenancy**: via `BusinessMember`. `User` has no `businessId` or `role` directly.
- **Prisma 7**: client generated in `./app/generated/prisma/client`.
- **middleware.ts**: uses `proxy.ts` naming for Next.js 16 Windows compatibility.
- **Role cookie**: `cf-role` set by `/api/auth/session-init`. Not HttpOnly — client
  reads it to render admin-only UI. Authorization always enforced server-side.
- **Locale cookie**: `cf-locale` set by `LocaleSwitcher` component. Not HttpOnly —
  readable by both client and server middleware. Falls back to `NEXT_PUBLIC_DEFAULT_LOCALE`.
- **Middleware route split**: `ADMIN_ONLY_PAGE_ROUTES` redirects staff to `/visits`.
  `ADMIN_ONLY_API_ROUTES` returns 403 directly.
- **Sidebar collapse**: `useSyncExternalStore` with localStorage.
- **Mobile sidebar**: Sheet drawer, hamburger at `top-4 left-4`, hidden below `lg`.
- **Dashboard fetch**: server component passes `headers()` so session cookie travels.
- **key prop on dialogs**: `key={editing ? edit-${id} : "create"}` forces remount.
- **useDebounce(300ms)**: search fires 300ms after user stops typing.
- **Decimal serialization**: Prisma Decimal must be cast to Number before JSON response.
- **params in Next.js 16**: params is Promise<{id}> — must await before destructuring.
- **Visits immutability**: no PATCH on visits by design. Delete + re-enter.
- **Employee creation**: Prisma transaction (User + Account + BusinessMember).
  Use ctx.password.hash — never auth.api.signUpEmail (hijacks session + unreliable
  outside HTTP context).
- **Seed**: same pattern as employee creation. ctx.password.hash + Prisma transaction.
  Never auth.api.signUpEmail — does not reliably create Account with hashed credentials
  outside route handlers, causing Better Auth to create duplicate users on login.
- **Better Auth Account model**: credentials are stored in the Account table with
  `providerId: "credential"` and `accountId: user.id`. A User without a matching
  Account record cannot log in — Better Auth will create a new User instead.
- **Sign out**: use `window.location.href = "/login"` not `router.push`. router.push
  is soft navigation — session cookie still present in browser memory when middleware
  runs, causing redirect loop. Also manually clear `cf-role` with document.cookie.
- **Login form type**: `React.FormEvent<HTMLFormElement>` not `React.SubmitEvent`.
  Wrong type silently breaks e.preventDefault(), causing native HTML form submit.
- **Employee removal**: delete BusinessMember only, User preserved for visit history.
- **Settings hydration**: page.tsx is Server Component, passes isAdmin + names as props
  to settings-client.tsx. Avoids cookie reading on client = no hydration mismatch.
- **DropdownMenuLabel**: broken in current shadcn/ui version with Base UI backend.
  Replace with plain styled div.
- **suppressHydrationWarning**: on html and body tags in root layout — browser
  extensions modify DOM before React hydrates, this suppresses false positives.
- **react-markdown**: required for report viewer. Install with npm install react-markdown.
- **oslo/password**: deprecated, do not use. Use auth.$context.password.hash.
- **i18n — no URL prefix**: locale is cookie-based, not URL-based. Avoids complexity
  in middleware routing and keeps all existing links valid.
- **i18n — AI reports**: pass locale to Gemini prompt. Do not translate after the fact —
  generate directly in the target language.
- **SPEC vs real schema**: always trust the actual schema.prisma file over SPEC.md.
  The SPEC schema can fall behind. When in doubt, read the file directly.
  - **i18n — useTranslations vs getTranslations**: useTranslations() for Client Components,
  getTranslations() (async) for Server Components. Wrong one causes a runtime error.
- **i18n — dynamic keys blocked**: next-intl cannot resolve template literal keys like
  t(`days.${index}`) at runtime. Use a locale-based array in the component instead:
  const DAYS = { en: [...], es: [...] }; DAYS[locale][index].
- **i18n — react-hooks/immutability**: ESLint rule from eslint-config-next blocks direct
  mutation of document.cookie in event handlers. Solution: use useState + useEffect —
  store the pending value in state, mutate in the effect. This is also the correct
  React pattern regardless of the lint rule.
- **i18n — useLocale()**: hook that returns the current locale string in Client Components.
  Use it to pass the correct locale to toLocaleDateString() and for locale-conditional logic.
- **i18n — day labels from API**: DAY_LABELS in /api/dashboard are hardcoded English strings.
  Do not change the API — translate on the client using a locale-based array indexed by
  position (API always returns 7 days Mon→Sun in order, index is reliable).
- **i18n — date formatting**: pass locale to toLocaleDateString().
  Use "es-CU" for Spanish (Cuba), "en-US" for English.