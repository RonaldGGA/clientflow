# SKILL: REST API Design

## URL Conventions
```
GET    /api/clients              → list (paginated)
GET    /api/clients/[id]         → single resource
POST   /api/clients              → create
PATCH  /api/clients/[id]         → partial update
DELETE /api/clients/[id]         → soft delete
```
- No verbs in URLs. `/api/clients/deactivate` → `PATCH /api/clients/[id]` with `{ active: false }`.
- Exception: actions that aren't CRUD. `POST /api/reports/generate` is acceptable.

## Request Validation
Every POST and PATCH validates with Zod before any DB call:
1. Parse body
2. Validate with safeParse
3. Return 400 with field errors if invalid
4. Only then touch the DB

## HTTP Status Codes
```
200 → success (GET, PATCH)
201 → created (POST)
400 → invalid input (validation failed)
401 → not authenticated
403 → authenticated but not authorized (wrong role)
404 → resource not found
500 → unexpected server error
```
Never return 200 with an error message in the body.

## Pagination
All list endpoints accept `?page=1&limit=20`.
Response includes pagination metadata:
```json
{
  "data": {
    "items": [...],
    "total": 87,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "error": null
}
```

## Filtering
Clients: `?search=name`
Visits: `?staffId=x&from=date&to=date`
Keep filter params minimal — only what the UI actually uses.

## Never Expose
- Password hashes
- Internal DB IDs in error messages
- Stack traces in production responses
- Other businesses' data (always filter by businessId)
