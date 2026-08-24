# Service Rush Architecture

## Purpose

Service Rush has a validated tactile core loop, but the production code must be able to grow into a much larger game: more restaurants, levels, recipes, customers, progression, achievements, upgrades, events, cosmetics and future systems without repeatedly rewriting the core.

The goal is **modular enough to scale, but not over-engineered before the game needs it**.

## Dependency direction

```text
Phaser Scenes / UI / Input
          ↓
      GameSession
          ↓
Gameplay Systems  ←  Content data
          ↓
 Domain models / Core services
          ↓
 GameClock · EventBus · Save schema
```

Dependencies flow downward. Domain/core code must never import Phaser.

### Rules

1. **Scenes render and route input; they do not own game rules.**
2. **Gameplay systems never manipulate visual objects directly.** They emit events/state changes that presentation code renders.
3. **All gameplay time uses `GameClock`.** Do not use `Date.now()`, independent `setTimeout()` calls or wall-clock timers for game rules.
4. **One `GameSession` owns one playable day/level.** Leaving a level destroys the session and all temporary runtime state.
5. **Content is data.** Days, recipes, balance values, customer definitions, upgrades and events should be added as configuration rather than new scene branches.
6. **Systems communicate through typed events where loose coupling is valuable.** Do not build a web of direct system-to-system calls.
7. **Progression is outside the temporary restaurant runtime.** Coins, stars, unlocks and achievements survive; customers and current kitchen jobs do not.
8. **Save data is versioned.** Schema changes require migration instead of breaking old players.

## Folder structure

```text
src/
├── core/                 Framework-independent foundations
│   ├── events/
│   ├── save/
│   ├── state/
│   └── time/
│
├── domain/               Pure game state vocabulary
│   ├── customer/
│   ├── order/
│   └── table/
│
├── systems/              Rules/processes operating on domain state
│   └── service/
│
├── content/              Data-driven game content and tuning
│
├── game/                 Phaser integration
│   ├── scenes/
│   └── session/
│
├── debug/                Development-only inspection/testing helpers
│
├── main.ts
└── styles.css
```

As the game grows, add modules by responsibility rather than by arbitrary file size:

```text
systems/
├── customers/
├── seating/
├── menu/
├── orders/
├── pos/
├── kitchen/
├── serving/
├── payment/
├── scoring/
├── progression/
└── achievements/

ui/
├── hud/
├── pos/
├── order-memory/
├── results/
├── upgrades/
└── restaurant-select/
```

Do not create these folders until they contain real implementation.

## GameSession boundary

A `GameSession` is the runtime container for one level/day.

It owns:

- Game clock
- Event bus
- Temporary customers and groups
- Tables
- Orders
- Kitchen queue/jobs
- Active service windows
- Level score/streak
- Spawn schedule

It does **not** own:

- Permanent coins
- Stars already earned
- Achievements
- Upgrade ownership
- Global settings
- Long-term statistics

This boundary lets a restaurant/level unload cleanly and prevents hidden timers or objects surviving between scenes.

## Authoritative time

Every gameplay timer derives from `GameClock.now`:

```text
Seat window
Menu window
Ready-to-order window
POS window
Kitchen process
Serve window
Eating process
Payment window
Customer spawn schedule
```

Pausing `GameClock` pauses the game rules together. Presentation animations that affect gameplay must also be synchronized with this state.

## State machines

Important objects advance through explicit states. Invalid transitions are rejected.

Example table lifecycle:

```text
empty
  ↓
waiting-menu
  ↓
browsing-menu
  ↓
ready-to-order
  ↓
waiting-pos
  ↓
order-sent
  ↓
waiting-food
  ↓
ready-to-serve
  ↓
eating
  ↓
waiting-payment
  ↓
empty
```

Never infer critical gameplay state from UI visibility, sprite texture or animation frame.

## Data-driven content

`content/dayConfigs.ts` demonstrates the intended pattern. Progression is described by configuration:

- feature unlocks
- number of tables
- waiting queue size
- kitchen capacity
- service timing
- available recipes

The scene should not contain code such as `if (day === 6) enableStreak()`.

Later the same pattern applies to customers, upgrades, restaurants and live/event content.

## Event boundaries

Example flow:

```text
ServingSystem validates drop
       ↓
state changes
       ↓
foodServed event
       ↓
├── HUD feedback
├── Score/Streak system
├── Achievement tracker
├── Audio feedback
└── Analytics (future)
```

The serving system should not know these consumers exist.

## UI and input

The game is mobile-first.

- Drag/drop is handled by input controllers and translated into gameplay commands.
- POS uses large tappable food icons.
- UI never decides whether an order or serve is correct; systems validate it.
- Touch targets should remain comfortably usable at narrow mobile widths.
- A drag interaction should have a deterministic cancel/reject behavior and must never reset timers by accident.

## Asset strategy

Do not ship every future asset in the initial bundle.

Use logical bundles as content grows:

```text
assets/common/
assets/restaurants/<restaurant-id>/
assets/food/<pack-id>/
assets/customers/<pack-id>/
assets/events/<event-id>/
```

Load common assets at boot and level-specific assets when entering that content. Release references when a session ends where practical.

## Progression architecture

Long-term systems attach around the core instead of entering it:

```text
Game Session Result
       ↓
Reward calculation
       ↓
Coins / Stars / XP
       ↓
Unlocks / Upgrades / Achievements
       ↓
Next level / restaurant
```

An upgrade should modify system configuration/capability, not patch scene code.

## Save architecture

Save only persistent state. Do not serialize the whole Phaser scene.

Use:

```text
saveVersion
highestUnlockedDay
coins
starsByDay
unlockedRecipes
unlockedUpgrades
achievements
settings (future)
statistics (future)
```

When schema changes, implement explicit migration.

## Performance principles

- Keep only the active session fully alive.
- Pool frequently spawned presentation objects if profiling shows allocation pressure.
- Prefer atlases and appropriately sized compressed textures as art arrives.
- Lazy-load optional content.
- Avoid per-object expensive work every frame when an event/state transition can do it once.
- Measure before adding complex optimization infrastructure.

## Testing strategy

Three layers:

1. **Pure rule tests** — state transitions, order matching, service rating, rewards.
2. **Simulation/debug tools** — spawn groups, force cooking complete, jump states, speed game time.
3. **Milestone playtests** — human judgment of fun, pacing, clarity and retention only when a meaningful batch is ready.

The user should not need to manually regression-test every small commit.

## Deliberate non-goals for now

We are not introducing ECS, a backend, multiplayer architecture, plugin frameworks or a complex dependency-injection container yet. The module boundaries above leave room for those only if the game eventually proves it needs them.
