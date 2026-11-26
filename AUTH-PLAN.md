# Auth plan: Spring Security in the API

This supersedes the shape suggested in AUTH-PROPOSAL.md. That document argued for form login with accounts kept in Doppler. This one keeps Spring Security, but moves accounts into a `users` table and authenticates with bearer tokens. The reason is the deployment split: the site will live on `azurestaticapps.net` and the API on `azurecontainerapps.io`, which makes a session cookie a cross-site cookie. Browsers are increasingly unwilling to send those, and the failure looks like random logouts. A token in an `Authorization` header has no such problem.

Nothing here is implemented yet. It is a plan for the group to argue with.

## What has to be protected

Today the API is read-only and public. `/api/dining-halls` returns three hardcoded halls and `/actuator/health` answers probes. That exposure is acceptable because there is nothing to write and nothing private to read. The moment reviews are written, the API has to know who is writing, and a review has to belong to someone.

The plan therefore protects writes, keeps catalog reads and health public, and gives every review an owner. It also decides the users table now, because attaching it later means backfilling authorship for reviews that already exist.

## Why tokens rather than sessions

Sessions are the simpler Spring Security story, and the existing frontend already sends `credentials: 'include'` because the original contract assumed cookies. The deployment breaks that assumption. A `SameSite=None` cookie across two different sites depends on third-party cookie policy that no one on the team controls, and the browser support keeps shrinking.

Tokens cost more work on the client, which is the honest trade. The token has to be stored somewhere, sent on every write, and cleared on sign-out. Storing it safely is a real problem, because anything JavaScript can read, an injected script can read. The plan keeps the lifetime short and prefers memory over persistent storage.

Container Apps Easy Auth was the other option. It is free and needs no Spring code, but it ties authentication to Azure and a cross-origin single-page app flow through it is fiddly. Keeping auth in the app means the same code works if the project ever moves hosts.

## Accounts

A `users` table, not a list of shared passwords in a secret store. Shared passwords cannot attribute a review, cannot be revoked per person, and would have to be replaced anyway once reviews need an author. The table is small:

- `id`, generated primary key
- `email`, unique, stored lowercased
- `password_hash`, BCrypt
- `display_name`
- `role`, `USER` by default, `ADMIN` reserved
- `created_at`

Reviews gain a `user_id` foreign key when the review write lands. The author string in the current fixture model becomes a projection of that relation rather than a free-text field.

Registration is open for the course. There is no invite flow and no email verification in this pass.

## Endpoints

Public reads and the probe stay open. Everything that changes data requires a token.

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/auth/register` | public | 201, 400 invalid, 409 duplicate email |
| `POST /api/auth/login` | public | 200 with token, 401 bad credentials |
| `GET /api/auth/me` | token | 200 current user, 401 missing or expired |
| `GET /api/dining-halls` | public | existing controller |
| `GET /api/catalog` | public | once it exists, see the contract note below |
| `POST /api/items/{id}/reviews` | token | 201, 401, 409 duplicate visit, 429 limited |
| `PUT`, `DELETE /api/reviews/{id}` | owner or admin | 403 for anyone else |
| `/actuator/health/**` | public | probes must never be gated |

The frontend currently calls `/catalog` and `/items/{id}/reviews` on a base URL that already ends in `/api`, while the backend serves `/api/dining-halls`. That path mismatch has to be settled in the same change as the review write, otherwise auth protects an endpoint nobody calls.

## Configuration

The dependencies are `spring-boot-starter-security`, `spring-boot-starter-validation`, and the jjwt trio (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`, 0.12 or newer). The project is on Spring Boot 4.1 and Java 17, where the security configuration API is the lambda style introduced in Security 6 and carried into 7.

The security filter chain is stateless and small:

- CSRF disabled, because there are no cookies to forge with.
- Session creation set to `STATELESS`.
- `authorizeHttpRequests` permits the auth endpoints, the public reads, and the health paths, and requires authentication for everything else.
- CORS enabled with a configured source, not defaults.
- A custom `AuthenticationEntryPoint` that returns JSON with a 401 status. The default would redirect to a login page, which is meaningless to a fetch call.
- The JWT filter added before `UsernamePasswordAuthenticationFilter`.

Supporting pieces:

- `PasswordEncoder` as BCrypt, strength 10.
- `JwtService` using HMAC-SHA256, a secret of at least 32 bytes, issuer, subject set to the user id, a role claim, and a 30 minute expiry.
- `JwtAuthenticationFilter` extending `OncePerRequestFilter`, reading the bearer token, validating it, loading the user, and setting the authentication. It clears the context in a `finally` block so a pooled thread cannot leak an identity.
- `UserDetailsService` backed by the user repository.
- A JSON error shape, `{"status": 401, "error": "..."}`, so the frontend's existing status-based messages stay coherent.

## Token handling in the frontend

`frontend/src/services/dining.ts` currently sends `credentials: 'include'` and turns a 401 into "session expired". With tokens, the service drops the credentials flag, adds `Authorization: Bearer <token>`, and a 401 clears the token and routes to sign-in. The draft-preserving behaviour in `Review.tsx` stays as it is.

The token lives in memory by default. `sessionStorage` is acceptable if a reload must survive, and `localStorage` is the wrong default because it turns any XSS into a long-lived credential. Mock mode is untouched, and the Playwright scenarios keep working because no real network is involved there.

## Validation and abuse

Email is trimmed, lowercased, and format-checked. Passwords need a minimum length, with 8 as the floor and 10 preferred, and are never echoed back. Duplicate registration returns 409 rather than a generic failure, because the frontend already distinguishes that case.

Login gets a small in-process throttle keyed by email and client address, returning 429 when it trips. This is a speed bump, not a web application firewall, it resets on restart, and it does nothing across more than one replica. That is acceptable while the app runs on a single replica, and worth revisiting if it ever scales out.

## Secrets and deployment

`JWT_SECRET` belongs in Doppler under both `dev` and `prd`, and reaches the container as a secret named `jwt-secret` with `JWT_SECRET=secretref:jwt-secret` in the environment. It must never appear in a `VITE_*` value, in the repository, or in a log line.

Rotating the secret invalidates every issued token, which is the only revocation mechanism in this design. That is a feature during an incident and an annoyance during normal operation, so rotate deliberately.

The CORS allowlist is environment-driven as `APP_CORS_ORIGINS`, a comma-separated list. It names the Static Web Apps hostname and the local development origins, and it never becomes `*` once credentials or tokens are in play.

## Tests

- `JwtService` issues, parses, and rejects an expired or tampered token.
- MockMvc: public read returns 200, a review write without a token returns 401, with a token returns 201, a wrong password returns 401, a duplicate registration returns 409, and editing another user's review returns 403.
- The frontend service adds the header, clears on 401, and keeps the draft.
- Existing H2-backed tests keep passing, and the health endpoint stays reachable without a token so the platform probes do not fail.

## Schema and migration

`ddl-auto` stays on `update` while the model is moving, so the users table appears on boot. Once the schema settles, switch to `validate` and introduce Flyway, in that order. Turning on `validate` before migrations exist turns every boot into a crash.

## Order of work

1. Users table, repository, and the register, login, and me endpoints.
2. Security configuration, JWT service and filter, JSON entry point.
3. The review write with ownership checks.
4. Frontend login, token store, and the service change.
5. Tests, then deploy with `JWT_SECRET` set first.
6. CORS allowlist for the Static Web Apps hostname.

## What this does not solve

No password reset, no email verification, no refresh tokens, no revocation list, no MFA, and no audit log. A stolen token works until it expires. Open registration invites spam accounts. The login throttle is best-effort and in-process. Roles are minimal, and `ADMIN` exists only to make ownership checks expressible later.

## Decisions for the group

- Tokens or sessions. This plan argues tokens because of the cross-origin split, but sessions are simpler if the site and API ever share an origin.
- Open registration or seeded accounts for the demo.
- Token lifetime, and whether a refresh token is worth the extra surface.
- Who owns the security configuration, since it sits in front of every endpoint.
- Whether `ADMIN` ships at launch or stays a column with a default.
