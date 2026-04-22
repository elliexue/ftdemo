import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// 默认模型在 public/assets/；自定义见 public/assets/custom/ 与 src/config/assetPaths.ts（loadModel 带回落）。
const PUBLIC_PREFIX = '/';

function normalizePublicPath(relativePath: string): string {
  const trimmed = relativePath.trim().replace(/^\.?\//, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${PUBLIC_PREFIX}${trimmed}`;
}

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const CHARACTER_MEDIUM_FBX = 'assets/custom/Model/characterMedium.fbx';
const KENNEY_COLORMAP = 'assets/custom/Models/FBX format/Textures/colormap.png';

export function assetUrl(relativePath: string): string {
  return normalizePublicPath(relativePath);
}

/** 含空格路径也能被正确请求 */
function encodedAssetUrl(relativePath: string): string {
  return encodeURI(assetUrl(relativePath));
}

export function loadGLTF(relativePath: string) {
  return gltfLoader.loadAsync(encodedAssetUrl(relativePath));
}

export function loadFBX(relativePath: string) {
  return fbxLoader.loadAsync(encodedAssetUrl(relativePath));
}

function isCharacterMediumFbx(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith(CHARACTER_MEDIUM_FBX.toLowerCase());
}

async function patchCharacterMediumFbxTexture(root: THREE.Object3D, relativePath: string): Promise<void> {
  if (!isCharacterMediumFbx(relativePath)) return;
  try {
    const tex = await textureLoader.loadAsync(encodedAssetUrl(KENNEY_COLORMAP));
    tex.colorSpace = THREE.SRGBColorSpace;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        const m = mat as THREE.MeshStandardMaterial & { map?: THREE.Texture | null; color?: THREE.Color };
        if (!m.map) m.map = tex;
        if (m.color) m.color.setHex(0xffffff);
        mat.needsUpdate = true;
      }
    });
  } catch (err) {
    console.warn('[assets] characterMedium.fbx fallback texture load failed:', err);
  }
}

export type LoadedScene = {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
};

/**
 * 加载 Kenney 等提供的 OBJ+MTL（贴图相对路径在 .mtl 里，如 Textures/colormap.png）。
 */
export function loadOBJ(relativeObjPath: string): Promise<THREE.Group> {
  const objUrl = encodedAssetUrl(relativeObjPath);
  const baseUrl = objUrl.slice(0, objUrl.lastIndexOf('/') + 1);
  const segments = relativeObjPath.split('/');
  const fileName = segments[segments.length - 1]!;
  const mtlName = fileName.replace(/\.obj$/i, '.mtl');

  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(baseUrl);
    mtlLoader.setResourcePath(baseUrl);

    mtlLoader.load(
      mtlName,
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(baseUrl);
        objLoader.load(
          fileName,
          (object) => {
            object.traverse((o) => {
              const mesh = o as THREE.Mesh;
              if (!mesh.isMesh) return;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const mat of mats) {
                if (mat && 'map' in mat && mat.map) {
                  (mat.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
                }
              }
            });
            resolve(object);
          },
          undefined,
          reject,
        );
      },
      undefined,
      reject,
    );
  });
}

/** 按扩展名选 FBX / GLB/GLTF / OBJ */
export async function loadSceneResource(relativePath: string): Promise<LoadedScene> {
  if (/\.obj$/i.test(relativePath)) {
    const group = await loadOBJ(relativePath);
    return { scene: group, animations: [] };
  }
  if (/\.fbx$/i.test(relativePath)) {
    const root = await loadFBX(relativePath);
    await patchCharacterMediumFbxTexture(root, relativePath);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat && 'map' in mat && mat.map) {
          (mat.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
        }
      }
    });
    const anims = root.animations?.length ? root.animations : [];
    return { scene: root, animations: anims };
  }
  const gltf = await loadGLTF(relativePath);
  return { scene: gltf.scene, animations: gltf.animations };
}
