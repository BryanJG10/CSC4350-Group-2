# Proposed Frontend ↔ API Contract (Sprint 2)

**Status: PROPOSAL — not agreed.** Owner: Bryan (frontend). Reviewers needed: Jalen (backend/API), Wilder (database).

The React frontend currently runs in **mock mode** only. It also contains an HTTP adapter
(`frontend/src/services/dining.ts → createHttpService`) written against the shapes below so that
switching to the real Spring Boot API is a configuration change, not a rewrite. Nothing here has been
implemented or tested against a real backend. Please comment on or edit this file in the pull request.

Architecture reminder (SRS §Architecture): `Browser → React → Spring Boot REST API → PostgreSQL`.
The browser never talks to PostgreSQL and never holds database credentials.

## Endpoints the frontend calls

Base URL comes from `VITE_API_BASE_URL` (default `/api`). All requests send cookies
(`credentials: 'include'`) and expect JSON.

### `GET /api/catalog`

Returns everything the browse/search screens need in one response (simple for Sprint 2; see
"Open questions" for splitting it later).

```json
{
  "halls":    [{ "id": "patton", "name": "Patton", "hours": "7 AM–9 PM" }],
  "stations": [{ "id": "grill", "hallId": "patton", "name": "Grill", "description": "Burgers, bowls and sides" }],
  "items": [{
    "id": "chicken-bowl", "stationId": "grill", "name": "Grilled chicken bowl",
    "description": "Grilled chicken, rice and vegetables.",
    "meal": "Lunch", "date": "2026-10-08",
    "startsAt": "2026-10-08T11:00:00-04:00", "endsAt": "2026-10-08T14:00:00-04:00",
    "dietary": [], "allergens": ["Milk"]
  }],
  "reviews": [{
    "id": "r1", "itemId": "chicken-bowl", "author": "Alex", "rating": 5,
    "text": "Fresh and filling.", "tags": ["Would recommend"], "createdAt": "2026-10-08T16:00:00Z"
  }]
}
```

Field rules the frontend validates (with zod) and relies on:

| Field | Rule |
|---|---|
| `hours` | string or `null` (null shows "Hours not provided") |
| `meal` | one of `Breakfast`, `Lunch`, `Dinner` |
| `date` | ISO date `YYYY-MM-DD` |
| `startsAt` / `endsAt` | ISO date-time **with offset**, or `null` when not scheduled |
| `dietary` | array of `Vegetarian`/`Vegan`, **or `null` when unknown**. `[]` means "known: no labels". |
| `allergens` | array of `Milk, Wheat, Soy, Eggs, Peanuts, Tree nuts, Fish, Shellfish, Sesame`, **or `null` when unknown**. `[]` means "known: none listed". |
| `rating` | integer 1–5 |
| `tags` | subset of `Long wait`, `Shortage`, `Vegan option`, `Would recommend` |
| references | every `station.hallId`, `item.stationId`, `review.itemId` must exist in the same response |

The `null` vs `[]` distinction matters for safety: an allergen filter **excludes** items whose
allergens are unknown, rather than treating "unknown" as "allergen-free".

### `POST /api/items/{itemId}/reviews`

Request body:

```json
{ "rating": 4, "text": "Fresh and filling.", "tags": ["Would recommend"] }
```

- `text` may be empty (rating-only review); max 1,000 characters.
- Success: `201` (or `200`) with the created review object (same shape as in `reviews` above).
  The frontend checks that the returned `itemId` matches.

Error statuses the UI already handles (all keep the student's draft):

| Status | Meaning shown to the user |
|---|---|
| 401 | Session expired — sign in again |
| 403 | Not permitted |
| 404 | Item not found |
| 409 | Duplicate review for this visit (FR-23) |
| 429 | Submission rate-limited (FR-24) |
| other / network | Generic "could not submit, try again" |

## Open questions for Jalen / Wilder

1. **Authentication** (FR-01/02): session cookie or bearer token? If cookies, do we need a CSRF token header on `POST`?
2. **Aggregates** (FR-20, NFR-11): should the API return precomputed `average`/`count` per item and station instead of the browser computing them from all reviews?
3. **Catalog size**: one `/catalog` call is fine for demo data. For a semester of reviews we should split into `/halls`, `/halls/{id}/stations`, `/stations/{id}/items?date=&meal=`, `/items/{id}/reviews`, and server-side search `/items?text=&hall=&…`.
4. **IDs**: string slugs (as above) or numeric database IDs? The frontend treats IDs as opaque strings, so either works.
5. **Time zone**: confirm item times are stored/returned with an offset; the UI displays them in `America/New_York`.
6. **Weekly hall schedule JSON** (SRS §Data Requirements): what structure? The UI currently shows `hours` as a plain string.
7. **Tag vocabulary**: confirm the four review tags and the dietary/allergen lists match the database seed.
8. **Author display**: show a display name, initials, or "Student"? (privacy)
9. **Error body**: is there a standard error JSON (e.g. `{ "message": "..." }`) the UI should display?

Once agreed, update this file's status, adjust `createHttpService` and its tests, and only then
describe the frontend as "integrated".
