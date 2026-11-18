# Proposal: put authentication inside the app

Written while the deployment work was in flight. Nothing here is agreed yet, and the image pipeline does not depend on it.

## What I am proposing

Add Spring Security to the backend so the app decides who gets in, rather than depending on the hosting platform to decide.

## Why

Right now the only way to keep strangers off a test deployment is the host's own gate. On Azure that means built-in authentication plus an Entra app registration. On any other free host there is nothing at all, or a check written by hand. The Azure route depends on tenant rights none of us have confirmed, and the fallback has no gate to begin with.

I think both problems go away if the app gates itself. Hosting becomes a question about compute and cold starts instead of permissions.

## What Spring Security provides

Framework behavior rather than custom code. Form login, sessions, CSRF tokens, password hashing, logout, and per-path authorization come from the dependency and one configuration class. There is no bespoke token handling for us to get wrong.

## The shape I would suggest

Accounts live in the Doppler config rather than the repository. The app builds a small user store from those values at startup, so adding a teammate is a secret edit and a restart. No table, no seeding script, and the passwords stay where the team already keeps them.

Form login handles sign-in. The health endpoint stays public and everything else needs a session. Sessions stay in memory, which is fine while there is one replica.

## What this changes for the team

This is shared surface, so it needs the group's agreement rather than a quiet commit.

- Every request the API owner writes passes through the security chain.
- The frontend needs a CORS decision that allows credentials, and a decision on CSRF for its writes.
- The health endpoint has to stay public. Otherwise the platform probes get rejected and the app never reports healthy.
- The frontend already sends credentials on every request and treats a 401 as an expired session, so cookies fit the contract we already wrote better than tokens would.

## What it does not solve

- No password reset, no roles, and no user management screen.
- It is not real identity. A list of shared passwords in a secret store is still a list of shared passwords.
- Sessions do not survive a restart, and would not survive more than one replica.

## The later step, if reviews need attribution

The review model has an author field, which is a fixture string today. Real attribution needs a users table and a foreign key from reviews to it. That is schema work, and I would want it to land with whichever change starts writing reviews to Postgres.

## Rough size

One dependency, one configuration class, and a short block of values in Doppler. Half a session, plus the conversation about CORS and CSRF.

## Decisions for the group

- Form login with accounts in Doppler, or single sign-on through Entra ID.
- Who owns the security configuration, since it sits in front of everyone's endpoints.
- How write requests handle CSRF, and whether the API and the site share an origin.
