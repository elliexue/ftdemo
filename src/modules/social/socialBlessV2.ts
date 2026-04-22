import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

function randInt(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

export function tryBlessFriendGrowingPlotV2(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage <= 0 || plot.stage >= 4) {
    pushLog('这块地没有可祝福的花。');
    return false;
  }
  plot.blessBonus = Math.min(2.2, plot.blessBonus + 0.65);
  const gold = randInt(2, 7);
  gameState.gold += gold;
  pushLog(`你祝福了邻居地块${plotIndex + 1}，生长速度提升，获得 ${gold} 金币感谢。`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: `祝福成功：地块${plotIndex + 1}加速生长`, kind: 'bless' } }));
  }
  notifyGameState();
  return true;
}

export function tryBlessFriendBloomPlotV2(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 4 || !plot.seedId) {
    pushLog('这里没有可祝福的成熟花。');
    return false;
  }
  if (plot.giantBloom) {
    pushLog('这朵花已经是超大花，不能再次祝福。');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '该花已是超大花，无法再次祝福', kind: 'bless' } }));
    }
    return false;
  }
  const label = SEED_CONFIG[plot.seedId].label;
  const gold = randInt(5, 14);
  gameState.gold += gold;
  plot.giantBloom = true;
  pushLog(`祝福成功：邻居的${label}（地块${plotIndex + 1}）变成了超大花！你获得 ${gold} 金币。`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: `祝福成功：${label}变成超大花`, kind: 'bless' } }));
  }
  notifyGameState();
  return true;
}
