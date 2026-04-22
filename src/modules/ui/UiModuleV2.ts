import * as THREE from 'three';
import { gameState, notifyGameState, subscribeGameState } from '../../game/GameState';
import { resetGameToDefault } from '../../game/saveLocal';
import { weatherLabel } from '../garden/GardenWeather';
import { SEED_CONFIG, SEED_IDS, type SeedId } from '../garden/types';
import { STEAL_SUCCESS_RATE_V2 as STEAL_SUCCESS_RATE } from '../social/socialStealV2';
import { buySeed, sellAllBouquetsFromInventory, sellAllFlowersFromInventory } from './hudShop';
import type { IModule } from '../IModule';

const SEED_EMOJI: Record<SeedId, string> = {
  tulip: '🌷',
  rose: '🌹',
  sunflower: '🌻',
  hibiscus: '🌺',
  cherry_blossom: '🌸',
  daisy: '🌼',
  lotus: '🪷',
  hyacinth: '🪻',
  white_flower: '🤍',
  rosette: '💮',
};

function seedHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class UiModuleV2 implements IModule {
  readonly name = 'UiModule';

  private root: HTMLDivElement | null = null;
  private shopOpen = false;
  private uiClickBound = false;
  private shelfOffset = 0;
  private toastTimer: number | null = null;

  init(_scene: THREE.Scene): void {
    this.mount();
    subscribeGameState(() => this.refresh());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('game:toast', this.onGameToast as EventListener);
    this.refresh();
  }

  update(_delta: number): void {}

  private mount(): void {
    const el = document.createElement('div');
    el.id = 'game-hud';
    el.innerHTML = `
      <style>
        #game-hud { position: fixed; inset: 0; z-index: 50; font: 13px/1.4 system-ui, sans-serif; color: #e6edf3; pointer-events: none; }
        #hud-top-dock { position: fixed; top: 10px; left: 10px; right: 10px; z-index: 51; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; pointer-events: none; }
        #hud-quick-actions { pointer-events: auto; width: min(400px, 52vw); background: rgba(15, 20, 28, 0.55); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 8px 10px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0,0,0,.22); }
        #hud-events-panel { pointer-events: auto; width: min(300px, 42vw); max-height: min(38vh, 320px); background: rgba(15, 20, 28, 0.5); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 8px 10px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0,0,0,.22); display: flex; flex-direction: column; }
        #hud-events-panel h3 { margin: 0 0 6px; font-size: 13px; color: #8fb6ff; flex-shrink: 0; }
        #hud-events-panel .log { flex: 1; min-height: 0; overflow: auto; font-size: 11px; white-space: pre-wrap; line-height: 1.35; opacity: .95; }
        #hud-scroll { position: fixed; left: 10px; top: 118px; width: min(420px, 94vw); bottom: 92px; overflow-y: auto; overflow-x: hidden; padding-right: 6px; pointer-events: auto; scrollbar-gutter: stable; }
        #game-hud .panel { pointer-events: auto; background: rgba(15, 20, 28, 0.88); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; }
        #game-hud h3 { margin: 0 0 6px; font-size: 13px; color: #8fb6ff; }
        #game-hud h4 { margin: 0 0 6px; font-size: 12px; color: #9ec5ff; font-weight: 600; }
        #hud-quick-actions button { margin: 2px 6px 2px 0; padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); background: #1f2630; color: #e6edf3; cursor: pointer; }
        #game-hud button { margin: 2px 4px 2px 0; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); background: #1f2630; color: #e6edf3; cursor: pointer; }
        #game-hud .row { margin: 4px 0; }
        #game-hud .hint { font-size: 12px; opacity: .78; }
        #hud-quick-actions .hint { font-size: 11px; opacity: .85; margin-top: 6px; line-height: 1.4; }
        #game-hud .seed-picker, #game-hud .inventory-flow { display: flex; flex-wrap: wrap; gap: 6px; }
        #game-hud .seed-chip.active { border-color: #6bb9ff; background: #244261; }
        #game-hud .inventory-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
        #game-hud .inv-item { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:7px; background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); font-size:12px; }
        #game-hud .inv-item img { width:16px; height:16px; object-fit:contain; }
        #hud-shop-modal { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(520px, 94vw); z-index: 60; box-shadow: 0 10px 28px rgba(0,0,0,.45); }
        #game-hud .shop-shelf-wrap { display:flex; align-items:center; gap: 6px; width:100%; }
        #game-hud .shop-shelf { flex:1 1 auto; min-width:0; overflow:hidden; touch-action:none; user-select:none; cursor:grab; }
        #game-hud .shop-shelf-track { display:flex; gap:10px; will-change: transform; }
        #game-hud .shop-card { flex: 0 0 158px; min-width: 158px; border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:8px; background: rgba(255,255,255,.04); }
        #game-hud .shop-card-visual { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
        #game-hud .shop-emoji { font-size:26px; }
        #game-hud .shop-swatch { width:34px; height:34px; border-radius:9px; border:2px solid rgba(255,255,255,.22); }
        #game-hud .shelf-nav { width:28px; height:28px; border-radius:50%; padding:0; line-height:1; font-size:16px; }
        #hud-center-toast { position: fixed; left:50%; top:20%; transform: translate(-50%,0); z-index:90; background:rgba(10,18,30,.72); border:1px solid rgba(130,210,255,.55); color:#ecf6ff; border-radius:12px; padding:12px 18px; font-size:18px; font-weight:700; opacity:0; pointer-events:none; transition:opacity .2s ease; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        #hud-center-toast.show { opacity:1; }
        #hud-garden .seed-picker { display: none !important; }
      </style>
      <div id="hud-top-dock">
        <div id="hud-quick-actions"></div>
        <div id="hud-events-panel"></div>
      </div>
      <div id="hud-scroll">
        <div class="panel" id="hud-status"></div>
        <div class="panel" id="hud-inventory"></div>
        <div class="panel" id="hud-shop-modal"></div>
        <div class="panel" id="hud-garden"></div>
      </div>
      <div id="hud-center-toast"></div>
    `;
    document.body.appendChild(el);
    this.root = el;
    this.wireButtons();
  }

  private wireButtons(): void {
    if (this.uiClickBound) return;
    this.uiClickBound = true;
    this.root?.addEventListener('pointerdown', (e) => {
      const baseEl = e.target instanceof Element ? e.target : null;
      const actionTarget = baseEl?.closest('[data-action]') as HTMLElement | null;
      if (!actionTarget) return;
      const action = actionTarget.dataset.action;
      const seed = actionTarget.dataset.seed as SeedId | undefined;
      e.preventDefault();
      e.stopPropagation();
      if (action === 'open-shop') this.shopOpen = true;
      if (action === 'close-shop') this.shopOpen = false;
      if (action === 'buy' && seed) buySeed(seed);
      if (action === 'sell-flowers') sellAllFlowersFromInventory();
      if (action === 'sell-bouquets') sellAllBouquetsFromInventory();
      if (action === 'shelf-left') this.nudgeShelf(-220);
      if (action === 'shelf-right') this.nudgeShelf(220);
      if (action === 'pick-seed' && seed) gameState.selectedSeed = seed;
      if (action === 'clear-save') {
        if (window.confirm('确定清除本地存档并恢复默认开局？')) resetGameToDefault();
      }
      notifyGameState();
      this.refresh();
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyB') {
      this.shopOpen = !this.shopOpen;
      this.refresh();
    }
    const digitOrder = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'] as const;
    const di = digitOrder.indexOf(e.code as (typeof digitOrder)[number]);
    if (di >= 0 && di < SEED_IDS.length) {
      gameState.selectedSeed = SEED_IDS[di]!;
      this.refresh();
    }
  };

  private onGameToast = (event: Event): void => {
    const ce = event as CustomEvent<{ message?: string }>;
    if (ce.detail?.message) this.showCenterToast(ce.detail.message, 1500);
  };

  private showCenterToast(message: string, durationMs: number): void {
    const toast = this.root?.querySelector('#hud-center-toast');
    if (!(toast instanceof HTMLElement)) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      this.toastTimer = null;
    }, durationMs);
  }

  private refresh(): void {
    if (!this.root) return;
    const status = this.root.querySelector('#hud-status');
    const inventory = this.root.querySelector('#hud-inventory');
    const shopModal = this.root.querySelector('#hud-shop-modal');
    const garden = this.root.querySelector('#hud-garden');
    const quick = this.root.querySelector('#hud-quick-actions');
    const events = this.root.querySelector('#hud-events-panel');
    if (!status || !inventory || !shopModal || !garden || !quick || !events) return;

    const seedIds = Object.keys(SEED_CONFIG) as SeedId[];
    const sel = SEED_CONFIG[gameState.selectedSeed].label;
    const weatherStr = weatherLabel(gameState.weather);
    const seedHotkeys = SEED_IDS.map((id, i) => `${i === 9 ? '0' : i + 1}=${SEED_CONFIG[id].label}`).join(' / ');
    const stealPct = Math.round(STEAL_SUCCESS_RATE * 100);

    const shelfItems = seedIds.map((seedId) => {
      const cfg = SEED_CONFIG[seedId];
      return `
        <div class="shop-card">
          <div class="shop-card-visual"><span class="shop-emoji">${SEED_EMOJI[seedId]}</span><span class="shop-swatch" style="background:${seedHex(cfg.color)}"></span></div>
          <h4>${cfg.label}</h4>
          <div class="hint">种子 ${cfg.seedPrice} 金币 / 鲜花 ${cfg.sellBase} 金币</div>
          <button data-action="buy" data-seed="${seedId}">购买</button>
        </div>
      `;
    }).join('');

    const seedPicker = seedIds.map((seedId) => {
      const cfg = SEED_CONFIG[seedId];
      const active = gameState.selectedSeed === seedId ? 'active' : '';
      return `<button class="seed-chip ${active}" data-action="pick-seed" data-seed="${seedId}">${SEED_EMOJI[seedId]} ${cfg.label} x${gameState.seeds[seedId]}</button>`;
    }).join('');

    const flowerCountMap: Record<SeedId, number> = Object.fromEntries(seedIds.map((id) => [id, 0])) as Record<SeedId, number>;
    for (const f of gameState.flowers) flowerCountMap[f.seedId] += 1;
    const seedInventoryCards = seedIds.map((seedId) => `<div class="inv-item"><img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" /><span>${SEED_CONFIG[seedId].label} 种子 x${gameState.seeds[seedId]}</span></div>`).join('');
    const flowerInventoryCards = seedIds
      .filter((seedId) => flowerCountMap[seedId] > 0)
      .map((seedId) => `<div class="inv-item"><img src="${SEED_CONFIG[seedId].icon}" alt="${SEED_CONFIG[seedId].label}" /><span>${SEED_CONFIG[seedId].label} 鲜花 x${flowerCountMap[seedId]}</span></div>`)
      .join('') || '<div class="hint">鲜花库存为空</div>';

    const bouquetCountByLabel = new Map<string, number>();
    for (const b of gameState.bouquets) bouquetCountByLabel.set(b.label, (bouquetCountByLabel.get(b.label) ?? 0) + 1);
    const bouquetInventoryCards = Array.from(bouquetCountByLabel.entries()).map(([label, count]) => `<span class="inv-item"><span>💐</span><span>${label} x${count}</span></span>`).join('') || '<div class="hint">花束库存为空</div>';

    status.innerHTML = `
      <h3>状态</h3>
      <div class="row">金币：<b>${gameState.gold}</b> ｜ 天气：<b>${weatherStr}</b></div>
      <div class="row hint">地图：中央自家花田，西侧邻居花田（偷花成功率 ${stealPct}%）</div>
      <div class="row">当前选种：<b>${sel}</b> ｜ 快捷键：<span class="hint">${seedHotkeys}</span> ｜ <b>B</b> 商店</div>
    `;

    inventory.innerHTML = `
      <h3>背包库存</h3>
      <div class="row hint">种子库存</div>
      <div class="inventory-grid">${seedInventoryCards}</div>
      <div class="row hint" style="margin-top:6px;">鲜花库存</div>
      <div class="inventory-grid">${flowerInventoryCards}</div>
      <div class="row hint" style="margin-top:6px;">花束库存</div>
      <div class="inventory-flow">${bouquetInventoryCards}</div>
    `;

    quick.innerHTML = `
      <h4>操作与存档</h4>
      <div>
        <button type="button" data-action="open-shop">打开商店</button>
        <button type="button" data-action="clear-save">清除本地存档</button>
      </div>
      <div class="hint">走近地图东侧插花角可打开插花面板；数字键或底栏选种。</div>
    `;

    events.innerHTML = `
      <h3>事件</h3>
      <div class="log">${gameState.logLines.join('\n')}</div>
    `;

    shopModal.innerHTML = this.shopOpen
      ? `<div class="row" style="display:flex;justify-content:space-between;align-items:center;"><h3>商店货架（10种花）</h3><button data-action="close-shop">关闭</button></div>
         <div class="row hint">左右拖动/滚轮浏览货架并购买。</div>
         <div class="shop-shelf-wrap"><button class="shelf-nav" data-action="shelf-left">◀</button><div class="shop-shelf"><div class="shop-shelf-track">${shelfItems}</div></div><button class="shelf-nav" data-action="shelf-right">▶</button></div>
         <div class="row"><button data-action="sell-flowers">卖出背包鲜花</button><button data-action="sell-bouquets">卖出花束</button></div>`
      : '';
    (shopModal as HTMLElement).style.display = this.shopOpen ? 'block' : 'none';
    if (this.shopOpen) {
      const shelf = shopModal.querySelector('.shop-shelf');
      const track = shopModal.querySelector('.shop-shelf-track');
      if (shelf instanceof HTMLElement && track instanceof HTMLElement) {
        this.syncShelfOffset(shelf, track);
        this.bindShelfDrag(shelf, track);
      }
    }

    garden.innerHTML = `<h3>种植</h3><div class="row hint">种子→生长→浇水→冷却后施肥→成熟收获</div><div class="row seed-picker">${seedPicker}</div>`;
  }

  private nudgeShelf(delta: number): void {
    const shelf = this.root?.querySelector('.shop-shelf');
    const track = this.root?.querySelector('.shop-shelf-track');
    if (!(shelf instanceof HTMLElement) || !(track instanceof HTMLElement)) return;
    this.shelfOffset += delta;
    this.syncShelfOffset(shelf, track);
  }

  private syncShelfOffset(shelf: HTMLElement, track: HTMLElement): void {
    const maxOffset = Math.max(0, track.scrollWidth - shelf.clientWidth);
    this.shelfOffset = Math.max(0, Math.min(maxOffset, this.shelfOffset));
    track.style.transform = `translateX(${-this.shelfOffset}px)`;
  }

  private bindShelfDrag(shelf: HTMLElement, track: HTMLElement): void {
    if (shelf.dataset.dragBound === '1') return;
    shelf.dataset.dragBound = '1';
    let dragging = false;
    let pointerId = -1;
    let startX = 0;
    let startOffset = 0;
    shelf.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button,[data-action]')) return;
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startOffset = this.shelfOffset;
      shelf.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    });
    shelf.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      this.shelfOffset = startOffset - (e.clientX - startX);
      this.syncShelfOffset(shelf, track);
      e.preventDefault();
    });
    const end = (e: PointerEvent): void => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      if (shelf.hasPointerCapture(e.pointerId)) shelf.releasePointerCapture(e.pointerId);
    };
    shelf.addEventListener('pointerup', end);
    shelf.addEventListener('pointercancel', end);
    shelf.addEventListener('wheel', (e) => {
      this.shelfOffset += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.syncShelfOffset(shelf, track);
      e.preventDefault();
    }, { passive: false });
  }
}
