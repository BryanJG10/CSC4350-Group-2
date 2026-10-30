# Sprint 2 Frontend — Requirements Traceability

Owner: Bryan Gilles. Scope: React frontend in **mock mode** (see `frontend/README.md`).

**Read this first.** These rows show that the *user interface* behaves as the requirement describes
against deterministic sample data. They do **not** show that the *system* meets the requirement:
there is no live API, database, authentication, or deployment behind this UI yet. Where a
requirement depends on the backend, the "Frontend status" says so.

Legend — **UI done**: implemented and covered by an automated test · **Partial**: UI exists but
depends on unbuilt backend behavior · **Deferred**: not in Sprint 2 frontend scope.

Test names: `unit` = `src/domain.test.ts`, `service` = `src/services/dining.test.ts`,
`component` = `src/App.test.tsx`, `e2e` = `tests/student.spec.ts`.

## Functional requirements

| Req | Wireframe | Frontend status | Where | Evidence |
|---|---|---|---|---|
| FR-05 Display the three halls | 03 | UI done | `pages/Browse.tsx → Halls` | e2e "hall, station, menu…"; `03-halls-desktop.png` |
| FR-06 Stations per hall | 04 | UI done | `Browse.tsx → Stations` | component "navigates hall → station…"; `04-stations-desktop.png` |
| FR-07 Items per station + meal period | 05 | UI done (date + meal selectors, empty menu state) | `Browse.tsx → Menu` | component + e2e; `05-menu-desktop.png` |
| FR-08 Rating, reviews, dietary/allergen, availability for an item | 07 | UI done (distinguishes unrated, unscheduled, unknown metadata) | `pages/Item.tsx` | component "distinct unrated, unscheduled…"; `07-item-desktop.png` |
| FR-09 Navigate hall → station → item | 03–07 | UI done (links, breadcrumbs, back buttons, browser Back) | `Browse.tsx`, `Item.tsx` | component + e2e |
| FR-10 Search items | 03, 06 | UI done (name text search) | `pages/Search.tsx`, `domain.ts → filterItems` | unit + component |
| FR-11 Filter by hall | 06 | UI done | same | unit "ANDs text, hall…" |
| FR-12 Filter by station | 06 | UI done (station list follows hall; resets when hall changes) | same | component "combines all filters…" |
| FR-13 Filter by meal period | 06 | UI done | same | unit + component |
| FR-14 Filter by rating | 06 | UI done (minimum rating; unrated items excluded only when a minimum is set) | same | unit "includes unrated items…" |
| FR-15 Filter by dietary/allergen tags | 06 | UI done (diet include + multi-allergen exclude; unknown metadata never counts as a match) | same | unit "does not consider unknown…" |
| FR-16 No-results message | 06, 20 | UI done (message + "Clear all filters") | `Search.tsx` | component + e2e; `06-empty-desktop.png` |
| FR-17 Authenticated student submits rating | 08 | **Partial** — rating required and validated; **no real authentication** (mock "Demo student") | `pages/Review.tsx` | component "requires a rating…" |
| FR-18 Written review | 08 | Partial — optional text, 1,000-char limit; saved only in memory | same | unit + component |
| FR-19 Structured tags | 08 | Partial — four tags from the wireframe; vocabulary needs team confirmation | same | component |
| FR-20 Aggregate ratings for items and stations | 04, 05, 07 | UI done, computed in browser from fixtures (station = all reviews of its items, weighted by count). Server-side aggregation is backend work (NFR-11). | `domain.ts → aggregate` | unit "weights station averages…" |
| FR-21 Review history for an item | 07 | UI done (newest first) | `Item.tsx` | component; `07-item-desktop.png` |
| FR-22 Edit/delete own review | 08, 20 | Deferred (needs accounts) | — | — |
| FR-23 Duplicate prevention | 08 | Deferred to backend; UI shows a message for HTTP 409 | `services/dining.ts` | service "reports HTTP 409…" |
| FR-24 Spam limiting | 08, 20 | Deferred to backend; UI keeps draft on 429 (mock scenario `rate-limited`) | same | service "reports HTTP 429…" |

Not implemented this sprint: FR-01–04 (accounts), FR-25–31 (saved items, heads-up), FR-32–42
(staff/admin, analytics, data integrity — backend/database).

## Non-functional requirements

| Req | Frontend status | Evidence |
|---|---|---|
| NFR-01 Consistent navigation/style | Shared header, mode banner, nav, footer, buttons and notices on every page | All screenshots |
| NFR-02 Reach item reviews without unnecessary pages | Item reachable from menu (3 clicks from home) or directly from search results | component + e2e |
| NFR-03 Understandable filter labels | Every control has a visible `<label>`/`<legend>`; e2e selects controls by label | e2e "combined filters…" |
| NFR-04 Clear feedback after submission | Success notice with link to item; failure notice keeps draft and offers "Try again"; focus moves to the message | component + e2e |
| NFR-05 Keyboard navigation | Skip link, visible focus ring, heading focus on route change, native radios/checkboxes; a missing rating moves focus to the rating group. e2e completes search → item → review with keyboard only (link-tabbing part skipped on WebKit; see log) | e2e "keyboard navigation…"; component "requires a rating…" |
| NFR-06 Readable text, labels, accessible controls | axe-core WCAG 2.1 AA scan on 4 routes × 3 widths; 44 px touch targets | e2e "accessible screens…" |
| NFR-07 Not color alone | Errors use text + `role="alert"`; selected nav uses `aria-current` + fill; ratings shown as numbers | axe scan + review |
| NFR-08 Alt text / labels for icons | No meaningful images/icons; screen-reader text "out of 5" on rating radios | axe scan |
| NFR-22 Modular separation | Pages depend only on the `DiningService` interface; mock and HTTP adapters interchangeable; browser never connects to PostgreSQL | service tests |
| NFR-24 Version control | Work on `bryan/sprint-2-react-frontend`, reviewed via pull request | git history |
| NFR-25 No hard-coded secrets | Only public `VITE_*` settings; `.env*` ignored except `.env.example` | `.gitignore`, `.env.example` |
| NFR-26 Major browsers | **Partial.** Passing in Chrome 156, Edge 156 and Playwright WebKit (Safari's engine, not real Safari). **Firefox not verified** — Playwright's Firefox build would not start on the dev machine (missing Windows runtime). | `verification-log.md` |
| NFR-27 Desktop + mobile | Single-column layout under 650 px; no horizontal scroll at 390 px and 320 px | e2e "…no horizontal overflow…"; `21-item-mobile.png`, `06-filters-mobile.png` |

NFR-09–21, 23 are backend, database, or deployment concerns and are not claimed here.

## Known limitations

- Mock data only; reviews reset on refresh. No authentication, so "authenticated student" rules are not enforced.
- HTTP adapter matches an unconfirmed proposal; it is unit-tested with fake `fetch` only.
- Search matches item names only (not descriptions or stations).
- Whole catalog loads at once — fine for fixtures, not for a semester of real data.
- Dietary/allergen labels come from menu records; the UI warns that they do not rule out cross-contact.
