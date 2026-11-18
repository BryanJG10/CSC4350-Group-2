# Getting the project running

This is the path from a fresh clone to a working app on your own machine. It assumes you have cloning rights, a GitHub account, and nothing else installed for this project yet.

There are two halves and you can run them separately. The backend lives in `app/` and talks to a Postgres database. The frontend lives in `frontend/` and, by default, does not talk to the backend at all. It shows canned data so you can work on screens without waiting for the API.

The database password is the part that surprises people. It is not in the repository, and it never will be. The team keeps it in Doppler, which is a hosted secret store. You install a small command line tool, log in once, and then start the backend through that tool. The password arrives as an ordinary environment variable and is never written to a file.

## What you need first

You need a Java development kit. The build asks for Java 17 specifically, so install that version rather than something newer and hope it works.

You need Node, at least the version listed in `frontend/package.json`, along with pnpm. The repository is set up for pnpm, so do not reach for npm here.

You need the Doppler command line tool.

```powershell
winget install Doppler.doppler
```

You do not need Docker unless you plan to build the container image. Nothing on the local development path uses it.

## Join the Doppler project

Ask a teammate to invite the email address you use for GitHub to the Doppler project called `dining-hall-review`. Without that invitation the command line will log in fine and then fail to read anything, which looks like a broken setup but is really just missing access.

Once you are invited, log in. Doppler opens a browser window and hands a token back to the terminal.

```powershell
doppler login
```

If the terminal says it cannot find the command, the install landed in a folder your shell does not search. Open a new terminal first, because the installer updates the search path and the window you already have will not see the change. If it still fails, the tool is installed but unlinked, and the fix is adding its folder to your user path.

## Point the backend at the right config

Doppler needs to know which project and which config belong to this folder. Run the setup from inside `app/`.

```powershell
cd app
doppler setup
```

It asks you to pick a project and a config. Choose `dining-hall-review` and `dev`. If the prompt is awkward, you can skip it and name both directly.

```powershell
doppler setup -p dining-hall-review -c dev
```

After this, expect nothing new inside the repository. Doppler stores that mapping in a file under your home folder, keyed by the directory you ran it in. On Windows that file sits in `.doppler` inside your user profile. This is normal, and it means there is nothing to commit and nothing to conflict over.

## Start the backend

```powershell
doppler run -- .\gradlew.bat bootRun
```

The first run downloads Gradle and the project dependencies, so give it a few minutes. You are ready when the log shows the server listening on its port.

Everything before the two dashes is Doppler, and everything after belongs to the app. Doppler reads your config, drops the values into the environment of that one process, and then gets out of the way. When you stop the server, the values are gone. Nothing is left on disk.

## If you cannot get into Doppler yet

You can still run the backend. There is an example file in `app/` with the key names and empty values.

```powershell
Copy-Item .env.example .env
```

Fill it in with credentials from a teammate, then start the server the ordinary way with `.\gradlew.bat bootRun`. Spring picks the file up automatically.

Do not do both at once. Real environment variables win over the file, so a stale `.env` will sit there looking authoritative while Doppler quietly supplies something else. When your Doppler access works, delete the file.

## Start the frontend

In a second terminal, install the dependencies and start the dev server.

```powershell
cd frontend
pnpm install
pnpm dev
```

The terminal prints the address to open. The app runs in mock mode, which means the review data is fake and the pages work without the backend running.

When you want the real API instead, set two variables before starting. `VITE_DATA_MODE` switches the data source to real requests, and `VITE_API_BASE_URL` says where those requests should go. Both are read at startup, so the dev server needs a restart after a change. Keep in mind that anything with a `VITE_` prefix ends up in the browser bundle, so never put a secret there.

## Run the tests

The backend tests use an in-memory database, so they do not care whether Postgres is running or whether your Doppler access works.

```powershell
cd app
.\gradlew.bat test
```

The frontend has unit tests and browser tests. The browser tests need their browsers downloaded once.

```powershell
cd frontend
pnpm test
pnpm exec playwright install
pnpm test:e2e
```

## When something goes wrong

If the terminal does not recognise `doppler`, open a new terminal before doing anything else. The installer changes your path, and windows that were already open keep the old one.

If Gradle complains that it cannot run the wrapper script, the file probably lost its executable bit on the way through Windows. The repository forces the right line endings through `app/.gitattributes`, so a fresh clone usually behaves. If it does not, running the `.bat` wrapper instead of the shell script sidesteps the problem.

If the backend starts and then fails to connect, read the error closely. A wrong password and an unreachable host both look like a refused connection from a distance. Check the host first, since a managed database usually wants `DB_SSLMODE` set to `require` and a local one wants `disable`.

If the frontend dev server starts on a different port than you expected, believe the terminal rather than the last instructions you read.

If a page renders but every request fails, check whether the frontend is still in mock mode. Mock mode never contacts the backend, so a broken API looks perfectly healthy until you switch.

## What not to commit

Do not commit `.env`, and do not paste credentials into a workflow file. The repository is public, so anything written into it is readable by everyone, and a public workflow file is the easiest place to leak a connection string by accident.
