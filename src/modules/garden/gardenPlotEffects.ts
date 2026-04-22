import * as THREE from 'three';
import { SEED_CONFIG, type SeedId } from './types';

type PlotHandle = { root: THREE.Group; plant: THREE.Group };
type Ripple = { mesh: THREE.Mesh; t: number; root: THREE.Group };
type Burst = { group: THREE.Group; t: number };
type PlantBump = { idx: number; t: number };

/**
 * 种花 / 浇水 / 收获的短时场景表现（与数值逻辑解耦）。
 */
export class GardenPlotEffects {
  private ripples: Ripple[] = [];
  private bursts: Burst[] = [];
  private plantBumps: PlantBump[] = [];

  constructor(
    private readonly handles: PlotHandle[],
    private readonly scene: THREE.Scene,
  ) {}

  triggerPlant(index: number): void {
    this.plantBumps.push({ idx: index, t: 0.34 });
  }

  triggerWater(index: number): void {
    const h = this.handles[index];
    if (!h) return;
    const geo = new THREE.RingGeometry(0.1, 0.36, 28);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x5ec8ff,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.16, 0);
    h.root.add(mesh);
    this.ripples.push({ mesh, t: 0, root: h.root });
  }

  /** 祝福成功：金色碎光 */
  triggerBless(index: number, _seedId: SeedId): void {
    const h = this.handles[index];
    if (!h) return;
    const color = 0xffe066;
    const g = new THREE.Group();
    g.position.copy(h.root.position);
    g.position.y += 0.48;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: 0xfff2a8,
      emissiveIntensity: 0.62,
      roughness: 0.28,
      metalness: 0.15,
    });
    const n = 16;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 6, 5), mat);
      const a = (i / n) * Math.PI * 2;
      s.userData.vx = Math.cos(a) * (1.8 + Math.random() * 0.9);
      s.userData.vy = 2.8 + Math.random() * 2.2;
      s.userData.vz = Math.sin(a) * (1.8 + Math.random() * 0.9);
      g.add(s);
    }
    this.scene.add(g);
    this.bursts.push({ group: g, t: 0 });
  }

  /** 施肥：土金色颗粒上扬 */
  triggerFertilize(index: number): void {
    const h = this.handles[index];
    if (!h) return;
    const g = new THREE.Group();
    g.position.copy(h.root.position);
    g.position.y += 0.52;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      emissive: 0x8a6a18,
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.12,
    });
    const n = 14;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.04, 0), mat);
      const a = (i / n) * Math.PI * 2;
      s.userData.vx = Math.cos(a) * (0.8 + Math.random() * 0.6);
      s.userData.vy = 2.2 + Math.random() * 1.6;
      s.userData.vz = Math.sin(a) * (0.8 + Math.random() * 0.6);
      g.add(s);
    }
    this.scene.add(g);
    this.bursts.push({ group: g, t: 0 });
  }

  triggerHarvest(index: number, seedId: SeedId): void {
    const h = this.handles[index];
    if (!h) return;
    const color = SEED_CONFIG[seedId].color;
    const g = new THREE.Group();
    g.position.copy(h.root.position);
    g.position.y += 0.42;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.32,
      metalness: 0.08,
    });
    const n = 12;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.05, 6, 5), mat);
      const a = (i / n) * Math.PI * 2;
      s.userData.vx = Math.cos(a) * (1.4 + Math.random() * 0.6);
      s.userData.vy = 2.4 + Math.random() * 2;
      s.userData.vz = Math.sin(a) * (1.4 + Math.random() * 0.6);
      g.add(s);
    }
    this.scene.add(g);
    this.bursts.push({ group: g, t: 0 });
  }

  update(delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]!;
      r.t += delta;
      const k = 1 + r.t * 4.8;
      r.mesh.scale.set(k, k, 1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.78 * (1 - r.t / 0.52));
      if (r.t > 0.52) {
        r.root.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.t += delta;
      for (const ch of b.group.children) {
        const m = ch as THREE.Mesh & {
          userData: { vx: number; vy: number; vz: number };
        };
        m.position.x += m.userData.vx * delta;
        m.position.y += m.userData.vy * delta;
        m.position.z += m.userData.vz * delta;
        m.userData.vy -= 6 * delta;
        m.scale.multiplyScalar(Math.max(0.2, 1 - delta * 1.15));
      }
      if (b.t > 0.7) {
        b.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            mat?.dispose();
          }
        });
        this.scene.remove(b.group);
        this.bursts.splice(i, 1);
      }
    }

    for (let i = this.plantBumps.length - 1; i >= 0; i--) {
      const b = this.plantBumps[i]!;
      b.t -= delta;
      const h = this.handles[b.idx];
      if (h) {
        const u = Math.max(0, b.t) / 0.34;
        const punch = Math.sin((1 - u) * Math.PI) * 0.14;
        h.plant.scale.set(1 + punch * 0.35, 1 + punch * 1.1, 1 + punch * 0.35);
      }
      if (b.t <= 0) {
        const hh = this.handles[b.idx];
        if (hh) hh.plant.scale.set(1, 1, 1);
        this.plantBumps.splice(i, 1);
      }
    }
  }
}
