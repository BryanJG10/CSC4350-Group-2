# Frontend deployment

This is the shipping plan for the React site. The backend has its own document in DEPLOYMENT.md, and the two are independent: the site is static files, so it never needs a container.

The group settled on Azure Static Web Apps, free tier, on 25 Nov. This document records how that gets built, what has to be true before it is wired to the API, and what is still blocked on repository rights.

## What is being deployed

The frontend is a Vite and React single-page app. `pnpm build` type-checks and writes the bundle to `frontend/dist`. Routing is hash-based through `HashRouter`, so the browser never asks the host for a deep path. Everything after the `#` stays on the client, which removes the usual single-page rewrite problem before it starts.

The service layer has two modes. It runs on fixtures by default, and switches to real HTTP when `VITE_DATA_MODE=http`. `VITE_API_BASE_URL` supplies the API root. Both values are baked into the bundle at build time, so a deployed site talks to exactly one backend, and pointing it somewhere else means rebuilding.

Neither value is a secret. Every `VITE_*` variable ships to the browser, so a credential must never be placed there.

## Why Static Web Apps

The free tier costs nothing and needs no card. It includes 100 GB of bandwidth and 0.5 GB of storage per month, which is far past anything this project will use. It also has built-in authentication, but that only covers routes served by Static Web Apps, not the external Container App, so it does not solve the API problem. The auth plan handles that separately.

GitHub Pages was the other free option, and it also needs no secret. The problem is that enabling Pages requires repository admin rights, and this machine is a collaborator. Static Web Apps can be created and deployed from this laptop with the Azure account we hold, which is what decides the choice for now.

## The contract gap to fix first

Wiring the site to the API will fail today, and hosting is not the reason. The HTTP service calls `GET /catalog` and `POST /items/{id}/reviews` on the configured base URL. The backend serves `GET /api/dining-halls` and nothing else. One side has to move.

Either the backend grows a catalog endpoint and a review write under the paths the service expects, with `/api` remaining the base path, or the service changes to match the controller. This is the same decision as the review write in the auth plan and should be made once, not twice. Deploying before it is settled produces a page that loads and then cannot fetch anything.

## The resource

One Static Web App on the free tier in East US 2, named `dining-web`. It produces a generated hostname under `azurestaticapps.net`. No API location is configured, because the API is the Container App, and the platform's own `/api` slot stays unused. No Functions, no database, nothing else that can bill.

## Build settings

Build from `frontend/` with pnpm 10.34.9 on Node 22.12 or newer. The output directory is `dist`. The production environment is two variables:

- `VITE_DATA_MODE=http`
- `VITE_API_BASE_URL=https://dining-api.purpledune-40dd4b71.eastus2.azurecontainerapps.io`

The base URL is the API root, and the service appends its own paths. Do not add `/api` here unless the backend moves under that prefix, or the result is `/api/api/...`.

## Routing file

Even with hash routing, add `staticwebapp.config.json` to the frontend root. It sets `navigationFallback` to rewrite unknown paths to `/index.html`, with exclusions for `/assets/*` and common file extensions, and returns a 404 for missing assets. Today it changes nothing, because the hash never reaches the server. It is cheap insurance for the day someone switches to browser routing or shares a direct asset link.

## Deploying it

There are two routes, and the first one works today.

**From this laptop.** Create the app once with `az staticwebapp create`, read the deployment token with `az staticwebapp secrets list`, then run the Static Web Apps CLI against `frontend/dist`. The token lives in the shell for the length of the command and is never committed. This needs no repository admin rights, which is why it is the path for the semester.

**From GitHub Actions, later.** The standard action needs `AZURE_STATIC_WEB_APPS_API_TOKEN` stored as a repository secret. Only the repository owner can add it. Once it exists, a push to `main` builds and deploys without a laptop involved. The workflow would set `app_location` to `frontend`, `output_location` to `dist`, and either let the action run the build or set `skip_app_build` and hand it a prebuilt folder.

## CORS

The site and the API are different origins, so the API has to allow the site explicitly. Once the security work lands, `*` is not acceptable, and the allowlist should name the Static Web Apps hostname plus the local Vite origins used in development. The plan is a single environment-driven list, `APP_CORS_ORIGINS`, read at startup. After tokens replace cookies, the allowed header set includes `Authorization`, and credentials can stay off.

## Verification

- Build locally with the production values and run `pnpm preview`. A green build that cannot reach the API is not verification.
- After deploying, load the site and watch the network tab for the catalog request. The page rendering is not the test; the fetch is.
- Send a preflight `OPTIONS` request from the site origin and confirm the API answers with the right headers.
- Run the Playwright smoke test against the deployed hostname with mock mode off.
- Keep the deployment history entry, because it is the rollback.

## Rollback

Static Web Apps keeps deployment history. Redeploying an earlier build from the portal or the CLI restores the site, and the API is untouched. A frontend rollback never requires a backend change.

## Cost

The free tier, with no Functions, no custom domain, and no add-ons. The only way this starts billing is an upgrade to a paid plan, which nobody should perform. Bandwidth at this scale is nowhere near the limit.

## Open decisions

- The app name and region, if East US 2 is not preferred.
- Whether deploys stay on the laptop for the semester or move to Actions once the owner adds the token.
- Whether the backend moves to match the service paths, or the service moves to match the backend. This one blocks the first useful deployment.
