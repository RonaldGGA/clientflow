# SKILL: Next.js 14 App Router

## Route Handlers
- Every GET handler must declare cache behavior explicitly:
```ts
export const dynamic = 'force-dynamic'
```
- Never rely on default caching behavior — it changes between Next.js versions.
- Route files export only HTTP method functions: `GET`, `POST`, `PATCH`, `DELETE`.

## Auth Check Pattern
Every protected route handler follows this exact order:
```ts
export async function GET(req: Request) {
  // 1. Check session
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })

  // 2. Check role if admin-only
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  // 3. Validate input (POST/PATCH only)
  // 4. Query DB
  // 5. Return response
}
```

## Middleware
- Middleware runs on every request — keep it minimal, no DB calls.
- Role-based redirects in middleware use the JWT token only.
- Pattern:
```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const token = await getToken({ req })
  if (!token) return NextResponse.redirect(new URL('/login', req.url))
  if (isAdminRoute(req.pathname) && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/visits/new', req.url))
  }
}
export const config = { matcher: ['/dashboard/:path*'] }
```

## Server vs Client Components
- Default: Server Component. Add `'use client'` only when needed.
- Needs `'use client'`: useState, useEffect, event handlers, browser APIs.
- Data fetching always in Server Components or route handlers — never in useEffect.
- Pass data down as props — don't fetch the same data twice.

## Error Handling in Pages
- Every page that fetches data must handle the loading and error states.
- Use Next.js `loading.tsx` and `error.tsx` colocated with the page.

## Response Shape
Always return the same shape:
```ts
// Success
return NextResponse.json({ data: result, error: null })

// Error
return NextResponse.json({ data: null, error: 'message' }, { status: 400 })
```
