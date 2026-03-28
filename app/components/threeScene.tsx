"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { createClouds } from "@/lib/clouds";
import { createStars, animateStars } from "@/lib/stars";
import { createLogos, animateLogos } from "@/lib/createLogos";

type InputState = { mouseX: number; mouseY: number };

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountNode: HTMLDivElement = mount;

    const inputState: InputState = { mouseX: 0, mouseY: 0 };

    let scene!: THREE.Scene;
    let camera!: THREE.PerspectiveCamera;
    let renderer!: THREE.WebGLRenderer;

    let petals: THREE.Object3D[] = [];
    let clouds: THREE.Mesh[] = [];
    let stars: THREE.Points | null = null;
    let logos: THREE.Mesh[] = [];

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const grassBlades: THREE.Mesh[] = [];
    const loader = new THREE.TextureLoader();
    const timer = new THREE.Timer();

    let raf = 0;

    function onPointerMove(e: PointerEvent) {
      const rect = mountNode.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      inputState.mouseX = (x - 0.5) * 2;
      inputState.mouseY = (0.5 - y) * 2;

      mouse.x = x * 2 - 1;
      mouse.y = -(y * 2 - 1);
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

      loader.load("/images/sunsetPrototype.png", (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        scene.background = texture;
      });

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
      renderer.domElement.id = "bg-canvas";
      mountNode.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(
        75,
        mountNode.clientWidth / mountNode.clientHeight,
        0.1,
        200
      );
      camera.position.set(0, 8, 18);
      camera.lookAt(0, 6.5, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
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

      stars = createStars(scene, 1000);
      logos = createLogos(scene);

      const rand = mulberry32(12345);
      petals = [];

      const flowerCount = 175;
      const spacing = 6;
      const gridSize = Math.ceil(Math.sqrt(flowerCount));

      for (let i = 0; i < flowerCount; i++) {
        const gridX = i % gridSize;
        const gridZ = Math.floor(i / gridSize);

        const x =
          gridX * spacing - (gridSize * spacing) / 2 + (rand() - 0.6) * 1.2;
        const z =
          gridZ * spacing - (gridSize * spacing) / 2 + (rand() - 0.6) * 1.2;
        const scale = 0.8 + rand() * 0.7;
        const petalCount = 18 + Math.floor(rand() * 6);

        const flower = createFlower({
          position: new THREE.Vector3(x, 0, z),
          petalCount,
          scale,
        });

        flower.traverse((obj: any) => {
          if (obj?.isMesh && obj.geometry?.type === "LatheGeometry") {
            petals.push(obj);
          }
        });

        scene.add(flower);
      }

      createGrassBand();

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

      mountNode.addEventListener("pointermove", onPointerMove);
    }

    function onResize() {
      if (!camera || !renderer) return;

      const width = mountNode.clientWidth;
      const height = mountNode.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
    }

    function animate() {
      raf = requestAnimationFrame(animate);

      const swayX = inputState.mouseX * 7;
      const swayY = 7.5 + inputState.mouseY * 5;

      camera.position.set(0, 8, 18);
      camera.lookAt(swayX, swayY, 0);

      timer.update();
      const time = timer.getElapsed();

      if (stars) animateStars(stars, timer);
      if (logos.length) animateLogos(logos, timer);

      const bloomProgress = Math.min(Math.sin(time) * 0.17 + 0.18, 0.2);

      petals.forEach((petal: any) => {
        petal.rotation.x = THREE.MathUtils.lerp(
          Math.PI / 2.2,
          Math.PI / 2.9,
          bloomProgress
        );
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

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(logos);

      logos.forEach((logo) => {
        logo.userData.hovered = false;
      });

      if (intersects.length > 0) {
        const hoveredLogo = intersects[0].object as THREE.Mesh;
        hoveredLogo.userData.hovered = true;
      }

      renderer.render(scene, camera);
    }

    init();
    window.addEventListener("resize", onResize);
    animate();

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", onResize);
      mountNode.removeEventListener("pointermove", onPointerMove);

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

  return <div ref={mountRef} style={{ width: "100%", height: "100vh" }} />;
}