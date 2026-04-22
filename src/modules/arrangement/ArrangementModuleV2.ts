import * as THREE from 'three';
import { gameState, pushLog, subscribeGameState } from '../../game/GameState';
import type { SeedId } from '../garden/types';
import { createArrangementSlotFlower } from '../garden/GardenVisuals';
import type { IModule } from '../IModule';
import {
  createArrangementStation,
  hitArrangementStation,
  hitArrangementSwitch,
  type ArrangementStationHandles,
} from './arrangementStation';
import {
  finishArrangementCraftV2 as finishArrangementCraft,
  takeFlowerFromInventoryV2 as takeFlowerFromInventory,
} from './arrangementLogicV2';

export class ArrangementModuleV2 implements IModule {
  readonly name = 'ArrangementModule';

  private station!: ArrangementStationHandles;
  private sceneRef: THREE.Scene | null = null;
  private slotVisuals: (THREE.Object3D | null)[] = [null, null, null];
  private celebrate: { t: number; groups: THREE.Group[]; mat: THREE.MeshStandardMaterial } | null = null;
  private craftPrompt: THREE.Sprite | null = null;
  private craftSwitchGlow: THREE.Mesh | null = null;
  private craftAnim:
    | {
        t: number;
        duration: number;
        flowers: THREE.Object3D[];
        from: THREE.Vector3[];
        center: THREE.Vector3;
        bouquet: THREE.Group;
        fx: THREE.Group;
      }
    | null = null;

  private readonly onFinishBound = (): void => this.startCraftAnimation();

  init(scene: THREE.Scene): void {
    this.sceneRef = scene;
    this.station = createArrangementStation(scene);
    this.createCraftInteractVisuals();
    window.addEventListener('game:arrangement-finish', this.onFinishBound);
    subscribeGameState(() => {
      this.syncSlotVisuals();
      this.syncCraftInteractState();
    });
    this.syncSlotVisuals();
    this.syncCraftInteractState();
  }

  update(delta: number): void {
    this.tickCelebration(delta);
    this.tickCraftAnimation(delta);
    this.tickPromptPulse();
  }

  onPointerDown(hits: THREE.Intersection[], _event: PointerEvent): void {
    for (const h of hits) {
      if (hitArrangementSwitch(h.object)) {
        const ok = finishArrangementCraft();
        if (!ok) pushLog('先放满3朵花，再按下插花开关。');
        return;
      }
    }
    for (const h of hits) {
      if (!hitArrangementStation(h.object)) continue;
      const selected = gameState.selectedArrangementSeed;
      if (!selected) {
        pushLog('请先在插花面板选择花朵，再点击花架摆放。');
        return;
      }
      const ok = takeFlowerFromInventory(selected);
      if (ok) pushLog(`已向花架放入 ${selected}。`);
      return;
    }
  }

  private createCraftInteractVisuals(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 92;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(7,16,30,0.78)';
      ctx.strokeStyle = 'rgba(111,215,255,0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f2f7ff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('可插花：点蓝色开关', canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    sprite.scale.set(1.9, 0.52, 1);
    sprite.position.set(0, 1.55, 1.88);
    sprite.visible = false;
    this.station.root.add(sprite);
    this.craftPrompt = sprite;

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x7dd1ff, emissive: 0x3c8dcc, emissiveIntensity: 0.55 }),
    );
    glow.position.set(0, 0.38, 1.95);
    glow.visible = false;
    this.station.root.add(glow);
    this.craftSwitchGlow = glow;
  }

  private syncCraftInteractState(): void {
    const ready = gameState.arrangementSlots.every((s) => s !== null);
    if (this.craftPrompt) this.craftPrompt.visible = ready && !this.craftAnim;
    if (this.craftSwitchGlow) this.craftSwitchGlow.visible = ready && !this.craftAnim;
  }

  private tickPromptPulse(): void {
    if (!this.craftPrompt || !this.craftPrompt.visible) return;
    const t = performance.now() * 0.001;
    const s = 1 + Math.sin(t * 3.2) * 0.05;
    this.craftPrompt.scale.set(1.9 * s, 0.52 * s, 1);
  }

  private syncSlotVisuals(): void {
    for (let i = 0; i < 3; i++) {
      const seedId = gameState.arrangementSlots[i];
      const anchor = this.station.slotAnchors[i]!;
      const cur = this.slotVisuals[i];
      if (seedId === null) {
        if (cur) {
          anchor.remove(cur);
          disposeArrangementFlower(cur);
          this.slotVisuals[i] = null;
        }
        continue;
      }
      const curSeed = cur?.userData.arrangementSeed as SeedId | undefined;
      if (cur && cur.userData.arrangementKind === 'flower' && curSeed === seedId) continue;
      if (cur) {
        anchor.remove(cur);
        disposeArrangementFlower(cur);
        this.slotVisuals[i] = null;
      }
      const viz = createArrangementSlotFlower(seedId);
      viz.userData.arrangementKind = 'flower';
      viz.userData.arrangementSeed = seedId;
      viz.rotation.y += i * 0.35;
      viz.position.y = 0.04;
      viz.traverse((o) => (o.frustumCulled = false));
      anchor.add(viz);
      this.slotVisuals[i] = viz;
    }
  }

  private startCraftAnimation(): void {
    const scene = this.sceneRef;
    if (!scene) return;
    const flowers = this.slotVisuals.filter((g): g is THREE.Object3D => Boolean(g));
    if (flowers.length < 3) return;
    const from = flowers.map((f) => {
      const p = new THREE.Vector3();
      f.getWorldPosition(p);
      return p;
    });
    const center = from.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / from.length);
    center.y += 0.45;

    const bouquet = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const seed = gameState.arrangementSlots[i] as SeedId;
      const flower = createArrangementSlotFlower(seed);
      flower.scale.setScalar(0.72);
      flower.position.set((i - 1) * 0.2, 0.05 + i * 0.03, (i - 1) * 0.06);
      bouquet.add(flower);
    }
    bouquet.position.copy(center);
    bouquet.visible = false;
    scene.add(bouquet);

    const fx = new THREE.Group();
    const fxMat = new THREE.MeshStandardMaterial({
      color: 0xffd36e,
      emissive: 0xffb64d,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.92,
    });
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 8, 7), fxMat);
      m.userData.a = (i / 24) * Math.PI * 2;
      fx.add(m);
    }
    fx.position.copy(center);
    fx.visible = false;
    scene.add(fx);

    this.craftAnim = { t: 0, duration: 1.35, flowers, from, center, bouquet, fx };
    this.syncCraftInteractState();
  }

  private tickCraftAnimation(delta: number): void {
    const a = this.craftAnim;
    if (!a) return;
    a.t += delta;
    const p = Math.min(1, a.t / a.duration);
    for (let i = 0; i < a.flowers.length; i++) {
      const obj = a.flowers[i]!;
      const start = a.from[i]!;
      const x = THREE.MathUtils.lerp(start.x, a.center.x + (i - 1) * 0.22 * (1 - p), p);
      const y = THREE.MathUtils.lerp(start.y, a.center.y + 0.45 * Math.sin(p * Math.PI), p);
      const z = THREE.MathUtils.lerp(start.z, a.center.z, p);
      const parent = obj.parent;
      if (parent) parent.worldToLocal(obj.position.set(x, y, z));
      obj.rotation.y += 0.08;
      obj.scale.setScalar(Math.max(0.18, 1 - p * 0.8));
    }
    if (p > 0.52) {
      a.fx.visible = true;
      let idx = 0;
      for (const ch of a.fx.children) {
        const m = ch as THREE.Mesh;
        const ang = (m.userData.a as number) + a.t * 4.2;
        const rr = (1 - p) * 0.55 + 0.18;
        m.position.set(Math.cos(ang) * rr, Math.sin(a.t * 7 + idx * 0.2) * 0.22, Math.sin(ang) * rr);
        (m.material as THREE.MeshStandardMaterial).opacity = Math.max(0.1, 1 - p);
        idx++;
      }
    }
    if (p > 0.72) {
      a.bouquet.visible = true;
      a.bouquet.rotation.y += 0.05;
      a.bouquet.scale.setScalar(0.9 + Math.sin(a.t * 5) * 0.04);
    }
    if (p < 1) return;
    // 先从花朵读取世界坐标再 detach，否则 remove 后 getWorldPosition 会错
    const celebrationOrigins: THREE.Vector3[] = [];
    const tmp = new THREE.Vector3();
    for (const f of a.flowers) {
      f.getWorldPosition(tmp);
      tmp.y += 0.15;
      celebrationOrigins.push(tmp.clone());
    }
    for (const f of a.flowers) if (f.parent) f.parent.remove(f);
    a.fx.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry?.dispose();
    });
    const fxMat = (a.fx.children[0] as THREE.Mesh | undefined)?.material;
    const mats = Array.isArray(fxMat) ? fxMat : fxMat ? [fxMat] : [];
    for (const m of mats) m.dispose();
    this.sceneRef?.remove(a.fx);
    this.sceneRef?.remove(a.bouquet);
    disposeArrangementFlower(a.bouquet);
    this.craftAnim = null;
    this.startFinishCelebration(celebrationOrigins);
    this.syncCraftInteractState();
  }

  private startFinishCelebration(originsFromAnim?: THREE.Vector3[]): void {
    const scene = this.sceneRef;
    if (!scene) return;
    const origins: THREE.Vector3[] =
      originsFromAnim && originsFromAnim.length > 0
        ? originsFromAnim
        : (() => {
            const out: THREE.Vector3[] = [];
            const p = new THREE.Vector3();
            for (const g of this.slotVisuals) {
              if (!g) continue;
              g.getWorldPosition(p);
              p.y += 0.15;
              out.push(p.clone());
            }
            return out;
          })();
    if (origins.length === 0) {
      const p = new THREE.Vector3();
      this.station.root.getWorldPosition(p);
      p.y += 0.9;
      origins.push(p);
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd45c, emissive: 0xcc7700, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.12 });
    const groups: THREE.Group[] = [];
    for (const origin of origins) {
      const grp = new THREE.Group();
      grp.position.copy(origin);
      scene.add(grp);
      groups.push(grp);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.055 + Math.random() * 0.04, 6, 5), mat);
        const a = (i / n) * Math.PI * 2;
        s.userData.vx = Math.cos(a) * (1.3 + Math.random() * 0.5);
        s.userData.vy = 2.2 + Math.random() * 1.6;
        s.userData.vz = Math.sin(a) * (1.3 + Math.random() * 0.5);
        grp.add(s);
      }
    }
    this.celebrate = { t: 0, groups, mat };
  }

  private tickCelebration(delta: number): void {
    const c = this.celebrate;
    if (!c) return;
    c.t += delta;
    for (const grp of c.groups) {
      for (const ch of grp.children) {
        const m = ch as THREE.Mesh & { userData: { vx: number; vy: number; vz: number } };
        m.position.x += m.userData.vx * delta;
        m.position.y += m.userData.vy * delta;
        m.position.z += m.userData.vz * delta;
        m.userData.vy -= 7 * delta;
        m.scale.multiplyScalar(Math.max(0.15, 1 - delta * 1.05));
      }
    }
    if (c.t <= 0.72) return;
    const scene = this.sceneRef;
    for (const grp of c.groups) {
      for (const ch of grp.children) (ch as THREE.Mesh).geometry?.dispose();
      scene?.remove(grp);
    }
    c.mat.dispose();
    this.celebrate = null;
  }
}

function disposeArrangementFlower(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) mat?.dispose?.();
  });
}

