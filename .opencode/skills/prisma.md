# SKILL: Prisma Patterns

## Client Singleton
Always import from `lib/prisma.ts` — never instantiate PrismaClient directly in a route.
```ts
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Mandatory Rules
- Every query with a list result MUST have explicit `orderBy`.
- Every query MUST filter by `deletedAt: null` unless intentionally fetching deleted records.
- Every entity-level query MUST filter by `businessId` from the session.

```ts
// BAD — missing orderBy, missing deletedAt filter, missing businessId
const clients = await prisma.client.findMany()

// GOOD
const clients = await prisma.client.findMany({
  where: { businessId: session.user.businessId, deletedAt: null },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: (page - 1) * 20,
})
```

## Soft Delete Pattern
Never use `delete()`. Always use `update()` to set `deletedAt`.
```ts
await prisma.client.update({
  where: { id },
  data: { deletedAt: new Date() },
})
```

## Include vs Select
- Use `select` when you know exactly what fields you need (leaner queries).
- Use `include` when you need full related objects.
- Never include relations you don't use in the response.

## Money Fields
- `basePrice` and `actualPrice` are `Decimal` in Prisma.
- Prisma returns `Decimal` objects — convert to `number` only at the response layer.
```ts
actualPrice: visit.actualPrice.toNumber()
```

## Migrations
- Name migrations descriptively: `npx prisma migrate dev --name add_notes_to_client`
- Never edit migration files manually after they're applied.
- Run `prisma generate` after every schema change.

## Transactions
Use transactions when multiple writes must succeed or fail together:
```ts
await prisma.$transaction([
  prisma.visit.create({ data: visitData }),
  prisma.client.update({ where: { id }, data: { updatedAt: new Date() } }),
])
```
