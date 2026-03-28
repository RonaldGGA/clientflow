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
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
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

### ✅ Phase 1 — Auth (Better Auth)
> Goal: users can log in, roles are enforced, routes are protected

- [x] Configure Better Auth with Prisma adapter and nextCookies plugin
- [x] Set up `api/auth/[...all]` catch-all route
- [x] Implement `middleware.ts` for route protection and session validation
- [x] Build login page UI using Better Auth client
- [x] Implement logic to check `BusinessMember` role for route authorization
- [x] Redirect unauthenticated users to `/login`
- [x] Redirect staff away from admin-only routes
- [x] Seed one admin user and one staff user
- [x] Verify: admin sees full nav, staff sees only visits

### ✅ Phase 2 — Dashboard & Layout
> Goal: authenticated users see a functional dashboard with real metrics and navigation

**Architecture decisions:**
- Dashboard is admin-only. Staff is redirected to `/visits` by middleware.
- Sidebar is collapsible (icon-only mode), expanded by default, state stored in localStorage.
- Profile is a dropdown in the sidebar footer — no separate route.
- All metrics are computed server-side in `/api/dashboard` — never on the client.
- Week range: Monday 00:00:00 to Sunday 23:59:59 of the current calendar week.
- Chart data (visits per day) is returned by the same API route as metrics.

**Sidebar navigation:**
- Admin: Dashboard, Clients, Visits, Employees, Reports, Settings + Profile dropdown
- Staff: Visits only + Profile dropdown

**Metrics (GET /api/dashboard):**
- `weeklyRevenue`: sum of `actualPrice` for visits in current calendar week
- `activeClients`: count of clients where `deletedAt IS NULL`
- `weeklyVisits`: count of visits in current calendar week
- `topService`: service name with most visits in current calendar week
- `visitsPerDay`: array of { day: string, count: number } for the current week (Mon–Sun)
- `recentVisits`: last 5 visits with client name, service name, actualPrice, createdAt

**Response shape:**

```json
{
  "data": {
    "weeklyRevenue": 1240.00,
    "activeClients": 8,
    "weeklyVisits": 23,
    "topService": "Corte clásico",
    "visitsPerDay": [
      { "day": "Mon", "count": 4 },
      { "day": "Tue", "count": 7 }
    ],
    "recentVisits": [
      {
        "id": "...",
        "clientName": "Juan",
        "serviceName": "Corte clásico",
        "actualPrice": 15.00,
        "createdAt": "2026-03-25T19:00:00Z"
      }
    ]
  },
  "error": null
}
```

**Files to create:**

- `app/(dashboard)/layout.tsx` — sidebar + topbar, role-aware nav
- `components/layout/sidebar.tsx` — collapsible sidebar component
- `components/layout/sidebar-nav.tsx` — nav items with active state
- `components/layout/user-menu.tsx` — profile dropdown in sidebar footer
- `app/(dashboard)/page.tsx` — dashboard page, fetches metrics server-side
- `app/api/dashboard/route.ts` — metrics API, admin-only, force-dynamic
- `components/dashboard/metric-card.tsx` — reusable metric display card
- `components/dashboard/visits-chart.tsx` — Recharts bar chart, visits per day
- `components/dashboard/recent-visits.tsx` — last 5 visits table

**Tasks:**

- [X] Build collapsible sidebar with role-aware navigation
- [X] Build profile dropdown in sidebar footer with sign out
- [X] Create GET /api/dashboard with all metrics
- [X] Build dashboard page with metric cards, chart, recent visits
- [X] Verify: metrics match data in database
- [X] Verify: staff cannot access /dashboard (redirected to /visits)

### Phase 3 — Clients & Services

> Goal: admins can manage clients and services with full CRUD

**Architecture decisions:**

- Clients and Services live under separate routes: `/clients` and `/settings/services`
- Services management lives under Settings — it's configuration, not day-to-day operation
- All lists are paginated (default page size: 20) with server-side search via query param `?q=`
- Soft delete only — `deletedAt` is set, records are never removed
- Forms use controlled components with client-side validation before submission
- Optimistic UI is not used — all mutations wait for server confirmation before updating the list

**Endpoints:**

- `GET /api/clients?q=&page=` — paginated list, excludes soft-deleted
- `POST /api/clients` — create client
- `PATCH /api/clients/[id]` — update client
- `DELETE /api/clients/[id]` — soft delete
- `GET /api/services?q=` — full list (services don't paginate, typically small set)
- `POST /api/services` — create service
- `PATCH /api/services/[id]` — update service
- `DELETE /api/services/[id]` — soft delete

**Files to create:**

- `app/(dashboard)/clients/page.tsx`
- `app/api/clients/route.ts`
- `app/api/clients/[id]/route.ts`
- `components/clients/client-list.tsx`
- `components/clients/client-form.tsx`
- `components/clients/delete-client-dialog.tsx`

**Tasks:**

- [ ] Create GET + POST /api/clients
- [ ] Create PATCH + DELETE /api/clients/[id]
- [ ] Build clients list page with search and pagination
- [ ] Build create/edit client form in a dialog
- [ ] Build soft delete confirmation dialog
- [ ] Verify: soft deleted clients don't appear in list or metrics

## Current Status

**Active Phase:** 3 — Clients & Services
**Last completed phase:** 2 — Dashboard & Layout
**Last updated:** 2026-03-27

## Technical Notes

- **Better Auth**: Replaced NextAuth for framework-agnostic stability and better Next.js 16 support.
- **Multitenancy**: Handled via `BusinessMember`. `User` does not store `businessId` or `role` directly.
- **Prisma 7**: Leveraging latest Prisma features.
- **middleware.ts**: Se usa `middleware.ts` en lugar de `proxy.ts` por bug confirmado
  en Next.js 16 en Windows. Exporta `proxy` como función principal y re-exporta
  como `middleware` para compatibilidad.
- **Role cookie**: `cf-role` cookie seteada por `/api/auth/session-init` después del
  login. Permite al middleware verificar roles sin tocar la DB.
- **Prisma 7 output**: Cliente generado en `./app/generated/prisma/client`.
  Todos los imports usan `@/app/generated/prisma/client`.
- **Seed**: `npx prisma db seed` crea business demo + admin + staff.
  Credenciales: `admin@clientflow.com` / `password123`, `staff@clientflow.com` / `password123`.
- **Dashboard**: Solo visible para admin. Staff redirige a `/visits` via middleware.
- **Métricas**: Calculadas server-side en `/api/dashboard`. Rango semanal: lunes 00:00
  a domingo 23:59 de la semana calendario actual.
  - **SSL mode**: `sslmode=verify-full` usado en DATABASE_URL y DIRECT_URL para
  compatibilidad futura con pg v9 / pg-connection-string v3.
- **session-init**: endpoint POST en `/api/auth/session-init`. Requiere
  `credentials: "include"` en el fetch del login para que la cookie de sesión
  viaje al servidor. Setea `cf-role` httpOnly con path `/`.
- **Sidebar collapse**: usa `useSyncExternalStore` con `localStorage`. 
  `getServerSnapshot` devuelve `false` para evitar hydration mismatch.
  `window.dispatchEvent(new StorageEvent(...))` necesario para notificar
  cambios en la misma pestaña.
- **Mobile sidebar**: oculto en mobile (`< lg`). Se abre como Sheet drawer
  con botón hamburger fijo en `top-4 left-4`.
- **Logo**: tijera (`Scissors`) es placeholder. Se volverá dinámico en Phase
  Settings basado en el tipo de negocio configurado.
- **Dashboard fetch**: `page.tsx` fetcha `/api/dashboard` server-side pasando
  `headers()` para que la cookie de sesión viaje correctamente entre server components.