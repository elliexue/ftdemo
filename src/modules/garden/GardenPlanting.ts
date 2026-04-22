
import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime, SeedId } from './types';

/**
 * 种植玩法：改播种条件、消耗、提示语，只动本文件。
 */
export function tryPlantSeed(plot: PlotRuntime, plotIndex: number, seed: SeedId): boolean {
  if (plot.stage !== 0) return false;
  if (gameState.seeds[seed] <= 0) {
    pushLog(`${seed} 种子不足，先去商店购买。`);
    return false;
  }
  gameState.seeds[seed] -= 1;
  plot.seedId = seed;
  plot.stage = 1;
  plot.growProgress = 0;
  plot.waterSaturation = 0;
  plot.needsWater = false;
  plot.needsFertilizer = false;
  plot.fertilizerCooldown = 0;
  plot.waterFxTime = 0;
  plot.fertilizerFxTime = 0;
  plot.giantBloom = false;
  plot.blessBonus = 0;
  delete plot.rareVariant;
  pushLog(`地块 ${plotIndex + 1}：已种下种子。`);
  notifyGameState();
  return true;
}
