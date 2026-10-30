# Dining Hall Review — React Frontend (Sprint 2)

Owner: Bryan Gilles · CSC 4350 Team Deuce (Group 2)

Student-facing screens from the wireframes: dining halls (03), stations (04), station menu (05),
search & combined filters (06), item details (07), rating/review form (08), shared states (20) and
mobile layout (21).

> **Mock mode is the default.** All halls, menus and reviews are deterministic sample data in
> `src/services/fixtures.ts`. Nothing is read from or written to the Spring Boot API or PostgreSQL.
> Reviews you post are kept in memory and disappear on refresh. A banner at the top of every page
> says "Sample data · Mock mode" so nobody mistakes the demo for live data.

## Run it

Requires Node.js 22.12+ and pnpm 10 (`npm install -g pnpm@10`). Verified with Node 26.13.0 and pnpm 10.34.9.

```bash
cd frontend
pnpm install        # install exact versions from pnpm-lock.yaml
pnpm dev            # http://127.0.0.1:5173
```

| Command                             | What it does                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Dev server with hot reload                                                            |
| `pnpm lint`                         | ESLint, including React Hooks and `jsx-a11y` accessibility rules (0 warnings allowed) |
| `pnpm format` / `pnpm format:check` | Prettier formatting                                                                   |
| `pnpm test`                         | Vitest unit + component interaction tests (jsdom)                                     |
| `pnpm build`                        | TypeScript type-check, then production build into `dist/`                             |
| `pnpm test:e2e`                     | Playwright browser tests (run `pnpm exec playwright install` once first)              |

## Demo scenarios (mock mode)

Open the footer's **Demo scenarios** menu, or add `?scenario=` before the `#`:

| URL                                                     | Behavior                                                 |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `/?scenario=read-failure#/`                             | First menu load fails → "Try again" recovers             |
| `/?scenario=submit-failure#/items/chicken-bowl/review`  | First review submit fails; draft is kept; retry succeeds |
| `/?scenario=session-expired#/items/chicken-bowl/review` | Submit returns 401; draft is kept                        |
| `/?scenario=rate-limited#/items/chicken-bowl/review`    | Submit returns 429; draft is kept                        |

Fixtures deliberately include rated and unrated items, an unscheduled item, an item with unknown
dietary/allergen data (`daily-bowl`, `oats`), a hall with no hours, and a meal/date with no menu.

## How it is organised

```
src/
  domain.ts            Types + zod schemas, filter and rating rules (pure functions, unit-tested)
  services/dining.ts   DiningService interface + mock and HTTP implementations
  services/fixtures.ts Deterministic sample data
  components.tsx       Shared UI pieces (Heading, Notice, Select, Rating, ItemList…)
  pages/               Browse (03/04/05), Search (06), Item (07), Review (08)
  App.tsx              Layout, navigation, routes, loading/error states
tests/student.spec.ts  Playwright end-to-end + accessibility (axe) + screenshot capture
```

Pages only talk to the `DiningService` interface. `mock` and `http` implementations are swapped by
configuration (`.env.local`, copied from `.env.example`):

```bash
VITE_DATA_MODE=mock   # or http
VITE_API_BASE_URL=/api
```

**HTTP mode is not integrated.** It targets a _proposed_ contract
([docs/sprint-2/api-contract-proposal.md](../docs/sprint-2/api-contract-proposal.md)) that Jalen and
Wilder have not yet confirmed, and the backend has no endpoints yet. Never put database credentials
or secrets in `VITE_*` variables — everything in them is shipped to the browser.

## Out of scope for Sprint 2

Accounts/sign-in, editing/deleting reviews, saved items, heads-up notifications, staff tools,
nutrition and recommendations. See [docs/sprint-2/frontend-traceability.md](../docs/sprint-2/frontend-traceability.md).
