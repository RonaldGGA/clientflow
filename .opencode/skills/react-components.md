# SKILL: React Components

## Component Rules
- One component = one responsibility.
- Props interface defined above the component, named `[ComponentName]Props`.
- No inline object/array creation in JSX — extract to variable or memo.
- No logic in JSX — extract to variables above the return.

```tsx
// BAD
return (
  <div>
    {users.filter(u => u.active).map(u => <UserCard key={u.id} user={u} />)}
  </div>
)

// GOOD
const activeUsers = users.filter(u => u.active)
return (
  <div>
    {activeUsers.map(u => <UserCard key={u.id} user={u} />)}
  </div>
)
```

## State Management
- Local state only — no global state manager (Zustand, Redux) for this project.
- Lift state only when two siblings need it — not preemptively.
- Server state (fetched data) lives in the component that owns it.

## Forms
- shadcn/ui Form with react-hook-form + Zod resolver.
- Controlled inputs only.
- Validate on submit, show field-level errors.
- Disable submit button during submission.

## Loading & Error States
Every component that fetches data has three states — all three must render correctly:
1. Loading → shadcn/ui Skeleton
2. Error → user-friendly message (not the raw error)
3. Success → the actual content

Never show empty white space while loading.

## Fetch Pattern (client-side)
```ts
// hooks/use-fetch.ts
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(json => setData(json.data))
      .catch(err => {
        if (err.name !== 'AbortError') setError('Request failed')
      })
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => { controller.abort(); clearTimeout(timeout) }
  }, [url])

  return { data, error, loading }
}
```

## Empty States
Every list component renders an empty state when the array is empty:
```tsx
if (clients.length === 0) {
  return <EmptyState message="No clients yet. Register the first one." />
}
```

## shadcn/ui Usage
- Use shadcn components for: Button, Input, Form, Table, Card, Dialog, Select, Badge, Skeleton.
- Never rebuild from scratch what shadcn provides.
- Extend with `className` prop using `cn()` utility — never override with `!important`.
