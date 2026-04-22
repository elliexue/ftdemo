import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime, SeedId } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

export const STEAL_SUCCESS_RATE_V2 = 0.58;

export function tryStealFriendFlowerV2(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 4 || !plot.seedId) {
    pushLog('这朵花还不能偷取。');
    return false;
  }
  if (Math.random() > STEAL_SUCCESS_RATE_V2) {
    pushLog('偷取失败，被邻居发现了。');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '偷取失败', kind: 'steal' } }));
    }
    return true;
  }
  const quality = Math.max(2, Math.min(5, Math.round(3 + Math.random() * 2)));
  const stolen: { seedId: SeedId; quality: number; rare?: boolean } = { seedId: plot.seedId, quality };
  if (plot.rareVariant) stolen.rare = true;
  gameState.flowers.push(stolen);
  pushLog(`偷取成功：从邻居地块${plotIndex + 1}获得 ${SEED_CONFIG[plot.seedId].label}（品质${quality}）。`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: `偷取成功：${SEED_CONFIG[plot.seedId].label}`, kind: 'steal' } }));
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

