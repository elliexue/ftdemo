import { notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime } from '../garden/types';

const HELP_FERTILIZE_WAIT_SECONDS = 4.5;

export function tryHelpFriendCareV2(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage === 2 && plot.needsWater) {
    plot.needsWater = false;
    plot.stage = 3;
    plot.growProgress = 0;
    plot.needsFertilizer = true;
    plot.fertilizerCooldown = HELP_FERTILIZE_WAIT_SECONDS;
    plot.waterSaturation = Math.min(1, plot.waterSaturation + 0.45);
    plot.waterFxTime = 0.9;
    pushLog(`你帮邻居地块${plotIndex + 1}浇水了。`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '帮助成功：已浇水', kind: 'help' } }));
    }
    notifyGameState();
    return true;
  }
  if (plot.stage === 3 && plot.needsFertilizer && plot.fertilizerCooldown <= 0) {
    plot.needsFertilizer = false;
    plot.fertilizerCooldown = 0;
    plot.stage = 4;
    plot.growProgress = 0;
    plot.fertilizerFxTime = 1.1;
    pushLog(`你帮邻居地块${plotIndex + 1}施肥了，花朵已成熟。`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '帮助成功：已施肥成熟', kind: 'help' } }));
    }
    notifyGameState();
    return true;
  }
  return false;
}

