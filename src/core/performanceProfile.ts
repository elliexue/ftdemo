import * as THREE from 'three';

type DeviceNavigator = Navigator & {
  deviceMemory?: number;
};

export type PerformanceProfile = {
  constrained: boolean;
  antialias: boolean;
  maxPixelRatio: number;
  shadowMapSize: number;
  shadowType: THREE.ShadowMapType;
  minShadowCasterRadius: number;
  hoverRefreshMs: number;
  enableControlDamping: boolean;
  targetFps: number;
};

export function createPerformanceProfile(): PerformanceProfile {
  const nav = navigator as DeviceNavigator;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const dpr = window.devicePixelRatio || 1;
  const screenPixels = window.innerWidth * window.innerHeight;
  const mobileLike = /android|iphone|ipad|mobile/i.test(nav.userAgent);
  const constrained = mobileLike || cores <= 6 || memory <= 6 || dpr >= 1.75;
  const largeViewportScale = screenPixels >= 2560 * 1440 ? 0.82 : screenPixels >= 1920 * 1080 ? 0.9 : 1;

  return {
    constrained,
    antialias: !constrained && dpr <= 1.5,
    maxPixelRatio: Math.max(0.85, (constrained ? 1.0 : 1.2) * largeViewportScale),
    shadowMapSize: constrained ? 512 : 1024,
    shadowType: constrained ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap,
    minShadowCasterRadius: constrained ? 0.22 : 0.12,
    hoverRefreshMs: constrained ? 96 : 56,
    enableControlDamping: !constrained,
    targetFps: constrained ? 30 : 60,
  };
}

export function getRendererOptions(profile: PerformanceProfile): THREE.WebGLRendererParameters {
  return {
    antialias: profile.antialias,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  };
}

export function applyRendererProfile(renderer: THREE.WebGLRenderer, profile: PerformanceProfile): void {
  resizeRenderer(renderer, profile, window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = profile.shadowType;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  profile: PerformanceProfile,
  width: number,
  height: number,
): void {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
  renderer.setSize(width, height);
}

function shouldKeepShadow(obj: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (current.userData.keepShadow === true) return true;
    current = current.parent;
  }
  return false;
}

function hasDynamicAncestor(obj: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (current.userData.dynamic === true) return true;
    current = current.parent;
  }
  return false;
}

export function optimizeShadowCasting(root: THREE.Object3D, minRadius: number): void {
  const worldScale = new THREE.Vector3();

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    obj.receiveShadow = true;

    if (shouldKeepShadow(obj)) {
      obj.castShadow = true;
      return;
    }

    const geometry = obj.geometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius ?? 0;
    obj.getWorldScale(worldScale);
    const scaledRadius = radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
    obj.castShadow = scaledRadius >= minRadius;
  });
}

export function freezeStaticTransforms(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (hasDynamicAncestor(obj)) return;
    obj.updateMatrix();
    obj.matrixAutoUpdate = false;
  });
  root.updateMatrixWorld(true);
}
