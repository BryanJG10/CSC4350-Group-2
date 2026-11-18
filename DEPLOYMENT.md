# Deployment

This is the shipping side of the project. It covers how the backend becomes a container image, how that image reaches the registry, and what still has to happen before it runs in Azure. Getting a working app on your own machine is a different job, and SETUP.md covers it.

## What goes into the image

Only the backend. The frontend is a static site, so it does not need a container at all.

The Dockerfile has two stages. The first uses a full Java kit to build the jar. The second carries only that jar on a smaller runtime image, which is what actually gets shipped.

The build context is the app folder, so every path in the Dockerfile is relative to it. A dockerignore file sits beside it and keeps the local env file out of the context. That matters because anything in the context can be copied into a layer, and a layer never goes away. The container reads its database values from environment variables at runtime instead.

The image name is ghcr.io/bryanjg10/csc4350-group-2-backend. The account name and the image name are lowercase because Docker rejects uppercase letters in a tag.

## When the workflow runs

The workflow file is .github/workflows/backend-image.yml, and the paths filter decides most of what happens.

- A pull request that touches the app folder builds the image and stops there. Nothing is published, so a broken Dockerfile shows up before anyone merges it.
- A push to main that touches the app folder builds the image and publishes it.
- A push that only changes documentation or the frontend does nothing. That is why a README fix does not rebuild the image.
- The Actions tab can run it by hand through the workflow dispatch trigger.

## How it authenticates

The job logs in with the token GitHub issues for that run. The workflow declares the packages write permission, which is what allows the push, and the token itself is supplied by the platform. There is no personal access token in the repository, no stored secret, and nothing anyone has to rotate.

Because the token belongs to the repository, the package is created under the repository owner's account and linked to the repository. It starts private.

## Tags

Each publish writes two tags. One is latest, which always points at the newest build. The other is the commit id, which keeps that particular build addressable forever.

So the tag list grows by one entry per app change that lands on main. The extra storage is small, because the builds share most of their layers.

Two merges landing close together can finish out of order, and the slower run moves latest backwards. A concurrency group in the workflow prevents that. It is not in place now.

## The health endpoint

A container host asks the app whether it is ready before sending it traffic, and it needs somewhere to ask. The health endpoint answers that question with up or down. A liveness path and a readiness path sit alongside it, which is the pair a host actually watches.

Only the health endpoint is exposed. The rest of the management endpoints are closed, so configuration and internal details are not reachable from outside the app.

The app connects to the database while it starts, because schema updates run on boot. A wrong database password shows up as a crash loop rather than a container that stays up and reports itself unready. Setting the schema mode to validate removes that dependency at boot and is the safer choice once the schema is stable.

## What is not automatic

Publishing is automatic. Deploying is not. Nothing in the workflow touches Azure, so a new image does not update a running service by itself.

The Azure side gets created by hand for now, with the database values going from a laptop into the container app as secrets. Those commands are drafted but have not been run against the subscription.

A fully automatic deploy would need the workflow to prove its identity to Azure, which means a federated login instead of a stored credential. Whether that is possible depends on whether the school tenant allows app registrations. That is worth testing before planning around it.

## Before the first deploy

Three things have to be settled by someone with rights on the account, not by any workflow.

- The registry package needs to be readable by the container host. Either make the package public, or create a read-only package token and give it to the container app.
- The production config in Doppler needs the same keys as the development config, with a rotated database password rather than the current one.
- The schema mode should be validate rather than update, so boots stop touching the schema.
