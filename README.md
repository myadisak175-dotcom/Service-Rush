# Service Rush

Mobile-first restaurant time-management game.

The validated core loop is:

`Seat → Menu → Take Order → Remember → POS → Kitchen → Drag Serve → Payment → Repeat`

This repository is the long-term production foundation. The architecture is deliberately modular and data-driven so the game can grow substantially without turning the prototype into one large script.

## Stack

- TypeScript 6
- Phaser 4
- Vite 8
- Static deployment compatible with GitHub Pages

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Start here

- `docs/ARCHITECTURE.md` — dependency rules and long-term structure
- `docs/GAMEPLAY-CONTRACT.md` — rules the core gameplay must preserve
- `src/content/dayConfigs.ts` — gradual Cooking-Dash-style progression as data
- `src/game/session/GameSession.ts` — runtime boundary for one playable level/day

## Development rule

`main` should remain playable. Small implementation changes are batched and user playtests happen at meaningful milestones rather than after every minor change.
