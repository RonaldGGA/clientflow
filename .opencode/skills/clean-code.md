# SKILL: Clean Code

## Functions
- One function = one responsibility. If you need "and" to describe it, split it.
- Max 20 lines per function. If longer, extract.
- No boolean parameters — use objects or separate functions.
- Prefer early returns over nested if blocks.

```ts
// BAD
function processVisit(visit: Visit, isAdmin: boolean) { ... }

// GOOD
function processAdminVisit(visit: Visit) { ... }
function processStaffVisit(visit: Visit) { ... }
```

## Naming
- Variables: what it IS, not what it does. `clientList` not `getClients`.
- Booleans: `isActive`, `hasVisits`, `canDelete` — always a predicate.
- Functions: verb + noun. `fetchClientById`, `buildWeeklyPrompt`, `softDeleteService`.
- No abbreviations. `err` → `error`, `res` → `response`, `usr` → `user`.
- No generic names: `data`, `info`, `temp`, `obj`, `item` are banned.

## Constants
- No magic numbers or strings inline.
```ts
// BAD
if (daysSinceVisit > 14) { ... }

// GOOD
const INACTIVE_CLIENT_THRESHOLD_DAYS = 14
if (daysSinceVisit > INACTIVE_CLIENT_THRESHOLD_DAYS) { ... }
```

## Comments
- Comments explain WHY, never WHAT.
- If the code needs a comment to explain what it does, rewrite the code.
- Exception: LLM prompt construction — comment the intent of each prompt section.

## Dead Code
- Delete unused variables, functions, imports immediately.
- Never commit commented-out code.
- Never leave `TODO` comments without a linked task.
