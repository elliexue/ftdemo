import { gameState, notifyGameState, type BouquetItem, type GameState, type GardenView } from './GameState';
import type { PlantStage, SeedId, WeatherId } from '../modules/garden/types';
import { SEED_IDS } from '../modules/garden/types';
import { initFriendGarden } from '../modules/social/socialMock';

const STORAGE_KEY = 'fthtml-yws-save-v1';
const PLOT_COUNT = 20;
const SAVE_DB_NAME = 'fthtml-save-db';
const SAVE_STORE_NAME = 'state';

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

function buildPersistedPayload(): PersistedV1 {
  return {
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
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

let saveDbPromise: Promise<IDBDatabase> | null = null;
let pendingIndexedDbPayload: PersistedV1 | null = null;
let indexedDbSaveInFlight = false;

function openSaveDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (saveDbPromise) return saveDbPromise;
  saveDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SAVE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SAVE_STORE_NAME)) {
        db.createObjectStore(SAVE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open save database'));
  }).catch((error) => {
    saveDbPromise = null;
    throw error;
  });
  return saveDbPromise ?? Promise.reject(new Error('Save database promise unavailable'));
}

function savePayloadToIndexedDb(payload: PersistedV1): Promise<void> {
  return openSaveDb().then((db) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE_NAME, 'readwrite');
    tx.objectStore(SAVE_STORE_NAME).put(payload, STORAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to write save payload'));
    tx.onabort = () => reject(tx.error ?? new Error('Save transaction aborted'));
  }));
}

function readPayloadFromIndexedDb(): Promise<PersistedV1 | null> {
  return openSaveDb().then((db) => new Promise<PersistedV1 | null>((resolve, reject) => {
    const tx = db.transaction(SAVE_STORE_NAME, 'readonly');
    const request = tx.objectStore(SAVE_STORE_NAME).get(STORAGE_KEY);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result && typeof result === 'object' ? (result as PersistedV1) : null);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to read save payload'));
    tx.onabort = () => reject(tx.error ?? new Error('Read transaction aborted'));
  }));
}

function queueIndexedDbSave(payload: PersistedV1): void {
  if (!canUseIndexedDb()) return;
  pendingIndexedDbPayload = payload;
  if (indexedDbSaveInFlight) return;
  indexedDbSaveInFlight = true;
  void flushIndexedDbSaveQueue();
}

async function flushIndexedDbSaveQueue(): Promise<void> {
  try {
    while (pendingIndexedDbPayload) {
      const payload = pendingIndexedDbPayload;
      pendingIndexedDbPayload = null;
      await savePayloadToIndexedDb(payload);
    }
  } catch {
    /* fall back to localStorage sync save on unload */
  } finally {
    indexedDbSaveInFlight = false;
    if (pendingIndexedDbPayload) queueIndexedDbSave(pendingIndexedDbPayload);
  }
}

function applyPersistedData(data: unknown): boolean {
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
  gameState.logLines = (logLines.length > 0 ? logLines : ['Loaded local save.']).slice(0, 12);
  return true;
}

export function saveGameNow(): void {
  const payload = buildPersistedPayload();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore storage failures */
  }
  queueIndexedDbSave(payload);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let idleSaveHandle: number | null = null;

export function scheduleSaveGame(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  if (idleSaveHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleSaveHandle);
    idleSaveHandle = null;
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const save = (): void => {
      queueIndexedDbSave(buildPersistedPayload());
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleSaveHandle = (window as Window & {
        requestIdleCallback: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
      }).requestIdleCallback(
        () => {
          idleSaveHandle = null;
          save();
        },
        { timeout: 1200 },
      );
      return;
    }
    save();
  }, 900);
}

export function loadGameFromLocal(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return applyPersistedData(JSON.parse(raw) as unknown);
  } catch {
    return false;
  }
}

export async function loadGame(): Promise<boolean> {
  if (loadGameFromLocal()) return true;
  if (!canUseIndexedDb()) return false;
  try {
    const payload = await readPayloadFromIndexedDb();
    if (!payload) return false;
    const loaded = applyPersistedData(payload);
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        /* ignore storage failures */
      }
    }
    return loaded;
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
  gameState.logLines = ['Local save cleared. Default state restored.'];
  initFriendGarden();
  notifyGameState();
}
