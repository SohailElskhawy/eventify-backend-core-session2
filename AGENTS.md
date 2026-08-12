# Eventify — project memory

<!-- Session 1, project block: you write the three sections below yourself,
     the way you learned in Foundations Lecture 4. Keep it short — this file
     is read at the start of every agent session. -->

## Run commands

- Dev server: `npm run dev` (node --watch, native TypeScript — no build step in dev)
- Typecheck: `npm run typecheck` — this is the real gate; Node strips types without checking them
- Lint: `npm run lint` (preconfigured; CI enforces it from Session 6)

## Conventions

- Strict TypeScript, `erasableSyntaxOnly` — literal unions instead of enums
- Relative imports use explicit `.ts` extensions
- ESM only (`"type": "module"`)

## The standing rule

AI writes with me, but I own and can explain every line I ship.
Every session, one function from someone's PR gets walked through live — it could be mine.