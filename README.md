# Benchwarm

Weighted spin-the-wheel lineup picker for game teams. No spreadsheets, no accounts.

## What it does

When a team has more players than match slots, Benchwarm fairly decides who plays each week using a weighted random draw. Players who sit out accumulate "bank entries" that increase their chances in future spins. A player who sits out two consecutive matches is guaranteed a spot next time.

**Match flow:**
1. Mark which players are available for the match
2. Review each player's bank entries and guaranteed status
3. Spin the wheel — guaranteed players are auto-included, the rest drawn by weight
4. Confirm the result and record the match

## Tech stack

- **Next.js 16** (App Router, Server Actions, React 19)
- **Neon Postgres** (serverless)
- **Tailwind CSS 4** + **shadcn/ui**
- **Framer Motion** (wheel animation)
- **TypeScript**

## Getting started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (or any Postgres instance)

### Setup

```bash
npm install
```

Create a `.env.local` file:

```
DATABASE_URL=your_neon_connection_string
```

Apply the schema:

```bash
psql $DATABASE_URL -f schema.sql
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

**No accounts.** Teams are created with a unique slug and a 4-digit admin PIN. Anyone with the link can view the team; write operations require the PIN.

**Seasons** group matches together. Only one season can be active at a time.

**Bank entries** are derived at runtime from match history — never stored directly. This means the fairness calculation is always consistent and auditable.

**Selection algorithm** (`src/lib/selection.ts`):
- Players guaranteed a spot (2+ consecutive sit-outs) are picked first
- Remaining slots filled via weighted random draw from the available pool
- Each bank entry adds one ticket to the draw
