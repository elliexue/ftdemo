
import { notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime } from './types';

/**
 * 施肥玩法：第三阶段点击施肥后直接进入第四阶段。
 */
const GIANT_BLOOM_CHANCE = 0.28;

export function tryFertilizePlot(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 3 || !plot.needsFertilizer) return false;
  if (plot.fertilizerCooldown > 0) {
    pushLog(`地块 ${plotIndex + 1}：还需等待 ${plot.fertilizerCooldown.toFixed(1)} 秒才能施肥。`);
    return false;
  }
  plot.needsFertilizer = false;
  plot.fertilizerCooldown = 0;
  plot.stage = 4;
  plot.growProgress = 0;
  plot.fertilizerFxTime = 1.1;
  plot.giantBloom = Math.random() < GIANT_BLOOM_CHANCE;
  pushLog(
    plot.giantBloom
      ? `地块 ${plotIndex + 1}：施肥成功，触发超大花变异！`
      : `地块 ${plotIndex + 1}：施肥成功，立即成熟可收获。`,
  );
  notifyGameState();
  return true;
}
