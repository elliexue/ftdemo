import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime, SeedId } from './types';
import { SEED_CONFIG } from './types';

export function tryHarvestPlotV2(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 4 || !plot.seedId) return false;
  const base = SEED_CONFIG[plot.seedId].sellBase;
  const quality = Math.max(1, Math.min(5, Math.round(base / 4 + Math.random() * 3)));
  const entry: { seedId: SeedId; quality: number; rare?: boolean } = { seedId: plot.seedId, quality };
  if (plot.rareVariant) entry.rare = true;
  gameState.flowers.push(entry);
  pushLog(`地块 ${plotIndex + 1}：收获 ${SEED_CONFIG[plot.seedId].label}（品质 ${quality}）`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: `收花成功：${SEED_CONFIG[plot.seedId].label}`, kind: 'harvest' } }));
  }
  plot.seedId = null;
  plot.stage = 0;
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
  notifyGameState();
  return true;
}

