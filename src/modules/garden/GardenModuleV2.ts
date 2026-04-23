import * as THREE from 'three';
import { gameState } from '../../game/GameState';
import { tryBlessFriendBloomPlotV3 as tryBlessFriendBloomPlotV2, tryBlessFriendGrowingPlotV3 as tryBlessFriendGrowingPlotV2 } from '../social/socialBlessV3';
import { tryStealFriendFlowerV2, STEAL_SUCCESS_RATE_V2 } from '../social/socialStealV2';
import { tryHelpFriendCareV2 } from '../social/socialCareV2';
import { initFriendGarden } from '../social/socialMock';
import { tickFriendGardenRegrowth } from '../social/friendGardenSpawn';
import { FriendGardenChaser } from '../social/friendGardenChaser';
import { tryFertilizePlot } from './GardenFertilizing';
import { tickGardenGrowth } from './GardenGrowth';
import { tickGardenWeather } from './GardenWeather';
import { tryHarvestPlotV2 as tryHarvestPlot } from './GardenHarvestV2';
import { tryPlantSeed } from './GardenPlanting';
import { tryWaterPlot } from './GardenWatering';
import { createGardenPlots, getGardenPlotIndex, type GardenPlotHandles } from './GardenPlots';
import { createFriendGardenPlots, getFriendGardenPlotIndex, type FriendGardenPlotHandles } from './FriendGardenPlots';
import { syncGardenPlotVisuals } from './GardenVisuals';
import { GardenPlotEffects } from './gardenPlotEffects';
import type { SeedId } from './types';
import type { IModule } from '../IModule';

const FRIEND_ACTION_BUTTON_KIND = 'friendActionButton';

interface FriendActionHit {
  action: 'bless' | 'steal';
  plotIndex: number;
}

type FriendActionWidgets = {
  bless: THREE.Sprite;
  steal: THREE.Sprite;
};

function resolvePlotFromHits(hits: THREE.Intersection[]): { plotIndex: number; isFriendPlot: boolean } | null {
  for (const h of hits) {
    const fi = getFriendGardenPlotIndex(h.object);
    if (fi !== null) return { plotIndex: fi, isFriendPlot: true };
    const si = getGardenPlotIndex(h.object);
    if (si !== null) return { plotIndex: si, isFriendPlot: false };
  }
  return null;
}

function resolveFriendActionFromHits(hits: THREE.Intersection[]): FriendActionHit | null {
  for (const h of hits) {
    let o: THREE.Object3D | null = h.object;
    while (o) {
      if (o.userData?.kind === FRIEND_ACTION_BUTTON_KIND) {
        const action = o.userData.action as 'bless' | 'steal';
        const plotIndex = o.userData.plotIndex as number;
        if ((action === 'bless' || action === 'steal') && typeof plotIndex === 'number') {
          return { action, plotIndex };
        }
      }
      o = o.parent;
    }
  }
  return null;
}

function makeCanvasBadge(text: string, bg: string, border: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2f6ff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.35, 0.54, 1);
  return sp;
}

export class GardenModuleV2 implements IModule {
  readonly name = 'GardenModule';

  private selfHandles: GardenPlotHandles[] = [];
  private friendHandles: FriendGardenPlotHandles[] = [];
  private player: THREE.Object3D | null = null;
  private scene: THREE.Scene | null = null;
  private readonly chaser = new FriendGardenChaser();
  private plotFx: GardenPlotEffects | null = null;
  private plotFxFriend: GardenPlotEffects | null = null;
  private friendActionWidgets: FriendActionWidgets[] = [];
  private chaseToastCooldown = 0;
  private elapsedSec = 0;
  private chaserUpdateAccum = 0;
  private friendVisualSyncAccum = 0;
  private friendButtonsSyncAccum = 0;

  init(scene: THREE.Scene): void {
    this.scene = scene;
    initFriendGarden();
    this.selfHandles = createGardenPlots(scene);
    this.friendHandles = createFriendGardenPlots(scene);
    this.attachFriendActionButtons();
    this.plotFx = new GardenPlotEffects(this.selfHandles, scene);
    this.plotFxFriend = new GardenPlotEffects(this.friendHandles, scene);
    this.chaser.init(scene);
    void this.chaser.loadSoldierModel();
    this.player = scene.getObjectByName('Player') ?? null;
    syncGardenPlotVisuals(this.selfHandles, gameState.plots, this.player?.position);
    syncGardenPlotVisuals(this.friendHandles, gameState.friendPlots, this.player?.position);
  }

  update(delta: number): void {
    this.chaseToastCooldown = Math.max(0, this.chaseToastCooldown - delta);
    this.elapsedSec += delta;
    if (!this.player && this.selfHandles.length > 0) {
      const anyRoot = this.selfHandles[0]!.root.parent;
      this.player = anyRoot?.getObjectByName('Player') ?? null;
    }
    tickGardenWeather(delta);
    tickGardenGrowth(delta, gameState.plots);
    tickGardenGrowth(delta, gameState.friendPlots);
    tickFriendGardenRegrowth(delta);
    const nearFriendGarden = this.player
      ? (this.player.position.x - (-18)) ** 2 + (this.player.position.z - (-2)) ** 2 < 22 * 22
      : true;

    if (this.scene) {
      if (nearFriendGarden) {
        // Keep chaser motion continuous near the player to avoid periodic hitching.
        this.chaserUpdateAccum = 0;
        this.chaser.update(this.scene, Math.min(delta, 1 / 30), this.elapsedSec, this.player);
      } else {
        this.chaserUpdateAccum += delta;
        if (this.chaserUpdateAccum >= 1 / 6) {
          const step = Math.min(this.chaserUpdateAccum, 0.1);
          this.chaserUpdateAccum = 0;
          this.chaser.update(this.scene, step, this.elapsedSec, this.player);
        }
      }
    }

    this.plotFx?.update(delta);
    this.plotFxFriend?.update(delta);

    // Self garden follows the player camera, so update continuously for smoothness.
    syncGardenPlotVisuals(this.selfHandles, gameState.plots, this.player?.position);

    if (nearFriendGarden) {
      this.friendVisualSyncAccum = 0;
      syncGardenPlotVisuals(this.friendHandles, gameState.friendPlots, this.player?.position);
    } else {
      this.friendVisualSyncAccum += delta;
      if (this.friendVisualSyncAccum >= 1 / 4) {
        this.friendVisualSyncAccum = 0;
        syncGardenPlotVisuals(this.friendHandles, gameState.friendPlots, this.player?.position);
      }
    }

    if (nearFriendGarden) {
      this.friendButtonsSyncAccum = 0;
      this.updateFriendActionButtons();
    } else {
      this.friendButtonsSyncAccum += delta;
      if (this.friendButtonsSyncAccum >= 0.12) {
        this.friendButtonsSyncAccum = 0;
        this.updateFriendActionButtons();
      }
    }
  }

  onPointerDown(hits: THREE.Intersection[], event: PointerEvent): void {
    const actionHit = resolveFriendActionFromHits(hits);
    if (actionHit) {
      const plot = gameState.friendPlots[actionHit.plotIndex];
      if (!plot) return;
      if (actionHit.action === 'bless') {
        if (tryBlessFriendBloomPlotV2(plot, actionHit.plotIndex)) {
          this.onBlessSuccess(actionHit.plotIndex, plot.seedId);
        }
      } else {
        // 偷花行为一旦触发（不论成败）立即追赶
        this.emitChaseToast();
        this.chaser.noteFriendGardenTouched();
        tryStealFriendFlowerV2(plot, actionHit.plotIndex);
      }
      return;
    }

    const resolved = resolvePlotFromHits(hits);
    if (!resolved) return;
    const { plotIndex, isFriendPlot } = resolved;

    if (isFriendPlot) {
      if (event.button !== 0 && event.button !== 2) return;
      const plot = gameState.friendPlots[plotIndex];
      if (!plot) return;
      if (event.button === 2) {
        if (plot.stage === 4) {
          if (tryBlessFriendBloomPlotV2(plot, plotIndex)) this.onBlessSuccess(plotIndex, plot.seedId);
        } else if (plot.stage > 0 && plot.stage < 4) {
          if (tryBlessFriendGrowingPlotV2(plot, plotIndex)) this.onBlessSuccess(plotIndex, plot.seedId);
        }
        return;
      }
      if (plot.stage > 0 && plot.stage < 4 && tryHelpFriendCareV2(plot, plotIndex)) {
        return;
      }
      if (plot.stage === 4) {
        // 偷花行为一旦触发（不论成败）立即追赶
        this.emitChaseToast();
        this.chaser.noteFriendGardenTouched();
        tryStealFriendFlowerV2(plot, plotIndex);
      }
      return;
    }

    if (event.button !== 0) return;
    const plot = gameState.plots[plotIndex];
    if (!plot) return;
    if (plot.stage === 0) {
      if (tryPlantSeed(plot, plotIndex, gameState.selectedSeed)) this.plotFx?.triggerPlant(plotIndex);
      return;
    }
    if (plot.stage === 1 || plot.stage === 2) {
      if (tryWaterPlot(plot, plotIndex)) this.plotFx?.triggerWater(plotIndex);
      return;
    }
    if (plot.stage === 3) {
      if (tryFertilizePlot(plot, plotIndex)) this.plotFx?.triggerFertilize(plotIndex);
      return;
    }
    const harvestSeed = plot.seedId;
    if (harvestSeed && tryHarvestPlot(plot, plotIndex)) this.plotFx?.triggerHarvest(plotIndex, harvestSeed);
  }

  private onBlessSuccess(plotIndex: number, seedId: SeedId | null): void {
    if (seedId) {
      this.plotFxFriend?.triggerBless(plotIndex, seedId);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:player-bless-dance', { detail: { duration: 1.9 } }));
    }
  }

  private attachFriendActionButtons(): void {
    this.friendActionWidgets.length = 0;
    for (let i = 0; i < this.friendHandles.length; i++) {
      const h = this.friendHandles[i]!;
      const bless = makeCanvasBadge('祝福', 'rgba(28,61,96,0.88)', 'rgba(109,186,255,0.95)');
      bless.userData.kind = FRIEND_ACTION_BUTTON_KIND;
      bless.userData.action = 'bless';
      bless.userData.plotIndex = i;
      bless.position.set(-0.55, 1.5, 0);
      bless.visible = false;
      h.root.add(bless);

      const steal = makeCanvasBadge('偷取', 'rgba(88,43,43,0.88)', 'rgba(255,138,138,0.95)');
      steal.userData.kind = FRIEND_ACTION_BUTTON_KIND;
      steal.userData.action = 'steal';
      steal.userData.plotIndex = i;
      steal.position.set(0.55, 1.5, 0);
      steal.visible = false;
      h.root.add(steal);
      this.friendActionWidgets.push({ bless, steal });
    }
  }

  private updateFriendActionButtons(): void {
    if (!this.player) return;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (let i = 0; i < this.friendHandles.length; i++) {
      const h = this.friendHandles[i]!;
      const plot = gameState.friendPlots[i];
      const near = (px - h.root.position.x) ** 2 + (pz - h.root.position.z) ** 2 < 4.2 * 4.2;
      const show = Boolean(plot && plot.stage === 4 && near);
      const widgets = this.friendActionWidgets[i];
      const bless = widgets?.bless;
      const steal = widgets?.steal;
      const giant = Boolean(plot?.giantBloom);
      const y = giant ? 2.05 : 1.5;
      const xOffset = giant ? 0.88 : 0.55;
      if (bless) bless.visible = show && !giant;
      if (steal) steal.visible = show;
      if (bless) bless.position.set(-xOffset, y, 0);
      if (steal) steal.position.set(xOffset, y, 0);
    }
  }

  private emitChaseToast(): void {
    if (this.chaseToastCooldown > 0) return;
    this.chaseToastCooldown = 3;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '邻居来追你了！', kind: 'chase' } }));
    }
    if (typeof document !== 'undefined') {
      const id = 'force-chase-toast';
      let node = document.getElementById(id) as HTMLDivElement | null;
      if (!node) {
        node = document.createElement('div');
        node.id = id;
        node.style.position = 'fixed';
        node.style.left = '50%';
        node.style.top = '20%';
        node.style.transform = 'translate(-50%, 0)';
        node.style.zIndex = '9999';
        node.style.padding = '12px 18px';
        node.style.borderRadius = '12px';
        node.style.border = '1px solid rgba(130,210,255,.65)';
        node.style.background = 'rgba(10,18,30,.92)';
        node.style.color = '#ecf6ff';
        node.style.fontSize = '18px';
        node.style.fontWeight = '700';
        node.style.boxShadow = '0 10px 24px rgba(0,0,0,.4)';
        node.style.pointerEvents = 'none';
        document.body.appendChild(node);
      }
      node.textContent = '邻居来追你了！';
      node.style.opacity = '1';
      window.setTimeout(() => {
        if (node) node.style.opacity = '0';
      }, 1500);
    }
  }
}
