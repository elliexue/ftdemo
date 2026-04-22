
import { notifyGameState } from '../../game/GameState';
import { getSpiritGrowthMultiplier } from './GardenSpiritBuff';
import { getPlantWeatherMultiplier } from './GardenWeather';
import type { PlotRuntime } from './types';

const BASE_GROW_PER_SEC = 0.06;

/**
 * 生长时间轴：改阶段推进速度、水分影响，只动本文件（天气倍率在 GardenWeather.ts）。
 */
export function tickGardenGrowth(delta: number, plots: PlotRuntime[]): void {
  let changed = false;
  const spirit = getSpiritGrowthMultiplier();

  for (const p of plots) {
    p.waterFxTime = Math.max(0, p.waterFxTime - delta);
    p.fertilizerFxTime = Math.max(0, p.fertilizerFxTime - delta);
    p.fertilizerCooldown = Math.max(0, p.fertilizerCooldown - delta);

    if (p.stage <= 0 || p.stage >= 4) continue;
    if (p.stage !== 1) continue;
    const waterBoost = 1 + 0.55 * p.waterSaturation;
    const blessBoost = 1 + p.blessBonus;
    const weatherMul = getPlantWeatherMultiplier(p.seedId);
    const rate = BASE_GROW_PER_SEC * weatherMul * spirit * waterBoost * blessBoost;
    p.growProgress += delta * rate;
    p.waterSaturation *= Math.exp(-delta * 0.08);
    p.blessBonus *= Math.exp(-delta * 0.03);

    if (p.growProgress >= 1) {
      p.growProgress = 0;
      p.stage = (p.stage + 1) as PlotRuntime['stage'];
      p.needsWater = p.stage === 2;
      p.needsFertilizer = false;
      p.fertilizerCooldown = 0;
      p.waterSaturation = 0;
      changed = true;
    }
  }

  if (changed) notifyGameState();
}
