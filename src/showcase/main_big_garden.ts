import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SEED_CONFIG, SEED_IDS, type SeedId } from '../modules/garden/types';
import {
  applyRendererProfile,
  createPerformanceProfile,
  freezeStaticTransforms,
  getRendererOptions,
  optimizeShadowCasting,
  resizeRenderer,
  type PerformanceProfile,
} from '../core/performanceProfile';

function makeRenderer(profile: PerformanceProfile): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer(getRendererOptions(profile));
  applyRendererProfile(r, profile);
  return r;
}

function toPastelColor(color: THREE.Color): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const out = color.clone();
  out.setHSL(hsl.h, Math.min(0.45, hsl.s * 0.62 + 0.05), Math.min(0.72, hsl.l * 0.78 + 0.06));
  return out;
}

type SharedStandardMaterialOptions = {
  color: number;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: THREE.Side;
};

type SharedBasicMaterialOptions = {
  color: number;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: THREE.Side;
};

const sharedStaticStandardMaterials = new Map<string, THREE.MeshStandardMaterial>();
const sharedStaticBasicMaterials = new Map<string, THREE.MeshBasicMaterial>();
const sharedToyMaterials = new Map<string, THREE.MeshToonMaterial>();
const sharedBoxGeometries = new Map<string, THREE.BoxGeometry>();
const sharedSphereGeometries = new Map<string, THREE.SphereGeometry>();
const sharedCylinderGeometries = new Map<string, THREE.CylinderGeometry>();
const sharedCircleGeometries = new Map<string, THREE.CircleGeometry>();
const sharedRingGeometries = new Map<string, THREE.RingGeometry>();
const sharedTorusGeometries = new Map<string, THREE.TorusGeometry>();
const sharedOctaGeometries = new Map<string, THREE.OctahedronGeometry>();

function getSharedStaticStandardMaterial(options: SharedStandardMaterialOptions): THREE.MeshStandardMaterial {
  const key = [
    options.color,
    options.roughness ?? '',
    options.metalness ?? '',
    options.emissive ?? '',
    options.emissiveIntensity ?? '',
    options.transparent ?? '',
    options.opacity ?? '',
    options.depthWrite ?? '',
    options.depthTest ?? '',
    options.side ?? '',
  ].join('|');
  let material = sharedStaticStandardMaterials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial(options);
    sharedStaticStandardMaterials.set(key, material);
  }
  return material;
}

function getSharedStaticBasicMaterial(options: SharedBasicMaterialOptions): THREE.MeshBasicMaterial {
  const key = [
    options.color,
    options.transparent ?? '',
    options.opacity ?? '',
    options.depthWrite ?? '',
    options.depthTest ?? '',
    options.side ?? '',
  ].join('|');
  let material = sharedStaticBasicMaterials.get(key);
  if (!material) {
    material = new THREE.MeshBasicMaterial(options);
    sharedStaticBasicMaterials.set(key, material);
  }
  return material;
}

function getSharedBoxGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
  const key = `${width}|${height}|${depth}`;
  let geometry = sharedBoxGeometries.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(width, height, depth);
    sharedBoxGeometries.set(key, geometry);
  }
  return geometry;
}

function getSharedSphereGeometry(
  widthSegments: number,
  heightSegments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
  thetaStart = 0,
  thetaLength = Math.PI,
): THREE.SphereGeometry {
  const key = `${widthSegments}|${heightSegments}|${phiStart}|${phiLength}|${thetaStart}|${thetaLength}`;
  let geometry = sharedSphereGeometries.get(key);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(1, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
    sharedSphereGeometries.set(key, geometry);
  }
  return geometry;
}

function getSharedCylinderGeometry(
  radialSegments: number,
  radiusTopRatio: number,
  openEnded = false,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
): THREE.CylinderGeometry {
  const key = `${radialSegments}|${radiusTopRatio}|${openEnded}|${thetaStart}|${thetaLength}`;
  let geometry = sharedCylinderGeometries.get(key);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(radiusTopRatio, 1, 1, radialSegments, 1, openEnded, thetaStart, thetaLength);
    sharedCylinderGeometries.set(key, geometry);
  }
  return geometry;
}

function getSharedCircleGeometry(segments: number): THREE.CircleGeometry {
  let geometry = sharedCircleGeometries.get(`${segments}`);
  if (!geometry) {
    geometry = new THREE.CircleGeometry(1, segments);
    sharedCircleGeometries.set(`${segments}`, geometry);
  }
  return geometry;
}

function getSharedRingGeometry(
  innerRatio: number,
  thetaSegments: number,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
): THREE.RingGeometry {
  const key = `${innerRatio}|${thetaSegments}|${thetaStart}|${thetaLength}`;
  let geometry = sharedRingGeometries.get(key);
  if (!geometry) {
    geometry = new THREE.RingGeometry(innerRatio, 1, thetaSegments, 1, thetaStart, thetaLength);
    sharedRingGeometries.set(key, geometry);
  }
  return geometry;
}

function getSharedTorusGeometry(
  tubeRatio: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
): THREE.TorusGeometry {
  const key = `${tubeRatio}|${radialSegments}|${tubularSegments}|${arc}`;
  let geometry = sharedTorusGeometries.get(key);
  if (!geometry) {
    geometry = new THREE.TorusGeometry(1, tubeRatio, radialSegments, tubularSegments, arc);
    sharedTorusGeometries.set(key, geometry);
  }
  return geometry;
}

function getSharedOctaGeometry(detail = 0): THREE.OctahedronGeometry {
  let geometry = sharedOctaGeometries.get(`${detail}`);
  if (!geometry) {
    geometry = new THREE.OctahedronGeometry(1, detail);
    sharedOctaGeometries.set(`${detail}`, geometry);
  }
  return geometry;
}

function makeScaledSphere(
  radius: number,
  material: THREE.Material,
  widthSegments: number,
  heightSegments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
  thetaStart = 0,
  thetaLength = Math.PI,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    getSharedSphereGeometry(widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength),
    material,
  );
  mesh.scale.setScalar(radius);
  return mesh;
}

function makeScaledCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number,
  material: THREE.Material,
  openEnded = false,
): THREE.Mesh {
  const baseRadius = Math.max(radiusBottom, 1e-4);
  const mesh = new THREE.Mesh(
    getSharedCylinderGeometry(radialSegments, radiusTop / baseRadius, openEnded),
    material,
  );
  mesh.scale.set(baseRadius, height, baseRadius);
  return mesh;
}

function makeScaledCircle(radius: number, segments: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(getSharedCircleGeometry(segments), material);
  mesh.scale.setScalar(radius);
  return mesh;
}

function makeScaledRing(
  innerRadius: number,
  outerRadius: number,
  thetaSegments: number,
  material: THREE.Material,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    getSharedRingGeometry(innerRadius / Math.max(outerRadius, 1e-4), thetaSegments, thetaStart, thetaLength),
    material,
  );
  mesh.scale.setScalar(outerRadius);
  return mesh;
}

function makeScaledTorus(
  radius: number,
  tubeRadius: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    getSharedTorusGeometry(tubeRadius / Math.max(radius, 1e-4), radialSegments, tubularSegments, arc),
    material,
  );
  mesh.scale.setScalar(radius);
  return mesh;
}

function makeScaledOctahedron(radius: number, detail: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(getSharedOctaGeometry(detail), material);
  mesh.scale.setScalar(radius);
  return mesh;
}

type StaticInstance = {
  px: number;
  py: number;
  pz: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
};

function addInstancedSet(
  root: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  instances: StaticInstance[],
  options?: { castShadow?: boolean; receiveShadow?: boolean },
): THREE.InstancedMesh | null {
  if (instances.length === 0) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < instances.length; i++) {
    const item = instances[i]!;
    dummy.position.set(item.px, item.py, item.pz);
    dummy.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
    dummy.scale.set(item.sx ?? 1, item.sy ?? item.sx ?? 1, item.sz ?? item.sx ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = options?.castShadow ?? false;
  mesh.receiveShadow = options?.receiveShadow ?? false;
  root.add(mesh);
  return mesh;
}

function getToyMaterialKey(material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial): string {
  const base = toPastelColor(material.color ?? new THREE.Color(0xffffff));
  return [
    base.getHexString(),
    material.transparent,
    material.opacity,
    material.depthWrite,
    material.depthTest,
    material.side,
  ].join('|');
}

function getSharedToyMaterial(material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial): THREE.MeshToonMaterial {
  const key = getToyMaterialKey(material);
  let toon = sharedToyMaterials.get(key);
  if (!toon) {
    const base = toPastelColor(material.color ?? new THREE.Color(0xffffff));
    // Plot cells use transparent materials, so we preserve transparency settings
    const preserveTransparency = material.transparent && material.opacity < 0.9;
    toon = new THREE.MeshToonMaterial({
      color: base,
      emissive: base.clone().multiplyScalar(0.03),
      transparent: preserveTransparency,
      opacity: preserveTransparency ? material.opacity : 1.0,
      depthWrite: preserveTransparency ? false : material.depthWrite,
      depthTest: material.depthTest,
      side: material.side,
    });
    sharedToyMaterials.set(key, toon);
  }
  return toon;
}

function applyToyStyle(root: THREE.Object3D, profile: PerformanceProfile): void {
  const replaced = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    const toonMaterials = materials.map((m) => {
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial)) {
        return m;
      }
      replaced.add(m);
      return getSharedToyMaterial(m);
    });
    obj.material = Array.isArray(obj.material) ? toonMaterials : toonMaterials[0]!;
    obj.receiveShadow = true;
  });
  for (const material of replaced) {
    material.dispose();
  }
  optimizeShadowCasting(root, profile.minShadowCasterRadius);
}

function disableRealtimeShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
  });
}

function makeFlower(color: number): THREE.Group {
  const g = new THREE.Group();
  const stem = makeScaledCylinder(
    0.02,
    0.03,
    0.56,
    10,
    getSharedStaticStandardMaterial({ color: 0x4d8650, roughness: 0.68 }),
  );
  stem.position.y = 0.28;
  stem.castShadow = true;
  const head = makeScaledSphere(
    0.1,
    getSharedStaticStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.5 }),
    12,
    10,
  );
  head.position.y = 0.62;
  head.castShadow = true;
  g.add(stem, head);
  return g;
}

function makeShopIconDataUrl(): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8a2d9"/>
      <stop offset="1" stop-color="#b575f6"/>
    </linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f28ccd"/>
      <stop offset="1" stop-color="#ffb46f"/>
    </linearGradient>
  </defs>
  <rect x="10" y="16" width="108" height="36" rx="12" fill="url(#roof)"/>
  <rect x="18" y="44" width="92" height="72" rx="10" fill="url(#wall)"/>
  <rect x="22" y="48" width="84" height="20" rx="8" fill="#ffffff"/>
  <rect x="26" y="48" width="14" height="20" rx="4" fill="#ffd6e8"/>
  <rect x="54" y="48" width="14" height="20" rx="4" fill="#ffd6e8"/>
  <rect x="82" y="48" width="14" height="20" rx="4" fill="#ffd6e8"/>
  <rect x="28" y="66" width="30" height="40" rx="6" fill="#ffc44d"/>
  <rect x="64" y="66" width="38" height="40" rx="6" fill="#f6f8ff"/>
  <circle cx="53" cy="86" r="3" fill="#f3a18a"/>
  <text x="64" y="39" text-anchor="middle" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#ffd85f">SHOP</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

type PreviewLocomotionMode = 'idle' | 'walk' | 'run';
type ChibiPreviewRig = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
};

type ShowcaseSeedState = {
  gold: number;
  selectedSeed: SeedId;
  seeds: Record<SeedId, number>;
};

type PlotStage = 0 | 1 | 2 | 3 | 4;
type PlotLifeState = {
  seedId: SeedId;
  stage: PlotStage;
  growProgress: number;
  needsWater: boolean;
  needsFertilizer: boolean;
  fertilizerCooldown: number;
  giantBloom: boolean;
  matureProgress: number;
  matureClusterReady: boolean;
  transitionPulse: number; // 过渡脉冲动画（0-1）
};

type PlotFx = {
  group: THREE.Group;
  t: number;
  ttl: number;
  kind: 'water' | 'fertilize' | 'mature';
};

const sharedPlantToonMaterials = new Map<number, THREE.MeshToonMaterial>();
const sharedPlantGeometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 10, 8),
  octa: new THREE.OctahedronGeometry(0.5),
  cone: new THREE.ConeGeometry(0.5, 1, 6),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 6),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  ring: new THREE.RingGeometry(0.5, 1, 22),
  dodeca: new THREE.DodecahedronGeometry(0.5),
};
const sharedPlantGeometrySet = new Set<THREE.BufferGeometry>(Object.values(sharedPlantGeometries));

const getSharedPlantToonMaterial = (color: number): THREE.MeshToonMaterial => {
  let mat = sharedPlantToonMaterials.get(color);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color });
    sharedPlantToonMaterials.set(color, mat);
  }
  return mat;
};

const isSharedPlantGeometry = (geometry: THREE.BufferGeometry): boolean =>
  sharedPlantGeometrySet.has(geometry);

const isSharedPlantMaterial = (material: THREE.Material): boolean => {
  for (const shared of sharedPlantToonMaterials.values()) {
    if (shared === material) return true;
  }
  return false;
};

function disposePlantVisual(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.geometry && !isSharedPlantGeometry(obj.geometry)) {
      obj.geometry.dispose();
    }
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (material && !isSharedPlantMaterial(material)) {
        material.dispose();
      }
    }
  });
}

function createChibiPreviewPlayer(): ChibiPreviewRig {
  const root = new THREE.Group();
  root.name = 'PreviewPlayerChibi';

  const skin = new THREE.MeshToonMaterial({ color: 0xf7d8bf });
  const hair = new THREE.MeshToonMaterial({ color: 0x26324f });
  const coat = new THREE.MeshToonMaterial({ color: 0x5f7ddd });
  const trim = new THREE.MeshToonMaterial({ color: 0xeef3ff });
  const shorts = new THREE.MeshToonMaterial({ color: 0x2f3c64 });
  const socks = new THREE.MeshToonMaterial({ color: 0xf8fbff });
  const shoes = new THREE.MeshToonMaterial({ color: 0xbc5156 });
  const eyeWhite = new THREE.MeshToonMaterial({ color: 0xf9fcff });
  const pupil = new THREE.MeshToonMaterial({ color: 0x2a3555 });
  const blush = new THREE.MeshToonMaterial({ color: 0xffa3ad });

  const torso = new THREE.Group();
  torso.position.y = 0.95;
  root.add(torso);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 6, 12), coat);
  torso.add(body);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.08), trim);
  shirt.position.set(0, 0, -0.17);
  torso.add(shirt);
  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), new THREE.MeshToonMaterial({ color: 0xde6a7f }));
  tie.position.set(0, -0.01, -0.21);
  tie.rotation.x = Math.PI * 0.5;
  torso.add(tie);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.29, 1.03, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 5, 8), coat);
  leftArmMesh.position.y = -0.18;
  leftArm.add(leftArmMesh);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin);
  leftHand.position.y = -0.36;
  leftArm.add(leftHand);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.29, 1.03, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 5, 8), coat);
  rightArmMesh.position.y = -0.18;
  rightArm.add(rightArmMesh);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin);
  rightHand.position.y = -0.36;
  rightArm.add(rightHand);
  root.add(rightArm);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.11, 0.58, 0);
  const leftLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.28, 5, 8), shorts);
  leftLegMesh.position.y = -0.18;
  leftLeg.add(leftLegMesh);
  const leftSock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.12, 8), socks);
  leftSock.position.y = -0.37;
  leftLeg.add(leftSock);
  const leftShoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), shoes);
  leftShoe.scale.set(1.05, 0.62, 1.45);
  leftShoe.position.set(0, -0.46, -0.04);
  leftLeg.add(leftShoe);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.11, 0.58, 0);
  const rightLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.28, 5, 8), shorts);
  rightLegMesh.position.y = -0.18;
  rightLeg.add(rightLegMesh);
  const rightSock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.12, 8), socks);
  rightSock.position.y = -0.37;
  rightLeg.add(rightSock);
  const rightShoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), shoes);
  rightShoe.scale.set(1.05, 0.62, 1.45);
  rightShoe.position.set(0, -0.46, -0.04);
  rightLeg.add(rightShoe);
  root.add(rightLeg);

  const head = new THREE.Group();
  head.position.y = 1.43;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 20), skin);
  head.add(face);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  hairCap.position.y = 0.08;
  head.add(hairCap);
  const bangL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hair);
  bangL.position.set(-0.12, 0.02, -0.27);
  bangL.scale.set(1.0, 0.82, 0.8);
  head.add(bangL);
  const bangR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hair);
  bangR.position.set(0.12, 0.01, -0.27);
  bangR.scale.set(1.0, 0.82, 0.8);
  head.add(bangR);
  const eyeLX = -0.11;
  const eyeRX = 0.11;
  const eyeY = 0.02;
  const eyeZ = -0.29;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeWhite);
  eyeL.position.set(eyeLX, eyeY, eyeZ);
  eyeL.scale.set(0.82, 1.08, 0.5);
  head.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeWhite);
  eyeR.position.set(eyeRX, eyeY, eyeZ);
  eyeR.scale.set(0.82, 1.08, 0.5);
  head.add(eyeR);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), pupil);
  pupilL.position.set(eyeLX, eyeY - 0.005, eyeZ - 0.025);
  head.add(pupilL);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), pupil);
  pupilR.position.set(eyeRX, eyeY - 0.005, eyeZ - 0.025);
  head.add(pupilR);
  const blushL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), blush);
  blushL.position.set(-0.19, -0.06, -0.25);
  blushL.scale.set(1.3, 0.72, 0.42);
  head.add(blushL);
  const blushR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), blush);
  blushR.position.set(0.19, -0.06, -0.25);
  blushR.scale.set(1.3, 0.72, 0.42);
  head.add(blushR);
  root.add(head);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
  });

  return { root, torso, head, leftArm, rightArm, leftLeg, rightLeg };
}

function animateChibiPreview(rig: ChibiPreviewRig, mode: PreviewLocomotionMode, delta: number, phase: { value: number }): void {
  if (mode !== 'idle') {
    const running = mode === 'run';
    phase.value += delta * (running ? 16 : 10);
    const stride = Math.sin(phase.value);
    const sway = Math.sin(phase.value * 0.5);
    const settle = Math.min(1, delta * 16);
    const legAmp = running ? 0.88 : 0.56;
    const armAmp = running ? 1.02 : 0.64;
    const bob = running ? 0.092 : 0.058;
    rig.root.position.y += ((Math.abs(stride) - 0.5) * bob - rig.root.position.y) * settle;
    rig.root.rotation.x += ((running ? 0.1 : 0.06) + Math.cos(phase.value) * 0.024 - rig.root.rotation.x) * settle;
    rig.root.rotation.z += (sway * (running ? 0.05 : 0.03) - rig.root.rotation.z) * settle;
    rig.leftArm.rotation.x += ((-stride * armAmp) - 0.32 - rig.leftArm.rotation.x) * settle;
    rig.rightArm.rotation.x += ((stride * armAmp) - 0.32 - rig.rightArm.rotation.x) * settle;
    rig.leftArm.rotation.z += (0.12 - rig.leftArm.rotation.z) * settle;
    rig.rightArm.rotation.z += (-0.12 - rig.rightArm.rotation.z) * settle;
    rig.leftLeg.rotation.x += (stride * legAmp - rig.leftLeg.rotation.x) * settle;
    rig.rightLeg.rotation.x += (-stride * legAmp - rig.rightLeg.rotation.x) * settle;
    rig.torso.rotation.y += (sway * (running ? 0.11 : 0.08) - rig.torso.rotation.y) * settle;
    rig.head.rotation.y += (Math.sin(phase.value * 0.42) * 0.09 - rig.head.rotation.y) * settle;
  } else {
    phase.value += delta * 5;
    const settle = Math.min(1, delta * 10);
    rig.root.position.y += (Math.sin(phase.value * 0.5) * 0.016 - rig.root.position.y) * settle;
    rig.root.rotation.x += (0 - rig.root.rotation.x) * settle;
    rig.root.rotation.z += (0 - rig.root.rotation.z) * settle;
    rig.leftArm.rotation.x += (-0.28 - rig.leftArm.rotation.x) * settle;
    rig.rightArm.rotation.x += (-0.28 - rig.rightArm.rotation.x) * settle;
    rig.leftArm.rotation.z += (0.1 - rig.leftArm.rotation.z) * settle;
    rig.rightArm.rotation.z += (-0.1 - rig.rightArm.rotation.z) * settle;
    rig.leftLeg.rotation.x += (0 - rig.leftLeg.rotation.x) * settle;
    rig.rightLeg.rotation.x += (0 - rig.rightLeg.rotation.x) * settle;
    rig.torso.rotation.y += (0 - rig.torso.rotation.y) * settle;
    rig.head.rotation.y += (Math.sin(phase.value * 0.25) * 0.03 - rig.head.rotation.y) * settle;
  }
}

function pointInPolygon(px: number, pz: number, polygon: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x;
    const zi = polygon[i]!.y;
    const xj = polygon[j]!.x;
    const zj = polygon[j]!.y;
    const intersect = ((zi > pz) !== (zj > pz))
      && (px < ((xj - xi) * (pz - zi)) / ((zj - zi) || 1e-6) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function addPlantingSubplots(
  root: THREE.Group,
  polygon: THREE.Vector2[],
  opts?: { step?: number; topY?: number; maxPlots?: number },
): void {
  if (polygon.length < 3) return;
  const step = opts?.step ?? 0.5;
  const topY = opts?.topY ?? 0.395;
  const maxPlots = opts?.maxPlots ?? 80;
  const inset = step * 0.36;

  const minX = Math.min(...polygon.map((p) => p.x));
  const maxX = Math.max(...polygon.map((p) => p.x));
  const minZ = Math.min(...polygon.map((p) => p.y));
  const maxZ = Math.max(...polygon.map((p) => p.y));

  const capMat = new THREE.MeshStandardMaterial({
    color: 0xc9d3df,
    roughness: 0.9,
    metalness: 0.04,
    transparent: true,
    opacity: 0.32,
    depthWrite: true,
  });
  const capGeo = new THREE.BoxGeometry(inset * 1.28, 0.062, inset * 1.28);

  let created = 0;
  for (let z = minZ + step * 0.5; z <= maxZ - step * 0.5; z += step) {
    for (let x = minX + step * 0.5; x <= maxX - step * 0.5; x += step) {
      if (created >= maxPlots) return;
      const sampleR = inset * 0.92;
      const samples: Array<[number, number]> = [
        [x, z],
        [x - sampleR, z],
        [x + sampleR, z],
        [x, z - sampleR],
        [x, z + sampleR],
      ];
      if (!samples.every(([sx, sz]) => pointInPolygon(sx, sz, polygon))) continue;

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(x, topY + 0.026, z);
      cap.receiveShadow = true;
      cap.castShadow = false;
      cap.visible = true;
      cap.userData.plotCell = true;
      cap.userData.planted = false;
      cap.userData.seedId = null;
      cap.userData.flower = null;
      root.add(cap);
      created++;
    }
  }
}

// ── Border decoration helpers ────────────────────────────────────────────────

function addBorderStone(root: THREE.Group, x: number, z: number, scale: number, tall = false, collector?: THREE.Object3D[]): void {
  const mat = getSharedStaticStandardMaterial({
    color: tall ? 0xb8b0a4 : 0xc8bfb2,
    roughness: 0.92,
    metalness: 0.03,
  });
  const baseR = tall ? 2.0 : 1.5;
  const stone = makeScaledOctahedron(baseR * scale, 1, mat);
  const sx = stone.scale.x;
  stone.scale.set(
    sx * (0.65 + Math.random() * 0.25),
    sx * (0.38 + Math.random() * 0.18),
    sx * (0.65 + Math.random() * 0.22),
  );
  stone.position.set(x, 0.38, z);
  stone.rotation.y = Math.random() * Math.PI * 2;
  stone.rotation.x = (Math.random() - 0.5) * 0.4;
  stone.castShadow = true;
  root.add(stone);
  if (collector) collector.push(stone);
}

function addBorderGrassTuft(root: THREE.Group, x: number, z: number, scale = 1, collector?: THREE.Object3D[]): void {
  const mat = getSharedStaticStandardMaterial({ color: 0x5da33f, roughness: 0.88 });
  const g = new THREE.Group();
  const blades = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blades; i++) {
    const h = (0.04 + Math.random() * 0.04) * scale;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.01 * scale, h, 0.01 * scale),
      mat,
    );
    blade.position.set(
      (Math.random() - 0.5) * 0.04 * scale,
      h * 0.5,
      (Math.random() - 0.5) * 0.04 * scale,
    );
    blade.rotation.x = (Math.random() - 0.5) * 0.5;
    blade.rotation.z = (Math.random() - 0.5) * 0.5;
    g.add(blade);
  }
  g.position.set(x, 0.38, z);
  g.castShadow = false;
  root.add(g);
  if (collector) collector.push(g);
}

function addBorderMushroom(root: THREE.Group, x: number, z: number, scale = 1, collector?: THREE.Object3D[]): void {
  const stemMat = getSharedStaticStandardMaterial({ color: 0xf0ead6, roughness: 0.85 });
  const capMat = getSharedStaticStandardMaterial({ color: 0x8b6914, roughness: 0.78 });
  const stemHeight = 0.12 * scale;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * scale, 0.022 * scale, stemHeight, 8),
    stemMat,
  );
  stem.position.set(x, 0.38 + stemHeight * 0.5, z);
  root.add(stem);

  const capGeo = new THREE.SphereGeometry(0.04 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(x, 0.38 + stemHeight + 0.04 * scale, z);
  root.add(cap);

  if (collector) { collector.push(stem); collector.push(cap); }
}

function addBorderDecorations(
  root: THREE.Group,
  outline: THREE.Vector2[],
  density = 0.12,
  decorCollector?: THREE.Object3D[],
): void {
  if (outline.length < 3) return;
  const postMat = getSharedStaticStandardMaterial({ color: 0xf1eee3, roughness: 0.9 });
  const railMat = getSharedStaticStandardMaterial({ color: 0xe7dfd2, roughness: 0.88 });
  const center = outline
    .reduce((acc, p) => acc.add(p), new THREE.Vector2(0, 0))
    .multiplyScalar(1 / outline.length);

  const positions: Array<{
    x: number; z: number;
    tangent: THREE.Vector2;
    inward: THREE.Vector2;
    state: 'decor' | 'fence';
  }> = [];
  let fenceMode = false;

  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const edge = new THREE.Vector2().subVectors(b, a);
    const len = edge.length();
    if (len < 0.08) continue;
    const steps = Math.max(3, Math.floor(len / density));
    const tangent = edge.clone().multiplyScalar(1 / len);
    const normal = new THREE.Vector2(-tangent.y, tangent.x);

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const base = new THREE.Vector2(
        THREE.MathUtils.lerp(a.x, b.x, t),
        THREE.MathUtils.lerp(a.y, b.y, t),
      );
      const wobble = (Math.random() - 0.5) * 0.12;
      const px = base.x + normal.x * wobble;
      const pz = base.y + normal.y * wobble;
      const inward = center.clone().sub(base).normalize();
      const seed = (i * 37 + s * 13) & 0xffff;
      const rand = (n: number) => ((seed * 2654435761 + n) & 0xffff) / 0xffff;

      fenceMode = fenceMode
        ? rand(2) < 0.45
        : rand(1) < 0.30;

      positions.push({ x: px, z: pz, tangent: tangent.clone(), inward: inward.clone(), state: fenceMode ? 'fence' : 'decor' });
    }
  }

  for (const pos of positions) {
    if (pos.state !== 'decor') continue;
    const { x, z, inward, tangent } = pos;
    const seed = ((x * 100 + z * 73) | 0);
    const rng = (n: number) => ((seed * 2654435761 + n) & 0xffff) / 0xffff;

    const innerCount = Math.random() < 0.6 ? 1 : 2;
    for (let k = 0; k < innerCount; k++) {
      const off = inward.clone().multiplyScalar(0.02 + rng(k * 7) * 0.10);
      const side = tangent.clone().multiplyScalar((rng(k * 3) - 0.5) * 0.16);
      const size = 0.02 + rng(k * 11) * 0.20;
      const isTall = rng(k * 5) < 0.20;
      addBorderStone(root, x + off.x + side.x, z + off.y + side.y, size, isTall, decorCollector);
    }

    if (rng(4) < 0.25) {
      const off = inward.clone().multiplyScalar(0.09 + rng(5) * 0.08);
      const side = tangent.clone().multiplyScalar((rng(6) - 0.5) * 0.08);
      const size = 0.02 + rng(7) * 0.10;
      addBorderStone(root, x + off.x + side.x, z + off.y + side.y, size, false, decorCollector);
    }

    if (rng(8) < 0.45) {
      const mOff = inward.clone().multiplyScalar(0.04 + rng(9) * 0.05);
      const mSide = tangent.clone().multiplyScalar((rng(10) - 0.5) * 0.04);
      addBorderMushroom(root, x + mOff.x + mSide.x, z + mOff.y + mSide.y, 0.7 + rng(11) * 0.55, decorCollector);
    }

    if (rng(12) < 0.55) {
      const gOff = inward.clone().multiplyScalar(0.03 + rng(13) * 0.06);
      const gSide = tangent.clone().multiplyScalar((rng(14) - 0.5) * 0.05);
      addBorderGrassTuft(root, x + gOff.x + gSide.x, z + gOff.y + gSide.y, 0.5 + rng(15) * 0.7, decorCollector);
    }
  }

  for (const pos of positions) {
    if (pos.state !== 'fence') continue;
    const { x, z, tangent } = pos;
    const ph = 0.38;
    const r = 0.018 + Math.random() * 0.010;
    const post = makeScaledCylinder(r, r * 1.1, ph, 6, postMat);
    post.position.set(x, ph * 0.5 + 0.15, z);
    post.rotation.y = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
    post.castShadow = true;
    root.add(post);
    if (decorCollector) decorCollector.push(post);
  }
}

function addFenceLoop(root: THREE.Group, width: number, depth: number): void {
  const postMat = new THREE.MeshStandardMaterial({ color: 0xc79b6f, roughness: 0.9 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xb88b60, roughness: 0.88 });
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const spacing = 0.56;

  const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.62, 8);
  const railGeoH = new THREE.BoxGeometry(0.5, 0.06, 0.06);
  const railGeoV = new THREE.BoxGeometry(0.06, 0.06, 0.5);

  for (let x = -halfW; x <= halfW + 1e-6; x += spacing) {
    for (const z of [-halfD, halfD]) {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(x, 0.31, z);
      p.castShadow = true;
      root.add(p);
    }
  }
  for (let z = -halfD; z <= halfD + 1e-6; z += spacing) {
    for (const x of [-halfW, halfW]) {
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(x, 0.31, z);
      p.castShadow = true;
      root.add(p);
    }
  }
  for (let x = -halfW + spacing * 0.5; x <= halfW - spacing * 0.5 + 1e-6; x += spacing) {
    for (const z of [-halfD, halfD]) {
      const r = new THREE.Mesh(railGeoH, railMat);
      r.position.set(x, 0.44, z);
      r.castShadow = true;
      root.add(r);
    }
  }
  for (let z = -halfD + spacing * 0.5; z <= halfD - spacing * 0.5 + 1e-6; z += spacing) {
    for (const x of [-halfW, halfW]) {
      const r = new THREE.Mesh(railGeoV, railMat);
      r.position.set(x, 0.44, z);
      r.castShadow = true;
      root.add(r);
    }
  }
}

function scatterPebblePath(root: THREE.Group, points: THREE.Vector3[], width = 0.46): void {
  const roadMat = getSharedStaticStandardMaterial({ color: 0xf0c35f, roughness: 0.96 });
  const edgeMat = getSharedStaticStandardMaterial({ color: 0xd9a956, roughness: 0.95 });
  const pebbleMat = getSharedStaticStandardMaterial({ color: 0xf5ecdd, roughness: 0.96 });
  const roadY = 0.392;
  const edgeY = 0.391;
  const stoneY = 0.435;
  const roadInstances: StaticInstance[] = [];
  const edgeInstances: StaticInstance[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const len = a.distanceTo(b);
    const steps = Math.max(2, Math.floor(len / 0.35));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const tangent = new THREE.Vector3().subVectors(b, a).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const baseX = THREE.MathUtils.lerp(a.x, b.x, t);
      const baseZ = THREE.MathUtils.lerp(a.z, b.z, t);
      roadInstances.push({ px: baseX, py: roadY, pz: baseZ, sx: width * 1.2, sy: width * 1.2, sz: 1, rx: -Math.PI / 2 });
      edgeInstances.push({ px: baseX, py: edgeY, pz: baseZ, sx: width * 1.3, sy: width * 1.3, sz: 1, rx: -Math.PI / 2 });

      const offset = (Math.random() - 0.5) * width * 0.76;
      const x = baseX + normal.x * offset + (Math.random() - 0.5) * 0.05;
      const z = baseZ + normal.z * offset + (Math.random() - 0.5) * 0.05;
      // Reduce stepping-stone density for cleaner visual rhythm.
      if (Math.random() < 0.12) {
        const stone = makeScaledCylinder(
          0.2 + Math.random() * 0.08,
          0.23 + Math.random() * 0.08,
          0.1,
          10,
          pebbleMat,
        );
        stone.position.set(x, stoneY + Math.random() * 0.01, z);
        stone.rotation.y = Math.random() * Math.PI;
        stone.castShadow = true;
        stone.receiveShadow = true;
        root.add(stone);
      }
    }
  }
  addInstancedSet(root, getSharedCircleGeometry(22), roadMat, roadInstances, { receiveShadow: true });
  addInstancedSet(root, getSharedRingGeometry((width * 1.08) / (width * 1.3), 20), edgeMat, edgeInstances, { receiveShadow: true });
}

function addSecretPebblePath(root: THREE.Group): void {
  const path = [
    new THREE.Vector3(-9.1, 0.2, 7.0),
    new THREE.Vector3(-7.6, 0.2, 5.9),
    new THREE.Vector3(-5.8, 0.2, 4.7),
    new THREE.Vector3(-3.4, 0.2, 3.1),
    new THREE.Vector3(-1.6, 0.2, 2.0),
    new THREE.Vector3(0.2, 0.2, 1.0),
    new THREE.Vector3(1.4, 0.2, 0.1),
    new THREE.Vector3(2.3, 0.2, -1.1),
    new THREE.Vector3(3.3, 0.2, -2.4),
    new THREE.Vector3(4.6, 0.2, -3.7),
    new THREE.Vector3(6.2, 0.2, -5.0),
    new THREE.Vector3(8.8, 0.2, -7.0),
  ];
  scatterPebblePath(root, path, 0.42);

  const sidePebbleMat = getSharedStaticStandardMaterial({ color: 0xe4dac8, roughness: 0.98 });
  const pebbleInstances: StaticInstance[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const tangent = new THREE.Vector3().subVectors(b, a).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    for (let s = 0; s < 3; s++) {
      const t = s / 3;
      const px = THREE.MathUtils.lerp(a.x, b.x, t);
      const pz = THREE.MathUtils.lerp(a.z, b.z, t);
      for (const side of [-1, 1] as const) {
        if (Math.random() < 0.5) continue;
        const d = 0.34 + Math.random() * 0.14;
        const radius = 0.05 + Math.random() * 0.03;
        pebbleInstances.push({
          px: px + normal.x * d * side,
          py: 0.42,
          pz: pz + normal.z * d * side,
          sx: radius,
          sy: radius,
          sz: radius,
        });
      }
    }
  }
  addInstancedSet(root, getSharedSphereGeometry(8, 6), sidePebbleMat, pebbleInstances, { castShadow: true });
}

function addMiniFenceRing(root: THREE.Group, x: number, z: number, r: number): void {
  const postMat = getSharedStaticStandardMaterial({ color: 0xc59667, roughness: 0.9 });
  const railMat = getSharedStaticStandardMaterial({ color: 0xb88657, roughness: 0.88 });
  const count = Math.max(16, Math.floor(r * 34));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const px = x + Math.cos(a) * (r + 0.12);
    const pz = z + Math.sin(a) * (r + 0.12);
    const p = makeScaledCylinder(0.028, 0.032, 0.34, 7, postMat);
    p.position.set(px, 0.43, pz);
    p.castShadow = true;
    root.add(p);
  }
  const ring = makeScaledTorus(r + 0.12, 0.018, 8, 80, Math.PI * 2, railMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.55, z);
  root.add(ring);
}

function addGroundZone(root: THREE.Group, x: number, z: number, r: number, _flowerColor: number): void {
  const segments = 18;
  const profile = Array.from({ length: segments }, (_, i) => {
    const waveA = Math.sin((i / segments) * Math.PI * 2 * 2.0) * 0.18;
    const waveB = Math.cos((i / segments) * Math.PI * 2 * 3.0) * 0.12;
    return 1.0 + waveA + waveB;
  });
  const outline: THREE.Vector2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const radius = r * THREE.MathUtils.clamp(profile[i]!, 0.7, 1.35);
    outline.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
  }

  const shape = new THREE.Shape(outline);
  const capMat = getSharedStaticStandardMaterial({ color: 0x1a4a2a, roughness: 0.92 });
  const cap = new THREE.Mesh(new THREE.ShapeGeometry(shape), capMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(x, 0.352, z);
  cap.receiveShadow = true;
  root.add(cap);

  const soil = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    getSharedStaticStandardMaterial({ color: 0x6f5134, roughness: 0.98 }),
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(x, 0.37, z);
  soil.receiveShadow = true;
  root.add(soil);

  const worldPolygon = outline.map((p) => new THREE.Vector2(x + p.x, z + p.y));
  addPlantingSubplots(root, worldPolygon, { step: 0.56, topY: 0.395, maxPlots: 56 });


  addBorderDecorations(root, worldPolygon, 0.12);

}

function addPolygonPlantingZone(root: THREE.Group, polygon: THREE.Vector2[], _flowerColor: number): void {
  if (polygon.length < 3) return;
  // Deep green planting area ground cap
  const capMat = getSharedStaticStandardMaterial({ color: 0x1a4a2a, roughness: 0.92 });
  const capShape = new THREE.Shape(polygon);
  const cap = new THREE.Mesh(new THREE.ShapeGeometry(capShape), capMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.y = 0.362;
  cap.receiveShadow = true;
  root.add(cap);

  // Brown soil layer
  const soil = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(polygon)),
    getSharedStaticStandardMaterial({ color: 0x6f5134, roughness: 0.98 }),
  );
  soil.rotation.x = Math.PI / 2;
  soil.position.y = 0.37;
  soil.receiveShadow = true;
  root.add(soil);

  addPlantingSubplots(root, polygon, { step: 0.5, topY: 0.395, maxPlots: 120 });

  // Border decorations: stones, mushrooms, grass, fence segments
  addBorderDecorations(root, polygon, 0.12);
}

type SavedZone = {
  points: Array<[number, number]>;
  color: number;
};

const ZONE_STORAGE_KEY = 'ft_garden_custom_zones_v2';
const LEGACY_ZONE_STORAGE_KEYS = ['ft_garden_custom_zones_v1'];
const SWING_ZONE_CLEANUP_ONCE_KEY = 'ft_garden_swing_zone_cleanup_v2_done';
const ROLLBACK_LATEST_ZONE_ONCE_KEY = 'ft_garden_rollback_latest_zone_once_v1_done';

function loadSavedZones(): SavedZone[] {
  try {
    for (const key of LEGACY_ZONE_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    const raw = window.localStorage.getItem(ZONE_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as SavedZone[];
    if (!Array.isArray(data)) return [];
    return data.filter((z) => Array.isArray(z.points) && z.points.length >= 3 && typeof z.color === 'number');
  } catch {
    return [];
  }
}

function saveZones(zones: SavedZone[]): void {
  try {
    window.localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(zones));
  } catch {
    // ignore storage failures (private mode/quota)
  }
}

function zoneCentroid(points: Array<[number, number]>): THREE.Vector2 {
  let sx = 0;
  let sz = 0;
  for (const [x, z] of points) {
    sx += x;
    sz += z;
  }
  const n = Math.max(1, points.length);
  return new THREE.Vector2(sx / n, sz / n);
}

function isLegacySwingZone(zone: SavedZone): boolean {
  const targets: Array<{ x: number; z: number; r: number }> = [
    { x: -2.8, z: -3.9, r: 2.25 },
    { x: 0.4, z: -4.0, r: 2.25 },
    { x: 3.0, z: -4.5, r: 2.1 },
    // legacy snapshots that may have been saved in scaled coordinates
    { x: -4.9, z: -6.8, r: 2.7 },
    { x: 0.7, z: -7.0, r: 2.7 },
    { x: 5.25, z: -7.88, r: 2.7 },
  ];
  const inTarget = (x: number, z: number): boolean => targets.some((t) => Math.hypot(x - t.x, z - t.z) <= t.r);
  const c = zoneCentroid(zone.points);
  if (inTarget(c.x, c.y)) return true;
  return zone.points.some(([x, z]) => inTarget(x, z));
}

function cleanupLegacySwingZonesOnce(zones: SavedZone[]): SavedZone[] {
  try {
    if (window.localStorage.getItem(SWING_ZONE_CLEANUP_ONCE_KEY) === '1') return zones;
  } catch {
    return zones;
  }

  const filtered = zones.filter((z) => !isLegacySwingZone(z));
  try {
    if (filtered.length !== zones.length) {
      saveZones(filtered);
    }
    window.localStorage.setItem(SWING_ZONE_CLEANUP_ONCE_KEY, '1');
  } catch {
    // ignore storage failures
  }
  return filtered;
}

function rollbackLatestZoneOnce(zones: SavedZone[]): SavedZone[] {
  try {
    if (window.localStorage.getItem(ROLLBACK_LATEST_ZONE_ONCE_KEY) === '1') return zones;
  } catch {
    return zones;
  }

  const rolled = zones.length > 0 ? zones.slice(0, zones.length - 1) : zones;
  try {
    if (rolled.length !== zones.length) {
      saveZones(rolled);
    }
    window.localStorage.setItem(ROLLBACK_LATEST_ZONE_ONCE_KEY, '1');
  } catch {
    // ignore storage failures
  }
  return rolled;
}

type ZoneCircle = { x: number; z: number; r: number };

function circlesOverlap(a: ZoneCircle, b: ZoneCircle, margin = 0): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const dist = Math.hypot(dx, dz);
  return dist < a.r + b.r + margin;
}

function addGroundZonesWithClearance(
  root: THREE.Group,
  desired: Array<{ x: number; z: number; r: number; color: number }>,
  blocked: ZoneCircle[],
): void {
  const accepted: ZoneCircle[] = [];
  for (const candidate of desired) {
    let r = candidate.r;
    while (r >= 0.85) {
      // Ground zone shape can bulge out, so use expanded clearance radius.
      const test: ZoneCircle = { x: candidate.x, z: candidate.z, r: r * 1.33 + 0.1 };
      const hitBlocked = blocked.some((b) => circlesOverlap(test, b, 0.06));
      const hitAccepted = accepted.some((a) => circlesOverlap(test, a, 0.26));
      if (!hitBlocked && !hitAccepted) {
        addGroundZone(root, candidate.x, candidate.z, r, candidate.color);
        accepted.push(test);
        break;
      }
      r -= 0.12;
    }
  }
}

function addFlowerWallZone(root: THREE.Group, x: number, z: number, width: number, height: number): void {
  const frame = new THREE.Mesh(
    getSharedBoxGeometry(width, height, 0.24),
    getSharedStaticStandardMaterial({ color: 0xf4f1e6, roughness: 0.86 }),
  );
  frame.position.set(x, height * 0.5 + 0.2, z);
  frame.castShadow = true;
  frame.receiveShadow = true;
  root.add(frame);

  const leafPalette = [0x78aa64, 0x8fc477, 0x9bd083];
  const flowerPalette = [0xffffff, 0xffe9af, 0xffc8d8, 0xcfe9ff];
  const leafInstances = leafPalette.map(() => [] as StaticInstance[]);
  for (let i = 0; i < 170; i++) {
    const radius = 0.07 + Math.random() * 0.08;
    const px = x + (Math.random() - 0.5) * (width * 0.92);
    const py = 0.34 + Math.random() * (height * 0.9);
    const pz = z + (Math.random() - 0.5) * 0.18;
    leafInstances[i % leafPalette.length]!.push({ px, py, pz, sx: radius, sy: radius, sz: radius });
    if (i % 3 === 0) {
      const f = makeFlower(flowerPalette[i % flowerPalette.length]!);
      f.scale.setScalar(0.26 + Math.random() * 0.15);
      f.position.set(px, py, pz + 0.14);
      root.add(f);
    }
  }
  for (let i = 0; i < leafPalette.length; i++) {
    addInstancedSet(
      root,
      getSharedSphereGeometry(8, 6),
      getSharedStaticStandardMaterial({ color: leafPalette[i]!, roughness: 0.9 }),
      leafInstances[i]!,
    );
  }
}

function addWoodLatticeRoseWall(root: THREE.Group, x: number, z: number, width: number, height: number): void {
  const woodMat = getSharedStaticStandardMaterial({ color: 0xb98e63, roughness: 0.9 });
  const woodDarkMat = getSharedStaticStandardMaterial({ color: 0xa67d57, roughness: 0.92 });
  const vineMat = getSharedStaticStandardMaterial({ color: 0x67924f, roughness: 0.88 });
  const roseMat = getSharedStaticStandardMaterial({ color: 0xea788f, roughness: 0.72 });
  const roseMatB = getSharedStaticStandardMaterial({ color: 0xff8ca1, roughness: 0.72 });

  const slatCount = Math.max(9, Math.floor(width / 0.42));
  const slatGap = width / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const px = x - width * 0.5 + slatGap * (i + 0.5);
    const slat = new THREE.Mesh(
      getSharedBoxGeometry(slatGap * 0.68, height, 0.12),
      i % 2 === 0 ? woodMat : woodDarkMat,
    );
    slat.position.set(px, 0.2 + height * 0.5, z);
    slat.castShadow = true;
    slat.receiveShadow = true;
    root.add(slat);
  }

  for (const y of [0.7, 1.45, 2.15]) {
    const rail = new THREE.Mesh(
      getSharedBoxGeometry(width + 0.16, 0.08, 0.1),
      woodDarkMat,
    );
    rail.position.set(x, 0.2 + y, z - 0.02);
    rail.castShadow = true;
    root.add(rail);
  }

  const vineInstances: StaticInstance[] = [];
  const nodeInstances: StaticInstance[] = [];
  const roseAInstances: StaticInstance[] = [];
  const roseBInstances: StaticInstance[] = [];
  for (let i = 0; i < 210; i++) {
    const vineRadius = 0.06 + Math.random() * 0.06;
    const px = x + (Math.random() - 0.5) * (width * 0.96);
    const topHeavy = Math.random() * Math.random();
    const py = 0.45 + (height * 0.95) * (1 - topHeavy);
    const pz = z + (Math.random() - 0.5) * 0.22;
    vineInstances.push({ px, py, pz, sx: vineRadius, sy: vineRadius, sz: vineRadius });

    if (Math.random() < 0.52) {
      const dropLen = 0.2 + Math.random() * 0.95;
      const drops = 2 + Math.floor(Math.random() * 4);
      for (let d = 0; d < drops; d++) {
        const t = d / Math.max(1, drops - 1);
        const nodeRadius = 0.04 + Math.random() * 0.03;
        nodeInstances.push({
          px: px + (Math.random() - 0.5) * 0.08,
          py: py - dropLen * t,
          pz: pz + (Math.random() - 0.5) * 0.08,
          sx: nodeRadius,
          sy: nodeRadius,
          sz: nodeRadius,
        });
      }
    }

    if (i % 2 === 0) {
      const roseRadius = 0.08 + Math.random() * 0.05;
      const target = i % 4 === 0 ? roseAInstances : roseBInstances;
      target.push({
        px: px + (Math.random() - 0.5) * 0.1,
        py: py + (Math.random() - 0.5) * 0.08,
        pz: pz + 0.09,
        sx: roseRadius,
        sy: roseRadius,
        sz: roseRadius,
      });
    }
  }
  addInstancedSet(root, getSharedSphereGeometry(8, 6), vineMat, vineInstances);
  addInstancedSet(root, getSharedSphereGeometry(8, 6), vineMat, nodeInstances);
  addInstancedSet(root, getSharedSphereGeometry(10, 8), roseMat, roseAInstances, { castShadow: true });
  addInstancedSet(root, getSharedSphereGeometry(10, 8), roseMatB, roseBInstances, { castShadow: true });
}

function addRosePergola(root: THREE.Group, x: number, z: number, angleY: number, scale = 1, rackId?: string): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = angleY;
  g.scale.setScalar(scale);
  root.add(g);

  const frameMat = getSharedStaticStandardMaterial({ color: 0xf6f4ef, roughness: 0.82 });
  const postGeo = getSharedBoxGeometry(0.14, 2.1, 0.14);
  const beamGeoX = getSharedBoxGeometry(2.8, 0.14, 0.18);
  const beamGeoZ = getSharedBoxGeometry(0.18, 0.14, 2.0);

  const postPts = [
    [-1.35, 1.05, -0.95],
    [1.35, 1.05, -0.95],
    [-1.35, 1.05, 0.95],
    [1.35, 1.05, 0.95],
  ] as const;
  for (const [px, py, pz] of postPts) {
    const p = new THREE.Mesh(postGeo, frameMat);
    p.position.set(px, py, pz);
    p.castShadow = true;
    p.receiveShadow = true;
    g.add(p);
  }

  const topY = 2.1;
  for (const zOff of [-0.95, 0.95] as const) {
    const beam = new THREE.Mesh(beamGeoX, frameMat);
    beam.position.set(0, topY, zOff);
    beam.castShadow = true;
    g.add(beam);
  }
  for (const xOff of [-1.35, -0.67, 0, 0.67, 1.35] as const) {
    const beam = new THREE.Mesh(beamGeoZ, frameMat);
    beam.position.set(xOff, topY, 0);
    beam.castShadow = true;
    g.add(beam);
  }

  const resolvedRackId = rackId ?? `pergola_${x.toFixed(2)}_${z.toFixed(2)}`;
  const slotCapMat = new THREE.MeshStandardMaterial({
    color: 0xc9d3df,
    roughness: 0.9,
    metalness: 0.03,
    transparent: true,
    opacity: 0.32,
    depthWrite: true,
  });
  const laneXs = [-1.35, -0.67, 0, 0.67, 1.35] as const;
  const laneZs = [-0.95, 0.95] as const;
  for (const lx of laneXs) {
    for (const lz of laneZs) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.24), slotCapMat);
      cap.position.set(lx, topY + 0.09, lz);
      cap.receiveShadow = true;
      cap.castShadow = false;
      cap.visible = true;
      cap.userData.plotCell = true;
      cap.userData.plotKind = 'rack';
      cap.userData.rackId = resolvedRackId;
      cap.userData.planted = false;
      cap.userData.seedId = null;
      cap.userData.flower = null;
      g.add(cap);
    }
  }
}

function addWallPlanters(root: THREE.Group, x: number, z: number, width: number): void {
  const planterMat = getSharedStaticStandardMaterial({ color: 0xc59667, roughness: 0.86 });
  const soilMat = getSharedStaticStandardMaterial({ color: 0x6f5134, roughness: 0.98 });
  const count = Math.max(3, Math.floor(width / 1.25));
  const gap = width / count;
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.5 + gap * (i + 0.5);
    const box = new THREE.Mesh(
      getSharedBoxGeometry(gap * 0.82, 0.3, 0.6),
      planterMat,
    );
    box.position.set(px, 0.33, z + 0.34);
    box.castShadow = true;
    box.receiveShadow = true;
    root.add(box);

    const soil = new THREE.Mesh(
      getSharedBoxGeometry(gap * 0.72, 0.08, 0.48),
      soilMat,
    );
    soil.position.set(px, 0.48, z + 0.34);
    soil.receiveShadow = true;
    root.add(soil);

    for (let f = 0; f < 4; f++) {
      const flower = makeFlower([0xffc8d8, 0xfff2ad, 0xd2ecff, 0xffffff][(i + f) % 4]!);
      flower.scale.setScalar(0.24 + Math.random() * 0.08);
      flower.position.set(
        px + (Math.random() - 0.5) * gap * 0.55,
        0.5,
        z + 0.34 + (Math.random() - 0.5) * 0.34,
      );
      root.add(flower);
    }
  }
}

function addArchPlantingZone(root: THREE.Group, x: number, z: number): void {
  const rig = new THREE.Group();
  rig.position.set(x, 0, z);
  rig.rotation.y = -0.46;
  root.add(rig);

  const starBaseShape = new THREE.Shape();
  const starOuter = 2.35;
  const starInner = 1.12;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? starOuter : starInner;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    if (i === 0) starBaseShape.moveTo(px, pz);
    else starBaseShape.lineTo(px, pz);
  }
  starBaseShape.closePath();
  const starBase = new THREE.Mesh(
    new THREE.ShapeGeometry(starBaseShape),
    getSharedStaticStandardMaterial({ color: 0xe9e0ca, roughness: 0.9 }),
  );
  starBase.rotation.x = -Math.PI / 2;
  starBase.position.y = 0.23;
  starBase.receiveShadow = true;
  rig.add(starBase);

  const archMat = getSharedStaticStandardMaterial({ color: 0xf5f2e8, roughness: 0.82 });
  const vineLeaf = getSharedStaticStandardMaterial({ color: 0x7fb56c, roughness: 0.88 });
  const rosePetal = getSharedStaticStandardMaterial({ color: 0xff9a56, roughness: 0.72 });
  const starRadiusAt = (theta: number, outer: number, inner: number): number => {
    const normalized = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sector = (normalized / (Math.PI * 2)) * 10;
    const frac = sector - Math.floor(sector);
    const from = Math.floor(sector) % 2 === 0 ? outer : inner;
    const to = (Math.floor(sector) + 1) % 2 === 0 ? outer : inner;
    return THREE.MathUtils.lerp(from, to, frac);
  };

  const leftLeg = makeScaledCylinder(0.09, 0.11, 2.7, 10, archMat);
  const rightLeg = makeScaledCylinder(0.09, 0.11, 2.7, 10, archMat);
  // Slight asymmetry makes the structure feel gently tilted.
  leftLeg.position.set(-2.1, 1.62, 0);
  rightLeg.position.set(2.1, 1.78, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  rig.add(leftLeg, rightLeg);

  const starTopShape = new THREE.Shape();
  const topOuter = 2.02;
  const topInner = 0.92;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? topOuter : topInner;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) starTopShape.moveTo(px, py);
    else starTopShape.lineTo(px, py);
  }
  starTopShape.closePath();
  const starTopHole = new THREE.Path();
  const holeOuter = 1.73;
  const holeInner = 0.78;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? holeOuter : holeInner;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) starTopHole.moveTo(px, py);
    else starTopHole.lineTo(px, py);
  }
  starTopHole.closePath();
  starTopShape.holes.push(starTopHole);
  const starTop = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starTopShape, { depth: 0.24, bevelEnabled: false }),
    archMat,
  );
  starTop.position.set(0, 2.9, -0.12);
  starTop.rotation.z = -0.14;
  starTop.rotation.y = -0.2;
  starTop.castShadow = true;
  rig.add(starTop);

  // Merge moon-star lighting into the floral arch centerpiece.
  const moonMat = getSharedStaticStandardMaterial({
    color: 0xfff2c9,
    emissive: 0xffd88a,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.08,
  });
  const moon = makeScaledTorus(1.12, 0.14, 16, 96, Math.PI * 1.64, moonMat);
  moon.position.set(0.15, 2.32, 0.08);
  moon.rotation.z = -0.86;
  moon.rotation.y = -0.52;
  rig.add(moon);

  const starMat = getSharedStaticStandardMaterial({
    color: 0xfff6dc,
    emissive: 0xffe5a8,
    emissiveIntensity: 0.7,
    roughness: 0.35,
  });
  const stars = [
    { sx: -1.35, sy: 1.95, sz: 0.4, s: 0.23 },
    { sx: 1.4, sy: 2.05, sz: -0.35, s: 0.23 },
    { sx: 0.1, sy: 3.15, sz: 0.06, s: 0.2 },
    { sx: -0.65, sy: 2.8, sz: -0.4, s: 0.17 },
    { sx: 0.86, sy: 2.68, sz: 0.34, s: 0.18 },
  ] as const;
  for (const st of stars) {
    const star = makeScaledOctahedron(st.s, 0, starMat);
    star.position.set(st.sx, st.sy, st.sz);
    rig.add(star);
  }

  const archLeafInstances: StaticInstance[] = [];
  const archRoseInstances: StaticInstance[] = [];
  for (let i = 0; i < 220; i++) {
    const leafRadius = 0.08 + Math.random() * 0.06;
    const t = i / 220;
    const a = Math.PI * t;
    const r = starRadiusAt(a - Math.PI / 2, 2.08, 0.96);
    const rx = Math.cos(a) * r;
    const ry = Math.sin(a) * r;
    const side = i % 2 === 0 ? -1 : 1;
    const legBlend = Math.random() < 0.35;
    let px = 0;
    let py = 0;
    let pz = 0;
    if (legBlend) {
      px = side * 2.1 + (Math.random() - 0.5) * 0.25;
      py = 0.4 + Math.random() * 2.5;
      pz = (Math.random() - 0.5) * 0.2;
    } else {
      px = rx + (Math.random() - 0.5) * 0.24;
      py = 2.95 + ry + (Math.random() - 0.5) * 0.24;
      pz = (Math.random() - 0.5) * 0.26;
    }
    archLeafInstances.push({ px, py, pz, sx: leafRadius, sy: leafRadius, sz: leafRadius });
    if (i % 3 === 0) {
      const roseRadius = 0.12 + Math.random() * 0.06;
      archRoseInstances.push({ px, py, pz: pz + 0.12, sx: roseRadius, sy: roseRadius, sz: roseRadius });
    }
  }
  addInstancedSet(rig, getSharedSphereGeometry(8, 6), vineLeaf, archLeafInstances);
  addInstancedSet(rig, getSharedSphereGeometry(10, 8), rosePetal, archRoseInstances);

  // Add floral decorations directly on the structure (posts + top frame), not on ground.
  const postDecorCenters = [
    new THREE.Vector3(-2.1, 1.15, 0),
    new THREE.Vector3(-2.1, 1.85, 0),
    new THREE.Vector3(-2.1, 2.45, 0),
    new THREE.Vector3(2.1, 1.15, 0),
    new THREE.Vector3(2.1, 1.95, 0),
    new THREE.Vector3(2.1, 2.55, 0),
  ];
  for (const c of postDecorCenters) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 0.1 + Math.random() * 0.14;
      const f = makeFlower(i % 2 === 0 ? 0xff89a8 : 0xffc5d5);
      f.scale.setScalar(0.24 + Math.random() * 0.1);
      f.position.set(c.x + Math.cos(a) * r, c.y + (Math.random() - 0.5) * 0.12, c.z + Math.sin(a) * r);
      rig.add(f);
    }
  }

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = starRadiusAt(a - Math.PI / 2, 1.95, 0.86);
    const f = makeFlower(i % 2 === 0 ? 0xff92ad : 0xffe3b0);
    f.scale.setScalar(0.22 + Math.random() * 0.1);
    f.position.set(Math.cos(a) * r, 2.9 + Math.sin(a) * r + (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.22);
    rig.add(f);
  }

  // Removed front translucent guide panels to avoid blocking white posts from frontal view.
}

function addCenterFloralSwing(root: THREE.Group): void {
  const x = 0.2;
  const z = -0.1;

  const base = makeScaledCylinder(
    2.1,
    2.25,
    0.12,
    56,
    getSharedStaticStandardMaterial({ color: 0xe6f1cf, roughness: 0.92 }),
  );
  base.position.set(x, 0.23, z);
  base.receiveShadow = true;
  root.add(base);

  const glow = makeScaledCircle(
    1.65,
    48,
    getSharedStaticBasicMaterial({ color: 0xf3f8bf, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, 0.301, z);
  root.add(glow);

  const ringMat = getSharedStaticStandardMaterial({ color: 0xf6f3ea, roughness: 0.78 });
  const ring = makeScaledTorus(1.45, 0.12, 16, 84, Math.PI * 2, ringMat);
  ring.position.set(x, 2.35, z);
  ring.castShadow = true;
  root.add(ring);

  const chainMat = getSharedStaticStandardMaterial({ color: 0xbeb8a8, roughness: 0.5, metalness: 0.32 });
  for (const dx of [-0.52, 0.52]) {
    const chain = makeScaledCylinder(0.018, 0.018, 1.2, 8, chainMat);
    chain.position.set(x + dx, 1.9, z);
    root.add(chain);
  }

  const seatGroup = new THREE.Group();
  seatGroup.position.set(x, 1.22, z);
  root.add(seatGroup);

  const seatBase = new THREE.Mesh(
    getSharedBoxGeometry(1.18, 0.1, 0.46),
    getSharedStaticStandardMaterial({ color: 0xeeeadf, roughness: 0.9 }),
  );
  seatBase.castShadow = true;
  seatGroup.add(seatBase);

  const seatCushion = new THREE.Mesh(
    getSharedBoxGeometry(1.04, 0.08, 0.38),
    getSharedStaticStandardMaterial({ color: 0xf8f6ee, roughness: 0.85 }),
  );
  seatCushion.position.y = 0.08;
  seatCushion.castShadow = true;
  seatGroup.add(seatCushion);

  const armMat = getSharedStaticStandardMaterial({ color: 0xf1eee4, roughness: 0.86 });
  const leftArm = new THREE.Mesh(getSharedBoxGeometry(0.08, 0.18, 0.42), armMat);
  const rightArm = new THREE.Mesh(getSharedBoxGeometry(0.08, 0.18, 0.42), armMat);
  leftArm.position.set(-0.56, 0.1, 0);
  rightArm.position.set(0.56, 0.1, 0);
  leftArm.castShadow = true;
  rightArm.castShadow = true;
  seatGroup.add(leftArm, rightArm);

  const leafMat = getSharedStaticStandardMaterial({ color: 0x7fb56c, roughness: 0.88 });
  const flowerMats = [
    getSharedStaticStandardMaterial({ color: 0xffffff, roughness: 0.75 }),
    getSharedStaticStandardMaterial({ color: 0xffd8ea, roughness: 0.75 }),
    getSharedStaticStandardMaterial({ color: 0xfff2be, roughness: 0.75 }),
  ];

  const swingLeafInstances: StaticInstance[] = [];
  const swingFlowerInstances = flowerMats.map(() => [] as StaticInstance[]);
  for (let i = 0; i < 260; i++) {
    const t = i / 260;
    const a = t * Math.PI * 2;
    const r = 1.45;
    const layer = Math.random() < 0.75 ? 0 : (Math.random() < 0.5 ? -0.18 : 0.18);
    const leafRadius = 0.06 + Math.random() * 0.05;
    const px = x + Math.cos(a) * (r + (Math.random() - 0.5) * 0.18);
    const py = 2.35 + Math.sin(a) * (r + (Math.random() - 0.5) * 0.18);
    const pz = z + layer + (Math.random() - 0.5) * 0.16;
    swingLeafInstances.push({ px, py, pz, sx: leafRadius, sy: leafRadius, sz: leafRadius });

    if (i % 2 === 0) {
      const flowerRadius = 0.075 + Math.random() * 0.05;
      swingFlowerInstances[i % flowerMats.length]!.push({ px, py, pz: pz + 0.1, sx: flowerRadius, sy: flowerRadius, sz: flowerRadius });
    }
  }
  addInstancedSet(root, getSharedSphereGeometry(8, 6), leafMat, swingLeafInstances);
  for (let i = 0; i < flowerMats.length; i++) {
    addInstancedSet(root, getSharedSphereGeometry(10, 8), flowerMats[i]!, swingFlowerInstances[i]!);
  }

  const groundPetalInstances = flowerMats.map(() => [] as StaticInstance[]);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const petalRadius = 0.04 + Math.random() * 0.03;
    groundPetalInstances[i % flowerMats.length]!.push({
      px: x + Math.cos(a) * (0.4 + Math.random() * 1.1),
      py: 0.32,
      pz: z + Math.sin(a) * (0.4 + Math.random() * 1.1),
      sx: petalRadius,
      sy: petalRadius,
      sz: petalRadius,
    });
  }
  for (let i = 0; i < flowerMats.length; i++) {
    addInstancedSet(root, getSharedSphereGeometry(8, 6), flowerMats[i]!, groundPetalInstances[i]!);
  }
}

function addMoonStarLightInstall(root: THREE.Group): void {
  const x = 0.2;
  const z = -0.1;

  const base = makeScaledCylinder(
    2.3,
    2.45,
    0.12,
    56,
    getSharedStaticStandardMaterial({ color: 0xf1e9d7, roughness: 0.9 }),
  );
  base.position.set(x, 0.23, z);
  base.receiveShadow = true;
  root.add(base);

  const moonMat = getSharedStaticStandardMaterial({
    color: 0xfff2c9,
    emissive: 0xffd88a,
    emissiveIntensity: 0.55,
    roughness: 0.38,
    metalness: 0.08,
  });
  const moonOuter = makeScaledTorus(1.7, 0.14, 16, 96, Math.PI * 1.62, moonMat);
  moonOuter.position.set(x + 0.08, 2.25, z + 0.02);
  moonOuter.rotation.z = -0.45;
  moonOuter.castShadow = true;
  root.add(moonOuter);

  const halo = makeScaledTorus(
    1.95,
    0.05,
    12,
    96,
    Math.PI * 1.7,
    getSharedStaticBasicMaterial({ color: 0xffefbe, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  halo.position.copy(moonOuter.position);
  halo.rotation.z = moonOuter.rotation.z;
  root.add(halo);

  const starCoreMat = getSharedStaticStandardMaterial({
    color: 0xfff6dc,
    emissive: 0xffe5a8,
    emissiveIntensity: 0.72,
    roughness: 0.35,
  });

  const stars = [
    { sx: -1.45, sy: 1.55, sz: 0.45, s: 0.25 },
    { sx: 1.55, sy: 1.45, sz: -0.35, s: 0.22 },
    { sx: 0.25, sy: 3.25, sz: 0.05, s: 0.2 },
    { sx: -0.8, sy: 2.95, sz: -0.42, s: 0.16 },
    { sx: 1.0, sy: 2.75, sz: 0.38, s: 0.17 },
  ] as const;

  for (const st of stars) {
    const core = makeScaledOctahedron(st.s, 0, starCoreMat);
    core.position.set(x + st.sx, st.sy, z + st.sz);
    root.add(core);

    const glow = makeScaledSphere(
      st.s * 1.7,
      getSharedStaticBasicMaterial({ color: 0xfff1c2, transparent: true, opacity: 0.25, depthWrite: false }),
      10,
      8,
    );
    glow.position.copy(core.position);
    root.add(glow);
  }

  const stringMat = getSharedStaticStandardMaterial({ color: 0xe7d7ad, roughness: 0.6, metalness: 0.15 });
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const theta = -0.95 + t * 1.95;
    const px = x + Math.cos(theta) * 1.52;
    const py = 2.25 + Math.sin(theta) * 1.52;
    const pz = z + (Math.random() - 0.5) * 0.3;
    const len = 0.65 + Math.random() * 0.6;

    const rope = makeScaledCylinder(0.01, 0.01, len, 6, stringMat);
    rope.position.set(px, py - len * 0.5, pz);
    root.add(rope);

    const drop = makeScaledOctahedron(0.08 + Math.random() * 0.05, 0, starCoreMat);
    drop.position.set(px, py - len, pz);
    root.add(drop);
  }

  const sparkleInstances: StaticInstance[] = [];
  for (let i = 0; i < 40; i++) {
    const radius = 0.03 + Math.random() * 0.03;
    sparkleInstances.push({
      px: x + (Math.random() - 0.5) * 3.8,
      py: 0.35 + Math.random() * 2.9,
      pz: z + (Math.random() - 0.5) * 3.2,
      sx: radius,
      sy: radius,
      sz: radius,
    });
  }
  addInstancedSet(
    root,
    getSharedSphereGeometry(8, 6),
    getSharedStaticBasicMaterial({ color: 0xffefba, transparent: true, opacity: 0.4, depthWrite: false }),
    sparkleInstances,
  );
}

function addScenery(root: THREE.Group): void {
  const trunkMat = getSharedStaticStandardMaterial({ color: 0x7a5c3e, roughness: 0.84 });
  const cloudMats = [
    getSharedStaticStandardMaterial({ color: 0xf1c9de, roughness: 0.88 }),
    getSharedStaticStandardMaterial({ color: 0xbfe3d4, roughness: 0.88 }),
    getSharedStaticStandardMaterial({ color: 0xd8edb7, roughness: 0.88 }),
  ];
  const trees = [
    { x: -8.2, z: -4.9, style: 0, h: 1.65, w: 0.92 },
    { x: 7.9, z: 4.9, style: 1, h: 2.2, w: 1.15 },
    { x: -3.0, z: 7.2, style: 0, h: 1.9, w: 1.0 },
    { x: -8.5, z: 2.7, style: 1, h: 1.55, w: 0.86 },
    { x: 8.4, z: -0.3, style: 2, h: 1.75, w: 0.94 },
  ] as const;
  const cloudInstances = cloudMats.map(() => [] as StaticInstance[]);
  for (const t of trees) {
    const trunk = makeScaledCylinder(0.13 * t.w, 0.19 * t.w, t.h, 10, trunkMat);
    trunk.position.set(t.x, 0.18 + t.h * 0.5, t.z);
    trunk.castShadow = true;
    root.add(trunk);
    const canopyCount = Math.floor(36 + t.h * 16);
    for (let i = 0; i < canopyCount; i++) {
      const trunkTopY = 0.18 + t.h;
      const lowBand = i < Math.floor(canopyCount * 0.25);
      const radius = (0.16 + Math.random() * 0.14) * t.w;
      cloudInstances[t.style]!.push({
        px: t.x + (Math.random() - 0.5) * (2.2 * t.w),
        py: lowBand
          ? trunkTopY - 0.2 + Math.random() * (0.45 * t.w)
          : trunkTopY + 0.15 + Math.random() * (0.95 * t.w),
        pz: t.z + (Math.random() - 0.5) * (2.3 * t.w),
        sx: radius,
        sy: radius,
        sz: radius,
      });
    }
  }
  for (let i = 0; i < cloudMats.length; i++) {
    addInstancedSet(root, getSharedSphereGeometry(9, 7), cloudMats[i]!, cloudInstances[i]!, { castShadow: true });
  }
}

function buildGarden(scene: THREE.Scene): THREE.Group {
  const root = new THREE.Group();
  scene.add(root);

  const lawnOutline = [
    new THREE.Vector2(-11.6, -8.3),
    new THREE.Vector2(-9.8, -9.0),
    new THREE.Vector2(-5.8, -9.3),
    new THREE.Vector2(-1.2, -8.8),
    new THREE.Vector2(3.1, -9.4),
    new THREE.Vector2(7.8, -8.9),
    new THREE.Vector2(10.7, -7.1),
    new THREE.Vector2(11.2, -2.4),
    new THREE.Vector2(10.9, 2.4),
    new THREE.Vector2(11.3, 6.4),
    new THREE.Vector2(9.8, 8.6),
    new THREE.Vector2(5.9, 9.2),
    new THREE.Vector2(1.0, 8.8),
    new THREE.Vector2(-3.3, 9.3),
    new THREE.Vector2(-7.6, 8.6),
    new THREE.Vector2(-10.5, 6.1),
    new THREE.Vector2(-11.0, 2.2),
    new THREE.Vector2(-11.6, -2.4),
  ];
  const smoothLawnOutline = new THREE.CatmullRomCurve3(
    lawnOutline.map((p) => new THREE.Vector3(p.x, 0, p.y)),
    true,
    'catmullrom',
    0.18,
  )
    .getPoints(180)
    .map((p) => new THREE.Vector2(p.x, p.z));
  const lawn = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(smoothLawnOutline)),
    new THREE.MeshStandardMaterial({ color: 0x74b84f, roughness: 0.95 }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.36;
  lawn.receiveShadow = true;
  root.add(lawn);

  scatterPebblePath(
    root,
    [
    new THREE.Vector3(-9.2, 0.2, 6.9),
    new THREE.Vector3(-8.4, 0.2, 5.6),
      new THREE.Vector3(-6.2, 0.2, 3.7),
      new THREE.Vector3(-2.6, 0.2, 2.5),
      new THREE.Vector3(1.4, 0.2, 1.2),
      new THREE.Vector3(4.4, 0.2, -0.4),
      new THREE.Vector3(7.2, 0.2, -2.8),
      new THREE.Vector3(8.5, 0.2, -4.2),
      new THREE.Vector3(9.0, 0.2, -5.6),
    ],
    0.43,
  );
  addSecretPebblePath(root);
  scatterPebblePath(
    root,
    [
      new THREE.Vector3(-2.8, 0.2, 2.3),
      new THREE.Vector3(-3.9, 0.2, 0.4),
      new THREE.Vector3(-5.3, 0.2, -1.5),
      new THREE.Vector3(-6.7, 0.2, -3.2),
      new THREE.Vector3(-8.1, 0.2, -4.9),
      new THREE.Vector3(-9.0, 0.2, -6.6),
    ],
    0.34,
  );
  scatterPebblePath(
    root,
    [
      new THREE.Vector3(0.9, 0.2, 0.5),
      new THREE.Vector3(1.6, 0.2, 0.9),
      new THREE.Vector3(3.2, 0.2, 2.0),
      new THREE.Vector3(5.0, 0.2, 3.3),
      new THREE.Vector3(6.6, 0.2, 4.8),
      new THREE.Vector3(7.8, 0.2, 6.1),
      new THREE.Vector3(8.8, 0.2, 7.0),
    ],
    0.3,
  );

  const blocked: ZoneCircle[] = [
    { x: 0.2, z: -0.1, r: 1.3 }, // swing
    { x: 6.9, z: -3.9, r: 2.35 }, // star/moon structure
    { x: -8.8, z: -2.6, r: 1.0 }, // tall wall (moved backward)
    { x: -3.9, z: -6.7, r: 2.2 }, // back-left wall
    { x: 4.2, z: -6.7, r: 2.0 }, // back-right wall
    { x: -7.55, z: -2.0, r: 1.45 }, // left pergola (moved backward)
    { x: 4.5, z: 6.1, r: 1.35 }, // top-right pergola
    { x: 0.15, z: -5.6, r: 1.45 }, // back-middle pergola
    // path safeguards
    { x: -6.2, z: 3.7, r: 1.1 }, { x: -2.6, z: 2.5, r: 1.1 }, { x: 1.4, z: 1.2, r: 1.1 },
    { x: 4.4, z: -0.4, r: 1.0 }, { x: 7.2, z: -2.8, r: 0.95 },
    { x: -3.9, z: 0.4, r: 0.9 }, { x: -5.3, z: -1.5, r: 0.9 }, { x: -6.7, z: -3.2, r: 0.9 },
    { x: 3.2, z: 2.0, r: 0.85 }, { x: 5.0, z: 3.3, r: 0.85 }, { x: 6.6, z: 4.8, r: 0.85 },
    { x: 0.2, z: 1.0, r: 0.92 }, { x: 1.4, z: 0.1, r: 0.92 }, { x: 2.3, z: -1.1, r: 0.92 },
  ];
  const desiredZones = [
    // behind swing
    { x: -2.8, z: -3.9, r: 1.75, color: 0xffebb4 },
    { x: 0.4, z: -4.0, r: 1.8, color: 0xd9edff },
    { x: 3.0, z: -4.5, r: 1.4, color: 0xffd7ea },
    // swing-front triangle (separated)
    { x: -5.3, z: 2.9, r: 1.3, color: 0xffcfe2 },
    { x: 2.9, z: 5.2, r: 1.25, color: 0xffd7ea },
    // edge greens
    { x: -9.1, z: 4.9, r: 2.2, color: 0xffa9c3 },
    { x: 8.8, z: 3.8, r: 1.75, color: 0xffd1e8 },
    { x: 8.8, z: -0.6, r: 1.7, color: 0xffe6a8 },
  ];
  // 用户通过绘制添加种植区域，不预设圆形种植区
  // addGroundZonesWithClearance(root, desiredZones, blocked);

  addFlowerWallZone(root, -8.8, -2.6, 1.2, 5.2);
  addWoodLatticeRoseWall(root, -3.9, -6.7, 6.2, 2.5);
  addWoodLatticeRoseWall(root, 4.2, -6.7, 5.4, 2.4);
  addWallPlanters(root, -8.8, -2.6, 1.2);
  addWallPlanters(root, -3.9, -6.7, 6.2);
  addWallPlanters(root, 4.2, -6.7, 5.4);
  addRosePergola(root, -7.55, -2.0, 1.55, 0.98, 'pergola_left');
  addRosePergola(root, 4.5, 6.1, -0.35, 0.92, 'pergola_top_right');
  addRosePergola(root, 0.15, -5.6, 0, 0.9, 'pergola_back_mid');
  addArchPlantingZone(root, 6.9, -3.9);
  addCenterFloralSwing(root);
  addScenery(root);
  return root;
}

function bootstrap(): void {
  const mount = document.getElementById('app');
  if (!mount) throw new Error('Missing #app');
  const performanceProfile = createPerformanceProfile();
  const perfDebugEnabled = new URLSearchParams(window.location.search).has('debugPerf');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5dbfc4);
  scene.fog = new THREE.Fog(0x5dbfc4, 20, 56);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(14, 12, 14);

  const renderer = makeRenderer(performanceProfile);
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);
  const requestShadowRefresh = (): void => {};
  const perfDebugEl = perfDebugEnabled ? document.createElement('div') : null;
  if (perfDebugEl) {
    perfDebugEl.style.position = 'fixed';
    perfDebugEl.style.left = '12px';
    perfDebugEl.style.top = '12px';
    perfDebugEl.style.padding = '8px 10px';
    perfDebugEl.style.borderRadius = '10px';
    perfDebugEl.style.background = 'rgba(10, 18, 24, 0.82)';
    perfDebugEl.style.color = '#ecf7ff';
    perfDebugEl.style.font = '12px/1.45 Consolas, monospace';
    perfDebugEl.style.whiteSpace = 'pre';
    perfDebugEl.style.zIndex = '100';
    perfDebugEl.style.pointerEvents = 'none';
    document.body.appendChild(perfDebugEl);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = performanceProfile.enableControlDamping;
  controls.target.set(0, 1.8, 0);
  controls.minDistance = 4;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minPolarAngle = Math.PI * 0.18;

  const hemi = new THREE.HemisphereLight(0xeef9f8, 0x7ab48e, 0.65);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff3df, 0.85);
  sun.position.set(14, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(performanceProfile.shadowMapSize, performanceProfile.shadowMapSize);
  sun.shadow.camera.near = 0.4;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const gardenRoot = buildGarden(scene);
  const gardenScale = 1.75;
  gardenRoot.scale.setScalar(gardenScale);
  // Keep ground contact visually stable while enlarging the whole garden.
  gardenRoot.position.y = -0.1;
  const gardenGroundY = gardenRoot.position.y + 0.36 * gardenScale;
  const drawSurfaceY = gardenGroundY + 0.02;
  const playerGroundY = gardenGroundY - 0.06;
  // 加载已保存的区域
  const loadedZones = loadSavedZones();
  const cleanedZones = cleanupLegacySwingZonesOnce(loadedZones);
  const savedZones = rollbackLatestZoneOnce(cleanedZones);
  for (const zone of savedZones) {
    const poly = zone.points.map(([px, pz]) => new THREE.Vector2(px, pz));
    addPolygonPlantingZone(gardenRoot, poly, zone.color);
  }
  applyToyStyle(scene, performanceProfile);
  freezeStaticTransforms(gardenRoot);

  const previewPlayerRig = createChibiPreviewPlayer();
  const previewPlayer = new THREE.Group();
  previewPlayer.name = 'PreviewPlayer';
  previewPlayer.position.set(0.2, playerGroundY, 2.6);
  previewPlayer.scale.setScalar(0.78);
  previewPlayer.add(previewPlayerRig.root);
  disableRealtimeShadows(previewPlayerRig.root);
  scene.add(previewPlayer);

  const previewShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.17, depthWrite: false }),
  );
  previewShadow.rotation.x = -Math.PI / 2;
  previewShadow.position.y = 0.01;
  previewPlayer.add(previewShadow);

  const drawHud = document.createElement('div');
  drawHud.style.position = 'fixed';
  drawHud.style.right = '12px';
  drawHud.style.bottom = '12px';
  drawHud.style.padding = '8px 10px';
  drawHud.style.borderRadius = '10px';
  drawHud.style.background = 'rgba(10,20,18,0.58)';
  drawHud.style.border = '1px solid rgba(173,222,198,0.28)';
  drawHud.style.color = '#eef6f1';
  drawHud.style.font = '12px/1.4 "Segoe UI","PingFang SC",sans-serif';
  drawHud.style.zIndex = '12';
  drawHud.style.display = 'none';
  drawHud.textContent = 'G: 鍒掑尯妯″紡 | 宸﹂敭: 鍔犵偣 | Enter: 鐢熸垚绉嶆鍖?| Backspace: 鎾ら攢鐐?| Esc: 鍙栨秷';
  drawHud.textContent = 'WASD: move | Shift: run | G: draw mode | P: sow mode | Enter: commit area';
  document.body.appendChild(drawHud);
  drawHud.remove();

  const actionHud = document.createElement('div');
  actionHud.style.position = 'fixed';
  actionHud.style.right = '12px';
  actionHud.style.bottom = '58px';
  actionHud.style.padding = '8px 10px';
  actionHud.style.borderRadius = '10px';
  actionHud.style.background = 'rgba(10,20,18,0.68)';
  actionHud.style.border = '1px solid rgba(173,222,198,0.3)';
  actionHud.style.color = '#f2fff8';
  actionHud.style.font = '12px/1.35 "Segoe UI","PingFang SC",sans-serif';
  actionHud.style.zIndex = '13';
  actionHud.style.display = 'none';
  actionHud.style.pointerEvents = 'none';
  actionHud.textContent = '鐐瑰嚮鍦板潡: 绉嶆 / 娴囨按 / 鏂借偉';
  document.body.appendChild(actionHud);

  const sowModeBtn = document.createElement('button');
  sowModeBtn.style.position = 'fixed';
  sowModeBtn.style.left = '50%';
  sowModeBtn.style.bottom = '14px';
  sowModeBtn.style.transform = 'translateX(-50%)';
  sowModeBtn.style.padding = '10px 16px';
  sowModeBtn.style.borderRadius = '999px';
  sowModeBtn.style.border = '1px solid rgba(178,228,206,0.42)';
  sowModeBtn.style.background = 'linear-gradient(180deg, rgba(41,64,83,0.94), rgba(28,44,58,0.96))';
  sowModeBtn.style.color = '#f4fbff';
  sowModeBtn.style.font = '700 12px/1 "Segoe UI","PingFang SC",sans-serif';
  sowModeBtn.style.letterSpacing = '0.4px';
  sowModeBtn.style.boxShadow = '0 8px 18px rgba(10,16,25,0.34)';
  sowModeBtn.style.transition = 'bottom 180ms ease, background 180ms ease, border-color 180ms ease';
  sowModeBtn.style.cursor = 'pointer';
  sowModeBtn.style.zIndex = '21';
  sowModeBtn.textContent = 'Sow mode: off';
  document.body.appendChild(sowModeBtn);
  sowModeBtn.textContent = '馃尡 杩涘叆鎾妯″紡';


  const resetBtn = document.createElement('button');
  resetBtn.textContent = '🔄 重置花园';
  resetBtn.style.position = 'fixed';
  resetBtn.style.right = '54px';
  resetBtn.style.bottom = '12px';
  resetBtn.style.padding = '6px 12px';
  resetBtn.style.borderRadius = '8px';
  resetBtn.style.border = '1px solid rgba(190,220,205,0.42)';
  resetBtn.style.background = 'rgba(14,28,24,0.88)';
  resetBtn.style.color = '#effaf3';
  resetBtn.style.font = '700 11px/1 "Segoe UI","PingFang SC",sans-serif';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.zIndex = '22';
  resetBtn.addEventListener('click', () => {
    if (confirm('确定要重置花园吗？这将清除所有种植区域和植物。')) {
      localStorage.removeItem('ft_garden_custom_zones_v2');
      localStorage.removeItem('ft_garden_plants_v1');
      localStorage.removeItem('ft_garden_rollback_latest_zone_once_v1_done');
      localStorage.removeItem('ft_garden_swing_zone_cleanup_v2_done');
      location.reload();
    }
  });
  document.body.appendChild(resetBtn);

  const helpBtn = document.createElement('button');
  helpBtn.type = 'button';
  helpBtn.textContent = '?';
  helpBtn.style.position = 'fixed';
  helpBtn.style.right = '12px';
  helpBtn.style.bottom = '12px';
  helpBtn.style.width = '34px';
  helpBtn.style.height = '34px';
  helpBtn.style.borderRadius = '50%';
  helpBtn.style.border = '1px solid rgba(190,220,205,0.42)';
  helpBtn.style.background = 'rgba(14,28,24,0.88)';
  helpBtn.style.color = '#effaf3';
  helpBtn.style.font = '700 18px/1 "Segoe UI",sans-serif';
  helpBtn.style.cursor = 'pointer';
  helpBtn.style.zIndex = '22';
  document.body.appendChild(helpBtn);

  const helpMask = document.createElement('div');
  helpMask.style.position = 'fixed';
  helpMask.style.inset = '0';
  helpMask.style.background = 'rgba(6,10,12,0.5)';
  helpMask.style.display = 'none';
  helpMask.style.zIndex = '38';
  document.body.appendChild(helpMask);

  const helpPanel = document.createElement('div');
  helpPanel.style.position = 'fixed';
  helpPanel.style.left = '50%';
  helpPanel.style.top = '50%';
  helpPanel.style.transform = 'translate(-50%, -50%)';
  helpPanel.style.width = 'min(560px, calc(100vw - 28px))';
  helpPanel.style.maxHeight = 'min(78vh, 680px)';
  helpPanel.style.overflowY = 'auto';
  helpPanel.style.padding = '14px 16px';
  helpPanel.style.borderRadius = '14px';
  helpPanel.style.border = '1px solid rgba(181,222,203,0.34)';
  helpPanel.style.background = 'rgba(13,24,22,0.97)';
  helpPanel.style.color = '#eef7f2';
  helpPanel.style.zIndex = '39';
  helpPanel.style.display = 'none';
  helpPanel.style.boxShadow = '0 16px 42px rgba(0,0,0,0.38)';
  helpPanel.innerHTML = [
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">',
    '<div style="font:700 17px/1.2 &quot;Segoe UI&quot;,&quot;PingFang SC&quot;,sans-serif;">操作说明</div>',
    '<button id="help-close" type="button" style="padding:5px 9px;border-radius:8px;border:1px solid rgba(190,220,204,0.35);background:rgba(42,58,52,0.9);color:#f0fff7;cursor:pointer;">关闭</button>',
    '</div>',
    '<div style="font:12px/1.7 &quot;Segoe UI&quot;,&quot;PingFang SC&quot;,sans-serif;opacity:0.96;">',
    'WASD / 方向键：移动，Shift：跑步，B：打开商店，P：切换种植模式<br/>',
    '鼠标左键拖动时旋转，滚轮缩放，右键平移<br/>',
    '种植模式开启：显示底部种子列表，可在地块播种<br/>',
    '种植模式关闭：隐藏种子列表，可继续浇水 / 施肥 / 收获<br/>',
    'G：进入画区模式，左键加点，Enter/空格确认，Backspace取消，Esc取消',
    '</div>',
  ].join('');
  document.body.appendChild(helpPanel);
  const helpClose = helpPanel.querySelector('#help-close') as HTMLButtonElement;
  const setHelpVisible = (visible: boolean): void => {
    helpMask.style.display = visible ? 'block' : 'none';
    helpPanel.style.display = visible ? 'block' : 'none';
  };
  helpBtn.addEventListener('click', () => setHelpVisible(helpMask.style.display !== 'block'));
  helpMask.addEventListener('click', () => setHelpVisible(false));
  helpClose.addEventListener('click', () => setHelpVisible(false));

  const seedState: ShowcaseSeedState = {
    gold: 220,
    selectedSeed: SEED_IDS[0]!,
    seeds: Object.fromEntries(SEED_IDS.map((id) => [id, 10])) as Record<SeedId, number>,
  };

  const quickHud = document.createElement('div');
  quickHud.style.position = 'fixed';
  quickHud.style.left = '12px';
  quickHud.style.top = '12px';
  quickHud.style.padding = '8px 12px';
  quickHud.style.borderRadius = '12px';
  quickHud.style.background = 'rgba(10,20,18,0.72)';
  quickHud.style.border = '1px solid rgba(173,222,198,0.34)';
  quickHud.style.color = '#eef6f1';
  quickHud.style.font = '12px/1.4 "Segoe UI","PingFang SC",sans-serif';
  quickHud.style.zIndex = '14';
  quickHud.style.display = 'flex';
  quickHud.style.alignItems = 'center';
  quickHud.style.flexWrap = 'nowrap';
  quickHud.style.gap = '10px';
  document.body.appendChild(quickHud);

  const coinIcon = document.createElement('div');
  coinIcon.style.width = '18px';
  coinIcon.style.height = '18px';
  coinIcon.style.borderRadius = '50%';
  coinIcon.style.background = 'radial-gradient(circle at 30% 30%, #fff4be, #ffd564 52%, #d39a19 100%)';
  coinIcon.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.25)';
  quickHud.appendChild(coinIcon);

  const goldValue = document.createElement('span');
  goldValue.style.fontWeight = '700';
  goldValue.style.minWidth = '52px';
  quickHud.appendChild(goldValue);

  const seedIcon = document.createElement('img');
  seedIcon.style.width = '18px';
  seedIcon.style.height = '18px';
  seedIcon.style.objectFit = 'contain';
  quickHud.appendChild(seedIcon);

  const seedValue = document.createElement('span');
  seedValue.style.fontWeight = '600';
  seedValue.style.minWidth = '24px';
  quickHud.appendChild(seedValue);

  const shopBtn = document.createElement('button');
  const shopIcon = document.createElement('img');
  shopIcon.src = makeShopIconDataUrl();
  shopIcon.alt = 'shop';
  shopIcon.style.width = '58px';
  shopIcon.style.height = '58px';
  shopIcon.style.objectFit = 'contain';
  const shopLabel = document.createElement('span');
  shopLabel.textContent = '商店';
  shopLabel.style.font = '700 11px/1 "Segoe UI",sans-serif';
  shopLabel.style.letterSpacing = '0.8px';
  shopBtn.style.position = 'fixed';
  shopBtn.style.left = '12px';
  shopBtn.style.top = '78px';
  shopBtn.style.width = '76px';
  shopBtn.style.padding = '8px 8px 6px';
  shopBtn.style.display = 'flex';
  shopBtn.style.flexDirection = 'column';
  shopBtn.style.alignItems = 'center';
  shopBtn.style.gap = '4px';
  shopBtn.style.border = '1px solid rgba(214,194,255,0.45)';
  shopBtn.style.background = 'linear-gradient(180deg, rgba(74,67,110,0.92), rgba(44,57,76,0.92))';
  shopBtn.style.borderRadius = '14px';
  shopBtn.style.color = '#fff6f6';
  shopBtn.style.boxShadow = '0 10px 18px rgba(24,17,40,0.32)';
  shopBtn.style.cursor = 'pointer';
  shopBtn.style.zIndex = '15';
  shopBtn.append(shopIcon, shopLabel);
  document.body.appendChild(shopBtn);

  const shopMask = document.createElement('div');
  shopMask.style.position = 'fixed';
  shopMask.style.inset = '0';
  shopMask.style.background = 'rgba(9,16,15,0.45)';
  shopMask.style.display = 'none';
  shopMask.style.zIndex = '35';
  document.body.appendChild(shopMask);

  const shopPanel = document.createElement('div');
  shopPanel.style.position = 'fixed';
  shopPanel.style.left = '50%';
  shopPanel.style.top = '50%';
  shopPanel.style.transform = 'translate(-50%, -50%)';
  shopPanel.style.width = 'min(760px, calc(100vw - 32px))';
  shopPanel.style.maxHeight = 'min(78vh, 720px)';
  shopPanel.style.padding = '14px';
  shopPanel.style.borderRadius = '14px';
  shopPanel.style.background = 'rgba(13,24,22,0.95)';
  shopPanel.style.border = '1px solid rgba(173,222,198,0.28)';
  shopPanel.style.color = '#eef6f1';
  shopPanel.style.display = 'none';
  shopPanel.style.zIndex = '36';
  shopPanel.style.boxShadow = '0 16px 40px rgba(0,0,0,0.38)';
  document.body.appendChild(shopPanel);

  const shopHeader = document.createElement('div');
  shopHeader.style.display = 'flex';
  shopHeader.style.justifyContent = 'space-between';
  shopHeader.style.alignItems = 'center';
  shopHeader.style.marginBottom = '10px';
  shopPanel.appendChild(shopHeader);

  const shopTitle = document.createElement('div');
  shopTitle.textContent = '绉嶅瓙鍟嗗簵';
  shopTitle.style.font = '700 18px/1.2 "Segoe UI","PingFang SC",sans-serif';
  shopHeader.appendChild(shopTitle);

  const shopClose = document.createElement('button');
  shopClose.textContent = '鍏抽棴';
  shopClose.style.padding = '6px 10px';
  shopClose.style.border = '1px solid rgba(190,220,204,0.35)';
  shopClose.style.background = 'rgba(42,58,52,0.9)';
  shopClose.style.borderRadius = '8px';
  shopClose.style.color = '#f0fff7';
  shopClose.style.cursor = 'pointer';
  shopHeader.appendChild(shopClose);

  const shopList = document.createElement('div');
  shopList.style.overflowY = 'auto';
  shopList.style.maxHeight = 'calc(min(78vh, 720px) - 74px)';
  shopList.style.display = 'grid';
  shopList.style.gap = '8px';
  shopPanel.appendChild(shopList);

  const seedDock = document.createElement('div');
  seedDock.style.position = 'fixed';
  seedDock.style.left = '50%';
  seedDock.style.bottom = '12px';
  seedDock.style.transform = 'translateX(-50%)';
  seedDock.style.display = 'none';
  seedDock.style.gap = '8px';
  seedDock.style.padding = '8px 10px';
  seedDock.style.borderRadius = '12px';
  seedDock.style.background = 'rgba(12,24,21,0.8)';
  seedDock.style.border = '1px solid rgba(173,222,198,0.3)';
  seedDock.style.zIndex = '20';
  seedDock.style.maxWidth = 'calc(100vw - 20px)';
  seedDock.style.overflowX = 'auto';
  document.body.appendChild(seedDock);

  const drawState = {
    enabled: false,
    points: [] as THREE.Vector2[],
    markers: [] as THREE.Mesh[],
    line: null as THREE.Line | null,
    fill: null as THREE.Mesh | null,
  };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hoverNdc = new THREE.Vector2();
  let hasHoverPointer = false;
  let hoverHintDirty = false;
  let lastHoverHintAt = 0;
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -drawSurfaceY);
  const hitPoint = new THREE.Vector3();
  const previewKeysDown = new Set<string>();
  const moveCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  const moveDir = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const tmpYawQuat = new THREE.Quaternion();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const cameraTargetFollow = new THREE.Vector3();
  const locomotionPhase = { value: 0 };
  const playableBoundX = 10.4 * gardenScale;
  const playableBoundZ = 8.8 * gardenScale;
  let previewSpeed = 3.8;
  const walkSpeed = 3.8;
  const runSpeed = 6.6;
  const clock = new THREE.Clock();
  const toGardenLocal = (p: THREE.Vector2): THREE.Vector2 => new THREE.Vector2(p.x / gardenScale, p.y / gardenScale);
  const plotCells: THREE.Mesh[] = [];
  const borderDecorObjects: THREE.Object3D[] = [];
  const activePlotCells = new Set<THREE.Mesh>();
  const promptFxCells = new Set<THREE.Mesh>();
  let sowMode = false;
  const syncActivePlotCell = (cell: THREE.Mesh): void => {
    if (cell.userData.life != null) {
      activePlotCells.add(cell);
      return;
    }
    activePlotCells.delete(cell);
  };
  const syncPlotCellVisibility = (target?: THREE.Mesh): void => {
    if (target) {
      // 单个 cell 同步时，也遵循 sowMode 规则，只有种植模式才显示土块
      target.visible = sowMode;
      const flower = target.userData.flower as THREE.Object3D | undefined;
      if (flower) flower.visible = true;
      const promptFx = target.userData.promptFx as THREE.Object3D | undefined;
      if (promptFx) promptFx.visible = true;
      return;
    }
    for (const cell of plotCells) {
      const life = cell.userData.life;
      // 种植模式下所有地块可见，非种植模式下不显示任何地块
      cell.visible = sowMode;
      // 花始终可见
      const flower = cell.userData.flower as THREE.Object3D | undefined;
      if (flower) flower.visible = true;
      // 浇水施肥特效始终可见
      const promptFx = cell.userData.promptFx as THREE.Object3D | undefined;
      if (promptFx) promptFx.visible = true;
    }
  };
  const collectPlotCells = (): void => {
    plotCells.length = 0;
    activePlotCells.clear();
    promptFxCells.clear();
    gardenRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.plotCell === true) {
        plotCells.push(obj);
        syncActivePlotCell(obj);
        if (obj.userData.promptFx) promptFxCells.add(obj);
      }
    });
    console.log('[Garden] Plot cells collected:', plotCells.length);
    syncPlotCellVisibility();
  };
  collectPlotCells();
  const setSowMode = (enabled: boolean): void => {
    sowMode = enabled;
    for (const cell of plotCells) {
      const mats = Array.isArray(cell.material) ? cell.material : [cell.material];
      for (const m of mats) {
        if (m instanceof THREE.MeshToonMaterial) {
          m.transparent = true;
          m.opacity = 0.38;
          m.depthWrite = false;
        } else if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial) {
          m.transparent = true;
          m.opacity = 0.38;
          m.depthWrite = true;
        }
      }
    }
    syncPlotCellVisibility();
    seedDock.style.display = enabled ? 'flex' : 'none';
    sowModeBtn.style.bottom = enabled ? '96px' : '14px';
    sowModeBtn.style.background = enabled
      ? 'linear-gradient(180deg, rgba(70,115,84,0.96), rgba(43,84,62,0.98))'
      : 'linear-gradient(180deg, rgba(41,64,83,0.94), rgba(28,44,58,0.96))';
    sowModeBtn.style.borderColor = enabled ? 'rgba(206,242,220,0.56)' : 'rgba(178,228,206,0.42)';
    sowModeBtn.textContent = enabled ? '🌱 退出种植' : '🌱 进入种植';
    actionHud.textContent = enabled ? '种植模式：点击地块种植或养护' : '普通模式：浇水/施肥/收获';
  };
  setSowMode(false);
  const seedButtons = new Map<SeedId, HTMLButtonElement>();
  const seedBadges = new Map<SeedId, HTMLSpanElement>();
  const shopOwnedLabels = new Map<SeedId, HTMLSpanElement>();

  const toastEl = document.createElement('div');
  toastEl.style.position = 'fixed';
  toastEl.style.left = '50%';
  toastEl.style.top = '18%';
  toastEl.style.transform = 'translateX(-50%)';
  toastEl.style.padding = '10px 14px';
  toastEl.style.borderRadius = '12px';
  toastEl.style.border = '1px solid rgba(188,220,204,0.35)';
  toastEl.style.background = 'rgba(12,24,22,0.92)';
  toastEl.style.color = '#eef6f1';
  toastEl.style.font = '13px/1.3 "Segoe UI","PingFang SC",sans-serif';
  toastEl.style.zIndex = '60';
  toastEl.style.pointerEvents = 'none';
  toastEl.style.opacity = '0';
  toastEl.style.transition = 'opacity 140ms ease';
  document.body.appendChild(toastEl);
  let toastTimer: number | null = null;
  let lastBackgroundToastAt = 0;
  const showToast = (text: string, kind: 'user' | 'background' = 'user'): void => {
    const now = performance.now();
    if (kind === 'background' && now - lastBackgroundToastAt < 1600) return;
    if (kind === 'background') lastBackgroundToastAt = now;
    toastEl.textContent = text;
    toastEl.style.opacity = '1';
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.style.opacity = '0';
      toastTimer = null;
    }, kind === 'background' ? 900 : 1300);
  };

  const updateQuickHud = (): void => {
    const cfg = SEED_CONFIG[seedState.selectedSeed];
    goldValue.textContent = `${seedState.gold}`;
    seedIcon.src = cfg.icon;
    seedIcon.alt = cfg.label;
    seedValue.textContent = `${seedState.seeds[seedState.selectedSeed]}`;
  };

  const plotEffects: PlotFx[] = [];
  const pendingPlotVisualRefresh = new Set<THREE.Mesh>();
  const STAGE1_GROW_RATE = 0.13;
  const STAGE2_GROW_RATE = 0.14;
  const STAGE3_GROW_RATE = 0.12;
  const GROW_RATE = 0.11;
  const FERTILIZE_WAIT = 6.5;
  const GIANT_CHANCE = 0.42;

  const getLife = (cell: THREE.Mesh): PlotLifeState | null => {
    const life = (cell.userData.life as PlotLifeState | undefined) ?? null;
    if (!life) return null;
    if (typeof life.matureProgress !== 'number') life.matureProgress = life.stage === 4 ? 1 : 0;
    if (typeof life.matureClusterReady !== 'boolean') life.matureClusterReady = life.stage === 4;
    return life;
  };

  const clearPlantVisual = (cell: THREE.Mesh): void => {
    const existing = cell.userData.flower as THREE.Object3D | undefined;
    if (existing) {
      gardenRoot.remove(existing);
      disposePlantVisual(existing);
    }
    cell.userData.flower = null;
  };

  const clearPromptFx = (cell: THREE.Mesh): void => {
    const existing = cell.userData.promptFx as THREE.Object3D | undefined;
    if (!existing) return;
    promptFxCells.delete(cell);
    gardenRoot.remove(existing);
    existing.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) m?.dispose();
    });
    cell.userData.promptFx = null;
  };

  type SeedVisualProfile = {
    seedShape: 'sphere' | 'box' | 'octa' | 'cone' | 'capsule';
    seedScale: number;
    signatureShape: 'sphere' | 'box' | 'octa' | 'cone' | 'capsule';
    signatureCount: number;
    signatureRadius: number;
    sproutLeafShape: 'round' | 'point' | 'leaf';
    stemColor: number;
    centerColor: number;
    petalShape: 'round' | 'point' | 'leaf';
    petalCount: number;
    petalRadius: number;
    sproutLeaves: number;
    sproutLift: number;
    stage3BloomScale: number;
    stage4BloomBaseScale: number;
    branchCount: number;
    bloomsPerBranch: number;
    branchSpread: number;
  };

  const VISUAL: Record<SeedId, SeedVisualProfile> = {
    tulip: { seedShape: 'cone', seedScale: 1.02, signatureShape: 'cone', signatureCount: 3, signatureRadius: 0.056, sproutLeafShape: 'leaf', stemColor: 0x5f9f5c, centerColor: 0xfff2ad, petalShape: 'leaf', petalCount: 6, petalRadius: 0.082, sproutLeaves: 2, sproutLift: 0.28, stage3BloomScale: 0.84, stage4BloomBaseScale: 1.12, branchCount: 3, bloomsPerBranch: 2, branchSpread: 0.28 },
    rose: { seedShape: 'sphere', seedScale: 0.96, signatureShape: 'sphere', signatureCount: 4, signatureRadius: 0.058, sproutLeafShape: 'round', stemColor: 0x5d8f54, centerColor: 0xffd8e3, petalShape: 'round', petalCount: 9, petalRadius: 0.074, sproutLeaves: 3, sproutLift: 0.26, stage3BloomScale: 0.9, stage4BloomBaseScale: 1.16, branchCount: 4, bloomsPerBranch: 2, branchSpread: 0.3 },
    sunflower: { seedShape: 'box', seedScale: 0.98, signatureShape: 'box', signatureCount: 5, signatureRadius: 0.06, sproutLeafShape: 'point', stemColor: 0x6f9f43, centerColor: 0x8a5d2b, petalShape: 'point', petalCount: 12, petalRadius: 0.11, sproutLeaves: 2, sproutLift: 0.25, stage3BloomScale: 0.94, stage4BloomBaseScale: 1.18, branchCount: 3, bloomsPerBranch: 3, branchSpread: 0.33 },
    hibiscus: { seedShape: 'octa', seedScale: 1.04, signatureShape: 'octa', signatureCount: 6, signatureRadius: 0.062, sproutLeafShape: 'leaf', stemColor: 0x5b9158, centerColor: 0xffefd4, petalShape: 'round', petalCount: 5, petalRadius: 0.096, sproutLeaves: 4, sproutLift: 0.24, stage3BloomScale: 0.88, stage4BloomBaseScale: 1.14, branchCount: 4, bloomsPerBranch: 2, branchSpread: 0.3 },
    cherry_blossom: { seedShape: 'capsule', seedScale: 1, signatureShape: 'capsule', signatureCount: 7, signatureRadius: 0.064, sproutLeafShape: 'round', stemColor: 0x6ca16a, centerColor: 0xfff4d9, petalShape: 'round', petalCount: 13, petalRadius: 0.085, sproutLeaves: 3, sproutLift: 0.27, stage3BloomScale: 0.86, stage4BloomBaseScale: 1.12, branchCount: 5, bloomsPerBranch: 2, branchSpread: 0.36 },
    daisy: { seedShape: 'sphere', seedScale: 0.9, signatureShape: 'cone', signatureCount: 8, signatureRadius: 0.066, sproutLeafShape: 'leaf', stemColor: 0x639660, centerColor: 0xf4d561, petalShape: 'leaf', petalCount: 10, petalRadius: 0.088, sproutLeaves: 2, sproutLift: 0.23, stage3BloomScale: 0.87, stage4BloomBaseScale: 1.13, branchCount: 3, bloomsPerBranch: 3, branchSpread: 0.29 },
    lotus: { seedShape: 'octa', seedScale: 0.94, signatureShape: 'sphere', signatureCount: 9, signatureRadius: 0.068, sproutLeafShape: 'leaf', stemColor: 0x6baf78, centerColor: 0xfff3b2, petalShape: 'leaf', petalCount: 8, petalRadius: 0.1, sproutLeaves: 4, sproutLift: 0.3, stage3BloomScale: 0.92, stage4BloomBaseScale: 1.17, branchCount: 4, bloomsPerBranch: 2, branchSpread: 0.35 },
    hyacinth: { seedShape: 'box', seedScale: 0.92, signatureShape: 'octa', signatureCount: 10, signatureRadius: 0.07, sproutLeafShape: 'point', stemColor: 0x5e8e67, centerColor: 0xf6f0ff, petalShape: 'round', petalCount: 14, petalRadius: 0.058, sproutLeaves: 5, sproutLift: 0.22, stage3BloomScale: 0.9, stage4BloomBaseScale: 1.16, branchCount: 4, bloomsPerBranch: 3, branchSpread: 0.3 },
    white_flower: { seedShape: 'sphere', seedScale: 0.92, signatureShape: 'sphere', signatureCount: 8, signatureRadius: 0.068, sproutLeafShape: 'leaf', stemColor: 0x638d59, centerColor: 0xf6e5b8, petalShape: 'round', petalCount: 8, petalRadius: 0.09, sproutLeaves: 4, sproutLift: 0.27, stage3BloomScale: 0.9, stage4BloomBaseScale: 1.14, branchCount: 4, bloomsPerBranch: 2, branchSpread: 0.31 },
    rosette: { seedShape: 'capsule', seedScale: 0.9, signatureShape: 'cone', signatureCount: 14, signatureRadius: 0.076, sproutLeafShape: 'point', stemColor: 0x6a8e62, centerColor: 0xe8def8, petalShape: 'point', petalCount: 15, petalRadius: 0.098, sproutLeaves: 5, sproutLift: 0.31, stage3BloomScale: 0.96, stage4BloomBaseScale: 1.22, branchCount: 6, bloomsPerBranch: 3, branchSpread: 0.38 },
  };

  const makeSeedCore = (profile: SeedVisualProfile, color: number): THREE.Mesh => {
    const mat = getSharedPlantToonMaterial(color);
    switch (profile.seedShape) {
      case 'box': return new THREE.Mesh(sharedPlantGeometries.box, mat);
      case 'octa': return new THREE.Mesh(sharedPlantGeometries.octa, mat);
      case 'cone': return new THREE.Mesh(sharedPlantGeometries.cone, mat);
      case 'capsule': return new THREE.Mesh(sharedPlantGeometries.capsule, mat);
      default: return new THREE.Mesh(sharedPlantGeometries.sphere, mat);
    }
  };

  const makeSignatureCore = (shape: SeedVisualProfile['signatureShape'], color: number, size: number): THREE.Mesh => {
    const mat = getSharedPlantToonMaterial(color);
    const scale = size * 2;
    switch (shape) {
      case 'box': {
        const mesh = new THREE.Mesh(sharedPlantGeometries.box, mat);
        mesh.scale.setScalar(scale * 1.35);
        return mesh;
      }
      case 'octa': {
        const mesh = new THREE.Mesh(sharedPlantGeometries.octa, mat);
        mesh.scale.setScalar(scale * 0.95);
        return mesh;
      }
      case 'cone': {
        const mesh = new THREE.Mesh(sharedPlantGeometries.cone, mat);
        mesh.scale.set(scale * 1.4, scale * 1.7, scale * 1.4);
        return mesh;
      }
      case 'capsule': {
        const mesh = new THREE.Mesh(sharedPlantGeometries.capsule, mat);
        mesh.scale.set(scale * 1.12, scale * 0.62, scale * 1.12);
        return mesh;
      }
      default: {
        const mesh = new THREE.Mesh(sharedPlantGeometries.sphere, mat);
        mesh.scale.setScalar(scale);
        return mesh;
      }
    }
  };

  const addSpeciesSignature = (target: THREE.Group, seed: SeedId, y: number, scale: number): void => {
    const cfg = VISUAL[seed];
    const c = new THREE.Color(SEED_CONFIG[seed].color);
    c.offsetHSL(0, 0.08, 0.12);
    const color = c.getHex();
    const geo = sharedPlantGeometries[cfg.signatureShape];
    const mat = getSharedPlantToonMaterial(color);
    const signature = new THREE.InstancedMesh(geo, mat, cfg.signatureCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cfg.signatureCount; i++) {
      const a = (i / cfg.signatureCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * cfg.signatureRadius * scale, y, Math.sin(a) * cfg.signatureRadius * scale);
      dummy.rotation.set(0, a, 0);
      const nodeScale = 0.0125 * scale * 2;
      switch (cfg.signatureShape) {
        case 'box': dummy.scale.setScalar(nodeScale * 1.35); break;
        case 'octa': dummy.scale.setScalar(nodeScale * 0.95); break;
        case 'cone': dummy.scale.set(nodeScale * 1.4, nodeScale * 1.7, nodeScale * 1.4); break;
        case 'capsule': dummy.scale.set(nodeScale * 1.12, nodeScale * 0.62, nodeScale * 1.12); break;
        default: dummy.scale.setScalar(nodeScale); break;
      }
      dummy.updateMatrix();
      signature.setMatrixAt(i, dummy.matrix);
    }
    signature.instanceMatrix.needsUpdate = true;
    target.add(signature);
  };

  const makeSproutLeaf = (shape: SeedVisualProfile['sproutLeafShape'], color: number): THREE.Mesh => {
    const mat = getSharedPlantToonMaterial(color);
    if (shape === 'point') {
      const cone = new THREE.Mesh(sharedPlantGeometries.cone, mat);
      cone.scale.set(0.044, 0.085, 0.044);
      cone.rotation.x = Math.PI * 0.5;
      return cone;
    }
    const sphere = new THREE.Mesh(sharedPlantGeometries.sphere, mat);
    if (shape === 'leaf') sphere.scale.set(0.0442, 0.02448, 0.0204);
    else sphere.scale.set(0.0312, 0.0312, 0.027);
    return sphere;
  };

  const makeBloomHead = (seed: SeedId, scale: number): THREE.Group => {
    const cfg = VISUAL[seed];
    const baseColor = SEED_CONFIG[seed].color;
    const g = new THREE.Group();
    const core = new THREE.Mesh(sharedPlantGeometries.sphere, getSharedPlantToonMaterial(cfg.centerColor));
    core.scale.setScalar(0.08);
    core.position.y = 0;
    g.add(core);

    const petals = new THREE.InstancedMesh(
      cfg.petalShape === 'point' ? sharedPlantGeometries.cone : sharedPlantGeometries.sphere,
      getSharedPlantToonMaterial(baseColor),
      cfg.petalCount,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < cfg.petalCount; i++) {
      const a = (i / cfg.petalCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * cfg.petalRadius, 0, Math.sin(a) * cfg.petalRadius);
      if (cfg.petalShape === 'point') {
        dummy.scale.set(0.056, 0.11, 0.056);
        dummy.rotation.set(0, a, Math.PI / 2);
      } else if (cfg.petalShape === 'leaf') {
        dummy.scale.set(0.0972, 0.05184, 0.04464);
      } else {
        dummy.scale.set(0.08768, 0.06592, 0.05184);
      }
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
    g.add(petals);
    g.scale.setScalar(scale);
    return g;
  };

  const makeBranchCluster = (seed: SeedId, giant: boolean): THREE.Group => {
    const cfg = VISUAL[seed];
    const g = new THREE.Group();
    const branchMat = getSharedPlantToonMaterial(cfg.stemColor);
    const base = new THREE.Mesh(sharedPlantGeometries.cylinder, branchMat);
    base.scale.set(0.044, 0.42, 0.056);
    base.position.y = 0.21;
    g.add(base);
    const branchCount = cfg.branchCount + (giant ? 1 : 0);
    for (let i = 0; i < branchCount; i++) {
      const a = (i / branchCount) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.27 + (i % 2) * 0.05, 0);
      pivot.rotation.y = a;
      pivot.rotation.z = -(0.56 + cfg.branchSpread * 0.24);
      g.add(pivot);
      const armLen = 0.24 + (i % 3) * 0.035;
      const arm = new THREE.Mesh(sharedPlantGeometries.cylinder, branchMat);
      arm.scale.set(0.024, armLen, 0.036);
      arm.position.y = armLen * 0.5;
      pivot.add(arm);
      for (let b = 0; b < cfg.bloomsPerBranch; b++) {
        const t = (b + 1) / (cfg.bloomsPerBranch + 1);
        const bloom = makeBloomHead(seed, (giant ? 1.05 : 0.9) * (0.92 + t * 0.2));
        bloom.position.set((t - 0.5) * 0.06, armLen * (0.56 + t * 0.55), 0);
        pivot.add(bloom);
      }
    }
    return g;
  };

  const buildPlantVisual = (life: PlotLifeState): THREE.Group => {
    const seed = life.seedId;
    const profile = VISUAL[seed];
    const seedColor = SEED_CONFIG[seed].color;
    const g = new THREE.Group();

    if (life.stage === 1) {
      const core = makeSeedCore(profile, seedColor);
      core.position.y = 0.08;
      switch (profile.seedShape) {
        case 'box': core.scale.setScalar(0.08 * profile.seedScale); break;
        case 'octa': core.scale.setScalar(0.052 * profile.seedScale); break;
        case 'cone': core.scale.set(0.09 * profile.seedScale, 0.1 * profile.seedScale, 0.09 * profile.seedScale); break;
        case 'capsule': core.scale.set(0.068 * profile.seedScale, 0.05 * profile.seedScale, 0.068 * profile.seedScale); break;
        default: core.scale.setScalar(0.09 * profile.seedScale); break;
      }
      g.add(core);
      addSpeciesSignature(g, seed, 0.09, 0.74);
    } else if (life.stage === 2) {
      const stem = new THREE.Mesh(sharedPlantGeometries.cylinder, getSharedPlantToonMaterial(profile.stemColor));
      stem.scale.set(0.032, profile.sproutLift, 0.04);
      stem.position.y = profile.sproutLift * 0.5;
      g.add(stem);
      for (let i = 0; i < profile.sproutLeaves; i++) {
        const leaf = makeSproutLeaf(profile.sproutLeafShape, seedColor);
        const a = (i / profile.sproutLeaves) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.045, profile.sproutLift - 0.02 + Math.sin(a * 2) * 0.01, Math.sin(a) * 0.045);
        if (profile.sproutLeafShape === 'point') {
          leaf.position.y += 0.01;
          leaf.rotation.y = a;
        }
        g.add(leaf);
      }
      addSpeciesSignature(g, seed, profile.sproutLift + 0.03, 0.86);
    } else if (life.stage === 3) {
      const stem = new THREE.Mesh(sharedPlantGeometries.cylinder, getSharedPlantToonMaterial(profile.stemColor));
      stem.scale.set(0.036, 0.34, 0.044);
      stem.position.y = 0.17;
      g.add(stem);
      const bloom = makeBloomHead(seed, profile.stage3BloomScale);
      bloom.position.y = 0.36;
      g.add(bloom);
      addSpeciesSignature(g, seed, 0.48, 0.92);
    } else {
      // 阶段4：逐渐绽放逻辑
      if (!life.matureClusterReady) {
        const p = Math.min(1, Math.max(0, life.matureProgress));
        const stemHeight = 0.34 + p * 0.16;
        const stem = new THREE.Mesh(sharedPlantGeometries.cylinder, getSharedPlantToonMaterial(profile.stemColor));
        stem.scale.set(0.04, stemHeight, 0.048);
        stem.position.y = stemHeight * 0.5;
        g.add(stem);
        const bloomScale = profile.stage4BloomBaseScale + p * (life.giantBloom ? 0.42 : 0.28) + (life.giantBloom ? 0.16 : 0);
        const bloom = makeBloomHead(seed, bloomScale);
        bloom.position.y = stemHeight + 0.05 + p * 0.06;
        g.add(bloom);
        // 预先创建5个分支，根据进度逐渐显示
        const maxBranches = 5;
        for (let i = 0; i < maxBranches; i++) {
          const branchGroup = new THREE.Group();
          branchGroup.userData.branchIndex = i;
          branchGroup.userData.isGrowingBranch = true; // 标记为成长中分支
          const baseAngle = maxBranches > 1 ? (i / maxBranches) * Math.PI * 2 : 0;
          branchGroup.rotation.y = baseAngle;
          branchGroup.rotation.z = -(0.45 + p * 0.35);
          branchGroup.position.y = stemHeight * (0.55 + p * 0.16);
          branchGroup.visible = false;
          g.add(branchGroup);
          const branchLen = 0.12 + p * 0.09;
          const arm = new THREE.Mesh(sharedPlantGeometries.cylinder, getSharedPlantToonMaterial(profile.stemColor));
          arm.scale.set(0.018, branchLen, 0.024);
          arm.position.y = branchLen * 0.5;
          branchGroup.add(arm);
          const bud = makeBloomHead(seed, 0.3 + p * 0.18);
          bud.position.y = branchLen + 0.015;
          branchGroup.add(bud);
        }
        addSpeciesSignature(g, seed, 0.5 + p * 0.06, 1);
      } else {
        // 成熟时使用华丽的最终态
        const cluster = makeBranchCluster(seed, life.giantBloom);
        cluster.userData.isFinalCluster = true; // 标记为最终花簇
        cluster.visible = false; // 初始隐藏，由动画控制显示
        g.add(cluster);
        addSpeciesSignature(g, seed, 0.56, 1.08);
        // 巨花放大
        if (life.giantBloom) {
          g.scale.setScalar(2.08);
        }
      }
    }

    if (life.stage === 4 && life.giantBloom) {
      g.scale.setScalar(life.matureClusterReady ? 2.08 : 1.9);
    }

    g.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });
    return g;
  };

  const refreshPlotVisual = (cell: THREE.Mesh): void => {
    const life = getLife(cell);
    syncActivePlotCell(cell);
    clearPlantVisual(cell);
    clearPromptFx(cell);
    if (!life) return;
    const visual = buildPlantVisual(life);
    const wp = new THREE.Vector3();
    cell.getWorldPosition(wp);
    const inv = 1 / gardenRoot.scale.x;
    visual.position.set(wp.x * inv, (wp.y - 0.01) * inv, wp.z * inv);
    gardenRoot.add(visual);
    disableRealtimeShadows(visual);
    freezeStaticTransforms(visual);
    cell.userData.flower = visual;

    if ((life.stage === 1 && life.needsWater) || (life.stage === 2 && life.needsWater)) {
      const yBase = life.stage === 1 ? 0.24 : 0.34;
      const hint = new THREE.Group();
      hint.userData.dynamic = true;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.16, 18),
        new THREE.MeshBasicMaterial({ color: 0x67cfff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = yBase;
      hint.add(ring);
      for (let i = 0; i < 5; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshToonMaterial({ color: 0x93ddff }));
        const a = (i / 5) * Math.PI * 2;
        d.position.set(Math.cos(a) * 0.12, yBase + 0.05, Math.sin(a) * 0.12);
        hint.add(d);
      }
      hint.position.set(wp.x * inv, (wp.y + yBase) * inv, wp.z * inv);
      gardenRoot.add(hint);
      cell.userData.promptFx = hint;
      promptFxCells.add(cell);
    } else if (life.stage === 3 && life.needsFertilizer) {
      const hint = new THREE.Group();
      hint.userData.dynamic = true;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.17, 18),
        new THREE.MeshBasicMaterial({ color: 0xffd26d, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.36;
      hint.add(ring);
      for (let i = 0; i < 6; i++) {
        const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.024), new THREE.MeshToonMaterial({ color: 0xf0b95a }));
        const a = (i / 6) * Math.PI * 2;
        p.position.set(Math.cos(a) * 0.13, 0.42, Math.sin(a) * 0.13);
        hint.add(p);
      }
      hint.position.set(wp.x * inv, (wp.y + 0.36) * inv, wp.z * inv);
      gardenRoot.add(hint);
      cell.userData.promptFx = hint;
      promptFxCells.add(cell);
    }
  };

  const enqueuePlotVisualRefresh = (cell: THREE.Mesh): void => {
    pendingPlotVisualRefresh.add(cell);
  };

  const flushPlotVisualRefresh = (maxPerFrame = 1): void => {
    if (pendingPlotVisualRefresh.size === 0) return;
    let count = 0;
    for (const cell of pendingPlotVisualRefresh) {
      pendingPlotVisualRefresh.delete(cell);
      refreshPlotVisual(cell);
      count += 1;
      if (count >= maxPerFrame) break;
    }
  };

  const spawnPlotFx = (cell: THREE.Mesh, kind: PlotFx['kind']): void => {
    const world = new THREE.Vector3();
    cell.getWorldPosition(world);
    const fx = new THREE.Group();
    fx.position.copy(world);
    fx.position.y += 0.18;
    if (kind === 'water') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.22, 22),
        new THREE.MeshBasicMaterial({ color: 0x66c9ff, transparent: true, opacity: 0.76, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      fx.add(ring);
      for (let i = 0; i < 12; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.026 + Math.random() * 0.02, 7, 6), new THREE.MeshToonMaterial({ color: 0x89d8ff }));
        d.position.set((Math.random() - 0.5) * 0.36, 0.25 + Math.random() * 0.36, (Math.random() - 0.5) * 0.36);
        d.userData.vy = -(1.4 + Math.random() * 1.2);
        fx.add(d);
      }
      scene.add(fx);
      plotEffects.push({ group: fx, t: 0, ttl: 0.85, kind });
      return;
    }
    const color = kind === 'fertilize' ? 0xc6a04a : 0xffe57b;
    for (let i = 0; i < (kind === 'fertilize' ? 14 : 10); i++) {
      const p = new THREE.Mesh(
        kind === 'fertilize' ? new THREE.DodecahedronGeometry(0.03 + Math.random() * 0.03) : new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 8, 6),
        new THREE.MeshToonMaterial({ color }),
      );
      p.position.set(0, 0.2, 0);
      const a = (i / 14) * Math.PI * 2;
      p.userData.vx = Math.cos(a) * (0.7 + Math.random() * 0.7);
      p.userData.vy = 1.9 + Math.random() * 1.6;
      p.userData.vz = Math.sin(a) * (0.7 + Math.random() * 0.7);
      fx.add(p);
    }
    scene.add(fx);
    plotEffects.push({ group: fx, t: 0, ttl: kind === 'fertilize' ? 0.95 : 1.15, kind });
  };

  const updatePlotEffects = (delta: number): void => {
    for (let i = plotEffects.length - 1; i >= 0; i--) {
      const fx = plotEffects[i]!;
      fx.t += delta;
      for (const ch of fx.group.children) {
        if (!(ch instanceof THREE.Mesh)) continue;
        if (fx.kind === 'water' && ch.geometry instanceof THREE.RingGeometry) {
          const k = 1 + fx.t * 2.6;
          ch.scale.set(k, k, 1);
          (ch.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.76 * (1 - fx.t / fx.ttl));
          continue;
        }
        const vx = (ch.userData.vx as number | undefined) ?? 0;
        const vy = (ch.userData.vy as number | undefined) ?? 0;
        const vz = (ch.userData.vz as number | undefined) ?? 0;
        ch.position.x += vx * delta;
        ch.position.y += vy * delta;
        ch.position.z += vz * delta;
        ch.userData.vy = vy - 5.5 * delta;
        ch.scale.multiplyScalar(Math.max(0.2, 1 - delta * 1.3));
      }
      if (fx.t >= fx.ttl) {
        fx.group.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m?.dispose();
        });
        scene.remove(fx.group);
        plotEffects.splice(i, 1);
      }
    }
  };

  // 更新植物生长动画（每帧调用）- 根据进度实时缩放植物和控制分支显示
  const updatePlantGrowthAnimation = (delta: number, phase: number): void => {
    for (const cell of activePlotCells) {
      const flower = cell.userData.flower as THREE.Group | undefined;
      const life = getLife(cell);
      if (!flower || !life) continue;

      let targetScale = 1;
      let breathe = 1;

      if (life.stage === 1) {
        // 阶段1：种子 → 发芽，逐渐长大
        const progress = life.growProgress;
        targetScale = 0.4 + progress * 0.6;
        if (progress > 0.65) {
          breathe = 1 + Math.sin(phase * 4) * 0.03;
        }
      } else if (life.stage === 2) {
        // 阶段2：幼苗，逐渐长大
        const progress = life.growProgress;
        targetScale = 0.6 + progress * 0.4;
        if (progress > 0.65) {
          breathe = 1 + Math.sin(phase * 4) * 0.04;
        }
      } else if (life.stage === 3) {
        // 阶段3：开花中，花苞逐渐变大
        const progress = life.growProgress;
        targetScale = 0.75 + progress * 0.25;
        if (progress > 0.65) {
          breathe = 1 + Math.sin(phase * 4) * 0.05;
        }
      } else if (life.stage === 4) {
        if (life.matureClusterReady) {
          // 成熟后：显示华丽最终态 + 轻微呼吸效果
          targetScale = 1;
          breathe = 1 + Math.sin(phase * 1.5) * 0.015;
          // 渐隐绽放态，显示最终态
          let bloomAlpha = 1;
          for (const child of flower.children) {
            if (child instanceof THREE.Group && child.userData.isGrowingBranch) {
              bloomAlpha = Math.max(0, bloomAlpha - 0.08);
              child.visible = bloomAlpha > 0;
            }
            if (child instanceof THREE.Group && child.userData.isFinalCluster) {
              child.visible = true;
              child.scale.setScalar(1);
            }
          }
        } else {
          // 成熟中：根据进度逐渐绽放 + 显示更多分支
          const p = life.matureProgress;
          targetScale = 0.7 + p * 0.3;
          breathe = 1 + Math.sin(phase * 2) * 0.02 * p;
          // 根据进度显示更多分支
          const visibleBranches = Math.floor(p * 5);
          for (const child of flower.children) {
            if (child instanceof THREE.Group && child.userData.isGrowingBranch) {
              child.visible = child.userData.branchIndex <= visibleBranches;
            }
          }
        }
      }

      // 应用缩放
      flower.scale.setScalar(targetScale * breathe);

      // 巨花特殊处理
      if (life.stage === 4 && life.giantBloom && !life.matureClusterReady) {
        flower.scale.setScalar(targetScale * breathe * 1.8);
      }
    }
  };

  const clearDraw = (): void => {
    for (const m of drawState.markers) scene.remove(m);
    drawState.markers = [];
    if (drawState.line) scene.remove(drawState.line);
    drawState.line = null;
    if (drawState.fill) scene.remove(drawState.fill);
    drawState.fill = null;
    drawState.points = [];
  };

  const refreshSeedDock = (): void => {
    for (const id of SEED_IDS) {
      const btn = seedButtons.get(id);
      const badge = seedBadges.get(id);
      if (!btn) continue;
      btn.style.outline = seedState.selectedSeed === id ? '2px solid #f7e08b' : '1px solid rgba(200,220,209,0.25)';
      btn.style.background = seedState.selectedSeed === id ? 'rgba(54,76,67,0.95)' : 'rgba(26,40,35,0.9)';
      if (badge) badge.textContent = `${seedState.seeds[id]}`;
    }
  };

  const getRackLockedSeed = (rackId: string): SeedId | null => {
    for (const c of plotCells) {
      if ((c.userData.rackId as string | undefined) !== rackId) continue;
      const rackLife = getLife(c);
      if (rackLife) return rackLife.seedId;
    }
    return null;
  };

  const describeCellAction = (cell: THREE.Mesh): string => {
    const life = getLife(cell);
    if (!life) {
      const rackId = cell.userData.rackId as string | undefined;
      if (rackId) {
        const locked = getRackLockedSeed(rackId);
        if (locked && locked !== seedState.selectedSeed) {
          return `此花架限定种植 ${SEED_CONFIG[locked].label}，请选择对应种子`;
        }
      }
    }
    if (!life) return `可种植：${SEED_CONFIG[seedState.selectedSeed].label}`;
    const stage = life.stage as PlotStage;
    if (stage === 1) {
      if (life.needsWater) return '阶段1完成：浇水进入阶段2';
      return `阶段1生长中：${Math.round(life.growProgress * 100)}%`;
    }
    if (stage === 2) {
      if (life.needsWater) return '阶段2完成：浇水进入阶段3';
      return `阶段2生长中：${Math.round(life.growProgress * 100)}%`;
    }
    if (stage === 3) {
      if (life.needsFertilizer) return '阶段3完成：施肥进入阶段4';
      return `阶段3生长中：${Math.round(life.growProgress * 100)}%`;
    }
    if (stage === 4) {
      if (!life.matureClusterReady) return `成熟中：${Math.round(life.matureProgress * 100)}%`;
      return life.giantBloom ? '巨花开花了：现在收获！' : '开花了：现在收获！';
    }
    return `生长中：${Math.round(life.growProgress * 100)}%`;
  };

  const interactPlotCell = (cell: THREE.Mesh): void => {
    const life = getLife(cell);
    const finalize = (): void => {
      syncPlotCellVisibility(cell);
      refreshSeedDock();
      updateQuickHud();
      for (const seedId of SEED_IDS) {
        const ownedLabel = shopOwnedLabels.get(seedId);
        if (ownedLabel) ownedLabel.textContent = `库存 ${seedState.seeds[seedId]}`;
      }
      actionHud.textContent = describeCellAction(cell);
    };

    if (!life) {
      const seed = seedState.selectedSeed;
      const rackId = cell.userData.rackId as string | undefined;
      if (rackId) {
        const locked = getRackLockedSeed(rackId);
        if (locked && locked !== seed) {
          showToast(`此花架限定种植 ${SEED_CONFIG[locked].label}`);
          actionHud.textContent = describeCellAction(cell);
          return;
        }
      }
      if (seedState.seeds[seed] <= 0) {
        showToast('种子不足，请去商店购买');
        actionHud.textContent = '点击地块：种植/浇水/施肥';
        return;
      }
      seedState.seeds[seed] -= 1;
      cell.userData.life = {
        seedId: seed,
        stage: 1,
        growProgress: 0,
        needsWater: false,
        needsFertilizer: false,
        fertilizerCooldown: 0,
        giantBloom: false,
        matureProgress: 0,
        matureClusterReady: false,
        transitionPulse: 0,
      } satisfies PlotLifeState;
      cell.userData.planted = true;
      cell.userData.seedId = seed;
      enqueuePlotVisualRefresh(cell);
      showToast(`已种植 ${SEED_CONFIG[seed].label}，阶段1开始`);
      finalize();
      return;
    }

    const stage = life.stage as PlotStage;
    if (stage === 1) {
      if (!life.needsWater) {
        showToast('阶段1生长中，请耐心等待');
        finalize();
        return;
      }
      life.stage = 2;
      life.growProgress = 0;
      life.needsWater = false;
      life.needsFertilizer = false;
      life.fertilizerCooldown = 0;
      enqueuePlotVisualRefresh(cell);
      spawnPlotFx(cell, 'water');
      showToast('已浇水，进入阶段2');
      finalize();
      return;
    }

    if (stage === 2) {
      if (!life.needsWater) {
        showToast(`阶段2生长中：${Math.round(life.growProgress * 100)}%`);
        finalize();
        return;
      }
      life.stage = 3;
      life.growProgress = 0;
      life.needsWater = false;
      life.needsFertilizer = false;
      life.fertilizerCooldown = 0;
      enqueuePlotVisualRefresh(cell);
      spawnPlotFx(cell, 'water');
      showToast('已浇水，进入阶段3');
      finalize();
      return;
    }

    if (stage === 3) {
      if (!life.needsFertilizer) {
        showToast(`阶段3生长中：${Math.round(life.growProgress * 100)}%`);
        finalize();
        return;
      }
      life.stage = 4;
      life.needsFertilizer = false;
      life.fertilizerCooldown = 0;
      life.giantBloom = Math.random() < GIANT_CHANCE;
      life.matureProgress = 0;
      life.matureClusterReady = false;
      enqueuePlotVisualRefresh(cell);
      spawnPlotFx(cell, 'fertilize');
      showToast(life.giantBloom ? '已施肥，触发了巨花！' : '已施肥，进入阶段4');
      finalize();
      return;
    }

    if (stage === 4) {
      if (!life.matureClusterReady) {
        showToast(`成熟中：${Math.round(life.matureProgress * 100)}%`);
        finalize();
        return;
      }
      const gain = SEED_CONFIG[life.seedId].sellBase + (life.giantBloom ? 10 : 0);
      seedState.gold += gain;
      clearPlantVisual(cell);
      clearPromptFx(cell);
      cell.userData.life = null;
      cell.userData.planted = false;
      cell.userData.seedId = null;
      syncActivePlotCell(cell);
      const mats = Array.isArray(cell.material) ? cell.material : [cell.material];
      for (const m of mats) {
        if ('color' in m) {
          const c = (m as THREE.MeshToonMaterial).color;
          c.setHex(0xc9d3df);
        }
      }
      spawnPlotFx(cell, 'mature');
      showToast(`收获了 +${gain} 金币`);
      finalize();
    }
  };

  const tickPlotLifecycle = (delta: number): void => {
    for (const cell of activePlotCells) {
      const life = getLife(cell);
      if (!life) continue;
      const stage = life.stage as PlotStage;
      if (stage === 1) {
        if (!life.needsWater) {
          life.growProgress = Math.min(1, life.growProgress + delta * STAGE1_GROW_RATE);
          if (life.growProgress >= 1) {
            life.growProgress = 1;
            life.needsWater = true;
            life.transitionPulse = 0; // 重置过渡状态
            enqueuePlotVisualRefresh(cell);
            showToast('阶段1完成，浇水进入阶段2', 'background');
          }
          // 过渡动画：当进度 > 0.65 时开始脉冲效果
          if (life.growProgress > 0.65) {
            life.transitionPulse = Math.min(1, life.transitionPulse + delta * 3);
          }
        }
        continue;
      }
      if (stage === 2 && !life.needsWater) {
        life.growProgress = Math.min(1, life.growProgress + delta * STAGE2_GROW_RATE);
        if (life.growProgress >= 1) {
          life.growProgress = 1;
          life.needsWater = true;
          life.transitionPulse = 0; // 重置过渡状态
          enqueuePlotVisualRefresh(cell);
          showToast('阶段2完成，浇水进入阶段3', 'background');
        }
        // 过渡动画
        if (life.growProgress > 0.65) {
          life.transitionPulse = Math.min(1, life.transitionPulse + delta * 3);
        }
        continue;
      }
      if (stage === 3 && !life.needsFertilizer) {
        life.growProgress = Math.min(1, life.growProgress + delta * STAGE3_GROW_RATE);
        if (life.growProgress >= 1) {
          life.growProgress = 1;
          life.needsFertilizer = true;
          life.transitionPulse = 0;
          enqueuePlotVisualRefresh(cell);
          showToast('阶段3完成，施肥进入阶段4', 'background');
        }
        // 过渡动画
        if (life.growProgress > 0.65) {
          life.transitionPulse = Math.min(1, life.transitionPulse + delta * 3);
        }
        continue;
      }
      if (stage === 4 && !life.matureClusterReady) {
        life.matureProgress = Math.min(1, life.matureProgress + delta * 0.24);
        if (life.matureProgress >= 1) {
          life.matureClusterReady = true;
          life.transitionPulse = 0;
          enqueuePlotVisualRefresh(cell);
          spawnPlotFx(cell, 'mature');
          showToast('花已完全成熟，可以收获了！', 'background');
        }
        continue;
      }
      if (life.stage === 1) {
        life.growProgress = Math.min(1, life.growProgress + delta * GROW_RATE);
        if (life.growProgress >= 1) {
          life.stage = 2;
          life.growProgress = 0;
          life.needsWater = true;
          enqueuePlotVisualRefresh(cell);
          showToast('Sprout entered Stage 2. Water is needed.', 'background');
        }
      } else if (life.stage === 3 && life.needsFertilizer && life.fertilizerCooldown > 0) {
        life.fertilizerCooldown = Math.max(0, life.fertilizerCooldown - delta);
      }
    }
  };

  const iconWithFallback = (seedId: SeedId): string => {
    if (seedId === 'white_flower') return '/assets/icons/white_flower.svg';
    if (seedId === 'rosette') return '/assets/icons/rosette.svg';
    return '/assets/icons/tulip.svg';
  };

  for (const id of SEED_IDS) {
    const item = document.createElement('button');
    item.style.position = 'relative';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.gap = '4px';
    item.style.width = '76px';
    item.style.padding = '6px 4px 5px';
    item.style.borderRadius = '11px';
    item.style.border = '1px solid rgba(200,220,209,0.25)';
    item.style.background = 'rgba(26,40,35,0.9)';
    item.style.color = '#f3fff7';
    item.style.font = '11px/1 "Segoe UI","PingFang SC",sans-serif';
    item.style.cursor = 'pointer';

    const icon = document.createElement('img');
    icon.src = SEED_CONFIG[id].icon;
    icon.alt = SEED_CONFIG[id].label;
    icon.onerror = () => { icon.src = iconWithFallback(id); };
    icon.style.width = '30px';
    icon.style.height = '30px';
    icon.style.objectFit = 'contain';
    item.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = SEED_CONFIG[id].label;
    name.style.whiteSpace = 'nowrap';
    item.appendChild(name);

    const badge = document.createElement('span');
    badge.textContent = '0';
    badge.style.position = 'absolute';
    badge.style.top = '4px';
    badge.style.right = '4px';
    badge.style.minWidth = '18px';
    badge.style.height = '18px';
    badge.style.padding = '0 4px';
    badge.style.borderRadius = '9px';
    badge.style.background = 'linear-gradient(180deg,#ffe896,#f4bf47)';
    badge.style.color = '#3a2a11';
    badge.style.font = '700 11px/18px "Segoe UI",sans-serif';
    badge.style.textAlign = 'center';
    item.appendChild(badge);

    item.addEventListener('click', () => {
      seedState.selectedSeed = id;
      refreshSeedDock();
      updateQuickHud();
    });
    seedButtons.set(id, item);
    seedBadges.set(id, badge);
    seedDock.appendChild(item);
  }

  for (const id of SEED_IDS) {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '56px 1fr auto auto';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.padding = '9px 10px';
    row.style.border = '1px solid rgba(170,214,191,0.2)';
    row.style.background = 'rgba(21,35,31,0.86)';
    row.style.borderRadius = '10px';

    const icon = document.createElement('img');
    icon.src = SEED_CONFIG[id].icon;
    icon.alt = SEED_CONFIG[id].label;
    icon.onerror = () => { icon.src = iconWithFallback(id); };
    icon.style.width = '48px';
    icon.style.height = '48px';
    icon.style.objectFit = 'contain';
    row.appendChild(icon);

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = SEED_CONFIG[id].label;
    title.style.fontWeight = '700';
    const price = document.createElement('div');
    price.textContent = `鍞环: ${SEED_CONFIG[id].seedPrice} 閲戝竵`;
    price.style.opacity = '0.86';
    info.append(title, price);
    row.appendChild(info);

    const owned = document.createElement('span');
    owned.textContent = `搴撳瓨 0`;
    owned.style.fontSize = '12px';
    row.appendChild(owned);
    shopOwnedLabels.set(id, owned);

    const buyBtn = document.createElement('button');
    buyBtn.textContent = '璐拱';
    buyBtn.style.padding = '6px 10px';
    buyBtn.style.borderRadius = '8px';
    buyBtn.style.border = '1px solid rgba(180,220,196,0.35)';
    buyBtn.style.background = 'rgba(56,93,73,0.9)';
    buyBtn.style.color = '#f1fff7';
    buyBtn.style.cursor = 'pointer';
    buyBtn.addEventListener('click', () => {
      const priceValue = SEED_CONFIG[id].seedPrice;
      if (seedState.gold < priceValue) {
        showToast('金币不足');
        return;
      }
      seedState.gold -= priceValue;
      seedState.seeds[id] += 1;
      refreshSeedDock();
      updateQuickHud();
      for (const seedId of SEED_IDS) {
        const ownedLabel = shopOwnedLabels.get(seedId);
        if (ownedLabel) ownedLabel.textContent = `搴撳瓨 ${seedState.seeds[seedId]}`;
      }
    });
    row.appendChild(buyBtn);
    shopList.appendChild(row);
  }

  const setShopVisible = (visible: boolean): void => {
    shopMask.style.display = visible ? 'block' : 'none';
    shopPanel.style.display = visible ? 'block' : 'none';
  };
  sowModeBtn.addEventListener('click', () => setSowMode(!sowMode));
  shopBtn.addEventListener('click', () => setShopVisible(true));
  shopMask.addEventListener('click', () => setShopVisible(false));
  shopClose.addEventListener('click', () => setShopVisible(false));

  refreshSeedDock();
  updateQuickHud();

  const rebuildPreview = (): void => {
    if (drawState.line) scene.remove(drawState.line);
    if (drawState.fill) scene.remove(drawState.fill);
    drawState.fill = null;
    if (drawState.points.length < 2) {
      drawState.line = null;
      return;
    }
    const pts = [...drawState.points, drawState.points[0]!].map((p) => new THREE.Vector3(p.x, drawSurfaceY, p.y));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xfff1b5 });
    drawState.line = new THREE.Line(geo, mat);
    scene.add(drawState.line);

    if (drawState.points.length >= 3) {
      const fillShape = new THREE.Shape(drawState.points);
      const fill = new THREE.Mesh(
        new THREE.ShapeGeometry(fillShape),
        new THREE.MeshBasicMaterial({ color: 0xfff1b5, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      // Keep preview orientation consistent with drawn world XZ points.
      fill.rotation.x = Math.PI / 2;
      fill.position.y = drawSurfaceY - 0.01;
      drawState.fill = fill;
      scene.add(fill);
    }
  };

  const commitDraw = (): void => {
    if (drawState.points.length < 3) return;
    const colorPool = [0xffd3e4, 0xffe9b9, 0xdaf0ff, 0xffc9da];
    const color = colorPool[Math.floor(Math.random() * colorPool.length)]!;
    const polygon = [...drawState.points].map(toGardenLocal);
    addPolygonPlantingZone(gardenRoot, polygon, color);
    savedZones.push({
      points: polygon.map((p) => [p.x, p.y]),
      color,
    });
    saveZones(savedZones);
    applyToyStyle(gardenRoot, performanceProfile);
    freezeStaticTransforms(gardenRoot);
    collectPlotCells();
    setSowMode(true);  // 绘制完成后自动进入种植模式
    requestShadowRefresh();
    clearDraw();
  };

  renderer.domElement.addEventListener('click', (ev) => {
    if (!drawState.enabled) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;

    const p = new THREE.Vector2(hitPoint.x, hitPoint.z);
    drawState.points.push(p);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe8b6 }),
    );
    marker.position.set(p.x, drawSurfaceY + 0.03, p.y);
    drawState.markers.push(marker);
    scene.add(marker);
    rebuildPreview();
  });

  renderer.domElement.addEventListener('contextmenu', (ev) => {
    if (!drawState.enabled) return;
    ev.preventDefault();
    commitDraw();
  });

  renderer.domElement.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    if (drawState.enabled) return;
    if (shopPanel.style.display === 'block') return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    // 射线检测 - 优先检测 plot cells
    if (plotCells.length > 0) {
      const hits = raycaster.intersectObjects(plotCells, false);
      if (hits.length > 0) {
        const cell = hits[0]!.object as THREE.Mesh;
        console.log('[Garden] Hit plot cell:', cell, 'sowMode:', sowMode);
        if (sowMode || getLife(cell) != null) {
          interactPlotCell(cell);
        }
        return;
      }
    }

    // 如果没命中 plot cells，检测装饰物
    if (borderDecorObjects.length > 0) {
      const decorHits = raycaster.intersectObjects(borderDecorObjects, true);
      if (decorHits.length > 0) {
        console.log('[Garden] Hit decoration, looking for nearest plot cell');
        // 找到被装饰物遮挡的最近的 plot cell
        const worldPoint = raycaster.ray.origin.clone().add(
          raycaster.ray.direction.clone().multiplyScalar(decorHits[0]!.distance)
        );
        const localPoint = worldPoint.clone().sub(gardenRoot.position).divideScalar(gardenRoot.scale.x);

        let nearestCell: THREE.Mesh | null = null;
        let nearestDist = Infinity;
        for (const cell of plotCells) {
          const dx = cell.position.x - localPoint.x;
          const dz = cell.position.z - localPoint.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestCell = cell;
          }
        }
        if (nearestCell && nearestDist < 0.8) {
          console.log('[Garden] Found nearest plot cell at distance:', nearestDist);
          if (sowMode || getLife(nearestCell) != null) {
            interactPlotCell(nearestCell);
          }
          return;
        }
      }
    }
  });

  renderer.domElement.addEventListener('pointermove', (ev) => {
    // Skip hover refresh while orbiting camera with right/middle mouse button.
    if ((ev.buttons & 2) !== 0 || (ev.buttons & 4) !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    hoverNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    hoverNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    hasHoverPointer = true;
    hoverHintDirty = true;
  });

  window.addEventListener('keydown', (ev) => {
    if (moveCodes.has(ev.code)) {
      previewKeysDown.add(ev.code);
      ev.preventDefault();
    }
    if (ev.code === 'KeyB') {
      const opening = shopPanel.style.display !== 'block';
      setShopVisible(opening);
      ev.preventDefault();
      return;
    }
    if (ev.code === 'KeyP') {
      setSowMode(!sowMode);
      ev.preventDefault();
      return;
    }
    if (ev.key.toLowerCase() === 'g') {
      drawState.enabled = !drawState.enabled;
      controls.enabled = !drawState.enabled;
      if (!drawState.enabled) clearDraw();
      return;
    }
    if (!drawState.enabled) return;
    if (ev.key === 'Escape') {
      clearDraw();
      return;
    }
    if (ev.key === 'Backspace') {
      ev.preventDefault();
      const last = drawState.markers.pop();
      if (last) scene.remove(last);
      drawState.points.pop();
      rebuildPreview();
      return;
    }
    if ((ev.key === 'Enter' || ev.key === ' ') && drawState.points.length >= 3) {
      ev.preventDefault();
      commitDraw();
    }
  });
  window.addEventListener('keyup', (ev) => {
    if (moveCodes.has(ev.code)) previewKeysDown.delete(ev.code);
  });

  const updateHoverHint = (): void => {
    if (!hasHoverPointer || drawState.enabled || shopPanel.style.display === 'block') {
      return;
    }
    if (!hoverHintDirty) return;
    const now = performance.now();
    if (now - lastHoverHintAt < performanceProfile.hoverRefreshMs) {
      return;
    }
    hoverHintDirty = false;
    lastHoverHintAt = now;
    if (!sowMode && shopPanel.style.display === 'block') {
      actionHud.textContent = '种植模式已关闭：点击底部按钮进入';
      return;
    }
    raycaster.setFromCamera(hoverNdc, camera);
    const hits = raycaster.intersectObjects(plotCells, false);
    if (hits.length === 0) {
      actionHud.textContent = '鐐瑰嚮鍦板潡: 绉嶆 / 娴囨按 / 鏂借偉';
      return;
    }
    const cell = hits[0]!.object as THREE.Mesh;
    if (!sowMode && !getLife(cell)) {
      actionHud.textContent = '种植模式已关闭：只有已种植的地块可以交互';
      return;
    }
    actionHud.textContent = describeCellAction(cell);
  };

  const updatePromptFx = (delta: number): void => {
    for (const cell of promptFxCells) {
      const hint = cell.userData.promptFx as THREE.Group | undefined;
      if (!hint) continue;
      const life = getLife(cell);
      if (!life || (life.stage !== 1 && life.stage !== 2 && life.stage !== 3)) {
        clearPromptFx(cell);
        continue;
      }
      hint.rotation.y += delta * 1.6;
      const pulse = 1 + Math.sin(clock.elapsedTime * 4.6) * 0.08;
      hint.scale.setScalar(pulse);
      for (const ch of hint.children) {
        if (!(ch instanceof THREE.Mesh)) continue;
        if (ch.geometry instanceof THREE.RingGeometry) continue;
        ch.position.y += Math.sin(clock.elapsedTime * 5 + ch.id * 0.3) * 0.0009;
      }
    }
  };

  const updatePreviewPlayer = (delta: number): void => {
    moveDir.set(0, 0, 0);
    const uiBlocking = drawState.enabled || shopPanel.style.display === 'block';
    if (!uiBlocking) {
      if (previewKeysDown.has('KeyW') || previewKeysDown.has('ArrowUp')) moveDir.z -= 1;
      if (previewKeysDown.has('KeyS') || previewKeysDown.has('ArrowDown')) moveDir.z += 1;
      if (previewKeysDown.has('KeyA') || previewKeysDown.has('ArrowLeft')) moveDir.x -= 1;
      if (previewKeysDown.has('KeyD') || previewKeysDown.has('ArrowRight')) moveDir.x += 1;
    }
    const sprinting = !uiBlocking && (previewKeysDown.has('ShiftLeft') || previewKeysDown.has('ShiftRight'));
    let mode: PreviewLocomotionMode = 'idle';

    if (moveDir.lengthSq() > 0) {
      mode = sprinting ? 'run' : 'walk';
      const targetSpeed = sprinting ? runSpeed : walkSpeed;
      previewSpeed += (targetSpeed - previewSpeed) * Math.min(1, delta * 13);

      moveDir.normalize();
      cameraForward.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z);
      if (cameraForward.lengthSq() < 1e-8) cameraForward.set(0, 0, 1);
      cameraForward.normalize();
      cameraRight.crossVectors(cameraForward, worldUp).normalize();

      const mx = moveDir.x;
      const mz = moveDir.z;
      const worldX = cameraRight.x * mx + cameraForward.x * -mz;
      const worldZ = cameraRight.z * mx + cameraForward.z * -mz;
      const len = Math.hypot(worldX, worldZ) || 1;
      previewPlayer.position.x += (worldX / len) * previewSpeed * delta;
      previewPlayer.position.z += (worldZ / len) * previewSpeed * delta;

      // The chibi face is modeled toward -Z, so yaw needs a PI-equivalent directional flip.
      const targetYaw = Math.atan2(-worldX, -worldZ);
      tmpYawQuat.setFromAxisAngle(worldUp, targetYaw);
      previewPlayer.quaternion.slerp(tmpYawQuat, 1 - Math.exp(-12 * delta));
    } else {
      previewSpeed += (walkSpeed - previewSpeed) * Math.min(1, delta * 8);
    }

    previewPlayer.position.x = THREE.MathUtils.clamp(previewPlayer.position.x, -playableBoundX, playableBoundX);
    previewPlayer.position.z = THREE.MathUtils.clamp(previewPlayer.position.z, -playableBoundZ, playableBoundZ);
    animateChibiPreview(previewPlayerRig, mode, delta, locomotionPhase);
    cameraTargetFollow.set(previewPlayer.position.x, 1.38, previewPlayer.position.z);
    controls.target.lerp(cameraTargetFollow, Math.min(1, delta * 4));
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    resizeRenderer(renderer, performanceProfile, window.innerWidth, window.innerHeight);
  });

  let perfDebugAccum = 0;
  let animPhase = 0;
  renderer.setAnimationLoop(() => {
    const delta = Math.min(clock.getDelta(), 1 / 30);
    animPhase += delta;
    tickPlotLifecycle(delta);
    flushPlotVisualRefresh();
    updatePlotEffects(delta);
    updatePlantGrowthAnimation(delta, animPhase);
    updatePromptFx(delta);
    updateHoverHint();
    updatePreviewPlayer(delta);
    if (controls.enableDamping) controls.update();

    perfDebugAccum += delta;
    if (perfDebugEl && perfDebugAccum >= 0.75) {
      perfDebugAccum = 0;
      const perfMemory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
      const usedHeapMb = perfMemory?.usedJSHeapSize ? `${(perfMemory.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB` : 'n/a';
      perfDebugEl.textContent = [
        `calls ${renderer.info.render.calls}`,
        `tris ${renderer.info.render.triangles}`,
        `geom ${renderer.info.memory.geometries}`,
        `tex ${renderer.info.memory.textures}`,
        `plots ${plotCells.length}/${activePlotCells.size}`,
        `heap ${usedHeapMb}`,
      ].join('\n');
    }

    renderer.render(scene, camera);
  });
}

bootstrap();

