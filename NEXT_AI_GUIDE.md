
# NEXT AI GUIDE (Read First)

This project is designed for parallel, module-based development.
The main goal is to let different contributors implement isolated gameplay logic, then merge once with minimal conflicts.

## Core Rules

1. Default write scope is `src/modules/**` (single gameplay module only).
2. Do not modify `src/core/**` unless the user explicitly asks for engine-level changes.
3. When adding a new module file, only merge by editing `src/modules/Registry.ts`:
   - add one `import`
   - add one `new XxxModule()` in `modules` array
4. Keep each feature in one module file when possible (or one small folder under `src/modules/<feature>` if needed).
5. Every completed feature output must be logged in `AI_CHANGELOG.md` in the same turn.
6. Log only final implemented outcomes (no intermediate attempts or temporary fixes).
7. If context is near limit, write a handoff note in `AI_CHANGELOG.md` so next AI can continue immediately.
8. Cross-person handoff happens only when the user declares this phase/project complete.

## Allowed/Preferred Edit Areas

- Garden gameplay:
  - `src/modules/garden/GardenWatering.ts`
  - `src/modules/garden/GardenPlanting.ts`
  - `src/modules/garden/GardenGrowth.ts`
  - `src/modules/garden/GardenHarvest.ts`
  - `src/modules/garden/GardenWeather.ts`
  - `src/modules/garden/GardenSpiritBuff.ts`
  - `src/modules/garden/GardenPlots.ts`
  - `src/modules/garden/GardenVisuals.ts`
- Social gameplay:
  - `src/modules/social/socialSteal.ts`
  - `src/modules/social/socialBless.ts`
  - `src/modules/social/socialMock.ts`
- Arrangement gameplay:
  - `src/modules/arrangement/arrangementLogic.ts`
- UI gameplay:
  - `src/modules/ui/hudShop.ts`
  - `src/modules/ui/UiModule.ts`
- Shared data model (use with care):
  - `src/game/GameState.ts`

## Merge Pattern (Strict)

1. Implement in your own module file(s) under `src/modules/**`.
2. Keep public API through `IModule` (`init`, `update`, optional `onPointerDown`).
3. Register once in `src/modules/Registry.ts`.
4. Append a detailed entry to `AI_CHANGELOG.md`.

## Required Changelog Format

Each task must append one record:

```md
## YYYY-MM-DD HH:mm (local)
- Owner: AI / user tag
- Goal: one-line target
- Files changed:
  - path/to/file.ts
- Behavior change:
  - final shipped behavior only
- Compatibility / merge risk:
  - conflict points or "low"
- Next handoff:
  - exact next step for next AI
```

## Current Known Notes

- Jump (`Space`) and camera/movement inversion fixes were recently added in `src/core/Engine.ts` by user request.
- Existing build may fail due to missing `three` type declarations (`@types/three`), unrelated to module gameplay logic.
- Changelog should stay concise and record the final state per feature, not iterative edit history.
