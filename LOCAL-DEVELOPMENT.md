# Local Development

How to build and run Dining Hall Review on your own machine. There is no pipeline yet. There is also no
REST API yet.

The project has three parts.

- The backend in `app/`. Java 17, Spring Boot 4.1.2, Gradle wrapper, JPA, PostgreSQL.
- The frontend in `frontend/`. React 19, TypeScript, Vite, Vitest, Playwright, pnpm.
- A PostgreSQL database. Local or hosted.

Three things are true right now.

- `app/` holds the main class, the config file, and a database test. No controllers.
- The frontend runs on sample data. `VITE_DATA_MODE=mock` is the default.
- Reviews posted in mock mode live in memory and disappear on refresh.

So the frontend works alone. The backend starts, but has nothing to call.

## What you need

- JDK 17. The build file asks for 17. Gradle can download one if it cannot find it.
- Node 22.12 or newer. The version is pinned in `package.json`.
- pnpm 10. Pinned in `packageManager`. Without it, use `npx pnpm@10.34.9 <command>`.
- PostgreSQL 16 or 17. Only for running the backend. Tests use H2.
- Podman or Docker. Optional. Only for a local database and the container build.

The first build downloads Gradle and the Maven dependencies. That needs network.

## Run it

Terminal one, backend:

```bash
cd app
./gradlew bootRun
```

Terminal two, frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend opens on `http://127.0.0.1:5173`. The backend listens on port 8080. They do not talk yet.

Only doing UI work? Skip the backend. `cd frontend && pnpm install && pnpm dev` is enough.

## Backend

Run these from `app/`. The wrapper is committed, so do not install Gradle.

```bash
cd app
./gradlew test      # tests, on H2
./gradlew build     # compile, test, package
./gradlew bootJar   # jar only
./gradlew bootRun   # run the app
./gradlew clean     # delete build/
```

`bootJar` writes `build/libs/app-0.0.1-SNAPSHOT.jar`. The name comes from the version in `build.gradle`.
To run it:

```bash
cd app
java -jar build/libs/app-0.0.1-SNAPSHOT.jar
```

To use a different port, set `SERVER_PORT`. Port 8080 is Spring Boot's default.

```bash
SERVER_PORT=8081 java -jar build/libs/app-0.0.1-SNAPSHOT.jar
```

More commands.

```bash
./gradlew tasks                                    # what you can run
./gradlew test --tests '*DatabaseConnectionTests'  # only the database test
./gradlew dependencies                             # dependency tree
```

On Windows use `gradlew.bat`.

## Backend settings

`application.yaml` reads environment variables. It also reads an optional `app/.env` file. Real
environment variables win over the file.

The import is `file:.env`, relative to the folder you start in. `./gradlew bootRun` from `app/` finds it.
`java -jar` from the repo root does not.

The file uses properties syntax. Write `KEY=value`. No quotes, no `export`, no comments on the same line.

```properties
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dining_hall_review
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_SSLMODE=disable
```

Settings you can use:

- `DB_HOST`, database host, default `localhost`
- `DB_PORT`, database port, default `5432`
- `DB_NAME`, database name, default `dining_hall_review`
- `DB_USERNAME`, database user, default `postgres`
- `DB_PASSWORD`, database password, empty by default
- `DB_SSLMODE`, set `disable` for a local database, default `require`
- `DB_POOL_SIZE`, connection pool size, default `5`
- `JPA_DDL_AUTO`, Hibernate creates and alters tables, default `update`
- `JPA_SHOW_SQL`, print SQL, default `false`
- `SERVER_PORT`, Spring Boot's own setting, default `8080`

Two traps.

- The default `DB_SSLMODE=require` fails on a plain local Postgres. Set it to `disable`.
- `README.md` says to copy `.env.example`. That file is not in the repo. Make `app/.env` yourself. It is
  git-ignored.

## Database

Podman and Docker take the same command. Data stays in a named volume.

```bash
podman run -d --name dhr-postgres \
  -e POSTGRES_DB=dining_hall_review \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v dhr-pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:17
```

Set `DB_SSLMODE=disable`, then check the connection.

```bash
cd app
./gradlew test --tests '*DatabaseConnectionTests'
```

That test skips itself when no database is set up. So `./gradlew test` still passes for teammates without
one. The test only reads. It forces `ddl-auto=none`, so it cannot change the schema.

Stop and remove:

```bash
podman stop dhr-postgres
podman rm dhr-postgres   # the volume stays unless you add -v
```

For a hosted database, take the host, port, name, user, and password from the provider. Keep
`DB_SSLMODE=require`. Providers show one long URL. Split it into the settings above. Do not paste the
whole URL. On a serverless plan keep `DB_POOL_SIZE` small. Five is fine.

## Frontend

Run these from `frontend/`.

```bash
cd frontend
pnpm install          # exact versions from the lockfile
pnpm dev              # dev server with reload
pnpm build            # type check, then build into dist/
pnpm preview          # serve dist/ locally
pnpm test             # unit and component tests
pnpm lint             # ESLint, zero warnings allowed
pnpm format           # Prettier, writes files
pnpm format:check     # Prettier, checks only
```

The dev and preview servers bind to `127.0.0.1`, not `0.0.0.0`.

Browser tests:

```bash
pnpm exec playwright install     # once per machine
pnpm test:e2e
pnpm test:e2e --project=chrome
pnpm exec playwright show-report
```

The config lists five projects. Two use installed browsers by name, Chrome and Edge. Edge is not on Linux
by default. If a project cannot launch, use another.

```bash
pnpm test:e2e --project=firefox
```

Frontend settings are optional and git-ignored. Vite reads them at build time.

```properties
VITE_DATA_MODE=mock        # mock or http
VITE_API_BASE_URL=/api     # only used when the mode is http
```

Everything starting with `VITE_` ends up inside the JavaScript file. Never put secrets there.

## Connecting the two

Not done yet. Three things are missing.

First, no controller. The frontend expects `GET /catalog` and `POST /items/{itemId}/reviews`. It sends
cookies, so sessions have to match.

Second, no dev proxy. `/api` is a relative path, so the request hits the Vite server and 404s. Add a
proxy in `frontend/vite.config.ts`:

```ts
server: {
  proxy: { '/api': 'http://127.0.0.1:8080' },
},
```

This assumes Spring owns the `/api` prefix. If it does not, add a `rewrite`.

Third, no CORS. Calling port 8080 from port 5173 needs backend CORS config. The client sends credentials,
so the config must name the exact origin. Browsers reject a wildcard. The proxy avoids the problem, so
start there.

The router is `HashRouter`. URLs look like `/index.html#/items/chicken-bowl`. Static hosts do not need
rewrite rules for that.

## What is missing

- No entities, repositories, controllers, validation, or security.
- No `.gitignore` in `frontend/` and none at the repo root. `frontend/dist/` and `frontend/test-results/`
  are committed. `node_modules/` shows up as untracked.
- No `.env.example`, even though both READMEs mention it.
- The schema comes from `ddl-auto=update`. Fine for now. Before a shared database, use migrations
  (Flyway) and set `JPA_DDL_AUTO=validate`.
- No health endpoint. Add `spring-boot-starter-actuator` when a host needs a probe.
- No CI. A workflow sketch is at the end of this file.
- The starter is `spring-boot-starter-webmvc`. That is the Spring Boot 4 name.

## Container build

`app/Dockerfile` builds the image. It has two stages, which keeps the final image small.

Stage one uses a JDK image. It copies the wrapper and build files, then the source, then runs `bootJar`.
Build files are copied first so Docker can cache that layer. Copying source last means a code change does
not redo the dependency download.

Stage two uses a JRE image. It copies only the jar. A JRE cannot compile code, so the compiler and sources
stay out of the final image. The app runs as a user named `spring` with uid 1001, not as root.

`app/.dockerignore` keeps the build output, `.gradle`, `.env`, and markdown out of the build context. That
makes the build faster and keeps secrets out.

Build with Podman or Docker. Image names are fully qualified so Podman does not stop to ask which registry
to use.

```bash
cd app
podman build -t dininghall-api .
```

Run it against the local database container. Host networking lets the container reach port 5432 on the
host, so `DB_HOST` stays `127.0.0.1`.

```bash
podman run --rm --network host \
  -e DB_HOST=127.0.0.1 \
  -e DB_PORT=5432 \
  -e DB_NAME=dining_hall_review \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_SSLMODE=disable \
  dininghall-api
```

There are no controllers yet, so `http://127.0.0.1:8080/` returns a 404. A 404 from Spring means the app
started.

The jar name in the Dockerfile includes the version. If the version in `build.gradle` changes, update that
line.

## Deploying

Nothing is deployed. No host and no pipeline. These are the options, roughly in order of effort.

A. Azure Container Apps and Azure Static Web Apps. This is the current plan. Container Apps runs the
image. Static Web Apps serves `frontend/dist`. Front Door is optional and only needed to put both parts on
one hostname. One hostname means no CORS. Cost is mostly the database. Container Apps scales to zero, so
a demo can hit a cold start.

Azure details for option A:

Build the image in Azure, so local Docker is not needed.

```bash
az acr build --registry <acrName> --image dininghall-api:latest app/
```

Set the Container App target port to 8080. Pass the `DB_` settings as secrets, not plain environment
variables. Keep one replica warm if cold starts are a problem during the demo. Route `/api` to the app and
nothing else.

Vite bakes the API URL into the bundle at build time. Keep the path relative.

```bash
cd frontend
VITE_DATA_MODE=http VITE_API_BASE_URL=/api pnpm build
```

Static Web Apps reads `pnpm-lock.yaml` on its own. Set the app location to `frontend`, the output to
`dist`, and the build command to `pnpm build`. Pin Node with `NODE_VERSION` if the builder is older than
the version in `engines`.

## Order of work

1. Controllers for `GET /catalog` and `POST /items/{id}/reviews`.
2. Actuator, CORS, and the Vite proxy.
3. Root `.gitignore` and both `.env.example` files. Untrack `frontend/dist`.
4. A CI workflow that runs `./gradlew build` and
   `pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm build`. It needs no cloud account.
5. A host, once the pieces above exist.

## Cleanup

`app/build/` and `app/.gradle/` are build output. Both are git-ignored. Delete them whenever.

## Doppler CLI Install instructions and usage (Linux / MacOS/ Windows)

I opted to use Doppler for secret management, since the env containing DB credentials (and any other future credentials) is not shared at this moment, and real software teams dont just message each other .env files. Let me correct myself. Software teams absolutely just send each other .env files, but they SHOULD NOT.  Team members will receive an invite to the Doppler project, and are also suggessted to install the Doppler CLI for seamless work.

Docs: https://docs.doppler.com/docs/install-cli

[quick ref]:

Windows: 
  `winget install doppler.doppler`
MacOS / Fedora: 
  `brew install gnupg | brew install dopplerhq/cli/doppler`
Linux (deb): 
  ```
  sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
  curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
  sudo apt-get update && sudo apt-get install doppler
  ```
