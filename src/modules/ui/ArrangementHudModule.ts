import * as THREE from 'three';
import { gameState, notifyGameState, subscribeGameState } from '../../game/GameState';
import {
  arrangementPreviewLabelV2 as arrangementPreviewLabel,
  clearArrangementSlotsV2 as clearArrangementSlots,
  finishArrangementCraftV2 as finishArrangementCraft,
} from '../arrangement/arrangementLogicV2';
import { ARRANGEMENT_HUD_PROXIMITY, ARRANGEMENT_STATION_CENTER_XZ } from '../arrangement/arrangementStation';
import { SEED_CONFIG, type SeedId } from '../garden/types';
import type { IModule } from '../IModule';

/**
 * 走近插花区域时显示的独立插花 HUD（与主 HUD 分离）。
 */
export class ArrangementHudModule implements IModule {
  readonly name = 'ArrangementHudModule';

  private root: HTMLDivElement | null = null;
  private scene: THREE.Scene | null = null;
  private uiClickBound = false;
  private nearStation = false;

  init(scene: THREE.Scene): void {
    this.scene = scene;
    this.mount();
    subscribeGameState(() => this.refresh());
    this.wireButtons();
    this.refresh();
  }

  update(_delta: number): void {
    const player = this.scene?.getObjectByName('Player');
    if (!player) return;
    const dx = player.position.x - ARRANGEMENT_STATION_CENTER_XZ.x;
    const dz = player.position.z - ARRANGEMENT_STATION_CENTER_XZ.z;
    const near = Math.hypot(dx, dz) < ARRANGEMENT_HUD_PROXIMITY;
    if (near !== this.nearStation) {
      this.nearStation = near;
      this.refreshVisibility();
    }
  }

  private mount(): void {
    const el = document.createElement('div');
    el.id = 'arrangement-hud';
    el.innerHTML = `
      <style>
        #arrangement-hud { position: fixed; right: 12px; bottom: 92px; z-index: 84; width: min(320px, calc(100vw - 24px)); font: 13px/1.45 system-ui, sans-serif; color: #e6edf3; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .2s ease, visibility .2s; }
        #arrangement-hud.visible { opacity: 1; visibility: visible; pointer-events: auto; }
        #arrangement-hud .panel { background: rgba(18, 24, 34, 0.92); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 10px 12px; box-shadow: 0 8px 22px rgba(0,0,0,.35); }
        #arrangement-hud h3 { margin: 0 0 8px; font-size: 14px; color: #9ec5ff; }
        #arrangement-hud .hint { font-size: 12px; opacity: .82; margin: 4px 0; }
        #arrangement-hud .arrange-picker { display: flex; flex-wrap: wrap; gap: 6px; }
        #arrangement-hud .arrange-card { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 7px; border: 1px solid rgba(255,255,255,.12); background: #1f2630; color: #e6edf3; cursor: pointer; }
        #arrangement-hud .arrange-card.active { border-color: #6bb9ff; background: #244261; }
        #arrangement-hud .arrange-card img { width: 18px; height: 18px; object-fit: contain; }
        #arrangement-hud button { margin: 4px 6px 0 0; padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); background: #1f2630; color: #e6edf3; cursor: pointer; }
      </style>
      <div class="panel" id="arrangement-hud-body"></div>
    `;
    document.body.appendChild(el);
    this.root = el;
  }

  private wireButtons(): void {
    if (this.uiClickBound || !this.root) return;
    this.uiClickBound = true;
    this.root.addEventListener('pointerdown', (e) => {
      const actionTarget = (e.target as Element | null)?.closest('[data-action]') as HTMLElement | null;
      if (!actionTarget) return;
      const action = actionTarget.dataset.action;
      const seed = actionTarget.dataset.seed as SeedId | undefined;
      e.preventDefault();
      e.stopPropagation();
      if (action === 'pick-arrange-flower' && seed) {
        gameState.selectedArrangementSeed = gameState.selectedArrangementSeed === seed ? null : seed;
      }
      if (action === 'arrange-finish') finishArrangementCraft();
      if (action === 'arrange-clear') clearArrangementSlots();
      notifyGameState();
      this.refresh();
    });
  }

  private refreshVisibility(): void {
    if (!this.root) return;
    this.root.classList.toggle('visible', this.nearStation);
    if (this.nearStation) this.refresh();
  }

  private refresh(): void {
    if (!this.root || !this.nearStation) return;
    const body = this.root.querySelector('#arrangement-hud-body');
    if (!(body instanceof HTMLElement)) return;

    const seedIds = Object.keys(SEED_CONFIG) as SeedId[];
    const flowerCountMap: Record<SeedId, number> = Object.fromEntries(seedIds.map((id) => [id, 0])) as Record<SeedId, number>;
    for (const f of gameState.flowers) flowerCountMap[f.seedId] += 1;

    const arrangementPickerHtml = seedIds
      .filter((seedId) => flowerCountMap[seedId] > 0)
      .map((seedId) => {
        const count = flowerCountMap[seedId]!;
        const active = gameState.selectedArrangementSeed === seedId ? 'active' : '';
        return `<button type="button" class="arrange-card ${active}" data-action="pick-arrange-flower" data-seed="${seedId}"><img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" /><span>${SEED_CONFIG[seedId].label} x${count}</span></button>`;
      })
      .join('') || '<span class="hint">背包暂无可插花花朵，先去收获一些花。</span>';

    body.innerHTML = `
      <h3>插花</h3>
      <div class="hint">${arrangementPreviewLabel()}</div>
      <div class="hint">花束背包：${gameState.bouquets.length} 束（可在商店出售）</div>
      <div class="arrange-picker">${arrangementPickerHtml}</div>
      <div>
        <button type="button" data-action="arrange-finish">开始插花</button>
        <button type="button" data-action="arrange-clear">清空槽位</button>
      </div>
      <div class="hint">靠近花架点击摆放；满三朵后按场景内蓝色开关合成。</div>
    `;
  }
}
