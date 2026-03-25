# SKILL: Security

## Auth Rules
- Session check is the FIRST thing in every protected route handler — before any logic.
- `businessId` comes from the session token — NEVER from the request body or query params.
- Role check is separate from auth check — authenticated ≠ authorized.

```ts
// BAD — businessId from body (attacker can spoof it)
const { businessId } = await req.json()

// GOOD — businessId from session
const session = await getServerSession(authOptions)
const businessId = session.user.businessId
```

## Password Handling
- Hash with bcrypt, minimum 12 rounds.
- Never log, return, or compare passwords in plain text.
- Never include `password` field in any query response — use `select` to exclude it.

```ts
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, name: true, role: true, businessId: true, password: true }
  // password selected ONLY for bcrypt.compare — never returned to client
})
```

## Input Sanitization
- Validate all inputs with Zod — this is also XSS protection.
- Never interpolate user input into raw SQL (Prisma prevents this, but no raw queries).
- String fields have max length in Zod schema: `z.string().max(255)`.

## Multi-Tenant Isolation
Every DB query that touches business data MUST include `businessId` filter.
No exceptions. An admin of Business A must never see Business B's data.

```ts
// This pattern on EVERY query
where: {
  businessId: session.user.businessId,
  deletedAt: null,
}
```

## Environment Variables
- API keys and secrets live only in `.env.local` (dev) and Vercel env vars (prod).
- Never hardcode secrets.
- `.env.local` is in `.gitignore` — verify before first commit.
- Provide `.env.example` with key names but no values.
