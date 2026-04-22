
import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime, SeedId } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

/** 左键偷花成功概率（失败仍会激怒护院），HUD 与文档可引用 */
export const STEAL_SUCCESS_RATE = 0.58;

/**
 * 偷花玩法：只改成功率、惩罚、奖励，动本文件。
 */
export function tryStealFriendFlower(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 4 || !plot.seedId) {
    pushLog('这朵花还不能偷。');
    return false;
  }
  if (Math.random() > STEAL_SUCCESS_RATE) {
    pushLog('偷花失败！好友的护院精灵发现了你。');
    return true;
  }
  const quality = Math.max(2, Math.min(5, Math.round(3 + Math.random() * 2)));
  const stolen: { seedId: SeedId; quality: number; rare?: boolean } = {
    seedId: plot.seedId,
    quality,
  };
  if (plot.rareVariant) stolen.rare = true;
  gameState.flowers.push(stolen);
  pushLog(
    `从好友地块 ${plotIndex + 1} 偷到 ${SEED_CONFIG[plot.seedId].label}（品质 ${quality}）！`,
  );
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
