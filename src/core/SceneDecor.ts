import * as THREE from 'three';

/**
 * 地面小石块（程序化）。远景灯笼见 decorGltfEnvironment.ts；要树可在此加程序化或实例化 glb。
 */
export function addSceneDecor(scene: THREE.Scene, _groundSize: number): void {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x7a7a82,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
  });
  const rng = mulberry32(42);

  for (let i = 0; i < 16; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 8 + rng() * 35;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rng() * 0.35, 0), rockMat);
    rock.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    rock.rotation.set(rng(), rng(), rng());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
