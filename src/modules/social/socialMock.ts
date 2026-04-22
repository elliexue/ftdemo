
import { gameState, notifyGameState } from '../../game/GameState';
import type { PlotRuntime, SeedId } from '../garden/types';

/**
 * 好友园地模拟数据。改「好友田里初始有什么」只动本文件。
 */
export function initFriendGarden(): void {
  const mk = (seedId: SeedId, stage: PlotRuntime['stage'], grow: number): PlotRuntime => {
    const p: PlotRuntime = {
      seedId,
      stage,
      growProgress: grow,
      waterSaturation: 0.2,
      needsWater: stage === 2,
      needsFertilizer: stage === 3,
      fertilizerCooldown: 0,
      waterFxTime: 0,
      fertilizerFxTime: 0,
      giantBloom: false,
      blessBonus: 0,
    };
    if (stage === 4 && Math.random() < 0.35) p.rareVariant = true;
    return p;
  };

  gameState.friendPlots = [
    mk('tulip', 4, 0),
    mk('rose', 2, 0.4),
    mk('tulip', 1, 0),
    mk('rose', 3, 0.6),
  ];
  notifyGameState();
}
