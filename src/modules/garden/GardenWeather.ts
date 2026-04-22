import { gameState, pushLog } from '../../game/GameState';
import type { SeedId, WeatherId } from './types';
import { SEED_CONFIG, WEATHER_CONFIG, WEATHER_ORDER } from './types';

/** 天气轮替周期（秒），到时切到下一种 */
const WEATHER_CYCLE_SEC = 36;

/**
 * 全局天气 + 各花适性倍率。改节奏/数值只动本文件与 types 里 SEED_CONFIG。
 */
export function tickGardenWeather(delta: number): void {
  gameState.weatherTimer += delta;
  if (gameState.weatherTimer < WEATHER_CYCLE_SEC) return;
  gameState.weatherTimer = 0;
  const i = WEATHER_ORDER.indexOf(gameState.weather);
  const next = WEATHER_ORDER[(i + 1) % WEATHER_ORDER.length]!;
  gameState.weather = next;
  const w = WEATHER_CONFIG[next];
  pushLog(`天气变化：${w.icon} ${w.label}（${w.hint}适性花朵加速）`);
}

export function getPlantWeatherMultiplier(seedId: SeedId | null): number {
  if (!seedId) return 1;
  const c = SEED_CONFIG[seedId];
  return gameState.weather === c.preferredWeather ? c.weatherGrowMul : c.weatherGrowMismatchMul;
}

export function weatherLabel(w: WeatherId): string {
  const c = WEATHER_CONFIG[w];
  return `${c.icon} ${c.label}`;
}
