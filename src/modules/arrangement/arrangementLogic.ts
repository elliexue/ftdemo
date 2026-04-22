import { gameState, notifyGameState, pushLog } from '../../game/GameState';
import type { SeedId } from '../garden/types';
import { SEED_CONFIG } from '../garden/types';

/**
 * 插花 / 展示评分。改合成规则、奖励，只动本文件。
 */
export function takeFlowerFromInventory(seedId: SeedId): boolean {
  const idx = gameState.flowers.findIndex((f) => f.seedId === seedId);
  if (idx < 0) {
    pushLog('背包里没有这种花。');
    return false;
  }
  const emptySlot = gameState.arrangementSlots.findIndex((s) => s === null);
  if (emptySlot < 0) {
    pushLog('插花槽已满（3 格），先完成作品或清空。');
    return false;
  }
  gameState.flowers.splice(idx, 1);
  gameState.arrangementSlots[emptySlot] = seedId;
  notifyGameState();
  return true;
}

export function clearArrangementSlots(): void {
  gameState.arrangementSlots = [null, null, null];
  gameState.selectedArrangementSeed = null;
  notifyGameState();
}

export function finishArrangementCraft(): boolean {
  const slots = gameState.arrangementSlots.filter((s): s is SeedId => s !== null);
  if (slots.length < 3) {
    pushLog('需要先放满 3 朵花，才能启动插花合成。');
    return false;
  }
  const sorted = [...slots].sort();
  const label = sorted.map((s) => SEED_CONFIG[s].label).join(' + ');
  const unique = new Set(sorted).size;
  const value = Math.round(sorted.reduce((sum, s) => sum + SEED_CONFIG[s].sellBase, 0) * 1.35 + unique * 8);
  const bouquet = {
    id: `bouquet_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    label: `${label} 花束`,
    seeds: sorted,
    value,
  };
  gameState.bouquets.push(bouquet);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:arrangement-finish', { detail: { seeds: sorted } }));
    window.dispatchEvent(
      new CustomEvent('game:toast', {
        detail: { message: `插花成功：${bouquet.label}`, kind: 'arrangement' },
      }),
    );
  }
  pushLog(`完成插花合成：${bouquet.label}（价值 ${value} 金币），已放入花束背包。`);
  window.setTimeout(() => clearArrangementSlots(), 1600);
  notifyGameState();
  return true;
}

export function finishArrangement(): void {
  const slots = gameState.arrangementSlots.filter((s): s is SeedId => s !== null);
  if (slots.length === 0) {
    pushLog('槽位是空的，先放入花朵。');
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('game:arrangement-finish'));
  }
  const unique = new Set(slots);
  const diversity = unique.size;
  const prestige = diversity * 15 + slots.length * 10;
  const bonusGold = diversity * 6 + slots.length * 4;
  gameState.gold += bonusGold;
  pushLog(`完成插花作品！声望 +${prestige}，额外金币 +${bonusGold}。`);
  /** 延迟清空槽位，让庆祝粒子能读到展台位置，且小动物在台上多留一瞬 */
  window.setTimeout(() => clearArrangementSlots(), 780);
}

export function arrangementPreviewLabel(): string {
  return gameState.arrangementSlots
    .map((s, i) => (s ? `${i + 1}.${SEED_CONFIG[s].label}` : `${i + 1}.空`))
    .join(' · ');
}
