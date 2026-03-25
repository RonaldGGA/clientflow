# SKILL: TypeScript Strict

## Hard Rules
- `strict: true` in tsconfig — non-negotiable.
- No `any`. If you feel the urge to use `any`, use `unknown` and narrow it.
- No type casting (`as SomeType`) unless you add a comment explaining why it's safe.
- No non-null assertions (`!`) unless you can prove the value is never null at that point.

## Types vs Interfaces
- `interface` for objects that describe entities (Client, Visit, User).
- `type` for unions, intersections, and utility types.
```ts
interface Client { id: string; name: string; phone: string | null }
type Role = 'ADMIN' | 'STAFF'
type ClientWithVisits = Client & { visits: Visit[] }
```

## Prisma Types
- Always import generated types from `@prisma/client` — never redefine them.
- Use `Prisma.ClientGetPayload<...>` for queries with includes.
```ts
type ClientWithHistory = Prisma.ClientGetPayload<{
  include: { visits: { include: { service: true; staff: true } } }
}>
```

## API Response Types
- Define a generic response wrapper and use it everywhere.
```ts
type ApiResponse<T> = { data: T; error: null } | { data: null; error: string }
```

## Async / Error Handling
- Never `async` without `try/catch` or explicit `.catch()`.
- Never swallow errors silently.
```ts
// BAD
const result = await prisma.client.findMany()

// GOOD
try {
  const result = await prisma.client.findMany()
} catch (error) {
  return { data: null, error: 'Failed to fetch clients' }
}
```

## Zod Validation
- Every API endpoint that receives input validates with Zod before touching the DB.
- Schema lives in `lib/validations/[entity].ts`.
- Parse with `safeParse`, never `parse` (parse throws, safeParse returns a result).
```ts
const result = createClientSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ data: null, error: result.error.flatten() }, { status: 400 })
}
```
