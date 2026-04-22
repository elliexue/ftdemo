import { gameState, notifyGameState, type BouquetItem, type GameState, type GardenView } from './GameState';
import type { PlantStage, SeedId, WeatherId } from '../modules/garden/types';
import { SEED_IDS } from '../modules/garden/types';
import { initFriendGarden } from '../modules/social/socialMock';

const STORAGE_KEY = 'fthtml-yws-save-v1';
const PLOT_COUNT = 20;

interface PersistedV1 {
  v: 1;
  gold: number;
  seeds: Record<SeedId, number>;
  flowers: { seedId: SeedId; quality: number; rare?: boolean }[];
  bouquets?: BouquetItem[];
  plots: GameState['plots'];
  selectedSeed: SeedId;
  selectedArrangementSeed?: SeedId | null;
  arrangementSlots: (SeedId | null)[];
  viewGarden: GardenView;
  friendChaserSpeedScale?: number;
  weather?: WeatherId;
  weatherTimer?: number;
  logLines: string[];
}

function emptySeedsRecord(): Record<SeedId, number> {
  return Object.fromEntries(SEED_IDS.map((id) => [id, 0])) as Record<SeedId, number>;
}

function isSeedId(x: unknown): x is SeedId {
  return typeof x === 'string' && SEED_IDS.includes(x as SeedId);
}

function isWeatherId(x: unknown): x is WeatherId {
  return x === 'sunny' || x === 'cloudy' || x === 'rain' || x === 'breeze';
}

function isPlantStage(x: unknown): x is PlantStage {
  return typeof x === 'number' && x >= 0 && x <= 4 && Number.isInteger(x);
}

function defaultPlot(): GameState['plots'][0] {
  return {
    seedId: null,
    stage: 0,
    growProgress: 0,
    waterSaturation: 0,
    needsWater: false,
    needsFertilizer: false,
    fertilizerCooldown: 0,
    waterFxTime: 0,
    fertilizerFxTime: 0,
    giantBloom: false,
    blessBonus: 0,
  };
}

function parsePlot(raw: unknown): GameState['plots'][0] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const seedRaw = o.seedId;
  const seedId = seedRaw === null ? null : isSeedId(seedRaw) ? seedRaw : null;
  if (seedRaw !== null && seedId === null) return null;
  if (!isPlantStage(o.stage)) return null;
  const stage = o.stage as PlantStage;
  const growProgress = typeof o.growProgress === 'number' ? o.growProgress : 0;
  const waterSaturation = typeof o.waterSaturation === 'number' ? o.waterSaturation : 0;
  const needsWater = typeof o.needsWater === 'boolean' ? o.needsWater : stage === 2;
  const needsFertilizer = typeof o.needsFertilizer === 'boolean' ? o.needsFertilizer : stage === 3;
  const fertilizerCooldown = typeof o.fertilizerCooldown === 'number' ? o.fertilizerCooldown : 0;
  const waterFxTime = typeof o.waterFxTime === 'number' ? o.waterFxTime : 0;
  const fertilizerFxTime = typeof o.fertilizerFxTime === 'number' ? o.fertilizerFxTime : 0;
  const giantBloom = o.giantBloom === true;
  const blessBonus = typeof o.blessBonus === 'number' ? o.blessBonus : 0;
  const rareVariant = o.rareVariant === true;
  return {
    seedId,
    stage,
    growProgress,
    waterSaturation,
    needsWater,
    needsFertilizer,
    fertilizerCooldown,
    waterFxTime,
    fertilizerFxTime,
    giantBloom,
    blessBonus,
    ...(rareVariant ? { rareVariant: true } : {}),
  };
}

export function saveGameNow(): void {
  try {
    const payload: PersistedV1 = {
      v: 1,
      gold: gameState.gold,
      seeds: { ...gameState.seeds },
      flowers: gameState.flowers.map((f) => ({ ...f })),
      bouquets: gameState.bouquets.map((b) => ({ ...b, seeds: [...b.seeds] })),
      plots: gameState.plots.map((p) => ({ ...p })),
      selectedSeed: gameState.selectedSeed,
      selectedArrangementSeed: gameState.selectedArrangementSeed,
      arrangementSlots: [...gameState.arrangementSlots],
      viewGarden: gameState.viewGarden,
      friendChaserSpeedScale: gameState.friendChaserSpeedScale,
      weather: gameState.weather,
      weatherTimer: gameState.weatherTimer,
      logLines: [...gameState.logLines],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* 隐私模式或配额满 */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSaveGame(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveGameNow();
  }, 400);
}

export function loadGameFromLocal(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return false;
    const o = data as Record<string, unknown>;
    if (o.v !== 1) return false;
    if (typeof o.gold !== 'number' || !Number.isFinite(o.gold)) return false;
    if (!o.seeds || typeof o.seeds !== 'object') return false;
    const seedsRaw = o.seeds as Record<string, unknown>;
    if (!Array.isArray(o.plots) || o.plots.length < 1) return false;
    const rawPlots = o.plots as unknown[];
    const plots: GameState['plots'] = [];
    for (let i = 0; i < PLOT_COUNT; i++) {
      const p = i < rawPlots.length ? parsePlot(rawPlots[i]) : null;
      plots.push(p ?? defaultPlot());
    }

    if (!Array.isArray(o.flowers)) return false;
    const flowers: { seedId: SeedId; quality: number; rare?: boolean }[] = [];
    for (const f of o.flowers) {
      if (!f || typeof f !== 'object') return false;
      const fr = f as Record<string, unknown>;
      if (!isSeedId(fr.seedId)) return false;
      if (typeof fr.quality !== 'number') return false;
      flowers.push(
        fr.rare === true
          ? { seedId: fr.seedId, quality: fr.quality, rare: true }
          : { seedId: fr.seedId, quality: fr.quality },
      );
    }
    const bouquets: BouquetItem[] = Array.isArray(o.bouquets)
      ? o.bouquets
          .map((b) => {
            if (!b || typeof b !== 'object') return null;
            const br = b as Record<string, unknown>;
            if (typeof br.id !== 'string' || typeof br.label !== 'string' || typeof br.value !== 'number') {
              return null;
            }
            if (!Array.isArray(br.seeds)) return null;
            const seeds = br.seeds.filter((s): s is SeedId => isSeedId(s));
            if (seeds.length !== 3) return null;
            return { id: br.id, label: br.label, value: Math.max(1, Math.floor(br.value)), seeds };
          })
          .filter((x): x is BouquetItem => x !== null)
      : [];
    if (!Array.isArray(o.arrangementSlots) || o.arrangementSlots.length !== 3) return false;
    const slots: (SeedId | null)[] = [];
    for (const s of o.arrangementSlots) {
      if (s === null) slots.push(null);
      else if (isSeedId(s)) slots.push(s);
      else return false;
    }
    const logLines = Array.isArray(o.logLines)
      ? o.logLines.filter((x): x is string => typeof x === 'string').slice(0, 20)
      : [];

    gameState.gold = Math.max(0, Math.floor(o.gold));
    const mergedSeeds = emptySeedsRecord();
    for (const id of SEED_IDS) {
      const v = seedsRaw[id];
      mergedSeeds[id] = typeof v === 'number' ? Math.max(0, Math.floor(v)) : 0;
    }
    gameState.seeds = mergedSeeds;
    gameState.plots = plots;
    gameState.flowers = flowers;
    gameState.bouquets = bouquets;
    gameState.selectedSeed = isSeedId(o.selectedSeed) ? o.selectedSeed : 'tulip';
    gameState.selectedArrangementSeed = isSeedId(o.selectedArrangementSeed) ? o.selectedArrangementSeed : null;
    gameState.arrangementSlots = slots;
    gameState.viewGarden = 'self';
    const ch = o.friendChaserSpeedScale;
    gameState.friendChaserSpeedScale =
      typeof ch === 'number' && Number.isFinite(ch) ? Math.min(1.35, Math.max(0.5, ch)) : 0.88;
    gameState.weather = isWeatherId(o.weather) ? o.weather : 'sunny';
    const wt = o.weatherTimer;
    gameState.weatherTimer =
      typeof wt === 'number' && Number.isFinite(wt) ? Math.max(0, Math.min(wt, 3600)) : 0;
    gameState.logLines = (logLines.length > 0 ? logLines : ['已加载本地存档。']).slice(0, 12);

    return true;
  } catch {
    return false;
  }
}

export function clearLocalSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function defaultSeedStock(): Record<SeedId, number> {
  return {
    tulip: 10,
    rose: 10,
    sunflower: 10,
    hibiscus: 10,
    cherry_blossom: 10,
    daisy: 10,
    lotus: 10,
    hyacinth: 10,
    white_flower: 10,
    rosette: 10,
  };
}

/** 恢复默认开局并刷新界面（好友田仍由 GardenModule 重新 mock） */
export function resetGameToDefault(): void {
  clearLocalSave();
  gameState.gold = 30;
  gameState.seeds = defaultSeedStock();
  gameState.flowers = [];
  gameState.bouquets = [];
  gameState.plots = Array.from({ length: PLOT_COUNT }, () => defaultPlot());
  gameState.viewGarden = 'self';
  gameState.selectedSeed = 'tulip';
  gameState.selectedArrangementSeed = null;
  gameState.arrangementSlots = [null, null, null];
  gameState.friendChaserSpeedScale = 0.88;
  gameState.weather = 'sunny';
  gameState.weatherTimer = 0;
  gameState.logLines = ['已清除存档，恢复默认开局。'];
  initFriendGarden();
  notifyGameState();
}
