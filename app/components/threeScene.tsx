"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { createClouds, animateClouds } from "@/lib/clouds";
import { createStars, animateStars } from "@/lib/stars";
import { createLogos, animateLogos, getLogoScreenSize } from "@/lib/createLogos";
import { SITE_LINKS, type SiteLinkKey } from "@/lib/siteLinks";
import {
  createSky,
  createSkyState,
  getSkyState,
  getCurrentHour,
  applySkyToUniforms,
  type Sky,
} from "@/lib/timeOfDay";
import AboutModal from "./aboutModal";

type InputState = { mouseX: number; mouseY: number };

type ScreenConfig = {
  isMobile: boolean;
  isTablet: boolean;
  cameraZ: number;
  cameraY: number;
  lookAtY: number;
  starCount: number;
  flowerCount: number;
  flowerSpacing: number;
  grassCount: number;
  grassWidth: number;
  grassDepth: number;
  swayXStrength: number;
  swayYStrength: number;
  inputDamping: number;
  sceneHeight: string;
};

type ThreeSceneProps = {
  onReady?: () => void;
  bloom?: boolean;
};

export default function ThreeScene({ onReady, bloom = true }: ThreeSceneProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  const bloomRef = useRef(bloom);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Partial<Record<SiteLinkKey, HTMLAnchorElement | null>>>({});
  const [sceneHeight, setSceneHeight] = useState("100vh");
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    bloomRef.current = bloom;
  }, [bloom]);

  const logoKeys: SiteLinkKey[] = ["github", "linkedin", "about"];

  useEffect(() => {
    const container = containerRef.current;
    const mount = mountRef.current;
    if (!container || !mount) return;
    const containerNode: HTMLDivElement = container;
    const mountNode: HTMLDivElement = mount;

    const inputState: InputState = { mouseX: 0, mouseY: 0 };

    let scene!: THREE.Scene;
    let camera!: THREE.PerspectiveCamera;
    let renderer!: THREE.WebGLRenderer;

    let flowers: THREE.Group[] = [];
    const clouds: THREE.Mesh[] = [];
    let stars: THREE.Points | null = null;
    let logos: THREE.Mesh[] = [];
    const projected = new THREE.Vector3();

    let ambient!: THREE.AmbientLight;
    let dirLight!: THREE.DirectionalLight;
    let sky: Sky | null = null;
    const skyState = createSkyState();

    // Dev preview: visit "?hour=1" (or any 0–24 value) to lock the sky to a
    // specific time of day. With no param it follows the visitor's real clock.
    function resolveHour(): number {
      const param = new URLSearchParams(window.location.search).get("hour");
      if (param !== null) {
        const n = parseFloat(param);
        if (!Number.isNaN(n)) return n;
      }
      return getCurrentHour();
    }

    const mouse = new THREE.Vector2();
    const grassBlades: THREE.Mesh[] = [];
    const loader = new THREE.TextureLoader();
    const timer = new THREE.Timer();

    let raf = 0;
    let firstFrameDone = false;
    let bloomStart: number | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const blooms: {
      disk: THREE.Mesh;
      delay: number;
      petals: { mesh: THREE.Mesh; scale: number; openRotation: number; openZ: number }[];
    }[] = [];

    function getScreenConfig(): ScreenConfig {
      const width = window.innerWidth;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;

      return {
        isMobile,
        isTablet,

        // Desktop unchanged
        cameraZ: isMobile ? 19.5 : isTablet ? 18.8 : 18,
        cameraY: isMobile ? 8.4 : isTablet ? 8.2 : 8,
        lookAtY: isMobile ? 7.1 : isTablet ? 6.8 : 6.5,

        // Desktop unchanged, mobile/tablet closer to desktop
        starCount: isMobile ? 700 : isTablet ? 850 : 1000,
        flowerCount: isMobile ? 145 : isTablet ? 160 : 175,
        flowerSpacing: isMobile ? 5.8 : isTablet ? 5.9 : 6,
        grassCount: isMobile ? 5200 : isTablet ? 6200 : 7700,
        grassWidth: isMobile ? 74 : isTablet ? 77 : 80,
        grassDepth: isMobile ? 64 : isTablet ? 66 : 69,

        // Keep navigation in view on narrow touch screens.
        swayXStrength: isMobile ? 0.8 : isTablet ? 6.5 : 7,
        swayYStrength: isMobile ? 0.6 : isTablet ? 4.7 : 5,
        inputDamping: isMobile ? 1.35 : isTablet ? 1.1 : 1,

        // Desktop unchanged
        sceneHeight: isMobile ? "100svh" : isTablet ? "100vh" : "100vh",
      };
    }

    function updateSceneHeight() {
      const config = getScreenConfig();
      setSceneHeight(config.sceneHeight);
    }


    function updatePointerCoords(e: { clientX: number; clientY: number }) {
      const rect = containerNode.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      mouse.x = x * 2 - 1;
      mouse.y = -(y * 2 - 1);

      return { x, y };
    }

    function syncInputAndCamera(x: number, y: number) {
      const config = getScreenConfig();
      const boost = config.isMobile ? 1.35 : config.isTablet ? 1.1 : 1;

      inputState.mouseX = (x - 0.5) * 2 * config.inputDamping * boost;
      inputState.mouseY = (0.5 - y) * 2 * config.inputDamping * boost;

      const swayX = inputState.mouseX * config.swayXStrength;
      const swayY = config.lookAtY + inputState.mouseY * config.swayYStrength;

      camera.position.set(0, config.cameraY, config.cameraZ);
      camera.lookAt(swayX, swayY, 0);
      camera.updateMatrixWorld();
    }

    function onPointerMove(e: PointerEvent) {
      const { x, y } = updatePointerCoords(e);
      syncInputAndCamera(x, y);
    }

    function updateLogoOverlays() {
      camera.updateMatrixWorld();
      const width = containerNode.clientWidth;
      const height = containerNode.clientHeight;
      for (const logo of logos) {
        const anchor = linkRefs.current[logo.userData.name as SiteLinkKey];
        if (!anchor) continue;
        logo.getWorldPosition(projected);
        projected.project(camera);
        const size = getLogoScreenSize(logo, camera, height);
        anchor.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        anchor.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
        anchor.style.width = `${size}px`;
        anchor.style.height = `${size}px`;
        anchor.style.visibility = "visible";
      }
    }

    function positionNavigation() {
      // Lay out once at the resting viewpoint. Pointer movement changes only
      // the camera, just as it does for the stars; icons stay at world positions.
      const config = getScreenConfig();
      const restingCamera = camera.clone();
      restingCamera.position.set(0, config.cameraY, config.cameraZ);
      restingCamera.lookAt(0, config.lookAtY, 0);
      restingCamera.updateMatrixWorld();
      animateLogos(logos, restingCamera, {
        width: containerNode.clientWidth,
        height: containerNode.clientHeight,
      });
    }

    function createLeaf(scale = 1) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(-0.38 * scale, 0.05 * scale, -0.45 * scale, 0.4 * scale, 0, 0.85 * scale);
      shape.bezierCurveTo(0.45 * scale, 0.4 * scale, 0.38 * scale, 0.05 * scale, 0, 0);
      const geometry = new THREE.ShapeGeometry(shape, 10);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        positions.setZ(i, 0.12 * Math.sin(y / scale * Math.PI) - Math.abs(positions.getX(i)) * 0.25);
      }
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({
        color: 0x48752c,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });

      const leaf = new THREE.Mesh(geometry, material);
      const vein = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0.01),
          new THREE.Vector3(0, 0.4 * scale, 0.2),
          new THREE.Vector3(0, 0.83 * scale, 0.06),
        ), 8, 0.008, 3, false),
        new THREE.MeshStandardMaterial({ color: 0x809748, roughness: 1 }),
      );
      leaf.add(vein);
      leaf.castShadow = true;
      return leaf;
    }

    let petalGeometry: THREE.PlaneGeometry | undefined;
    const petalMaterials = new Map<string, THREE.MeshStandardMaterial>();

    function createPetal(color = 0xffe066, emissive = 0xffe066, scale = 1) {
      // All petals have the same shape; preserve size variation with transforms.
      if (!petalGeometry) {
        petalGeometry = new THREE.PlaneGeometry(1, 1, 6, 12);
        const positions = petalGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          const t = positions.getY(i) + 0.5;
          const across = positions.getX(i) * 2;
          const width = Math.pow(Math.sin(Math.PI * t), 0.75) * 0.14;
          positions.setXYZ(i,
            across * width,
            t * 0.88,
            0.10 * Math.sin(t * Math.PI) + 0.09 * t * t + across * across * 0.035,
          );
        }
        petalGeometry.computeVertexNormals();
      }
      const materialKey = `${color}:${emissive}`;
      let material = petalMaterials.get(materialKey);
      if (!material) {
        material = new THREE.MeshStandardMaterial({
          color,
          emissive,
          emissiveIntensity: 0.025,
          roughness: 0.8,
          metalness: 0,
          side: THREE.DoubleSide,
        });
        petalMaterials.set(materialKey, material);
      }

      const petal = new THREE.Mesh(petalGeometry, material);
      petal.scale.setScalar(scale);
      petal.castShadow = true;
      return petal;
    }

    function createFlower(options: {
      position?: THREE.Vector3;
      petalCount?: number;
      petalColor?: number;
      petalEmissive?: number;
      stemColor?: number;
      scale?: number;
    } = {}) {
      const {
        position = new THREE.Vector3(0, 0, 0),
        petalCount = 22,
        petalColor = 0xf5bd23,
        petalEmissive = 0xf5bd23,
        stemColor = 0x52732d,
        scale: flowerScale = 1,
      } = options;
      const scale = 1;

      const group = new THREE.Group();

      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-0.04, 0.75, 0.02),
          new THREE.Vector3(0.04, 1.55, 0),
          new THREE.Vector3(0.1, 2.2, 0),
        ]), 16, 0.065, 7, false),
        new THREE.MeshStandardMaterial({ color: stemColor, roughness: 0.95 }),
      );
      stem.castShadow = true;
      group.add(stem);
      const head = new THREE.Group();
      head.position.set(0.1, 2.2, 0);
      head.rotation.x = 0.65 + Math.random() * 0.2;
      group.add(head);

      const leafCount = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < leafCount; i++) {
        const leaf = createLeaf(scale * (0.8 + Math.random() * 0.4));
        const leafHeight = 0.7 * scale + Math.random() * 0.8 * scale;
        leaf.position.y = leafHeight;

        const side = Math.random() < 0.5 ? -1 : 1;
        const stemRadius = 0.09 * scale;
        leaf.position.x = side * (stemRadius + 0.03 * scale);
        leaf.position.z = 0;
        leaf.rotation.z = side * (Math.PI / 2.1 + Math.random() * 0.2);
        leaf.rotation.y = side * (Math.PI / 2.3);
        leaf.rotation.x = 0.35 + (Math.random() - 0.5) * 0.2;
        group.add(leaf);
      }

      const diskGeometry = new THREE.SphereGeometry(0.34, 24, 12);
      diskGeometry.scale(1, 0.28, 1);
      const diskMaterial = new THREE.MeshStandardMaterial({
        color: 0x49301b, roughness: 1, metalness: 0,
      });
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      disk.castShadow = true;
      head.add(disk);
      // Golden-angle seed spirals, batched into one draw call per head.
      const seeds = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.018, 5, 4),
        new THREE.MeshStandardMaterial({ color: 0x79502b, roughness: 1 }),
        180,
      );
      const seedTransform = new THREE.Object3D();
      const seedColor = new THREE.Color();
      for (let i = 0; i < 180; i++) {
        const radius = 0.315 * Math.sqrt((i + 0.5) / 180);
        const angle = i * 2.399963;
        seedTransform.position.set(Math.cos(angle) * radius,
          0.095 * Math.sqrt(1 - (radius / 0.34) ** 2), Math.sin(angle) * radius);
        seedTransform.scale.set(0.8, 0.5, 1);
        seedTransform.rotation.y = angle;
        seedTransform.updateMatrix();
        seeds.setMatrixAt(i, seedTransform.matrix);
        seeds.setColorAt(i, seedColor.setHSL(0.09, 0.45, 0.16 + (i % 7) * 0.018));
      }
      disk.add(seeds);

      const flowerBloom = {
        disk,
        // Roll the bloom from left to right across the field.
        delay: THREE.MathUtils.clamp((position.x + 25) / 50, 0, 1) * 1.4,
        petals: [] as { mesh: THREE.Mesh; scale: number; openRotation: number; openZ: number }[],
      };
      disk.scale.setScalar(0.45);
      blooms.push(flowerBloom);

      for (let i = 0; i < petalCount * 2; i++) {
        const layer = Math.floor(i / petalCount);
        const petal = createPetal(
          layer ? 0xffcf38 : petalColor,
          petalEmissive,
          scale * (0.9 + Math.random() * 0.2)
        );

        const angle = (i / petalCount) * Math.PI * 2 + layer * Math.PI / petalCount;
        const holder = new THREE.Object3D();
        holder.position.set(0, layer ? 0.015 : -0.025, 0);

        petal.rotation.set(
          Math.PI / 2.1 + (Math.random() - 0.5) * 0.15,
          0,
          (Math.random() - 0.5) * 0.1
        );

        petal.position.set(0, 0, 0.27 * scale + Math.random() * 0.035);
        flowerBloom.petals.push({
          mesh: petal,
          scale: petal.scale.x,
          openRotation: petal.rotation.x,
          openZ: petal.position.z,
        });
        petal.rotation.x = 0.12;
        petal.position.z *= 0.25;
        petal.scale.multiply(new THREE.Vector3(0.65, 0.35, 0.65));
        holder.add(petal);
        holder.rotation.y = angle;
        head.add(holder);
      }

      group.position.copy(position);
      group.scale.setScalar(flowerScale);

      // Breeze data so each flower bends at its base independently.
      // The group's pivot sits at ground level, so rotating it sways the
      // whole stem + head like a real sunflower in the wind.
      group.userData.phase = Math.random() * Math.PI * 2;
      group.userData.swayAmount = 0.8 + Math.random() * 0.5;
      // Wind rolls across the field, so the phase depends on position
      group.userData.windPhase = position.x * 0.16 + position.z * 0.12;
      // Steady direction the breeze is blowing (radians)
      group.userData.windDir = Math.PI * 0.15;

      return group;
    }

    function createGrassBand({
      count = 7700,
      width = 80,
      depth = 69,
      minHeight = 0.5,
      maxHeight = 1.1,
      color = 0x2e6e1a,
    } = {}) {
      // Root the blade at y=0 so wind bends it from the ground.
      const grassGeometry = new THREE.PlaneGeometry(0.085, 1, 2, 7);
      const positions = grassGeometry.attributes.position;
      const colors: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        const height = positions.getY(i) + 0.5;
        const across = positions.getX(i) / 0.0425;
        positions.setXYZ(i,
          positions.getX(i) * Math.pow(1 - height, 0.8) + 0.1 * height * height,
          height,
          0.18 * height * height + Math.abs(across) * 0.018 * Math.sin(height * Math.PI),
        );
        const shade = new THREE.Color().setRGB(
          0.48 + height * 0.35,
          0.58 + height * 0.35,
          0.35 + height * 0.22,
        );
        colors.push(shade.r, shade.g, shade.b);
      }
      grassGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      grassGeometry.computeVertexNormals();
      // A small shared palette avoids thousands of separate materials.
      const materials = Array.from({ length: 6 }, (_, i) =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).offsetHSL((i - 2) * 0.008, -0.08, (i - 2) * 0.018),
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.95,
          metalness: 0,
        }),
      );

      for (let i = 0; i < count; i++) {
        const blade = new THREE.Mesh(grassGeometry, materials[i % materials.length]);

        blade.position.x = (Math.random() - 0.5) * width;
        blade.position.z = (Math.random() - 0.5) * depth;
        blade.position.y = 0;

        const s = minHeight + Math.random() * (maxHeight - minHeight);
        blade.scale.set(0.65 + Math.random() * 0.7, s, 1);

        blade.rotation.y = Math.random() * Math.PI * 2;
        blade.rotation.z = (Math.random() - 0.5) * 0.2;
        blade.userData.lean = blade.rotation.z;
        blade.userData.flex = 0.7 + Math.random() * 0.6;

        blade.castShadow = true;
        blade.receiveShadow = true;

        scene.add(blade);
        grassBlades.push(blade);
      }
    }

    function mulberry32(seed: number) {
      return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function init() {
      scene = new THREE.Scene();

      const config = getScreenConfig();

      getSkyState(resolveHour(), skyState);
      sky = createSky(scene, skyState);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(containerNode.clientWidth, containerNode.clientHeight);
      renderer.domElement.id = "bg-canvas";
      Object.assign(renderer.domElement.style, {
        display: "block",
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
      mountNode.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(
        75,
        containerNode.clientWidth / containerNode.clientHeight,
        0.1,
        200
      );
      camera.position.set(0, config.cameraY, config.cameraZ);
      camera.lookAt(0, config.lookAtY, 0);

      ambient = new THREE.AmbientLight(0xffffff, skyState.ambient);
      scene.add(ambient);

      dirLight = new THREE.DirectionalLight(0xffffff, skyState.dirIntensity);
      dirLight.color.copy(skyState.dirColor);
      dirLight.position.set(5, 10, 7.5);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshStandardMaterial({ color: 0x24521e })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);

      stars = createStars(scene, config.starCount);
      logos = createLogos(scene);
      positionNavigation();

      const rand = mulberry32(12345);
      flowers = [];

      const flowerCount = config.flowerCount;
      const spacing = config.flowerSpacing;
      const gridSize = Math.ceil(Math.sqrt(flowerCount));

      for (let i = 0; i < flowerCount; i++) {
        const gridX = i % gridSize;
        const gridZ = Math.floor(i / gridSize);

        const x =
          gridX * spacing - (gridSize * spacing) / 2 + (rand() - 0.6) * 1.2;
        const z =
          gridZ * spacing - (gridSize * spacing) / 2 + (rand() - 0.6) * 1.2;

        const baseScale = config.isMobile ? 0.9 : config.isTablet ? 0.95 : 1;
        const scale = baseScale * (0.8 + rand() * 0.7);
        const petalCount = 18 + Math.floor(rand() * 6);

        const flower = createFlower({
          position: new THREE.Vector3(x, 0, z),
          petalCount,
          scale,
        });

        flowers.push(flower);
        scene.add(flower);
      }

      createGrassBand({
        count: config.grassCount,
        width: config.grassWidth,
        depth: config.grassDepth,
      });

      const cloudTextures: THREE.Texture[] = [];
      let texturesLoaded = 0;

      loader.load("/images/clouds1.png", (t1: THREE.Texture) => {
        cloudTextures[0] = t1;
        texturesLoaded++;
        if (texturesLoaded === 2) {
          createClouds(scene, camera, cloudTextures, clouds);
        }
      });

      loader.load("/images/fluff1.png", (t2: THREE.Texture) => {
        cloudTextures[1] = t2;
        texturesLoaded++;
        if (texturesLoaded === 2) {
          createClouds(scene, camera, cloudTextures, clouds);
        }
      });

      containerNode.addEventListener("pointermove", onPointerMove);
    }

    function onResize() {
      if (!camera || !renderer) return;

      const width = containerNode.clientWidth;
      const height = containerNode.clientHeight;
      const config = getScreenConfig();

      camera.aspect = width / height;
      camera.position.set(0, config.cameraY, config.cameraZ);
      camera.lookAt(0, config.lookAtY, 0);
      camera.updateProjectionMatrix();
      positionNavigation();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);

      updateSceneHeight();
    }

    function animate() {
      raf = requestAnimationFrame(animate);

      const config = getScreenConfig();

      const swayX = inputState.mouseX * config.swayXStrength;
      const swayY = config.lookAtY + inputState.mouseY * config.swayYStrength;

      camera.position.set(0, config.cameraY, config.cameraZ);
      camera.lookAt(swayX, swayY, 0);

      timer.update();
      const time = timer.getElapsed();

      // Start only after the loader has completely faded out. Use elapsed
      // seconds so the duration is independent of the display's frame rate.
      if (bloomRef.current && bloomStart === null) bloomStart = time;
      if (bloomStart !== null) {
        let complete = true;
        for (const flower of blooms) {
          const progress = reducedMotion.matches
            ? 1
            : THREE.MathUtils.clamp((time - bloomStart - flower.delay) / 2.4, 0, 1);
          const eased = progress * progress * (3 - 2 * progress);
          flower.disk.scale.setScalar(THREE.MathUtils.lerp(0.45, 1, eased));
          for (const petal of flower.petals) {
            petal.mesh.rotation.x = THREE.MathUtils.lerp(0.12, petal.openRotation, eased);
            petal.mesh.position.z = THREE.MathUtils.lerp(petal.openZ * 0.25, petal.openZ, eased);
            petal.mesh.scale.set(
              petal.scale * THREE.MathUtils.lerp(0.65, 1, eased),
              petal.scale * THREE.MathUtils.lerp(0.35, 1, eased),
              petal.scale * THREE.MathUtils.lerp(0.65, 1, eased),
            );
          }
          if (progress < 1) complete = false;
        }
        // Keep the finished flowers at their original transforms without
        // doing per-petal work throughout the rest of the visit.
        if (complete) blooms.length = 0;
      }

      getSkyState(resolveHour(), skyState);
      if (sky) applySkyToUniforms(sky, skyState);
      if (ambient) ambient.intensity = skyState.ambient;
      if (dirLight) {
        dirLight.intensity = skyState.dirIntensity;
        dirLight.color.copy(skyState.dirColor);
      }
      if (stars) {
        (stars.material as THREE.PointsMaterial).opacity = skyState.starOpacity;
        stars.visible = skyState.starOpacity > 0.001;
      }

      if (stars) animateStars(stars, timer);
      // --- Breeze controls (tweak these to taste) ---
      const BREEZE_SPEED = 1.0; // how fast the flowers sway back and forth
      const BREEZE_TRAVEL = 0.5; // speed of gusts rolling across the field
      const BREEZE_STRENGTH = 0.20; // max bend (radians) of a flower in the wind
      const BREEZE_FLUTTER = 0.05; // small fast wobble layered on top

      // Gusts: a slow swell so the wind ebbs, then surges
      const gust = 0.55 + 0.45 * Math.sin(time * 0.25);

      flowers.forEach((flower) => {
        const d = flower.userData;

        // Two offset waves give an organic, non-repeating sway, plus a quick
        // flutter so the bend never looks perfectly smooth.
        const bend =
          (Math.sin(time * BREEZE_SPEED + d.phase + time * BREEZE_TRAVEL + d.windPhase) *
            0.75 +
            Math.sin(time * BREEZE_SPEED * 1.9 + d.phase * 1.4) * 0.25 +
            Math.sin(time * BREEZE_SPEED * 4.5 + d.phase) * BREEZE_FLUTTER) *
          BREEZE_STRENGTH *
          d.swayAmount *
          gust;

        // Bend mostly along the wind direction, with a little cross-sway
        flower.rotation.x = Math.cos(d.windDir) * bend;
        flower.rotation.z = -Math.sin(d.windDir) * bend - bend * 0.25;
      });

      animateClouds(clouds, camera, time, reducedMotion.matches);

      grassBlades.forEach((blade) => {
        const phase = blade.position.x * 0.22 + blade.position.z * 0.16;
        const wind = reducedMotion.matches ? 0 :
          (Math.sin(time * 1.1 + phase) * 0.14 +
           Math.sin(time * 2.3 + phase * 1.3) * 0.025) * blade.userData.flex;
        blade.rotation.x = wind;
        blade.rotation.z = blade.userData.lean + wind * 0.35;
      });


      updateLogoOverlays();
      renderer.render(scene, camera);

      if (!firstFrameDone) {
        firstFrameDone = true;
        onReadyRef.current?.();
      }
    }

    updateSceneHeight();
    init();
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", onResize);
      containerNode.removeEventListener("pointermove", onPointerMove);

      if (renderer) {
        renderer.dispose();
        const canvas = renderer.domElement;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene?.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          geometries.add(obj.geometry);
          const meshMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
          meshMaterials.forEach((material) => materials.add(material));
          if (obj instanceof THREE.InstancedMesh) obj.dispose();
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: sceneHeight,
        minHeight: "100svh",
        touchAction: "manipulation",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />
      <nav aria-label="Main navigation" style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}>
        {logoKeys.map((key) => {
          const link = SITE_LINKS[key];
          const isModal = link.type === "modal";
          return (
            <a
              key={key}
              ref={(node) => { linkRefs.current[key] = node; }}
              style={{ position: "absolute", visibility: "hidden", pointerEvents: "auto", transform: "translate(-50%, -50%)", touchAction: "manipulation" }}
              href={link.type === "modal" ? "#" : link.url}
              target={link.type === "external" ? "_blank" : undefined}
              rel={link.type === "external" ? "noopener noreferrer" : undefined}
              aria-label={key === "about" ? "About me" : key === "github" ? "GitHub" : "LinkedIn"}
              onClick={(e) => {
                if (isModal) {
                  e.preventDefault();
                  setAboutOpen(true);
                }
              }}
            />
          );
        })}
      </nav>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}