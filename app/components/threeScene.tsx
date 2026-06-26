"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { createClouds } from "@/lib/clouds";
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

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Partial<Record<SiteLinkKey, HTMLAnchorElement | null>>>({});
  const logosRef = useRef<THREE.Mesh[]>([]);
  const [sceneHeight, setSceneHeight] = useState("100vh");

  const logoKeys: SiteLinkKey[] = ["github", "linkedin"];

  function setLogoHovered(key: SiteLinkKey, hovered: boolean) {
    const logo = logosRef.current.find((mesh) => mesh.userData.name === key);
    if (logo) logo.userData.hovered = hovered;
  }

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
    let clouds: THREE.Mesh[] = [];
    let stars: THREE.Points | null = null;
    let logos: THREE.Mesh[] = [];

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
    const projected = new THREE.Vector3();
    const grassBlades: THREE.Mesh[] = [];
    const loader = new THREE.TextureLoader();
    const timer = new THREE.Timer();

    let raf = 0;

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

        // Stronger touch/mobile response
        swayXStrength: isMobile ? 6.2 : isTablet ? 6.5 : 7,
        swayYStrength: isMobile ? 4.4 : isTablet ? 4.7 : 5,
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
      if (!logos.length) return;

      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);

      const width = containerNode.clientWidth;
      const height = containerNode.clientHeight;

      logos.forEach((logo) => {
        const key = logo.userData.name as SiteLinkKey;
        const anchor = linkRefs.current[key];
        if (!anchor) return;

        logo.getWorldPosition(projected);
        projected.project(camera);

        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        const size = getLogoScreenSize(logo, camera, height);

        anchor.style.visibility = "visible";
        anchor.style.left = `${x}px`;
        anchor.style.top = `${y}px`;
        anchor.style.width = `${size}px`;
        anchor.style.height = `${size}px`;
      });
    }

    function createLeaf(scale = 1) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.18 * scale, 0.3 * scale, 0, 0.8 * scale);
      shape.quadraticCurveTo(-0.18 * scale, 0.3 * scale, 0, 0);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: 0.01 * scale,
        bevelEnabled: false,
      });
      geometry.rotateX(Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({
        color: 0x228b22,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      const leaf = new THREE.Mesh(geometry, material);
      leaf.castShadow = true;
      return leaf;
    }

    function createPetal(color = 0xffe066, emissive = 0xffe066, scale = 1) {
      const points: THREE.Vector2[] = [];
      points.push(new THREE.Vector2(0, 0));
      points.push(new THREE.Vector2(0.07 * scale, 0.3 * scale));
      points.push(new THREE.Vector2(0.12 * scale, 0.8 * scale));
      points.push(new THREE.Vector2(0.07 * scale, 1.4 * scale));
      points.push(new THREE.Vector2(0, 1.7 * scale));

      const geometry = new THREE.LatheGeometry(points, 24, 0, Math.PI);
      geometry.translate(0, -0.85 * scale, 0);

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive,
        roughness: 0.35,
        metalness: 0.15,
        side: THREE.DoubleSide,
      });

      const petal = new THREE.Mesh(geometry, material);
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
        petalColor = 0xffe066,
        petalEmissive = 0xffe066,
        stemColor = 0x228b22,
        scale = 1,
      } = options;

      const group = new THREE.Group();

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scale, 0.09 * scale, 2.3 * scale, 13),
        new THREE.MeshStandardMaterial({ color: stemColor })
      );
      stem.position.y = 1.1 * scale;
      group.add(stem);

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
        leaf.rotation.x = Math.PI / 2.4 + (Math.random() - 0.5) * 0.2;
        group.add(leaf);
      }

      const diskGeometry = new THREE.SphereGeometry(
        0.32 * scale,
        32,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.7
      );
      const diskMaterial = new THREE.MeshStandardMaterial({
        color: 0x4b2e05,
        roughness: 0.7,
        metalness: 0.2,
      });
      const disk = new THREE.Mesh(diskGeometry, diskMaterial);
      disk.position.y = 2.2 * scale;
      disk.castShadow = true;
      group.add(disk);

      const petalHeightOffset = 2.2 * scale;
      for (let i = 0; i < petalCount; i++) {
        const petal = createPetal(
          petalColor,
          petalEmissive,
          scale * (0.9 + Math.random() * 0.2)
        );

        const angle = (i / petalCount) * Math.PI * 2;
        const holder = new THREE.Object3D();
        holder.position.set(0, petalHeightOffset, 0);

        petal.rotation.set(
          Math.PI / 2.1 + (Math.random() - 0.5) * 0.15,
          0,
          (Math.random() - 0.5) * 0.1
        );

        petal.position.set(0, 0, 0.38 * scale + Math.random() * 0.05);
        holder.add(petal);
        holder.rotation.y = angle;
        group.add(holder);
      }

      group.position.copy(position);
      group.scale.set(scale, scale, scale);

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
      const grassGeometry = new THREE.PlaneGeometry(0.08, 1, 1, 3);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.93,
      });

      for (let i = 0; i < count; i++) {
        const blade = new THREE.Mesh(grassGeometry, baseMaterial.clone());

        blade.position.x = (Math.random() - 0.5) * width;
        blade.position.z = (Math.random() - 0.5) * depth;
        blade.position.y = 0.5;

        const s = minHeight + Math.random() * (maxHeight - minHeight);
        blade.scale.y = s;

        blade.rotation.y = Math.random() * Math.PI * 2;
        blade.rotation.z = (Math.random() - 0.5) * 0.2;

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
      logosRef.current = logos;

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
      if (logos.length) animateLogos(logos, camera, timer);

      // --- Breeze controls (tweak these to taste) ---
      const BREEZE_SPEED = 1.0; // how fast the flowers sway back and forth
      const BREEZE_TRAVEL = 0.5; // speed of gusts rolling across the field
      const BREEZE_STRENGTH = 0.20; // max bend (radians) of a flower in the wind
      const BREEZE_FLUTTER = 0.05; // small fast wobble layered on top

      // Gusts: a slow swell so the wind ebbs, then surges
      const gust = 0.55 + 0.45 * Math.sin(time * 0.25);

      flowers.forEach((flower: any) => {
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

      clouds.forEach((cloud: any) => {
        cloud.position.x =
          cloud.userData.baseX +
          Math.sin(time * 0.1 + cloud.userData.offset) * 6 +
          Math.sin(time * 0.03) * 3;

        cloud.position.y =
          cloud.userData.baseY +
          Math.cos(time * 0.15 + cloud.userData.offset) * 0.6;

        cloud.lookAt(camera.position);
      });

      grassBlades.forEach((blade, i) => {
        const phase = i * 0.14;
        blade.rotation.x =
          Math.sin(time * 1.3 + phase + blade.position.x * 0.2) * 0.23;
      });

      updateLogoOverlays();

      renderer.render(scene, camera);
    }

    updateSceneHeight();
    init();
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", onResize);
      containerNode.removeEventListener("pointermove", onPointerMove);
      logosRef.current = [];

      if (renderer) {
        renderer.dispose();
        const canvas = renderer.domElement;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }

      scene?.traverse((obj: any) => {
        if (obj?.isMesh) {
          obj.geometry?.dispose?.();

          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: any) => m?.dispose?.());
          } else {
            obj.material?.dispose?.();
          }
        }
      });
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
        touchAction: "none",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {logoKeys.map((key) => {
          const link = SITE_LINKS[key];
          const linkStyle: React.CSSProperties = {
            position: "absolute",
            pointerEvents: "auto",
            cursor: "pointer",
            transform: "translate(-50%, -50%)",
            touchAction: "manipulation",
          };

          return (
            <a
              key={key}
              ref={(el) => {
                linkRefs.current[key] = el;
              }}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={key}
              style={linkStyle}
              onMouseEnter={() => setLogoHovered(key, true)}
              onMouseLeave={() => setLogoHovered(key, false)}
            />
          );
        })}
      </div>
    </div>
  );
}