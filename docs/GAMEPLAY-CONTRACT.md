# Core Gameplay Contract

These rules preserve the prototype behavior while the code is rebuilt into production modules.

## Validated loop

```text
Customer group arrives
  ↓
Drag group to a valid table
  ↓
Drag menu to table
  ↓
Customers browse
  ↓
Ready-to-order icon appears
  ↓
Tap customer/table to take order
  ↓
Order is visible for a short memory window
  ↓
Tap food icons in POS to reproduce the order
  ↓
Kitchen processes accepted order
  ↓
Food appears at pickup
  ↓
Drag each dish to the correct table
  ↓
Customers eat
  ↓
Payment becomes available
  ↓
Collect payment and free table
```

## Interaction ownership

- Seating: drag and drop.
- Menu delivery: drag and drop.
- Take order: tap.
- POS: tap food image/icon; no text entry.
- Serving: drag a dish from pickup to a table.
- Payment: tap.

## Service windows

Timed service is attached to the **currently actionable service step**, not one giant patience bar.

A service window starts only when the player can actually perform that action.

Examples:

- Seat starts when a group enters the waiting area.
- Menu starts after seating has completed.
- Take Order starts after browsing completes and the ready icon appears.
- POS starts after the protected memory view ends.
- Serve starts when food is actually ready at pickup.
- Payment starts when eating finishes.

Only one primary service window should normally be visible for a table at a time.

## Ratings

A resolved window can produce:

- Perfect
- Great
- OK
- Late

Late does not automatically destroy the flow. The action remains completable unless a specific level rule explicitly makes a customer leave.

## Pause invariant

Pause must stop all gameplay progression:

- service windows
- spawn timing
- browsing
- kitchen processing
- eating
- payment timing

The player must never gain an advantage by pausing.

## Anti-exploit invariants

- Dragging a customer around does not restart the seating timer.
- Once customers are seated, they cannot be freely moved to reset/optimize states unless a future feature explicitly allows it.
- POS failures do not reveal the correct order.
- Before successful POS submission, another UI surface must not leak the hidden order.
- Wrong serving attempts do not reveal the destination table.
- A rejected drop returns/cancels predictably and never duplicates or destroys a dish.
- Game rules validate actions; UI highlights are feedback only.
- Queue design must not soft-lock the restaurant.

## Progressive onboarding

Early days reveal complexity gradually. Current baseline:

```text
Day 1  Seating + Menu
Day 2  + Take Order + Memory
Day 3  + POS + Kitchen
Day 4  + Drag Serving
Day 5  + Payment / full service loop
Day 6  + Service ratings + streak / higher overlap
```

This progression is defined in content data and is expected to be tuned through playtesting.

## What should not be added to the core yet

Until retention/progression design is implemented and tested, do not complicate the base loop with boosters, helper notebooks, character powers or extra cooking minigames. New systems should earn their place by improving fun, choice, progression or retention.
