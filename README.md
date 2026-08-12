# Eventify

The event booking API you build across this course. This template ships the
project skeleton - strict TypeScript config, ESLint, editor settings - so
Session 1 starts at the interesting part: writing the server.

## Prerequisites

Check these off before Session 1 (they match the course pre-work email):

- [ ] **Node 24 LTS** - check with `node --version` (must print `v24.x`).
      Node 20 is EOL and Node 22 will not run this course's TypeScript setup.
- [ ] **npm 11** - ships with Node 24; check with `npm --version`.
- [ ] **Git** installed and a **GitHub account** you can push to.
- [ ] **VS Code** with the **GitHub Copilot** extension (free tier is fine).
      Students: start GitHub Education verification now - Copilot Pro is free
      for verified students, but approval takes days.

## Setup

```bash
# 1. Create YOUR repo from this template on GitHub ("Use this template"),
#    name it eventify, then clone it:
git clone https://github.com/<your-username>/eventify.git
cd eventify

# 2. Install dev tooling (TypeScript, ESLint):
npm install

# 3. Create your local env file (never committed):
cp .env.example .env
```

There is no server yet - you write `src/server.ts` in Session 1's project
block. Once it exists, the scripts below are your daily loop.

## Scripts

**`npm run dev`** - runs `node --watch --env-file=.env src/server.ts`.
Node 24 runs TypeScript directly by stripping types and restarts on save - no
nodemon, no tsx, no build step.

**`npm run typecheck`** - runs `tsc --noEmit`.
Node strips types without checking them, so a green `dev` proves nothing -
this is the real gate; run it before every commit.

**`npm run lint`** - runs ESLint (flat config, typescript-eslint) over the
project. Preconfigured from day one; CI starts enforcing it in Session 6.

## Homework is submitted as a Pull Request

Every session's homework lands as **one PR** to your own `eventify` repo:

1. Branch from `main` (e.g. `session-1`), commit in logical steps.
2. Open a PR whose description covers: what you built, how to run it, and
   which parts were AI-assisted plus how you verified them. A classmate
   should be able to run your server from the description alone.
3. Merge only when `npm run typecheck` and `npm run lint` pass.

**The ownership rule:** AI writes with you, but you own every line you ship.
At the start of each session one function from someone's PR is picked at
random and its author walks the class through it, line by line. Any function
in your PR can be that function.