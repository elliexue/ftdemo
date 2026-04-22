
# AI CHANGELOG

Use this file as the single source of truth for cross-window handoff.
Every AI turn that changes behavior must append one entry.
Keep entries concise: record final delivered behavior only, skip intermediate changes.

---

## 2026-04-14 23:46 (local)
- Owner: AI
- Goal: Add jump behavior.
- Files changed:
  - src/core/Engine.ts
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Press `Space` to jump.
  - Added gravity, vertical velocity, landing clamp.
  - HUD hint now includes jump key.
- Compatibility / merge risk:
  - Medium: touched `src/core/Engine.ts` (engine-level file).
- Next handoff:
  - Keep future gameplay additions in `src/modules/**` by default.

## 2026-04-14 23:58 (local)
- Owner: AI
- Goal: Fix reversed movement and reversed vertical camera drag.
- Files changed:
  - src/core/Engine.ts
- Behavior change:
  - `W/S/A/D` direction mapping flipped to match expected controls.
  - Right-drag vertical camera pitch direction inverted.
- Compatibility / merge risk:
  - Medium: touched `src/core/Engine.ts` (engine-level file).
- Next handoff:
  - If more control tuning is needed, centralize parameters in one config block to reduce future conflicts.

## 2026-04-15 00:12 (local)
- Owner: AI
- Goal: Add persistent handoff rules and mandatory logging workflow for next AI windows.
- Files changed:
  - NEXT_AI_GUIDE.md
  - AI_CHANGELOG.md
  - 说明.txt
- Behavior change:
  - Introduced strict module-first development rules for AI contributors.
  - Added a required changelog format and handoff expectations.
  - Linked the handoff workflow directly in 说明.txt.
- Compatibility / merge risk:
  - Low: documentation-only changes.
- Next handoff:
  - Continue feature implementation inside `src/modules/**` and append one changelog entry per task.

## 2026-04-14 22:07 (local)
- Owner: AI
- Goal: Correct forward/backward movement direction.
- Files changed:
  - src/core/Engine.ts
- Behavior change:
  - `W/ArrowUp` moves forward, `S/ArrowDown` moves backward.
- Compatibility / merge risk:
  - Medium: touched `src/core/Engine.ts` (engine-level file).
- Next handoff:
  - Keep movement tuning centralized to avoid repeated control flips.

## 2026-04-14 22:16 (local)
- Owner: AI
- Goal: Add home-page shop entry and scrollable flower shelf shop UI.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Home panel now has an `打开商店` entrance.
  - Clicking opens a shop panel with a horizontally scrollable flower shelf list.
  - Each flower card shows prices and supports direct seed purchase.
  - Shop panel supports close and includes one-click sell-all from inventory.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Add more flower types in `SEED_CONFIG` to automatically expand shelf items.

## 2026-04-14 22:21 (local)
- Owner: AI
- Goal: Fix unresponsive shop open interaction.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Shop click handling now uses resilient `data-action` delegation (`closest`) so nested click targets still work.
  - Shop panel is now a clear floating panel when opened.
  - Added `B` key as a direct open/close shortcut for shop.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep future shop actions on `data-action` to reuse the same delegated handler.

## 2026-04-14 22:32 (local)
- Owner: AI
- Goal: Center shop panel and expand shop seeds to 10 with matching flower icons.
- Files changed:
  - src/modules/ui/UiModule.ts
  - src/modules/garden/types.ts
  - src/game/GameState.ts
  - public/assets/icons/*.svg
  - public/assets/icons/ATTRIBUTION.md
- Behavior change:
  - Shop opens in centered modal.
  - Shop shelf now shows 10 flower seeds with icon + price, and supports purchase.
  - Seed selection UI is now dynamic for all configured seeds.
- Compatibility / merge risk:
  - Medium: added new SeedId variants and global seed inventory fields.
- Next handoff:
  - Adding any new seed now only needs `SEED_CONFIG` + icon file.

## 2026-04-14 22:36 (local)
- Owner: AI
- Goal: Fix shop shelf not scrolling.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Shop shelf now supports drag-to-scroll with mouse/touch.
  - Mouse wheel vertical scroll is mapped to horizontal shelf movement.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Reuse `bindShelfDrag` for any future horizontal card lists.

## 2026-04-14 22:40 (local)
- Owner: AI
- Goal: Make shop shelf dragging work reliably across browsers.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Replaced pointer-capture drag with robust mouse/touch drag handlers.
  - Added one-time binding guard to avoid duplicate listeners.
  - Wheel-to-horizontal scroll remains enabled.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep horizontal list interactions centralized in `bindShelfDrag`.

## 2026-04-14 22:43 (local)
- Owner: AI
- Goal: Fix shop modal layer/event issues after opening.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Raised shop modal interaction layer (`z-index`/pointer-events) to ensure clickable top-layer behavior.
  - Switched action handling to document-level delegated click routing.
  - Prevented shelf drag handler from intercepting button clicks (buy/close).
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep modal actions on `data-action` and avoid non-delegated button listeners.

## 2026-04-14 22:46 (local)
- Owner: AI
- Goal: Restore clickability of home shop entry and modal action buttons.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - HUD layer now reliably receives pointer input.
  - Delegated click handling now supports non-Element/text-node click targets.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep event delegation robust to mixed target node types.

## 2026-04-14 22:49 (local)
- Owner: AI
- Goal: Fix global left-side UI buttons not responding.
- Files changed:
  - src/modules/ui/UiModule.ts
  - src/core/Engine.ts
- Behavior change:
  - Removed canvas pointer-capture path that could trap pointer events.
  - UI actions now trigger on HUD-level `pointerdown` and stop propagation to canvas.
- Compatibility / merge risk:
  - Medium: touched both UI and engine input handling.
- Next handoff:
  - Keep canvas camera drag logic free of hard pointer capture unless strictly required.

## 2026-04-14 22:52 (local)
- Owner: AI
- Goal: Fix shop shelf still not sliding.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Rebuilt shelf drag with pointer-based capture on shelf element only.
  - Added explicit left/right shelf navigation buttons as fallback.
  - Kept wheel-to-horizontal scroll.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Reuse the same shelf drag pattern for other card carousels.

## 2026-04-14 22:54 (local)
- Owner: AI
- Goal: Fix shelf container layout preventing horizontal movement.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Made shelf area a shrinkable flex item (`flex:1; min-width:0`) so overflow can occur.
  - Locked each product card width (`flex:0 0 190px`) to guarantee horizontal overflow.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep carousel containers with `min-width:0` when nested in flex layouts.

## 2026-04-14 22:57 (local)
- Owner: AI
- Goal: Resolve shelf movement failure by replacing native scrolling with controlled track translation.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Shelf now moves via JS-managed `translateX` track offset.
  - Drag, wheel, and left/right navigation all drive the same offset logic.
- Compatibility / merge risk:
  - Low: UI module only.
- Next handoff:
  - Keep all carousel movement through `syncShelfOffset` for consistent behavior.

## 2026-04-14 23:19 (local)
- Owner: AI
- Goal: Show per-seed inventory directly on seed selection UI.
- Files changed:
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Each seed picker button now displays current stock count (e.g. `种子名 ×数量`).
- Compatibility / merge risk:
  - Low: UI text rendering only.
- Next handoff:
  - Keep picker count display bound to `gameState.seeds[seedId]`.

## 2026-04-14 23:24 (local)
- Owner: AI
- Goal: Give different seeds visibly different 3D flower models.
- Files changed:
  - src/modules/garden/GardenVisuals.ts
- Behavior change:
  - Each seed type now uses a distinct flower-head geometry (shape differences), in addition to color differences.
- Compatibility / merge risk:
  - Low: visual module only.
- Next handoff:
  - Extend `HEAD_GEOMETRIES` when adding new seed types.

## 2026-04-14 23:27 (local)
- Owner: AI
- Goal: Set initial seed stock to 10 each and expand plots to 20.
- Files changed:
  - src/game/GameState.ts
  - src/modules/garden/GardenPlots.ts
- Behavior change:
  - Account starts with 10 units for each seed type.
  - Garden now renders 20 plots (5x4 layout).
- Compatibility / merge risk:
  - Medium: touches global game initialization + plot layout.
- Next handoff:
  - Keep `plots.length` and rendered plot count aligned when adjusting layout.

## 2026-04-14 23:32 (local)
- Owner: AI
- Goal: Make watering mandatory for growth and add visual watering-needed hints.
- Files changed:
  - src/modules/garden/types.ts
  - src/modules/garden/GardenPlanting.ts
  - src/modules/garden/GardenGrowth.ts
  - src/modules/garden/GardenWatering.ts
  - src/modules/garden/GardenPlots.ts
  - src/modules/garden/GardenVisuals.ts
  - src/modules/garden/GardenHarvest.ts
  - src/modules/social/socialSteal.ts
  - src/modules/social/socialMock.ts
  - src/game/GameState.ts
- Behavior change:
  - Crops now stop growing until watered (`needsWater` gate per stage).
  - Stage advancement consumes watering and requires next watering action before further growth.
  - Plants that need watering now show a floating blue hint marker above the model.
- Compatibility / merge risk:
  - Medium: extends PlotRuntime and updates related gameplay modules.
- Next handoff:
  - Keep `needsWater` synchronized whenever resetting or creating plot runtime objects.

## 2026-04-14 23:40 (local)
- Owner: AI
- Goal: Rework stage progression to watering/fertilizing task gates with prompts and action VFX.
- Files changed:
  - src/modules/garden/types.ts
  - src/modules/garden/GardenGrowth.ts
  - src/modules/garden/GardenWatering.ts
  - src/modules/garden/GardenFertilizing.ts
  - src/modules/garden/GardenModule.ts
  - src/modules/garden/GardenPlots.ts
  - src/modules/garden/GardenVisuals.ts
  - src/modules/garden/GardenPlanting.ts
  - src/modules/garden/GardenHarvest.ts
  - src/modules/social/socialSteal.ts
  - src/modules/social/socialMock.ts
  - src/game/GameState.ts
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Stage 1 -> 2 grows by time without watering.
  - Stage 2 -> 3 requires watering and upgrades immediately.
  - Stage 3 -> 4 requires fertilizing and upgrades immediately.
  - Water/fertilizer required states show distinct model hints; both actions play visual effects.
- Compatibility / merge risk:
  - Medium: extends plot runtime schema and stage transition logic.
- Next handoff:
  - Keep all plot reset/create paths updating both requirement flags and effect timers.

## 2026-04-14 23:46 (local)
- Owner: AI
- Goal: Improve watering/fertilizing VFX realism and add nearby 3D action prompts.
- Files changed:
  - src/modules/garden/GardenPlots.ts
  - src/modules/garden/GardenVisuals.ts
  - src/modules/garden/GardenModule.ts
- Behavior change:
  - Watering VFX is now droplet-like particle motion.
  - Fertilizing VFX is now granular pellet-like particle motion.
  - When player approaches a target plot, a 3D prompt appears near the flower (`需要浇水` / `需要施肥`).
- Compatibility / merge risk:
  - Low: visual+interaction guidance layer only.
- Next handoff:
  - Keep prompt text rendering cache to avoid per-frame canvas redraw.

## 2026-04-14 23:48 (local)
- Owner: AI
- Goal: Increase watering/fertilizing VFX visibility and shrink 3D prompt size.
- Files changed:
  - src/modules/garden/GardenPlots.ts
  - src/modules/garden/GardenVisuals.ts
- Behavior change:
  - Water/fertilizer particles are larger/brighter with wider motion range.
  - Nearby 3D action prompt sprite size reduced to avoid blocking view.
- Compatibility / merge risk:
  - Low: visual tuning only.
- Next handoff:
  - Continue balancing readability by adjusting particle count before further size increases.

## 2026-04-14 23:53 (local)
- Owner: AI
- Goal: Further enlarge VFX range, shrink prompt UI again, and add fertilizing wait time after watering.
- Files changed:
  - src/modules/garden/types.ts
  - src/modules/garden/GardenGrowth.ts
  - src/modules/garden/GardenWatering.ts
  - src/modules/garden/GardenFertilizing.ts
  - src/modules/garden/GardenPlots.ts
  - src/modules/garden/GardenVisuals.ts
  - src/modules/garden/GardenPlanting.ts
  - src/modules/garden/GardenHarvest.ts
  - src/modules/social/socialSteal.ts
  - src/modules/social/socialMock.ts
  - src/game/GameState.ts
- Behavior change:
  - Water/fertilizer VFX now have larger particles and wider visible range.
  - 3D action prompt is smaller and positioned higher to avoid covering effects.
  - After watering into stage 3, fertilizing is locked for a short cooldown period.
- Compatibility / merge risk:
  - Medium: runtime plot schema updated with fertilizing cooldown.
- Next handoff:
  - Keep `fertilizerCooldown` initialized/reset on all plot lifecycle paths.

## 2026-04-14 23:55 (local)
- Owner: AI
- Goal: Increase 3D prompt text readability.
- Files changed:
  - src/modules/garden/GardenVisuals.ts
- Behavior change:
  - Increased in-world prompt font size while keeping prompt panel size unchanged.
- Compatibility / merge risk:
  - Low: visual text styling only.
- Next handoff:
  - Tune font size and panel scale together if camera distance changes later.

## 2026-04-14 23:57 (local)
- Owner: AI
- Goal: Show fertilizing availability only after cooldown, increase cooldown duration, and enlarge prompt font.
- Files changed:
  - src/modules/garden/GardenWatering.ts
  - src/modules/garden/GardenVisuals.ts
- Behavior change:
  - Fertilizing prompt marker now appears only when cooldown is finished.
  - Fertilizing wait time after watering increased.
  - 3D prompt text font increased by two size steps.
- Compatibility / merge risk:
  - Low: stage-3 guidance tuning only.
- Next handoff:
  - Keep fertilizing readiness condition consistent across hints and interaction checks.

## 2026-04-15 11:25 (local)
- Owner: AI
- Goal: Add fertilize-time random giant bloom mutation with persistent visual effect.
- Files changed:
  - src/modules/garden/types.ts
  - src/modules/garden/GardenFertilizing.ts
  - src/modules/garden/GardenVisuals.ts
  - src/modules/garden/gardenPlantMeshes.ts
  - src/modules/garden/GardenPlanting.ts
  - src/modules/garden/GardenHarvest.ts
  - src/modules/social/socialSteal.ts
  - src/modules/social/socialMock.ts
  - src/game/GameState.ts
  - src/game/saveLocal.ts
- Behavior change:
  - Fertilizing now rolls random chance to trigger giant bloom mutation immediately.
  - Triggered giant blooms mature as oversized flowers and keep a persistent aura VFX until reset/harvest.
  - Giant bloom state is initialized/reset/saved consistently.
- Compatibility / merge risk:
  - Medium: extends plot runtime schema and save/load compatibility fields.
- Next handoff:
  - Keep `giantBloom` synced in all future plot lifecycle and persistence paths.

## 2026-04-15 11:29 (local)
- Owner: AI
- Goal: Make giant bloom aura clearly visible and ensure immediate display after mutation trigger.
- Files changed:
  - src/modules/garden/gardenPlantMeshes.ts
  - src/modules/garden/GardenVisuals.ts
- Behavior change:
  - Enlarged and repositioned giant aura rings to prevent clipping inside oversized flowers.
  - Giant aura display condition now depends directly on mutation flag (`giantBloom`) for immediate appearance.
- Compatibility / merge risk:
  - Low: giant bloom visual presentation only.
- Next handoff:
  - Keep aura size/position coupled with giant flower scale adjustments.

## 2026-04-15 12:06 (local)
- Owner: AI
- Goal: Upgrade arrangement workflow/UI and restore missing flower icons.
- Files changed:
  - src/modules/ui/UiModule.ts
  - src/modules/arrangement/ArrangementModule.ts
  - src/modules/arrangement/arrangementLogic.ts
  - src/modules/arrangement/arrangementStation.ts
  - src/game/GameState.ts
  - src/game/saveLocal.ts
  - public/assets/icons/*.svg
- Behavior change:
  - Arrangement panel now supports flower selection style with icon cards and inventory counts.
  - Arrangement interaction changed to planting-like flow: select flower type in UI, then click scene flower rack to place into arrangement slots.
  - Replaced arrangement station visual model with a cleaner wood shelf/rack style.
  - Restored missing seed icon assets, including lotus icon.
- Compatibility / merge risk:
  - Medium: touches UI + arrangement interaction + persistent state schema (`selectedArrangementSeed`).
- Next handoff:
  - Continue adding new arrangement gameplay only in `src/modules/arrangement/**`; keep save compatibility for `selectedArrangementSeed`.

## 2026-04-15 12:33 (local)
- Owner: AI
- Goal: Rebuild arrangement station + add 3D craft flow + bouquet item economy loop.
- Files changed:
  - src/modules/arrangement/arrangementStation.ts
  - src/modules/arrangement/ArrangementModule.ts
  - src/modules/arrangement/arrangementLogic.ts
  - src/modules/ui/hudShop.ts
  - src/modules/ui/UiModule.ts
  - src/game/GameState.ts
  - src/game/saveLocal.ts
- Behavior change:
  - Arrangement station remodeled into circular low-wall style with decorative ring layout and a clickable 3D craft switch.
  - When 3 flowers are placed, in-world craft prompt and switch glow appear; triggering craft plays fly-up merge animation + impact effect.
  - Crafted result becomes a new bouquet inventory item (not immediate direct gold).
  - Shop sell action now supports bouquet items, converting them to gold for buying more seeds.
  - Bouquet inventory is now persisted in save/load/reset flow.
- Compatibility / merge risk:
  - Medium: touches arrangement scene interaction, economy flow, and save schema (`bouquets`).
- Next handoff:
  - Keep bouquet schema stable (`id/label/seeds/value`) for future market or order-system extensions.

## 2026-04-15 12:44 (local)
- Owner: AI
- Goal: Fix arrangement switch usability and redesign inventory display panel.
- Files changed:
  - src/modules/arrangement/ArrangementModule.ts
  - src/modules/arrangement/arrangementStation.ts
  - src/modules/ui/UiModule.ts
- Behavior change:
  - Arrangement switch hit detection is now prioritized before station hit, with enlarged invisible hit area.
  - In-world arrangement prompt was reduced in size and text fit to avoid overflow.
  - Added standalone inventory panel UI with icon-based cards for seed stock and flower stock, plus bouquet count.
- Compatibility / merge risk:
  - Low: interaction priority and HUD rendering adjustments only.
- Next handoff:
  - Keep switch hit logic in first-pass ray check to avoid future click conflicts with station meshes.

## 2026-04-15 13:02 (local)
- Owner: AI
- Goal: Improve arrangement data layout and add center success toast bubbles.
- Files changed:
  - src/modules/ui/UiModule.ts
  - src/modules/garden/GardenHarvest.ts
  - src/modules/arrangement/arrangementLogic.ts
- Behavior change:
  - Arrangement flower options now display in multi-item row style (same flow feel as planting option rows).
  - Added center bubble toast that auto-disappears for both harvest success and arrangement success.
  - Inventory panel bouquet data now supports multi-item grouped display (same row-flow style).
- Compatibility / merge risk:
  - Low: UI rendering and event-notification additions only.
- Next handoff:
  - Reuse `game:toast` event for future action feedback instead of adding duplicated popup systems.

## 2026-04-15 13:12 (local)
- Owner: AI
- Goal: Fix TypeScript build blockers that prevented app startup.
- Files changed:
  - src/core/modelUtils.ts
  - src/modules/arrangement/ArrangementModule.ts
  - src/modules/social/friendGardenSpawn.ts
- Behavior change:
  - Resolved strict nullability and material-dispose typing errors.
  - Added missing `giantBloom` field in friend garden spawn runtime data.
  - Full `npm run build` now passes again.
- Compatibility / merge risk:
  - Low: compile/runtime schema consistency fixes only.
- Next handoff:
  - Keep `PlotRuntime` fields synchronized across all mock/spawn/reset paths when adding new gameplay flags.

## 2026-04-15 13:24 (local)
- Owner: AI
- Goal: Fix widespread mojibake (garbled text) by switching to clean UTF-8 UI/arrangement modules.
- Files changed:
  - src/modules/ui/UiModuleV2.ts
  - src/modules/arrangement/ArrangementModuleV2.ts
  - src/modules/arrangement/arrangementLogicV2.ts
  - src/modules/garden/GardenHarvestV2.ts
  - src/modules/garden/GardenModule.ts
  - src/modules/Registry.ts
- Behavior change:
  - All major player-facing UI text now uses clean Chinese strings (status/inventory/shop/arrangement/toast).
  - Harvest success and arrangement success toasts now display correct Chinese text.
  - Registry now uses the new clean modules (`V2`) to avoid inherited garbled literals.
- Compatibility / merge risk:
  - Medium: module entry switched to new V2 files; legacy modules still present but no longer wired in registry.
- Next handoff:
  - Continue feature development in V2 modules; keep legacy modules untouched unless doing full migration cleanup.

## 2026-04-15 13:36 (local)
- Owner: AI
- Goal: Add neighbor-help gameplay and mature-flower interaction buttons with result toasts.
- Files changed:
  - src/modules/garden/GardenModuleV2.ts
  - src/modules/social/socialCareV2.ts
  - src/modules/social/socialBlessV2.ts
  - src/modules/social/socialStealV2.ts
  - src/modules/ui/UiModuleV2.ts
  - src/modules/Registry.ts
- Behavior change:
  - In neighbor garden, player can help water/fertilize growing flowers.
  - When neighbor flowers are mature, approaching them shows in-world 3D action buttons: Bless / Steal.
  - Blessing mature neighbor flowers now makes them giant blooms immediately.
  - Bless/steal actions now trigger center toast result bubbles.
- Compatibility / merge risk:
  - Medium: switched active garden/social interaction entry to V2 module chain.
- Next handoff:
  - Keep neighbor interaction logic centralized in `GardenModuleV2` + `social*V2` to avoid mixed V1/V2 behavior.

## 2026-04-15 (local)
- Owner: AI
- Goal: Fix player facing, neighbor bless aggro, HUD seed title, shop sell split, toast placement, locomotion clip priority.
- Files changed:
  - src/core/Engine.ts
  - src/core/modelUtils.ts
  - src/modules/garden/GardenModuleV2.ts
  - src/modules/social/friendGardenChaser.ts
  - src/modules/ui/BottomSeedDockModule.ts
  - src/modules/ui/UiModuleV2.ts
  - src/modules/ui/hudShop.ts
- Behavior change:
  - Player yaw uses atan2(-vx,-vz) so movement matches forward with soldier mesh PI offset (no moonwalk).
  - Blessing neighbor plots no longer triggers chaser or chase toasts; steal still does.
  - Bottom seed bar shows title「选择种植的种子」; removed unused duplicate `#hud-seed-dock` from V2 HUD.
  - Shop modal: separate buttons for selling flowers vs bouquets (`sellAllFlowersFromInventory` / `sellAllBouquetsFromInventory`).
  - Result/chase toasts anchored near top-center (~20% from top) instead of screen center.
  - Locomotion clip picker prefers Walk over Run when both exist.
- Compatibility / merge risk:
  - Low–medium: `sellAllInventoryForGold` unchanged for legacy `UiModule.ts`; V2 shop no longer exposes one-click sell-all.
- Next handoff:
  - If facing still wrong for a different player asset, toggle mesh `rotation.y` vs yaw offset in one place only.

## 2026-04-15 (local, follow-up)
- Owner: AI
- Goal: Neighbor facing; arrangement HUD near station; events top-right; quick actions + hints + toast glass UI.
- Files changed:
  - src/modules/social/friendGardenChaser.ts
  - src/modules/arrangement/arrangementStation.ts
  - src/modules/arrangement/ArrangementModuleV2.ts
  - src/modules/ui/ArrangementHudModule.ts (new)
  - src/modules/ui/UiModuleV2.ts
  - src/modules/Registry.ts
- Behavior change:
  - Neighbor GLB no longer uses local Y=π so `lookAt` matches walk direction.
  - Exported `ARRANGEMENT_STATION_CENTER_XZ` / `ARRANGEMENT_HUD_PROXIMITY`; new `ArrangementHudModule` shows floating插花面板 when player is within ~5.2m of the station (removed from main HUD scroll).
  - Event log fixed top-right with translucent `backdrop-filter` panel; main column scrolls below top dock.
  - Top-left dock: 打开商店、清除本地存档、操作提示；居中 toast 半透明毛玻璃。
- Compatibility / merge risk:
  - Low: new module in `Registry`; `UiModuleV2` DOM ids changed (no `hud-shop-entry` / `hud-arrange` / `hud-log` in scroll).

## 2026-04-15 (local)
- Owner: AI
- Goal: Fix arrangement success celebration at wrong world position.
- Files changed:
  - src/modules/arrangement/ArrangementModuleV2.ts
- Behavior change:
  - Celebration burst origins are sampled with `getWorldPosition` before flowers are detached from slot anchors.
- Compatibility / merge risk:
  - Low.

## 2026-04-21 (local)
- Owner: AI
- Goal: Generate a chibi-style player model and add clear walk/run locomotion.
- Files changed:
  - src/core/Engine.ts
- Behavior change:
  - Default player switched to a procedurally generated chibi character (big-head cartoon style).
  - Added distinct locomotion states: idle / walk / run.
  - Holding `Shift` while moving enters run mode (faster speed + larger limb swing); normal move is walk.
- Compatibility / merge risk:
  - Medium: updated player construction and movement animation pipeline in engine-level file.
- Next handoff:
  - If a GLB character is re-enabled later, keep `Shift` run speed/state logic and only swap visual/clip mapping.

## 2026-04-21 (local, follow-up)
- Owner: AI
- Goal: Make chibi player visible in the active garden showcase page.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added a visible chibi player entity to `garden-scene.html` scene.
  - Added playable locomotion in showcase: `WASD` move, `Shift` run.
  - Added procedural idle/walk/run animation (head/arm/leg motion) and camera target follow.
- Compatibility / merge risk:
  - Low: showcase-only scene script.
- Next handoff:
  - If needed, tune spawn position and speed in `bootstrap` preview-player constants.

## 2026-04-21 (local, follow-up-2)
- Owner: AI
- Goal: Fix reversed-facing movement and align player-to-scene scale in showcase.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Fixed preview player yaw so movement no longer appears backward.
  - Adjusted preview player scale and follow-target height for better proportion against garden props.
- Compatibility / merge risk:
  - Low: showcase-only player transform/locomotion tuning.
- Next handoff:
  - If proportion still needs tuning, adjust `previewPlayer.scale` and `cameraTargetFollow` together.

## 2026-04-21 (local, follow-up-3)
- Owner: AI
- Goal: Enlarge showcase garden scale to better match player proportion.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Increased whole garden scene scale (with height offset compensation) so props read larger vs player.
  - Expanded player movement bounds to match enlarged map.
  - Kept custom-plot drawing aligned by converting drawn world points into scaled garden local coordinates before commit/save.
- Compatibility / merge risk:
  - Low: showcase-only tuning and draw-coordinate adaptation.
- Next handoff:
  - If you want an even larger look, increase `gardenScale` and keep the same local/world conversion pattern.

## 2026-04-21 (local, follow-up-4)
- Owner: AI
- Goal: Further enlarge showcase scene scale per visual feedback.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Increased `gardenScale` from `1.28` to `1.45` for a noticeably larger environment.
- Compatibility / merge risk:
  - Low: scalar tuning only, existing bound/draw adaptation stays effective.
- Next handoff:
  - Continue tuning only `gardenScale` if more macro proportion adjustment is needed.

## 2026-04-21 (local, follow-up-5)
- Owner: AI
- Goal: Fix showcase left/right movement inversion and floating pebble-path height.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Corrected camera-relative right vector (`forward x up`) so `A/D` left-right movement matches expectation.
  - Lowered path layers (road, ring edge, stones, side pebbles) to visually attach to ground after scene scaling.
- Compatibility / merge risk:
  - Low: showcase movement-vector and path-height tuning only.
- Next handoff:
  - If needed, fine-tune `roadY/edgeY/stoneY` constants for final terrain blending.

## 2026-04-21 (local, follow-up-6)
- Owner: AI
- Goal: Enlarge showcase environment again to improve player-to-scene proportion.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Increased `gardenScale` from `1.45` to `1.62`.
- Compatibility / merge risk:
  - Low: scalar tuning only; existing movement-bound and draw-coordinate adaptation remains linked to `gardenScale`.
- Next handoff:
  - Continue tuning `gardenScale` if proportion still needs adjustment.

## 2026-04-21 (local, follow-up-7)
- Owner: AI
- Goal: Enlarge showcase environment one more step by request.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Increased `gardenScale` from `1.62` to `1.75`.
- Compatibility / merge risk:
  - Low: scalar tuning only.
- Next handoff:
  - Keep using `gardenScale` as the single proportion control knob.

## 2026-04-21 (local, follow-up-8)
- Owner: AI
- Goal: Fix foot sinking, clear auto flowers from plant zones, and add showcase shop+seed planting loop.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Raised player ground alignment to current scaled terrain height (feet no longer sink).
  - Removed default flower auto-generation in all planting zones; flowers now appear only after player planting.
  - Added shop UI with seed purchase, bottom seed inventory dock, `B` shortcut to open/close shop, and click-to-plant on subplot cells.
- Compatibility / merge risk:
  - Medium: showcase bootstrap now includes local economy/inventory/planting interactions.
- Next handoff:
  - If adding harvest/growth later, reuse `cell.userData` planted state and seed metadata as the runtime anchor.

## 2026-04-21 (local, follow-up-9)
- Owner: AI
- Goal: Upgrade showcase HUD visuals (shop icon, resource graphics, hint placement).
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Replaced shop entry with a stylized icon button (shop-building look) using an embedded SVG icon.
  - Converted gold/seed status to iconized display and seed dock to icon + numeric badge chips.
  - Moved operation hint panel to the bottom-right corner.
- Compatibility / merge risk:
  - Low: UI presentation-only changes on showcase page.
- Next handoff:
  - If needed, replace embedded SVG with external asset while keeping existing button structure.

## 2026-04-21 (local, follow-up-10)
- Owner: AI
- Goal: Port prior project planting lifecycle (grow/water/fertilize/mature) into showcase scene.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added plot lifecycle state machine: planted stage-1 growth -> stage-2 requires watering -> stage-3 requires fertilizer (with cooldown) -> stage-4 mature.
  - Plot click interaction is now state-driven (same click does plant / water / fertilize based on current phase).
  - Added stage-dependent plant visuals and watering/fertilizing/maturity particle effects.
  - Added dynamic action hint near bottom-right that reflects hovered plot’s current actionable state.
- Compatibility / merge risk:
  - Medium: showcase planting interaction path now uses richer per-cell runtime state in `userData.life`.
- Next handoff:
  - Add harvest/sell integration by consuming mature `stage===4` cells and clearing `userData.life`.

## 2026-04-21 (local, follow-up-11)
- Owner: AI
- Goal: Fix seed visual differentiation, restore water/fertilize prompt FX, and remove floating plants.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Mature flower visuals now vary by seed type (e.g. sunflower/lotus/rose-like forms) rather than color-only difference.
  - Re-added in-plot 3D prompt effects for "needs water" and "needs fertilizer", with continuous pulsing/rotation.
  - Lowered plant root anchor and early-stage geometry heights so planted flowers sit on the soil instead of floating.
- Compatibility / merge risk:
  - Low: visual-layer updates built on existing plot lifecycle state.
- Next handoff:
  - If any species still feels too similar, extend `makeMatureBloom` with additional per-seed silhouette variants.

## 2026-04-21 (local, follow-up-12)
- Owner: AI
- Goal: Improve startup inventory and mature-stage interaction/visual quality.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Initialized account with `10` seeds for every seed type.
  - Mature plots are now harvestable on click; harvest clears the plot and grants gold (giant bloom gives bonus).
  - Reworked mature default bloom silhouette and removed the previous large top sphere/glow look.
- Compatibility / merge risk:
  - Low: showcase runtime state and visual tuning only.
- Next handoff:
  - If desired, route harvest output into a bouquet/flower inventory instead of direct gold gain.

## 2026-04-21 (local, follow-up-13)
- Owner: AI
- Goal: Enforce per-seed unique models across stages and add visible late growth process.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added per-seed visual profile system so stage-1/2/3/4 shapes are no longer generic shared meshes.
  - Growth chain now renders as: seed core -> sprout variant -> watered bloom -> fertilized large bloom -> mature multi-branch multi-flower cluster.
  - Stage-4 harvesting is gated until mature-cluster completion; mature progress now advances over time and then unlocks harvest.
- Compatibility / merge risk:
  - Medium: plot lifecycle data now includes `matureProgress` and `matureClusterReady`.
- Next handoff:
  - If balancing is needed, tune stage-4 maturation rate in `tickPlotLifecycle`.

## 2026-04-21 (local, follow-up-14)
- Owner: AI
- Goal: Guarantee stronger per-species model uniqueness in every stage and make fertilize->mature growth visibly progressive.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added species signature geometry rings (shape/count/radius) and per-species profile params so all seed types remain visually distinguishable in stage-1/2/3/4.
  - Adjusted stage mapping to match expected growth arc: stage-2 pre-water sprout, stage-3 post-water blooming flower, stage-4 post-fertilize enlarged flower that keeps growing before mature cluster unlock.
  - Mature pre-cluster state now renders progressive branch/bud growth and refreshes in discrete visual steps until final multi-branch multi-flower model appears.
- Compatibility / merge risk:
  - Medium: expanded visual profile schema for seed rendering; no protocol change outside showcase script.
- Next handoff:
  - If visuals are still too close for any pair, tune `VISUAL` signature and petal parameters for that pair only.

## 2026-04-21 (local, follow-up-15)
- Owner: AI
- Goal: Update stage transition rules and fix flower/branch separation in stage-2/3/4 models.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - New growth flow: stage-1 needs watering to enter stage-2; stage-2 waits growth then needs watering to enter stage-3; stage-3 waits growth then needs fertilizing to enter stage-4.
  - Water prompt FX now supports both stage-1 and stage-2 when watering is required.
  - Rebuilt bloom anchor/branch mounting so flower heads stay attached to stems/branches in stage-3 and stage-4 (including pre-mature growth and mature cluster).
- Compatibility / merge risk:
  - Medium: old legacy branch still exists in file history section, but runtime now follows the new early-return lifecycle path.
- Next handoff:
  - If pacing needs adjustment, tune `STAGE2_GROW_RATE` and `STAGE3_GROW_RATE`.

## 2026-04-21 (local, follow-up-16)
- Owner: AI
- Goal: Add stage-1 timed growth-before-water and restore obvious giant-plant randomness visibility.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Stage-1 now also has a growth period first; when progress reaches 100%, it requires watering to enter stage-2.
  - Planting now starts stage-1 as growing (`needsWater=false`) instead of immediate watering-required.
  - Increased giant mutation chance and added clear giant aura + larger giant scaling at stage-4 so random giant outcomes are visually obvious.
- Compatibility / merge risk:
  - Low: lifecycle pacing and stage-4 visual emphasis tuning.
- Next handoff:
  - If giant plants appear too often, reduce `GIANT_CHANCE` from `0.42` to desired rate.

## 2026-04-21 (local, follow-up-17)
- Owner: AI
- Goal: Make giant plants visually bigger without aura effects.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Removed giant aura visuals (ring + star particles).
  - Increased giant plant body scale directly (`stage-4`: pre-mature `1.9`, mature `2.08`) so giant size is obvious by mesh itself.
- Compatibility / merge risk:
  - Low: visual-only tuning for giant plants.
- Next handoff:
  - If still too large/small, tune the two giant scale values in `buildPlantVisual`.

## 2026-04-21 (local, follow-up-18)
- Owner: AI
- Goal: Improve planting-slot appearance to soft circular markers instead of dark square soil blocks.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Replaced subplot bed/cell geometry from square boxes to circular thin cylinders.
  - Changed planting-slot palette to low-saturation light gray with transparency so slots are visible but subtle.
  - Updated harvest reset color to the same light-gray slot tone (no more brown fallback after harvest).
- Compatibility / merge risk:
  - Low: visual-only update on subplot mesh/material generation.
- Next handoff:
  - If markers need to be even lighter/darker, tune `capMat.opacity` and `capMat.color` in `addPlantingSubplots`.

## 2026-04-21 (local, follow-up-19)
- Owner: AI
- Goal: Remove the two default planting zones in the swing-front area to allow manual replanning.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Deleted the two hardcoded `desiredZones` entries under the `// swing-front triangle` section.
  - Swing-front area is now left empty by default for custom planting-zone layout.
- Compatibility / merge risk:
  - Low: data-list adjustment only; no gameplay/state-machine logic changes.
- Next handoff:
  - Rebuild swing-area planting blocks using draw mode (`G`) and custom polygon zones.

## 2026-04-21 (local, follow-up-20)
- Owner: AI
- Goal: Correct the previous removal target and actually clear the two swing-back default zones.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Removed the two `desiredZones` entries near `(-2.8, -3.9)` and `(0.4, -4.0)` that were still appearing around the swing area.
- Compatibility / merge risk:
  - Low: static default-zone list adjustment only.
- Next handoff:
  - If any swing-area plots still remain, check browser localStorage custom zones and delete the specific saved polygons.

## 2026-04-21 (local, follow-up-21)
- Owner: AI
- Goal: Fix persistent swing-area plots that reappeared from local saved custom zones.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added startup cleanup for legacy swing-area saved polygons (near `(-2.8, -3.9)` and `(0.4, -4.0)`).
  - On boot, filtered zones are immediately written back to localStorage so removed zones do not come back after refresh.
- Compatibility / merge risk:
  - Low: only affects legacy saved-zone loading in the target swing area.
- Next handoff:
  - If user wants a full reset, add a one-click action to clear all `ZONE_STORAGE_KEY` data.

## 2026-04-21 (local, follow-up-22)
- Owner: AI
- Goal: Resolve remaining swing-area plots by adding robust one-time legacy-zone migration cleanup.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Removed the last default swing-back zone entry (`x: 3.0, z: -4.5`) from `desiredZones`.
  - Upgraded legacy swing-zone detection to support both unscaled and scaled historical coordinates.
  - Added one-time cleanup key (`ft_garden_swing_zone_cleanup_v2_done`) so cleanup runs once, then stops deleting future user-created zones.
- Compatibility / merge risk:
  - Low: startup migration logic only, scoped to swing-area legacy polygons.
- Next handoff:
  - If user still sees stale geometry, force hard-refresh and verify URL is `/garden-scene.html`.

## 2026-04-21 (local, follow-up-23)
- Owner: AI
- Goal: Roll back the newest user-added planting zone on request.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added one-time latest-zone rollback on startup (`ft_garden_rollback_latest_zone_once_v1_done`).
  - Startup load order is now: load -> swing legacy cleanup -> rollback newest zone once -> render zones.
- Compatibility / merge risk:
  - Low: affects saved custom zone bootstrap order only.
- Next handoff:
  - For repeated manual undo support, add a dedicated UI button that pops latest zone and reloads scene.

## 2026-04-21 (local, follow-up-24)
- Owner: AI
- Goal: Upgrade custom planting-zone border style from full fence to mixed natural enclosure.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Reworked `addPolygonPlantingZone` boundary generation to a mixed style:
    - partial/sparse fence segments (not full perimeter),
    - edge stones with varied size/placement,
    - shrub and small mushroom-style decor accents.
  - Added polygon winding-aware outward normal so border decorations are placed toward the outer side consistently.
- Compatibility / merge risk:
  - Low: visual generation update for custom polygon borders only.
- Next handoff:
  - If user wants stronger style identity per zone, add `styleId` to `SavedZone` and branch boundary generation by style preset.

## 2026-04-21 (local, follow-up-25)
- Owner: AI
- Goal: Reduce fence density further and enhance organic border richness + rounded zone edge.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - `addPolygonPlantingZone` now smooths drawn polygon edges with closed Catmull-Rom sampling before building soil/border, making zone edges visually rounder.
  - Fence became sparse and irregular short segments only (instead of frequent full-edge pickets).
  - Increased stone density and expanded size variance; added occasional larger boulders.
  - Added richer border decorations: grass clumps + shrub variation + mushroom clusters with randomized spacing/scale.
- Compatibility / merge risk:
  - Medium-low: procedural border generation changed, but input/output zone data format unchanged.
- Next handoff:
  - If user wants even softer contour, increase smoothing sample density or Catmull-Rom tension in `smoothPolygon`.

## 2026-04-21 (local, follow-up-26)
- Owner: AI
- Goal: Slightly increase fence presence and amplify size staggering for rocks/mushrooms/grass clusters.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Raised sparse-fence occurrence a little and added occasional second short fence segment on an edge.
  - Expanded rock/boulder scale variance for stronger small-vs-large contrast.
  - Expanded shrub, mushroom, and grass-clump size variance ranges to make border decor layering more obvious.
- Compatibility / merge risk:
  - Low: procedural decoration parameter tuning only.
- Next handoff:
  - If still too dense, tune `useFence` threshold upward; if too sparse, lower it slightly.

## 2026-04-21 (local, follow-up-27)
- Owner: AI
- Goal: Make planting-zone surface look like stylized farm soil (warm brown, mottled, with planting marks).
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Updated subplot cell materials from cool gray to warm soil tones, with oval-like cap shaping/rotation for cultivated-bed feel.
  - Updated polygon soil base color and added a procedural layer of soft darker oval marks across the zone surface.
  - Updated harvest reset color to the new soil cap tone so post-harvest slots match the new surface palette.
- Compatibility / merge risk:
  - Low: visual material/decor update only; planting logic unchanged.
- Next handoff:
  - If needed, reduce furrow density by increasing `furrowStep` in `addPolygonPlantingZone`.

## 2026-04-21 (local, follow-up-28)
- Owner: AI
- Goal: Hide planting cells by default and show them only in explicit sow mode.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Planting cells are no longer always visible; default state is hidden.
  - Added a `播种模式` toggle button (plus `P` hotkey). In sow mode, cells appear as semi-transparent square blocks.
  - Plot click interactions now require sow mode to be enabled; hover hint text also reflects sow-mode state.
  - New custom zones apply current sow-mode visibility immediately after creation.
- Compatibility / merge risk:
  - Medium-low: interaction entry condition changed (needs sow mode on for plot clicking).
- Next handoff:
  - If watering/fertilizing should work outside sow mode, add dedicated plant-hit interaction raycast while keeping slot-visibility toggle.

## 2026-04-21 (local, follow-up-29)
- Owner: AI
- Goal: Fix sow-mode visibility bug where plot cells still appeared while mode was off.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Switched plot-cell visibility control to `cell.visible` (mode-gated), avoiding material-replacement side effects.
  - Updated sow-mode material application to support both `MeshStandardMaterial` and `MeshToonMaterial`.
  - Plot cells now initialize hidden and only show when sow mode is enabled.
- Compatibility / merge risk:
  - Low: visibility control hardening only.
- Next handoff:
  - If needed, separate "show grid" and "allow interaction" into two independent toggles.

## 2026-04-21 (local, follow-up-30)
- Owner: AI
- Goal: Remove dense “small block” ground artifacts and harden hidden-state behavior when sow mode is off.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Removed the dense procedural mini-patch/furrow overlay on planting surfaces (the source of “密密麻麻小块”).
  - Strengthened plot-cell visibility sync: `collectPlotCells()` now enforces `cell.visible = sowMode`.
- Compatibility / merge risk:
  - Low: visual cleanup + visibility synchronization only.
- Next handoff:
  - If a subtle soil texture is still desired, add a low-frequency decal (few large patches) instead of dense tiled marks.

## 2026-04-21 (local, follow-up-31)
- Owner: AI
- Goal: Keep flower care available outside sow mode, while keeping sow mode dedicated to planting/grid display, and make cell density slightly sparser.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Non-sow mode now only blocks interactions on empty cells; planted cells can still be clicked for watering/fertilizing/harvest.
  - Hover logic no longer hard-stops when sow mode is off, so planted-cell action hints remain available.
  - Planting slot generation spacing increased and max slot caps reduced for a slightly less dense layout.
- Compatibility / merge risk:
  - Low: interaction gating + subplot density parameter tuning.
- Next handoff:
  - If density still feels high, continue by raising `step` in `addPlantingSubplots` call sites before reducing gameplay max plot caps further.

## 2026-04-21 (local, follow-up-32)
- Owner: AI
- Goal: Align sow-mode behavior with latest requirement (hide plot blocks outside sow mode) and slightly increase subplot density from overly sparse state.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Outside sow mode, plot blocks are visually hidden again; sow mode still reveals semi-transparent planting blocks.
  - Planted flowers remain operable through existing cell interaction path while keeping block visuals hidden in normal mode.
  - Subplot density adjusted back up slightly by tightening step and raising caps from the previous sparse tuning.
- Compatibility / merge risk:
  - Low: visibility/material tuning + subplot generation parameter adjustment.
- Next handoff:
  - If you want even denser plots, lower `step` gradually by `0.01~0.02` before increasing `maxPlots`.

## 2026-04-21 (local, follow-up-33)
- Owner: AI
- Goal: Refine planting UI flow, replace mismatched white/accessory flower variants, and move operation tips into a help popup.
- Files changed:
  - src/showcase/main_big_garden.ts
  - src/modules/garden/types.ts
  - public/assets/icons/gardenia.svg
  - public/assets/icons/lavender.svg
- Behavior change:
  - Seed list is now hidden outside sow mode; entering sow mode reveals it, and the bottom-center mode button shifts upward above the list.
  - Bottom mode button is now a graphical play/sow toggle style instead of the old right-side text button.
  - On-screen operation hint HUDs are hidden and replaced by a `?` help button that opens a modal with controls/instructions.
  - White flower / accessory flower now use updated variant colors/icons and updated growth-shape profiles.
- Compatibility / merge risk:
  - Low-medium: UI layout/state flow adjustments + seed asset/config replacement.
- Next handoff:
  - If variant names also need to change in visible labels, adjust `SEED_CONFIG` label strings in `src/modules/garden/types.ts`.

## 2026-04-21 (local, follow-up-34)
- Owner: AI
- Goal: Correct sow-entry wording/icon flow, fix white/accessory flower naming+icon reliability, and fully move operation hints into help popup.
- Files changed:
  - src/showcase/main_big_garden.ts
  - src/modules/garden/types.ts
- Behavior change:
  - Bottom center entry now uses sow wording (enter/exit sow mode), no longer “play mode”.
  - White flower / accessory flower display names changed to `栀子花` and `薰衣草`.
  - Added icon fallback handling for seed-dock and shop list image load failures.
  - Removed the standalone operation HUD block from scene view and kept controls info in the `?` help modal.
- Compatibility / merge risk:
  - Low: UI wording/visibility and asset fallback hardening.
- Next handoff:
  - If needed, replace fallback icons with new dedicated backups rather than legacy icon paths.

## 2026-04-21 (local, follow-up-35)
- Owner: AI
- Goal: Align white/accessory flower icon style with the rest and clear residual left-top text-like hint feel.
- Files changed:
  - src/modules/garden/types.ts
  - src/showcase/main_big_garden.ts
- Behavior change:
  - White flower and accessory flower icon paths switched to the same flat icon style set used by other flowers.
  - Left-top quick status now shows seed count only (number), removing label-like text under/near gold display.
- Compatibility / merge risk:
  - Low: display text/icon mapping only.
- Next handoff:
  - If needed, also remove unused `gardenia.svg`/`lavender.svg` assets from `public/assets/icons`.

## 2026-04-21 (local, follow-up-36)
- Owner: AI
- Goal: Move camera-operation text fully into help popup and remove remaining always-on hint under top-left status.
- Files changed:
  - src/showcase/main_big_garden.ts
  - src/modules/ui/UiModuleV2.ts
- Behavior change:
  - Added `鼠标左键拖动旋转，滚轮缩放，右键平移` to the `?` help popup in big garden scene.
  - Removed the persistent `操作提示` line from `UiModuleV2` quick panel (this was the leftover text under gold/status).
- Compatibility / merge risk:
  - Low: text/UI visibility only.
- Next handoff:
  - If unified UX is required, keep all control tips only in help popup and avoid re-adding always-on hint lines in module panels.

## 2026-04-21 (local, follow-up-37)
- Owner: AI
- Goal: Remove the remaining top-left persistent camera hint shown in `garden-scene.html`.
- Files changed:
  - garden-scene.html
- Behavior change:
  - Replaced `garden-scene.html` with a clean shell page (only app container + scene script), removing the old `.hud` hint banner entirely.
- Compatibility / merge risk:
  - Low: static page cleanup only.
- Next handoff:
  - Keep camera control guidance only in the `?` help popup inside the scene UI.

## 2026-04-21 (local, follow-up-38)
- Owner: AI
- Goal: Turn pergolas into plantable zones and enforce single-flower-type rule per pergola.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added elevated planting slots inside each rose pergola as valid `plotCell` targets.
  - Assigned each pergola a stable `rackId` and enforced planting lock: once a pergola has any planted flower, all other empty slots in that pergola only accept the same seed type.
  - Added rack-lock feedback text/toast when selected seed does not match current pergola lock.
- Compatibility / merge risk:
  - Medium-low: extends plot placement to pergola structures and adds seed gating on empty-slot planting path.
- Next handoff:
  - If needed, show pergola lock seed more explicitly in UI badges (e.g., tiny rack tag above pergola).

## 2026-04-21 (local, follow-up-39)
- Owner: AI
- Goal: Make pergola flowers fully player-planted only (empty rack by default), not pre-decorated.
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Removed built-in pergola hanging vines/roses so pergolas start empty.
  - Moved pergola planting slots onto pergola top beams (no planter/plot pads under the pergola).
  - Kept per-pergola single-seed lock and localized lock hint/toast in Chinese.
- Compatibility / merge risk:
  - Medium-low: pergola visuals simplified + planting slot positions moved from lower interior to top structure.
- Next handoff:
  - If planting interaction on top beams feels hard, slightly enlarge rack slot hitbox size while keeping them visually hidden outside sow mode.

## 2026-04-22 (local, follow-up-40)
- Owner: AI
- Goal: Re-implement rack planting interaction flow from records (sow mode proximity button + confirm-to-fill behavior).
- Files changed:
  - src/showcase/main_big_garden.ts
- Behavior change:
  - Added a proximity-based 3D action button on the rack in sow mode (`花架一键种满`), shown only when the camera/target is near and the rack is empty.
  - Clicking that button opens a confirmation dialog; confirming plants the current selected flower across the rack workflow.
  - In sow mode, direct clicks on rack body no longer trigger accidental action; sow action is routed through the rack button.
  - Existing rack-specific growth visuals remain independent from ground logic, with flower count/density increasing through growth/water/fertilize progression.
- Compatibility / merge risk:
  - Low: interaction flow upgrade on existing rack scene.
- Next handoff:
  - If needed, replace browser `confirm` with in-scene stylized confirm panel for consistent visual style.

## Template (Copy Below)
- Owner: AI / user tag
- Goal: 
- Files changed:
  - 
- Behavior change:
  - final shipped result only
- Compatibility / merge risk:
  - 
- Next handoff:
  -
