import * as THREE from 'three';

export function enableModelShadows(root: THREE.Object3D, cast = true, receive = true): void {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

/** FBX occasionally imports with invisible/culled materials; force a safe visible setup. */
export function forceModelVisible(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.visible = true;
    mesh.frustumCulled = false;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const m = mat as THREE.Material & {
        transparent?: boolean;
        opacity?: number;
        side?: THREE.Side;
        depthWrite?: boolean;
        depthTest?: boolean;
      };
      if ('transparent' in m) m.transparent = false;
      if ('opacity' in m) m.opacity = 1;
      if ('side' in m) m.side = THREE.DoubleSide;
      if ('depthWrite' in m) m.depthWrite = true;
      if ('depthTest' in m) m.depthTest = true;
      mat.needsUpdate = true;
    }
  });
}

function createToonGradientMap(): THREE.DataTexture {
  // 4-step toon ramp
  const data = new Uint8Array([24, 96, 172, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function createCartoonPatternMap(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffd88a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffb86b';
    for (let y = 0; y < 128; y += 16) ctx.fillRect(0, y, 128, 8);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 4;
    for (let i = -128; i < 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Apply cartoon-like toon shading while keeping base map/colors from original materials. */
export function stylizeModelCartoon(root: THREE.Object3D): void {
  const gradientMap = createToonGradientMap();
  const patternMap = createCartoonPatternMap();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const isSkinned = (mesh as THREE.SkinnedMesh).isSkinnedMesh === true;
    const srcMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const toonMats = srcMats.map((src) => {
      const m = src as THREE.MeshStandardMaterial;
      const toon = new THREE.MeshToonMaterial({
        map: patternMap,
        color: (m.color ?? new THREE.Color(0xffffff)).clone().multiplyScalar(1.06),
        transparent: false,
        opacity: 1,
        gradientMap,
      });
      // Keep skeletal animation and morph animation working after material swap.
      (toon as THREE.MeshToonMaterial & { skinning?: boolean; morphTargets?: boolean; morphNormals?: boolean }).skinning = isSkinned;
      (toon as THREE.MeshToonMaterial & { skinning?: boolean; morphTargets?: boolean; morphNormals?: boolean }).morphTargets =
        Boolean((mesh as THREE.Mesh & { morphTargetInfluences?: number[] }).morphTargetInfluences);
      (toon as THREE.MeshToonMaterial & { skinning?: boolean; morphTargets?: boolean; morphNormals?: boolean }).morphNormals =
        Boolean((mesh as THREE.Mesh & { morphTargetInfluences?: number[] }).morphTargetInfluences);
      toon.needsUpdate = true;
      return toon;
    });
    mesh.material = Array.isArray(mesh.material) ? toonMats : toonMats[0];
  });
}

/** 按包围盒高度缩放到 targetHeight，并把模型底对齐到本地 y=0（precise 利于 SkinnedMesh） */
export function normalizeModelHeight(root: THREE.Object3D, targetHeight: number): void {
  const box = new THREE.Box3().setFromObject(root, true);
  const size = box.getSize(new THREE.Vector3());
  const sy = targetHeight / Math.max(size.y, 1e-4);
  root.scale.setScalar(sy);
  box.setFromObject(root, true);
  root.position.y -= box.min.y;
}

function clipNameTrim(name: string): string {
  return name.trim();
}

/**
 * Three.js Soldier.glb 等常见顺序为 TPose → Idle → …；`clips.find(/\bidle\b)` 会先误匹配 **TPose**。
 * 绑定 / 参考姿不参与 locomotion。
 */
function isBindPoseClipName(name: string): boolean {
  const n = clipNameTrim(name).toLowerCase();
  if (/^t[-_]?pose$/i.test(clipNameTrim(name)) || n === 'tpose') return true;
  if (/\bbind\b/i.test(n) && /pose/i.test(n)) return true;
  if (/\breference\b/i.test(n)) return true;
  return false;
}

function findClipNameIgnoreCase(clips: THREE.AnimationClip[], exact: string): THREE.AnimationClip | null {
  const hit = THREE.AnimationClip.findByName(clips, exact);
  if (hit) return hit;
  const low = exact.toLowerCase();
  return clips.find((c) => clipNameTrim(c.name).toLowerCase() === low) ?? null;
}

function clipNameLower(clip: THREE.AnimationClip): string {
  return clipNameTrim(clip.name).toLowerCase();
}

function isNonLocomotionClipName(nameLow: string): boolean {
  return /\b(jump|dance|attack|punch|kick|hit|die|death|fall|roll|sit|clap|wave|emote)\b/i.test(nameLow);
}

function scoreRunLike(nameLow: string): number {
  let s = 0;
  if (/run/.test(nameLow)) s += 6;
  if (/jog/.test(nameLow)) s += 4;
  if (/walk/.test(nameLow)) s += 3;
  if (/\blocomo|movement|move\b/.test(nameLow)) s += 2;
  if (isNonLocomotionClipName(nameLow)) s -= 8;
  return s;
}

function scoreIdleLike(nameLow: string): number {
  let s = 0;
  if (/\bidle\b/.test(nameLow)) s += 7;
  if (/\bstand\b/.test(nameLow)) s += 3;
  if (/\bbreath|wait|survey|rest\b/.test(nameLow)) s += 2;
  if (/(run|walk|jog)/.test(nameLow)) s -= 4;
  if (isNonLocomotionClipName(nameLow)) s -= 6;
  return s;
}

/**
 * Mixamo 等导出常为 `Armature|Run`，`AnimationClip.findByName(clips, 'Run')` 会失败，故用名称子串匹配。
 * 显式排除 TPose，避免待机误选成绑定姿导致走路仍 T-pose。
 */
export function pickCharacterLocomotionClips(clips: THREE.AnimationClip[]): {
  idle: THREE.AnimationClip | null;
  run: THREE.AnimationClip | null;
} {
  if (!clips.length) return { idle: null, run: null };

  const locomotion = clips.filter((c) => !isBindPoseClipName(c.name));
  const byTest = (re: RegExp, pool: THREE.AnimationClip[] = locomotion) =>
    pool.find((c) => re.test(c.name)) ?? null;
  const candidates = locomotion.filter((c) => !isNonLocomotionClipName(clipNameLower(c)));
  const pool = candidates.length ? candidates : locomotion;

  // 位移时优先用 Walk：低速下更自然；无 Walk 再选 Run/Jog
  let run: THREE.AnimationClip | null =
    findClipNameIgnoreCase(pool, 'Walk') ||
    findClipNameIgnoreCase(pool, 'Walking') ||
    findClipNameIgnoreCase(pool, 'Run') ||
    findClipNameIgnoreCase(pool, 'Running') ||
    byTest(/walk/i, pool) ||
    byTest(/run/i, pool) ||
    byTest(/jog/i, pool) ||
    [...pool].sort((a, b) => scoreRunLike(clipNameLower(b)) - scoreRunLike(clipNameLower(a)))[0] ||
    null;

  let idle: THREE.AnimationClip | null =
    findClipNameIgnoreCase(pool, 'Idle') ||
    byTest(/(survey|idle|stand)/i, pool) ||
    [...pool].sort((a, b) => scoreIdleLike(clipNameLower(b)) - scoreIdleLike(clipNameLower(a)))[0] ||
    null;

  if (!idle && run && locomotion.length) {
    const runUuid = run.uuid;
    idle = locomotion.find((c) => c.uuid !== runUuid) ?? null;
  }

  if (!idle && !run) {
    idle = pool[0] ?? null;
    run = pool.find((c) => c.uuid !== idle?.uuid) ?? null;
  } else if (idle && run && idle.uuid === run.uuid) {
    run = pool.find((c) => c.uuid !== idle!.uuid) ?? null;
  }

  if (idle && !run && pool.length >= 1) {
    run = pool.find((c) => c.uuid !== idle.uuid) ?? null;
  }

  return { idle, run };
}
