import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { PlotRuntime } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

function randInt(a: number, b: number): number {
  return a + Math.floor(Math.random() * (b - a + 1));
}

/**
 * 祝福玩法：只改本文件。
 * 生长期：加速 + 金币谢礼 + 小概率预埋稀有品相。
 * 盛花：金币谢礼 + 较高概率当场变异为稀有（花冠金色），已为稀有时额外金币。
 */

export function tryBlessFriendGrowingPlot(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage <= 0 || plot.stage >= 4) {
    pushLog('这块地没有可祝福的幼苗。');
    return false;
  }
  plot.blessBonus = Math.min(2.2, plot.blessBonus + 0.65);
  const gold = randInt(2, 7);
  gameState.gold += gold;
  let msg = `祝福了好友幼苗（地块 ${plotIndex + 1}），对方生长加速；你获得 ${gold} 金币谢礼。`;
  if (!plot.rareVariant && Math.random() < 0.12) {
    plot.rareVariant = true;
    msg += ' 花脉泛起微光，似乎能长成稀有品相！';
  }
  pushLog(msg);
  notifyGameState();
  return true;
}

export function tryBlessFriendBloomPlot(plot: PlotRuntime, plotIndex: number): boolean {
  if (plot.stage !== 4 || !plot.seedId) {
    pushLog('这里没有盛开的鲜花可祝福。');
    return false;
  }
  const label = SEED_CONFIG[plot.seedId].label;
  let gold = randInt(5, 14);
  if (plot.rareVariant) {
    gold += randInt(3, 8);
  }
  gameState.gold += gold;

  if (!plot.rareVariant && Math.random() < 0.22) {
    plot.rareVariant = true;
    pushLog(
      `为好友的${label}（地块 ${plotIndex + 1}）送上祝福！获得 ${gold} 金币；花朵异变为稀有金色品相！`,
    );
  } else if (plot.rareVariant) {
    pushLog(
      `为稀有的${label}（地块 ${plotIndex + 1}）加深祝福，获得 ${gold} 金币，花瓣流光溢彩。`,
    );
  } else {
    pushLog(`为好友的${label}（地块 ${plotIndex + 1}）送上祝福，获得 ${gold} 金币谢礼。`);
  }
  notifyGameState();
  return true;
}
