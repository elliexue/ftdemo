import * as THREE from 'three';
import { loadModel } from '../../config/assetPaths';
import {
  enableModelShadows,
  forceModelVisible,
  normalizeModelHeight,
  pickCharacterLocomotionClips,
} from '../../core/modelUtils';
import { gameState, pushLog } from '../../game/GameState';

const ZONE_CENTER = new THREE.Vector3(-18, 0, -2);
const AGGRO_RADIUS = 12.5;
const BASE_CHASE_SPEED = 7.0;
const PATROL_SPEED = 2.85;
const RETURN_SPEED = 6.2;
const CALM_BEFORE_PATROL_SEC = 11;
/** 守园时追到玩家此距离内，传送回出生点 */
const CATCH_PLAYER_DIST = 1.22;
const CATCH_COOLDOWN_SEC = 2.8;

/** 与玩家同模区分色：略偏红褐，像邻园护院制服 */
const CHASER_TINT = new THREE.Color(1.12, 0.58, 0.52);

function tintGuardMaterials(root: THREE.Object3D, tint: THREE.Color): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const out = list.map((m) => {
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        const c = m.clone();
        c.color.multiply(tint);
        return c;
      }
      return m;
    });
    mesh.material = Array.isArray(mesh.material) ? out : out[0];
  });
}

type AiPhase = 'patrol' | 'returning' | 'guarding';

/**
 * 邻园主人：平时在远处溜达；动过他的花（祝福或偷花）后会赶回花田，进入守园追击。
 * 与玩家同 soldier.glb + 换色；失败时为红胶囊。
 */
export class FriendGardenChaser {
  readonly root = new THREE.Group();
  private readonly spawn = new THREE.Vector3(-18, 0, 0.2);
  private readonly patrolWps = [
    new THREE.Vector3(3, 0, 12),
    new THREE.Vector3(11, 0, 6),
    new THREE.Vector3(-4, 0, 14),
  ];
  private patrolIndex = 0;
  private aiPhase: AiPhase = 'patrol';
  private calmTimer = 0;
  private tmp = new THREE.Vector3();
  private mixer: THREE.AnimationMixer | null = null;
  private idle: THREE.AnimationAction | null = null;
  private run: THREE.AnimationAction | null = null;
  private locomotion = false;
  private catchCooldown = 0;
  private chaseAlertCooldown = 0;

  constructor() {
    this.buildCapsuleFallback();
    this.root.position.copy(this.patrolWps[0]!);
    this.root.name = 'FriendGardenChaser';
  }

  private buildCapsuleFallback(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb84a4a,
      roughness: 0.55,
      metalness: 0.12,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 6, 10), mat);
    body.position.y = 0.72;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat);
    head.position.y = 1.35;
    head.castShadow = true;
    this.root.add(body, head);
  }

  init(scene: THREE.Scene): void {
    scene.add(this.root);
  }

  /** 动过邻园的花（祝福成功或偷花尝试）时调用，主人从溜达改为赶回。 */
  noteFriendGardenTouched(): void {
    this.calmTimer = 0;
    if (this.aiPhase === 'patrol') {
      this.aiPhase = 'returning';
    }
    if (this.chaseAlertCooldown <= 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:toast', { detail: { message: '邻居来追你了！', kind: 'chase' } }));
      this.chaseAlertCooldown = 3.2;
    }
  }

  /** 异步加载与玩家同 GLB（独立实例 + 护院换色） */
  async loadSoldierModel(): Promise<void> {
    try {
      const gltf = await loadModel('player');
      const model = gltf.scene;
      enableModelShadows(model);
      forceModelVisible(model);
      normalizeModelHeight(model, 1.65);
      tintGuardMaterials(model, CHASER_TINT);
      // 与 root.lookAt 朝向一致：不再叠 Math.PI，避免倒着走
      model.name = 'FriendGuardSoldier';
      model.updateMatrixWorld(true);

      this.root.clear();
      this.root.add(model);

      this.mixer = new THREE.AnimationMixer(model);
      const clips = gltf.animations;
      const { idle: idleC, run: runC } = pickCharacterLocomotionClips(clips);
      if (idleC) {
        this.idle = this.mixer.clipAction(idleC);
        this.idle.setLoop(THREE.LoopRepeat, Infinity);
      }
      if (runC) {
        this.run = this.mixer.clipAction(runC);
        this.run.setLoop(THREE.LoopRepeat, Infinity);
      }
      if (this.idle && this.run) {
        this.idle.reset().fadeIn(0.15).play();
        this.run.play();
        this.run.setEffectiveWeight(0);
      } else if (this.idle) {
        this.idle.reset().fadeIn(0.15).play();
      } else {
        this.run?.reset().fadeIn(0.15).play();
      }
      this.locomotion = false;
    } catch {
      /* 无 glb 时保留构造里的胶囊 */
    }
  }

  private distXZ(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  private moveTowardXZ(target: THREE.Vector3, step: number): boolean {
    this.tmp.set(target.x - this.root.position.x, 0, target.z - this.root.position.z);
    const len = this.tmp.length();
    if (len < 0.04) return false;
    this.tmp.multiplyScalar(1 / len);
    const d = Math.min(step, len);
    this.root.position.x += this.tmp.x * d;
    this.root.position.z += this.tmp.z * d;
    return len > 0.12;
  }

  private setLocomotion(moving: boolean): void {
    if (!this.mixer || !this.idle || !this.run) return;
    if (moving === this.locomotion) return;
    this.locomotion = moving;
    if (moving) {
      this.idle.fadeOut(0.18);
      this.run.reset().fadeIn(0.18).play();
    } else {
      this.run.fadeOut(0.18);
      this.idle.reset().fadeIn(0.18).play();
    }
  }

  update(scene: THREE.Scene, delta: number, timeSec: number): void {
    const player = scene.getObjectByName('Player');
    if (!player) return;

    this.catchCooldown = Math.max(0, this.catchCooldown - delta);
    this.chaseAlertCooldown = Math.max(0, this.chaseAlertCooldown - delta);

    const px = player.position.x;
    const pz = player.position.z;
    const dx = px - ZONE_CENTER.x;
    const dz = pz - ZONE_CENTER.z;
    const distPlayerFromGarden = Math.hypot(dx, dz);

    let moving = false;

    if (this.aiPhase === 'patrol') {
      const target = this.patrolWps[this.patrolIndex]!;
      if (this.distXZ(this.root.position, target) < 0.38) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolWps.length;
        const next = this.patrolWps[this.patrolIndex]!;
        this.root.lookAt(next.x, this.root.position.y + 0.4, next.z);
      } else {
        moving = this.moveTowardXZ(target, PATROL_SPEED * delta);
        this.root.lookAt(target.x, this.root.position.y + 0.4, target.z);
      }
    } else if (this.aiPhase === 'returning') {
      moving = this.moveTowardXZ(this.spawn, RETURN_SPEED * delta);
      this.root.lookAt(this.spawn.x, this.root.position.y + 0.4, this.spawn.z);
      if (this.distXZ(this.root.position, this.spawn) < 0.48) {
        this.aiPhase = 'guarding';
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
        pushLog('邻园主人赶回花田了……');
      }
    } else {
      if (distPlayerFromGarden < AGGRO_RADIUS) {
        this.calmTimer = 0;
        const scale = gameState.friendChaserSpeedScale;
        const wobble = 1 + 0.14 * Math.sin(timeSec * 2.6);
        const spd = BASE_CHASE_SPEED * scale * wobble;
        this.tmp.set(px - this.root.position.x, 0, pz - this.root.position.z);
        const len = this.tmp.length();
        if (len > 0.08) {
          this.tmp.multiplyScalar(1 / len);
          this.root.position.x += this.tmp.x * spd * delta;
          this.root.position.z += this.tmp.z * spd * delta;
          moving = true;
        }
        this.root.lookAt(px, this.root.position.y + 0.4, pz);
        const dxp = px - this.root.position.x;
        const dzp = pz - this.root.position.z;
        if (this.catchCooldown <= 0 && Math.hypot(dxp, dzp) < CATCH_PLAYER_DIST) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('game:respawn-player'));
          }
          this.catchCooldown = CATCH_COOLDOWN_SEC;
          pushLog('被邻园主人撵回出发点！');
        }
      } else {
        this.calmTimer += delta;
        this.tmp.set(this.spawn.x - this.root.position.x, 0, this.spawn.z - this.root.position.z);
        const l = this.tmp.length();
        if (l > 0.02) {
          this.tmp.multiplyScalar(1 / l);
          const backSpd = 4 * delta;
          const step = Math.min(backSpd, l);
          this.root.position.x += this.tmp.x * step;
          this.root.position.z += this.tmp.z * step;
          moving = l > 0.15;
        }
        this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, 0, 1 - Math.exp(-5 * delta));

        const atPost = this.distXZ(this.root.position, this.spawn) < 0.55;
        if (atPost && this.calmTimer >= CALM_BEFORE_PATROL_SEC) {
          this.aiPhase = 'patrol';
          this.patrolIndex = 0;
          this.calmTimer = 0;
          pushLog('邻园主人又出去溜达了。');
        }
      }
    }

    this.setLocomotion(moving);
    this.mixer?.update(delta);
  }
}
