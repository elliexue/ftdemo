
import { notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime } from './types';

/** 每次浇水增加的生长进度（可按玩法改大改小） */
const WATER_PROGRESS_BUMP = 0.18;

/** 浇水增加的水分饱和度上限 1 */
const WATER_SATURATION_BUMP = 0.45;
const FERTILIZE_WAIT_SECONDS = 6.5;

/**
 * 浇水玩法：只改本文件即可调整浇水效果（数值、条件、日志）。
 */
export function tryWaterPlot(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage === 0 || plot.stage >= 4) return false;
  if (plot.stage === 2 && plot.needsWater) {
    plot.needsWater = false;
    plot.growProgress = 0;
    plot.stage = 3;
    plot.needsFertilizer = true;
    plot.fertilizerCooldown = FERTILIZE_WAIT_SECONDS;
    plot.waterSaturation = Math.min(1, plot.waterSaturation + WATER_SATURATION_BUMP);
    plot.waterFxTime = 0.9;
    pushLog(
      `地块 ${plotIndex + 1}：浇水完成，立即进入第三阶段。等待 ${FERTILIZE_WAIT_SECONDS} 秒后可施肥。`,
    );
    notifyGameState();
    return true;
  }

  plot.waterSaturation = Math.min(1, plot.waterSaturation + WATER_SATURATION_BUMP);
  plot.growProgress = Math.min(1, plot.growProgress + WATER_PROGRESS_BUMP);
  plot.waterFxTime = 0.7;
  pushLog(`地块 ${plotIndex + 1}：浇水成功。`);
  notifyGameState();
  return true;
}
