
import * as THREE from 'three';
import { loadModel } from '../config/assetPaths';
import { getFriendGardenPlotIndex } from '../modules/garden/FriendGardenPlots';
import type { IModule } from '../modules/IModule';
import { addSceneDecor } from './SceneDecor';
import { forceModelVisible, normalizeModelHeight, pickCharacterLocomotionClips } from './modelUtils';
import { makeGrassTexture } from './makeGrassTexture';
import { makeSkyGradientTexture } from './makeSkyGradientTexture';
import { applyRendererProfile, createPerformanceProfile, getRendererOptions, optimizeShadowCasting, resizeRenderer } from './performanceProfile';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
type LocomotionMode = 'idle' | 'walk' | 'run';
type ChibiPlayerRig = {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
};

export class Engine {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly modules: IModule[];
  private readonly performanceProfile = createPerformanceProfile();
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly player = new THREE.Group();
  private readonly keysDown = new Set<string>();
  private readonly moveDir = new THREE.Vector3();
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpVec2 = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly walkMoveSpeed = 6.8;
  private readonly runMoveSpeed = 11.4;
  private moveSpeed = this.walkMoveSpeed;
  private verticalVelocity = 0;
  private readonly gravity = 28;
  private readonly jumpSpeed = 10;
  private readonly groundHeight = 0;

  /** 右键拖拽：绕角色水平角 */
  private cameraYaw = 2.35;
  /** 俯仰，略向上看 */
  private cameraPitch = 0.38;
  private cameraDistance = 8.5;
  private readonly minCameraDistance = 4.2;
  private readonly maxCameraDistance = 20;
  private readonly pivotHeight = 1.15;
  private readonly minPitch = 0.12;
  private readonly maxPitch = 1.25;
  private orbitDragging = false;
  private orbitPointerId: number | null = null;
  private readonly orbitSensitivity = 0.0045;

  private playerMixer: THREE.AnimationMixer | null = null;
  private playerIdleAction: THREE.AnimationAction | null = null;
  private playerRunAction: THREE.AnimationAction | null = null;
  private playerDanceAction: THREE.AnimationAction | null = null;
  private playerLocomotion = false;
  private playerAnimMode: 'none' | 'dual' | 'runOnly' | 'idleOnly' = 'none';
  private playerVisualRoot: THREE.Object3D | null = null;
  private playerContactShadow: THREE.Mesh | null = null;
  private proceduralRig: ChibiPlayerRig | null = null;
  private locomotionPhase = 0;
  private blessDanceTimer = 0;
  private blessAura: THREE.Group | null = null;

  constructor(modules: IModule[]) {
    this.modules = modules;

    this.scene = new THREE.Scene();
    this.scene.background = makeSkyGradientTexture();
    this.scene.fog = new THREE.Fog(0xb8d9f0, 55, 220);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer(getRendererOptions(this.performanceProfile));
    applyRendererProfile(this.renderer, this.performanceProfile);

    this.setupLights();
    this.setupGround();
    addSceneDecor(this.scene, 400);
    optimizeShadowCasting(this.scene, this.performanceProfile.minShadowCasterRadius);
    this.setupPlayer();
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5236, 0.55);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.22);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e6, 1.05);
    sun.position.set(28, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.performanceProfile.shadowMapSize, this.performanceProfile.shadowMapSize);
    sun.shadow.bias = -0.00025;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);
  }

  private setupGround(): void {
    const size = 400;
    const geo = new THREE.PlaneGeometry(size, size, 80, 80);
    const grass = makeGrassTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: grass,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'Ground';
    this.scene.add(ground);

    const grid = new THREE.GridHelper(size, 100, 0x2a3d2e, 0x35543a);
    grid.material.opacity = 0.18;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.015;
    this.scene.add(grid);
  }

  private setupPlayer(): void {
    const rig = this.createChibiPlayerRig();
    this.proceduralRig = rig;
    this.player.clear();
    this.player.add(rig.root);
    this.playerVisualRoot = rig.root;
    this.player.position.set(0, 0, 5);
    this.player.name = 'Player';
    this.scene.add(this.player);
    this.ensurePlayerContactShadow();
    this.syncPlayerContactShadow();

    this.playerMixer = null;
    this.playerIdleAction = null;
    this.playerRunAction = null;
    this.playerDanceAction = null;
    this.playerAnimMode = 'none';
    this.playerLocomotion = false;
  }

  private createChibiPlayerRig(): ChibiPlayerRig {
    const root = new THREE.Group();
    root.name = 'PlayerChibi';

    const skin = new THREE.MeshToonMaterial({ color: 0xf7d8bf });
    const hair = new THREE.MeshToonMaterial({ color: 0x1f2b49 });
    const coat = new THREE.MeshToonMaterial({ color: 0x5f7ddd });
    const coatTrim = new THREE.MeshToonMaterial({ color: 0xeaf0ff });
    const shorts = new THREE.MeshToonMaterial({ color: 0x2f3c64 });
    const socks = new THREE.MeshToonMaterial({ color: 0xf5f8ff });
    const shoes = new THREE.MeshToonMaterial({ color: 0xb64a4d });
    const eyeWhite = new THREE.MeshToonMaterial({ color: 0xf9fcff });
    const eyePupil = new THREE.MeshToonMaterial({ color: 0x2a3555 });
    const blush = new THREE.MeshToonMaterial({ color: 0xffa3ad });

    const torso = new THREE.Group();
    torso.position.y = 0.94;
    root.add(torso);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 6, 12), coat);
    body.position.y = -0.02;
    torso.add(body);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.08), coatTrim);
    shirt.position.set(0, -0.02, -0.17);
    torso.add(shirt);
    const collar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 3), coatTrim);
    collar.position.set(0, 0.18, -0.2);
    collar.rotation.x = Math.PI * 0.5;
    torso.add(collar);

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
    head.position.y = 1.42;
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
    const ahoge = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.14, 3, 4), hair);
    ahoge.position.set(0.05, 0.4, -0.02);
    ahoge.rotation.z = -0.35;
    head.add(ahoge);
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
    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), eyePupil);
    pupilL.position.set(eyeLX, eyeY - 0.005, eyeZ - 0.025);
    head.add(pupilL);
    const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), eyePupil);
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

  private disablePlayerRealtimeShadows(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
    });
  }

  private ensurePlayerContactShadow(): void {
    if (this.playerContactShadow) return;
    this.playerContactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    this.playerContactShadow.rotation.x = -Math.PI / 2;
    this.playerContactShadow.position.y = this.groundHeight + 0.02;
    this.playerContactShadow.renderOrder = 1;
    this.scene.add(this.playerContactShadow);
  }

  private syncPlayerContactShadow(): void {
    if (!this.playerContactShadow) return;
    const airborne = Math.max(0, this.player.position.y - this.groundHeight);
    const scale = THREE.MathUtils.clamp(1 - airborne * 0.16, 0.72, 1);
    const material = this.playerContactShadow.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.clamp(0.18 - airborne * 0.05, 0.06, 0.18);
    this.playerContactShadow.position.set(this.player.position.x, this.groundHeight + 0.02, this.player.position.z);
    this.playerContactShadow.scale.setScalar(scale);
  }

  start(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
    this.resize();
    window.addEventListener('resize', () => this.resize());

    for (const mod of this.modules) {
      mod.init(this.scene);
    }

    this.syncCameraImmediate();

    window.addEventListener('game:respawn-player', this.onRespawnPlayer);
    window.addEventListener('game:player-bless-dance', this.onBlessDance as EventListener);
    window.addEventListener('game:toast', this.onGameToast as EventListener);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    canvas.addEventListener('pointermove', this.onCanvasPointerMove);
    canvas.addEventListener('pointerup', this.onCanvasPointerUp);
    canvas.addEventListener('pointercancel', this.onCanvasPointerUp);
    canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.renderer.setAnimationLoop(() => this.frame());
  }

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const dy = event.deltaY;
    const factor = dy > 0 ? 1.09 : 1 / 1.09;
    this.cameraDistance = Math.max(
      this.minCameraDistance,
      Math.min(this.maxCameraDistance, this.cameraDistance * factor),
    );
    this.updateCameraPosition();
  };

  private pickFromPointerEvent(event: PointerEvent): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.scene.children, true);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    resizeRenderer(this.renderer, this.performanceProfile, w, h);
  }

  private onRespawnPlayer = (): void => {
    this.player.position.set(0, this.groundHeight, 5);
    this.verticalVelocity = 0;
    this.syncPlayerContactShadow();
  };

  /** 人形 Soldier（`assets/soldier.glb`）；GLB 正面与移动轴向不一致时绕 Y 翻转。失败时保留胶囊占位 */
  private async loadPlayerSoldierModel(): Promise<void> {
    try {
      const gltf = await loadModel('player');
      const model = gltf.scene;
      this.disablePlayerRealtimeShadows(model);
      forceModelVisible(model);
      normalizeModelHeight(model, 1.65);
      /** 与 `updatePlayer` 里 atan2 朝向一致：Soldier 资源默认面朝与位移相反一侧 */
      model.rotation.y = Math.PI;
      model.name = 'PlayerMesh';
      model.updateMatrixWorld(true);

      this.player.clear();
      this.player.add(model);
      this.playerVisualRoot = model;

      const clips = gltf.animations;
      this.playerMixer = null;
      this.playerIdleAction = null;
      this.playerRunAction = null;
      this.playerDanceAction = null;
      this.playerAnimMode = 'none';
      this.playerLocomotion = false;

      if (clips.length === 0) return;

      this.playerMixer = new THREE.AnimationMixer(model);
      const { idle: idleClip, run: runClip } = pickCharacterLocomotionClips(clips);
      const danceClip = clips.find((c) => /(dance|celebrate|wave|cheer)/i.test(c.name)) ?? null;

      if (idleClip && runClip) {
        this.playerIdleAction = this.playerMixer.clipAction(idleClip);
        this.playerRunAction = this.playerMixer.clipAction(runClip);
        this.playerIdleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.playerRunAction.setLoop(THREE.LoopRepeat, Infinity);
        this.playerIdleAction.play();
        this.playerRunAction.play();
        this.playerRunAction.setEffectiveWeight(0);
        this.playerAnimMode = 'dual';
      } else if (runClip) {
        this.playerRunAction = this.playerMixer.clipAction(runClip);
        this.playerRunAction.setLoop(THREE.LoopRepeat, Infinity);
        this.playerRunAction.play();
        this.playerRunAction.timeScale = 0;
        this.playerAnimMode = 'runOnly';
      } else if (idleClip) {
        this.playerIdleAction = this.playerMixer.clipAction(idleClip);
        this.playerIdleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.playerIdleAction.play();
        this.playerAnimMode = 'idleOnly';
      } else {
        const fallback = clips[0];
        if (fallback) {
          const act = this.playerMixer.clipAction(fallback);
          act.setLoop(THREE.LoopRepeat, Infinity);
          act.play();
          this.playerAnimMode = 'idleOnly';
        }
      }
      if (danceClip) {
        this.playerDanceAction = this.playerMixer.clipAction(danceClip);
        this.playerDanceAction.setLoop(THREE.LoopRepeat, Infinity);
        this.playerDanceAction.clampWhenFinished = false;
      }
    } catch (err) {
      console.warn(
        '[Engine] 无法加载 soldier.glb，使用胶囊占位。请执行 npm run download-assets 或手动放到 public/assets/soldier.glb。',
        err,
      );
    }
  }

  private onBlessDance = (): void => {
    this.blessDanceTimer = 1.9;
    if (this.playerDanceAction) {
      this.playerIdleAction?.fadeOut(0.12);
      this.playerRunAction?.fadeOut(0.12);
      this.playerDanceAction.reset().fadeIn(0.12).play();
      this.playerAnimMode = 'idleOnly';
    }
    this.ensureBlessAura();
  };

  private onGameToast = (event: Event): void => {
    const ce = event as CustomEvent<{ kind?: string; message?: string }>;
    if (ce.detail?.kind === 'bless') this.onBlessDance();
  };

  private ensureBlessAura(): void {
    if (!this.playerVisualRoot || this.blessAura) return;
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffef9a, transparent: true, opacity: 0.86, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 5), mat);
      m.userData.phase = (i / 10) * Math.PI * 2;
      m.userData.r = 0.58 + Math.random() * 0.26;
      g.add(m);
    }
    g.visible = false;
    this.playerVisualRoot.add(g);
    this.blessAura = g;
  }

  private applyProceduralLocomotion(mode: LocomotionMode, delta: number): void {
    const v = this.playerVisualRoot;
    if (!v) return;
    const rig = this.proceduralRig;
    if (mode !== 'idle') {
      const running = mode === 'run';
      this.locomotionPhase += delta * (running ? 16 : 10);
      const stride = Math.sin(this.locomotionPhase);
      const sway = Math.sin(this.locomotionPhase * 0.5);
      const settle = Math.min(1, delta * 16);
      const legAmp = running ? 0.88 : 0.56;
      const armAmp = running ? 1.02 : 0.64;
      const bob = running ? 0.092 : 0.058;

      v.position.y += ((Math.abs(stride) - 0.5) * bob - v.position.y) * settle;
      v.rotation.x += ((running ? 0.1 : 0.06) + Math.cos(this.locomotionPhase) * 0.024 - v.rotation.x) * settle;
      v.rotation.z += (sway * (running ? 0.05 : 0.03) - v.rotation.z) * settle;
      if (rig) {
        rig.leftArm.rotation.x += ((-stride * armAmp) - 0.32 - rig.leftArm.rotation.x) * settle;
        rig.rightArm.rotation.x += ((stride * armAmp) - 0.32 - rig.rightArm.rotation.x) * settle;
        rig.leftArm.rotation.z += (0.12 - rig.leftArm.rotation.z) * settle;
        rig.rightArm.rotation.z += (-0.12 - rig.rightArm.rotation.z) * settle;
        rig.leftLeg.rotation.x += (stride * legAmp - rig.leftLeg.rotation.x) * settle;
        rig.rightLeg.rotation.x += (-stride * legAmp - rig.rightLeg.rotation.x) * settle;
        rig.torso.rotation.y += (sway * (running ? 0.11 : 0.08) - rig.torso.rotation.y) * settle;
        rig.head.rotation.y += (Math.sin(this.locomotionPhase * 0.42) * 0.09 - rig.head.rotation.y) * settle;
      }
    } else {
      this.locomotionPhase += delta * 5;
      const settle = Math.min(1, delta * 10);
      v.position.y += (Math.sin(this.locomotionPhase * 0.5) * 0.016 - v.position.y) * settle;
      v.rotation.x += (0 - v.rotation.x) * settle;
      v.rotation.z += (0 - v.rotation.z) * settle;
      if (rig) {
        rig.leftArm.rotation.x += (-0.28 - rig.leftArm.rotation.x) * settle;
        rig.rightArm.rotation.x += (-0.28 - rig.rightArm.rotation.x) * settle;
        rig.leftArm.rotation.z += (0.1 - rig.leftArm.rotation.z) * settle;
        rig.rightArm.rotation.z += (-0.1 - rig.rightArm.rotation.z) * settle;
        rig.leftLeg.rotation.x += (0 - rig.leftLeg.rotation.x) * settle;
        rig.rightLeg.rotation.x += (0 - rig.rightLeg.rotation.x) * settle;
        rig.torso.rotation.y += (0 - rig.torso.rotation.y) * settle;
        rig.head.rotation.y += (Math.sin(this.locomotionPhase * 0.25) * 0.03 - rig.head.rotation.y) * settle;
      }
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      if (this.player.position.y <= this.groundHeight + 1e-3) {
        this.verticalVelocity = this.jumpSpeed;
      }
      e.preventDefault();
      return;
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.keysDown.add(e.code);
      return;
    }

    if (MOVE_KEYS.has(e.code)) {
      this.keysDown.add(e.code);
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private onCanvasPointerDown = (event: PointerEvent): void => {
    if (event.button === 2) {
      const hits = this.pickFromPointerEvent(event);
      for (const h of hits) {
        if (getFriendGardenPlotIndex(h.object) !== null) {
          for (const mod of this.modules) {
            mod.onPointerDown?.(hits, event);
          }
          event.preventDefault();
          return;
        }
      }
      this.orbitDragging = true;
      this.orbitPointerId = event.pointerId;
      event.preventDefault();
      return;
    }

    if (event.button === 1) {
      this.orbitDragging = true;
      this.orbitPointerId = event.pointerId;
      event.preventDefault();
      return;
    }

    if (event.button !== 0) return;

    const hits = this.pickFromPointerEvent(event);
    if (hits.length === 0) return;

    for (const mod of this.modules) {
      mod.onPointerDown?.(hits, event);
    }
  };

  private onCanvasPointerMove = (event: PointerEvent): void => {
    if (!this.orbitDragging || this.orbitPointerId !== event.pointerId) return;
    this.cameraYaw -= event.movementX * this.orbitSensitivity;
    this.cameraPitch += event.movementY * this.orbitSensitivity;
    this.cameraPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.cameraPitch));
  };

  private onCanvasPointerUp = (event: PointerEvent): void => {
    if (!this.orbitDragging) return;
    this.orbitDragging = false;
    this.orbitPointerId = null;
  };

  private syncCameraImmediate(): void {
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const px = this.player.position.x;
    const py = this.player.position.y + this.pivotHeight;
    const pz = this.player.position.z;

    const cosP = Math.cos(this.cameraPitch);
    const sinP = Math.sin(this.cameraPitch);
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);

    const ox = this.cameraDistance * cosP * sinY;
    const oy = this.cameraDistance * sinP;
    const oz = this.cameraDistance * cosP * cosY;

    this.camera.position.set(px + ox, py + oy, pz + oz);
    this.camera.lookAt(px, py, pz);
  }

  private updatePlayer(delta: number): void {
    const dancing = this.blessDanceTimer > 0;
    if (dancing) this.blessDanceTimer = Math.max(0, this.blessDanceTimer - delta);
    this.moveDir.set(0, 0, 0);
    if (!dancing) {
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) this.moveDir.z -= 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) this.moveDir.z += 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) this.moveDir.x += 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) this.moveDir.x -= 1;
    }
    const sprinting = !dancing && (this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'));

    const pivotX = this.player.position.x;
    const pivotY = this.player.position.y + this.pivotHeight;
    const pivotZ = this.player.position.z;

    this.tmpVec.set(pivotX - this.camera.position.x, 0, pivotZ - this.camera.position.z);
    if (this.tmpVec.lengthSq() < 1e-8) {
      this.tmpVec.set(0, 0, 1);
    }
    this.tmpVec.normalize();

    this.tmpVec2.crossVectors(this.worldUp, this.tmpVec).normalize();

    let locomotionMode: LocomotionMode = 'idle';
    if (this.moveDir.lengthSq() > 0) {
      locomotionMode = sprinting ? 'run' : 'walk';
      const targetSpeed = sprinting ? this.runMoveSpeed : this.walkMoveSpeed;
      this.moveSpeed += (targetSpeed - this.moveSpeed) * Math.min(1, delta * 13);
      this.moveDir.normalize();
      const forward = this.tmpVec;
      const right = this.tmpVec2;
      const mx = this.moveDir.x;
      const mz = this.moveDir.z;
      const worldX = right.x * mx + forward.x * -mz;
      const worldZ = right.z * mx + forward.z * -mz;
      const len = Math.hypot(worldX, worldZ) || 1;
      this.player.position.x += (worldX / len) * this.moveSpeed * delta;
      this.player.position.z += (worldZ / len) * this.moveSpeed * delta;

      // 与 soldier 子网格的 Math.PI 偏转叠加后，仍面向移动方向（避免视觉上“倒着走”）
      const targetYaw = Math.atan2(-worldX, -worldZ);
      this.tmpQuat.setFromAxisAngle(this.worldUp, targetYaw);
      this.player.quaternion.slerp(this.tmpQuat, 1 - Math.exp(-12 * delta));
    } else {
      this.moveSpeed += (this.walkMoveSpeed - this.moveSpeed) * Math.min(1, delta * 8);
    }

    if (this.playerMixer) {
      const moving = locomotionMode !== 'idle';
      const locomotionScale = locomotionMode === 'run' ? 1.18 : 0.78;
      if (this.playerAnimMode === 'dual' && this.playerIdleAction && this.playerRunAction) {
        this.playerRunAction.timeScale = moving ? locomotionScale : 1;
        if (moving !== this.playerLocomotion) {
          this.playerLocomotion = moving;
          if (moving) {
            this.playerIdleAction.fadeOut(0.12);
            this.playerRunAction.reset().fadeIn(0.12).play();
          } else {
            this.playerRunAction.fadeOut(0.12);
            this.playerIdleAction.reset().fadeIn(0.12).play();
          }
        }
      } else if (this.playerAnimMode === 'runOnly' && this.playerRunAction) {
        if (moving !== this.playerLocomotion) {
          this.playerLocomotion = moving;
          this.playerRunAction.timeScale = moving ? locomotionScale : 0;
          if (moving) this.playerRunAction.play();
        }
      }
    }
    this.applyProceduralLocomotion(locomotionMode, delta);
    if (this.blessAura) {
      this.blessAura.visible = dancing;
      if (dancing) {
        this.locomotionPhase += delta * 10;
        for (const c of this.blessAura.children) {
          const m = c as THREE.Mesh;
          const ph = (m.userData.phase as number) + this.locomotionPhase;
          const r = m.userData.r as number;
          m.position.set(Math.cos(ph) * r, 1.1 + Math.sin(ph * 2) * 0.12, Math.sin(ph) * r);
        }
        if (!this.playerDanceAction && this.playerVisualRoot) {
          // Strong visible fallback dance when no dedicated clip exists.
          this.playerVisualRoot.rotation.y += delta * 3.6;
          this.playerVisualRoot.position.y = Math.sin(this.locomotionPhase * 1.7) * 0.11;
          this.playerVisualRoot.rotation.x = Math.sin(this.locomotionPhase * 2.1) * 0.14;
          this.playerVisualRoot.rotation.z = Math.sin(this.locomotionPhase * 1.3) * 0.12;
        }
      } else if (this.playerDanceAction && this.playerDanceAction.isRunning()) {
        this.playerDanceAction.fadeOut(0.15);
      } else if (this.playerVisualRoot) {
        this.playerVisualRoot.position.y += (0 - this.playerVisualRoot.position.y) * Math.min(1, delta * 10);
        this.playerVisualRoot.rotation.x += (0 - this.playerVisualRoot.rotation.x) * Math.min(1, delta * 10);
        this.playerVisualRoot.rotation.z += (0 - this.playerVisualRoot.rotation.z) * Math.min(1, delta * 10);
      }
    }

    this.verticalVelocity -= this.gravity * delta;
    this.player.position.y += this.verticalVelocity * delta;
    if (this.player.position.y < this.groundHeight) {
      this.player.position.y = this.groundHeight;
      this.verticalVelocity = 0;
    }

    this.syncPlayerContactShadow();
    this.updateCameraPosition();
  }

  private frame(): void {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.updatePlayer(delta);
    this.playerMixer?.update(delta);
    for (const mod of this.modules) {
      mod.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
