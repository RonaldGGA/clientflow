<div align="center">

# ClientFlow

**The all-in-one client & service management platform for local businesses.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)](https://www.postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

</div>

---

## The Problem

Running a barbershop, clinic, repair shop, or salon means juggling clients, staff, services, and revenue — often on paper, in spreadsheets, or across disconnected apps. Tracking who came in, what they paid, and how the week performed shouldn't require a degree in software.

**ClientFlow was built to fix that.**

---

## What Is ClientFlow?

ClientFlow is a **multi-tenant SaaS application** that gives small service businesses a clean, modern workspace to manage everything that matters:

- Register and manage clients
- Catalog services with flexible pricing
- Log every visit with the staff member and actual price charged
- Understand business performance through an analytics dashboard
- Receive **AI-generated weekly reports** written in plain language

Designed to be **business-agnostic** — it works equally well for barbershops, physiotherapy clinics, nail salons, personal trainers, and repair workshops. The demo ships with barbershop sample data.

---

## Features

### For Admins
- **Dashboard** — Weekly revenue, total visits, active clients, and a 7-day visit chart at a glance
- **Client Management** — Full CRUD with search, phone, notes, and soft delete to preserve history
- **Service Catalog** — Manage services with base prices; actual prices can be overridden per visit
- **Visit Log** — Complete history of all visits across all staff members, with date and staff filters
- **Employee Management** — Create staff accounts, assign roles, and revoke access without losing visit history
- **AI Reports** — Generate a narrative business performance report for any week using Google Gemini 2.5 Flash, with OpenRouter as a fallback. Reports are stored and only regenerated on demand
- **Settings** — Update business name, personal profile, and password

### For Staff
- **Visit Entry** — Log new visits for any client with service selection and optional price override
- **Personal Visit Log** — Staff see only their own visits; admins see everyone's
- **Client Creation** — Staff can register walk-in clients on the spot

### Platform
- **Role-Based Access Control** — Two roles (`admin` / `staff`) enforced server-side on every API route and page
- **Multi-tenant Architecture** — Schema designed to support multiple businesses from day one
- **Bilingual UI** — Full English and Spanish support via `next-intl`, with locale persisted in a cookie and applied to AI report generation
- **Responsive Design** — Collapsible sidebar on desktop, Sheet drawer on mobile

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Full-stack, Vercel-native, Server + Client Components |
| Language | **TypeScript** (strict) | End-to-end type safety |
| Database | **PostgreSQL 17** / **Neon** | Relational data, Neon for zero-config production |
| ORM | **Prisma 7** | Type-safe queries, schema-driven migrations |
| Auth | **Better Auth** | Framework-agnostic, credential-based sessions |
| Styling | **Tailwind CSS + shadcn/ui** | Consistent, production-quality dark UI |
| Charts | **Recharts** | Composable, lightweight data visualization |
| AI | **Google Gemini 2.5 Flash** | Stable free tier (250 RPD), fast generation |
| AI Fallback | **OpenRouter** | Backup provider if Gemini is unavailable |
| i18n | **next-intl** | Server + Client Component translation support |
| Deployment | **Vercel + Neon** | Zero-config CI/CD, matches the full stack |

---

## Architecture Highlights

### Multi-Tenancy via `BusinessMember`
Users belong to a business through a `BusinessMember` join table that carries their role. A single user account can belong to multiple businesses. All data entities (`Client`, `Service`, `Visit`, `Report`) carry a `businessId` and are always queried with a tenant filter.

### Role Enforcement at Two Layers
- **Middleware** (`proxy.ts`) — protects page routes and redirects unauthorized users before any page renders
- **API handlers** — validate session and role independently on every request; the UI is never the only guard

### Soft Delete Everywhere (Except Visits)
Clients and services use `deletedAt DateTime?` so historical data is never lost. Visits are immutable by design — if a visit was entered incorrectly, it is deleted and re-entered. This keeps the audit trail clean.

### Price Stored at the Point of Service
`Service.basePrice` is a catalog default. `Visit.actualPrice` captures what was actually charged, supporting discounts, promotions, and price changes over time without affecting historical records.

### AI Reports with Fallback and Timeout
Every AI call runs with a 15-second `AbortController`. If Gemini fails or times out, the system retries against OpenRouter automatically. Reports are persisted in the database after generation and served from storage on subsequent requests.

### i18n Without URL Prefixes
Locale is stored in a `cf-locale` cookie — no `/es/dashboard` path complexity. The locale is readable by both server and client, applied to UI strings via `next-intl`, and passed directly to the Gemini prompt so AI reports are generated in the user's chosen language rather than translated after the fact.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 17 running locally
- A Google AI API key ([get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
git clone https://github.com/your-username/clientflow.git
cd clientflow
npm install
```

### Environment Setup

Copy the example below to `.env.local` and fill in your values:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/clientflow_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/clientflow_dev"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000

# AI
GOOGLE_AI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key

# i18n — "en" or "es"
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

### Database Setup

```bash
# Push the schema and generate the Prisma client
npx prisma migrate dev --name init

# Seed the database with a demo admin and staff account
npx prisma db seed
```

**Default credentials after seeding:**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.com` | `admin1234` |
| Staff | `staff@demo.com` | `staff1234` |

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the credentials above.

---

## Project Structure

```
clientflow/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # All authenticated pages
│   │   ├── page.tsx           # Dashboard (admin only)
│   │   ├── clients/
│   │   ├── visits/
│   │   ├── employees/         # Admin only
│   │   ├── reports/           # Admin only
│   │   └── settings/
│   │       └── services/      # Admin only
│   └── api/                   # All REST endpoints
│       ├── auth/
│       ├── clients/
│       ├── services/
│       ├── visits/
│       ├── employees/
│       ├── dashboard/
│       ├── reports/
│       └── settings/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   ├── layout/                # Sidebar, user menu, locale switcher
│   ├── dashboard/             # MetricCard, VisitsChart, RecentVisits
│   ├── clients/               # CRUD dialogs
│   ├── services/
│   ├── visits/
│   ├── employees/
│   └── reports/               # ReportViewer, WeekPicker
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # Better Auth server config
│   ├── auth-client.ts         # Better Auth browser client
│   └── prompts/report.ts      # Gemini prompt template
├── messages/
│   ├── en.json                # English UI strings
│   └── es.json                # Spanish UI strings
├── i18n/request.ts            # next-intl locale detection
├── prisma/schema.prisma
└── proxy.ts                   # Next.js 16 middleware (route protection)
```

---

## Database Schema

The schema is fully relational and multi-tenant from the ground up.

```
Business ──< BusinessMember >── User
    │                               │
    ├──< Client                     │
    ├──< Service                    │
    ├──< Visit >── Client           │
    │          └── Service          │
    │          └── User (staff) ────┘
    └──< Report
```

Key design decisions reflected in the schema:
- `BusinessMember` carries the `role` string (`admin` | `staff`) per business, not on the `User` itself
- `Visit` stores `actualPrice` independently of `Service.basePrice`
- `Client` and `Service` have `deletedAt` for soft delete; `Visit` does not
- `Report` stores generated content as a string, enabling instant retrieval without regeneration

---

## Deployment

ClientFlow is designed to deploy to **Vercel + Neon** with zero configuration beyond environment variables.

1. Create a Neon database and copy the connection strings
2. Add all environment variables to the Vercel dashboard (use `sslmode=verify-full` for production database URLs)
3. Run `npx prisma migrate deploy` against the Neon database
4. Push to your main branch — Vercel builds and deploys automatically

---

## Roadmap

The current version covers the full core workflow. Planned additions:

**AI Expansion**
- Client history summary on profile open
- Revenue anomaly alerts after report generation
- Client churn detection (clients overdue for a visit)
- Price optimization suggestions based on demand data
- Natural language query interface ("how much did we make from haircuts last month?")

**Product**
- Multi-business onboarding UI (schema already supports it)
- Employee invite by email via Resend
- Weekly report export to PDF
- Per-client profile page with full visit history and AI summary
- Dashboard week-over-week delta comparison
- In-app and email notifications
- React Native mobile client (API is already complete)

---

## Design System

- **Theme:** Dark only
- **Font:** Inter
- **Accent:** Emerald `#10b981`
- **Components:** shadcn/ui with Tailwind CSS

---

## License

MIT © 2026 — Built as a portfolio project demonstrating full-stack SaaS architecture with AI integration. Intended to be helpful for local businesses.

---

<div align="center">

Built with Next.js · Prisma · Better Auth · Google Gemini · Deployed on Vercel

</div>