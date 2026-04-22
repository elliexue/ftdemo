import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function makeRenderer(): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.06;
  return r;
}

function makeFlower(color: number): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.028, 0.56, 10),
    new THREE.MeshStandardMaterial({ color: 0x487a4c, roughness: 0.64 }),
  );
  stem.position.y = 0.28;
  stem.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.48 }));
  head.position.y = 0.62;
  head.castShadow = true;
  g.add(stem, head);
  return g;
}

function makePlanter(color: number): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.26, 22),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 }),
  );
  pot.castShadow = true;
  pot.receiveShadow = true;
  pot.position.y = 0.13;
  g.add(pot);
  return g;
}

function addIsoGarden(scene: THREE.Scene): void {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf4f0de, roughness: 0.96 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xa8d488, roughness: 0.92 });

  const base = new THREE.Group();
  scene.add(base);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.34, 8.4), new THREE.MeshStandardMaterial({ color: 0xe9f3dc, roughness: 0.95 }));
  plinth.position.y = 0.17;
  plinth.receiveShadow = true;
  base.add(plinth);

  const grass = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.2, 7.8), grassMat);
  grass.position.y = 0.43;
  grass.receiveShadow = true;
  base.add(grass);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.7), stoneMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0.7, 0.54, 0.5);
  base.add(path);

  const tileGeo = new THREE.BoxGeometry(0.54, 0.045, 0.54);
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      if (Math.abs(x) + Math.abs(z) > 5) continue;
      const t = new THREE.Mesh(tileGeo, stoneMat);
      t.position.set(0.65 + x * 0.58 + (z % 2) * 0.06, 0.57, 0.5 + z * 0.52);
      t.castShadow = true;
      t.receiveShadow = true;
      base.add(t);
    }
  }

  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xf8f5ea, roughness: 0.86 });
  for (let i = 0; i < 10; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), fenceMat);
    post.position.set(-2.9 + i * 0.42, 1.05, -2.35);
    base.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 0.1), fenceMat);
  rail.position.set(-1.0, 1.38, -2.35);
  base.add(rail);

  const archMat = new THREE.MeshStandardMaterial({ color: 0xf3f2e5, roughness: 0.74 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 12, 48, Math.PI), archMat);
  arch.rotation.z = Math.PI / 2;
  arch.position.set(2.55, 1.74, 0.1);
  base.add(arch);

  const chair = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.55), wood);
  seat.position.y = 0.45;
  chair.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.05), wood);
  back.position.set(0, 0.75, -0.25);
  chair.add(back);
  for (const sx of [-0.22, 0.22]) for (const sz of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), wood);
    leg.position.set(sx, 0.22, sz);
    chair.add(leg);
  }
  chair.position.set(-2.15, 0.58, 1.35);
  chair.rotation.y = Math.PI * 0.12;
  base.add(chair);

  const table = new THREE.Group();
  const tableMat = new THREE.MeshStandardMaterial({ color: 0xeecb62, roughness: 0.72 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.86), tableMat);
  top.position.y = 0.46;
  table.add(top);
  for (const sx of [-0.32, 0.32]) for (const sz of [-0.32, 0.32]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), tableMat);
    leg.position.set(sx, 0.22, sz);
    table.add(leg);
  }
  table.position.set(0.45, 0.58, 1.0);
  table.rotation.y = -0.2;
  base.add(table);

  const bushColors = [0x79b86e, 0x8ac57d, 0x94d78d, 0x8abf72];
  for (let i = 0; i < 180; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: bushColors[i % bushColors.length]!, roughness: 0.9 }),
    );
    const side = i % 2 === 0 ? -1 : 1;
    const x = side < 0 ? -2.8 + Math.random() * 3.2 : 1.5 + Math.random() * 2.4;
    const z = -2.5 + Math.random() * 4.8;
    const y = 0.62 + Math.random() * (side < 0 ? 1.35 : 0.7);
    m.position.set(x, y, z);
    m.castShadow = true;
    base.add(m);
  }

  const flowerPalette = [0xffffff, 0xffe86d, 0xffcf89, 0xffa3be, 0xcfe9ff];
  for (let i = 0; i < 170; i++) {
    const flower = makeFlower(flowerPalette[i % flowerPalette.length]!);
    flower.scale.setScalar(0.36 + Math.random() * 0.34);
    const ring = 2.6 + Math.random() * 1.3;
    const angle = Math.random() * Math.PI * 2;
    flower.position.set(Math.cos(angle) * ring * 0.9, 0.54, Math.sin(angle) * ring * 0.78);
    base.add(flower);
  }

  const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x7d5f3d, roughness: 0.82 }));
  treeTrunk.position.set(0.45, 1.3, -1.6);
  base.add(treeTrunk);
  for (let i = 0; i < 90; i++) {
    const c = i % 3 === 0 ? 0xf6db5a : i % 3 === 1 ? 0xf2d24d : 0x9ec86b;
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14 + Math.random() * 0.11, 8, 6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.86 }));
    bloom.position.set(0.15 + (Math.random() - 0.5) * 2.2, 2.0 + Math.random() * 1.55, -1.6 + (Math.random() - 0.5) * 1.8);
    bloom.castShadow = true;
    base.add(bloom);
  }

  const pots = [
    [1.65, 0.6, 1.9, 0x8fb483, 0xffef96],
    [2.2, 0.6, 1.55, 0x8ca2bf, 0xffffff],
    [1.95, 0.6, 2.3, 0xb88d67, 0xffb5c3],
  ] as const;
  for (const [x, y, z, p, f] of pots) {
    const pot = makePlanter(p);
    pot.position.set(x, y, z);
    base.add(pot);
    const fl = makeFlower(f);
    fl.position.set(x, y + 0.16, z);
    fl.scale.setScalar(0.92);
    base.add(fl);
  }
}

function bootstrap(): void {
  const mount = document.getElementById('app');
  if (!mount) throw new Error('Missing #app');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc9df);
  scene.fog = new THREE.Fog(0x9cc9df, 10, 30);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(7.2, 6.4, 7.8);

  const renderer = makeRenderer();
  mount.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.4, 0);
  controls.minDistance = 6;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.2;

  const hemi = new THREE.HemisphereLight(0xf2fbff, 0x6f8a76, 0.62);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.36);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff8de, 1.25);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.4;
  sun.shadow.camera.far = 44;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);

  addIsoGarden(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

bootstrap();
