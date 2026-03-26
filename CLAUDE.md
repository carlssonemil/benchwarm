@AGENTS.md

# Benchwarm

Weighted spin-the-wheel lineup picker for sports teams. When a team has more available players than match slots, it uses a fair weighted random selection algorithm to decide who plays.

## Stack

- **Framework**: Next.js 16 (App Router) — see AGENTS.md for breaking changes warning
- **Frontend**: React 19, TypeScript (strict), Tailwind CSS 4, shadcn/ui, Framer Motion
- **Database**: Neon Postgres, raw SQL via `@neondatabase/serverless` (no ORM)
- **Auth**: No user accounts — teams identified by slug + 4-digit PIN

## Key Architecture

- **Server Components** by default; `'use client'` only for interactive wizards/dialogs
- **DB mutations**: All via `'use server'` actions in `src/actions/`
- **PIN auth**: `requirePin()` in `src/lib/pin.ts` wraps all mutations server-side
- **No ORM**: Raw SQL via the `sql` template tag from `src/lib/db.ts`

## Core Fairness Algorithm (`src/lib/selection.ts`)

1. Players with 2+ consecutive sit-outs → guaranteed spots
2. Remaining slots filled via weighted lottery (more sit-outs = more tickets)
3. Bank entries computed at runtime from match history (never stored) — always auditable

## Key Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full Postgres schema (5 tables: teams, players, seasons, matches, match_players) |
| `src/lib/selection.ts` | Core weighted selection algorithm |
| `src/lib/db.ts` | Neon DB connection |
| `src/lib/pin.ts` | PIN authorization helper |
| `src/lib/constants.ts` | Defaults (match size=5), storage keys, colors |
| `src/types/database.ts` | All TypeScript interfaces |
| `src/actions/match-actions.ts` | Match CRUD + `computePlayerBanks()` |
| `src/actions/team-actions.ts` | Team CRUD + PIN verification |
| `src/actions/player-actions.ts` | Player CRUD |
| `src/actions/season-actions.ts` | Season CRUD |
| `src/app/team/[slug]/page.tsx` | Main team dashboard (5 tabs) |
| `src/components/team/match/match-wizard.tsx` | Multi-step match flow |

## Match Wizard Flow

Availability → Bank Review → Spin (Framer Motion wheel) → Confirm → Save

## Status

v0.1.0, early development, no tests yet.
