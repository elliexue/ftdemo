
import type { PlotRuntime, SeedId, WeatherId } from '../modules/garden/types';

export type GardenView = 'self' | 'friend';
export interface BouquetItem {
  id: string;
  label: string;
  seeds: SeedId[];
  value: number;
}

export interface GameState {
  gold: number;
  seeds: Record<SeedId, number>;
  flowers: { seedId: SeedId; quality: number; rare?: boolean }[];
  bouquets: BouquetItem[];
  plots: PlotRuntime[];
  friendPlots: PlotRuntime[];
  viewGarden: GardenView;
  selectedSeed: SeedId;
  selectedArrangementSeed: SeedId | null;
  arrangementSlots: (SeedId | null)[];
  logLines: string[];
  weather: WeatherId;
  weatherTimer: number;
  /** 邻园主人追击速度倍率（数值玩法可调） */
  friendChaserSpeedScale: number;
}

const listeners = new Set<() => void>();

const defaultSeedStock = (): Record<SeedId, number> => ({
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
});

const emptyPlot = (): PlotRuntime => ({
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
});

export const gameState: GameState = {
  gold: 30,
  seeds: defaultSeedStock(),
  flowers: [],
  bouquets: [],
  plots: Array.from({ length: 20 }, () => emptyPlot()),
  friendPlots: [],
  viewGarden: 'self',
  selectedSeed: 'tulip',
  selectedArrangementSeed: null,
  arrangementSlots: [null, null, null],
  logLines: ['欢迎来到音舞小镇：点击地块种花，未成熟时点击浇水，成熟后再点收获。'],
  weather: 'sunny',
  weatherTimer: 0,
  friendChaserSpeedScale: 0.88,
};

export function subscribeGameState(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyGameState(): void {
  for (const fn of listeners) fn();
}

export function pushLog(message: string): void {
  gameState.logLines.unshift(message);
  gameState.logLines = gameState.logLines.slice(0, 12);
  notifyGameState();
}

export function getActivePlots(): PlotRuntime[] {
  return gameState.viewGarden === 'friend' ? gameState.friendPlots : gameState.plots;
}
