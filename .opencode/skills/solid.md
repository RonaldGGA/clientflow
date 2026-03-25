# SKILL: SOLID (Applied to This Stack)

## S — Single Responsibility
- Route handler: only HTTP handling (parse, validate, call service, respond).
- Don't put business logic in route handlers — extract to lib functions.
```ts
// BAD — business logic in route
export async function POST(req: Request) {
  const body = await req.json()
  const visits = await prisma.visit.findMany({ where: { businessId: body.id } })
  const revenue = visits.reduce((acc, v) => acc + v.actualPrice.toNumber(), 0)
  // ... 40 more lines
}

// GOOD — route delegates
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  const report = await generateWeeklyReport(session.user.businessId, body.weekStart)
  return NextResponse.json({ data: report, error: null })
}
```

## O — Open/Closed
- Prompt builder accepts a config object — adding a new report type doesn't change existing code.
- LLM caller is a single function — swapping providers doesn't change callers.

## L — Liskov Substitution
- Applies to TypeScript: if a function accepts `Client`, it must work with any valid `Client`.
- Don't add implicit assumptions about optional fields being present.

## I — Interface Segregation
- Props interfaces are specific — don't pass the whole `Client` object if the component only needs `name` and `id`.
```ts
// BAD
interface ClientCardProps { client: Client } // Client has 10 fields

// GOOD
interface ClientCardProps { id: string; name: string; isInactive: boolean }
```

## D — Dependency Inversion
- Route handlers depend on lib functions, not on Prisma directly.
- This means lib functions can be tested independently of the HTTP layer.
- Pattern: `app/api/` calls `lib/` — `lib/` calls `prisma`.

```
Request → Route Handler → lib/clients.ts → prisma
                       ↘ lib/validations/client.ts
```
