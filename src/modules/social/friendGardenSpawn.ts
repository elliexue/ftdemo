import { gameState, notifyGameState } from '../../game/GameState';
import { SEED_IDS, type SeedId } from '../garden/types';

let acc = 0;
/** 每隔约多少秒尝试在空地块补种（邻人花园） */
const SPAWN_INTERVAL_SEC = 24;

/**
 * 邻人花园空地块随机补种，成熟后可偷；与数值逻辑分离便于改间隔。
 */
export function tickFriendGardenRegrowth(delta: number): void {
  acc += delta;
  if (acc < SPAWN_INTERVAL_SEC) return;
  acc = 0;

  const emptyIdx: number[] = [];
  for (let i = 0; i < gameState.friendPlots.length; i++) {
    if (gameState.friendPlots[i]!.stage === 0) emptyIdx.push(i);
  }
  if (emptyIdx.length === 0) return;

  const i = emptyIdx[Math.floor(Math.random() * emptyIdx.length)]!;
  const seed: SeedId = SEED_IDS[Math.floor(Math.random() * SEED_IDS.length)]!;
  gameState.friendPlots[i] = {
    seedId: seed,
    stage: 1,
    growProgress: 0,
    waterSaturation: 0.38,
    needsWater: false,
    needsFertilizer: false,
    fertilizerCooldown: 0,
    waterFxTime: 0,
    fertilizerFxTime: 0,
    giantBloom: false,
    blessBonus: 0,
  };
  notifyGameState();
}
