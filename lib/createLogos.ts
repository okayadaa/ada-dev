import * as THREE from "three";

import { SITE_LINKS, type SiteLinkKey } from "@/lib/siteLinks";

const LOGO_SIZE = 1.9;

export function createLogos(scene: THREE.Scene): THREE.Mesh[] {
  const loader = new THREE.TextureLoader();

  const items = [
    { name: "home", path: "/icons/house-solid.png", x: -4, y: 9 },
    { name: "github", path: "/icons/github-solid.png", x: 0, y: 9 },
    { name: "linkedin", path: "/icons/linkedin-solid.png", x: 4, y: 9 },
  ];

  const logos: THREE.Mesh[] = [];

  items.forEach(({ name, path, x, y }) => {
    const texture = loader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;

    const link = SITE_LINKS[name as SiteLinkKey];

    const glowMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 1, 1),
    });

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE),
      glowMaterial
    );
    glow.position.set(x, y, -1.01);

    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
      color: new THREE.Color(1, 1, 1),
    });

    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE),
      logoMaterial
    );
    logo.position.set(x, y, -1);

    logo.userData = {
      name,
      link,
      glow,
      hovered: false,
      baseX: x,
      baseY: y,
      baseZ: -1,
    };

    scene.add(glow);
    scene.add(logo);
    logos.push(logo);
  });

  return logos;
}

export function animateLogos(
  logos: THREE.Mesh[],
  camera: THREE.Camera,
  timer: THREE.Timer
) {
  const time = timer.getElapsed();
  const wave = Math.sin(time * 1.5);

  logos.forEach((logo) => {
    const glow = logo.userData.glow as THREE.Mesh;
    const hovered = logo.userData.hovered as boolean;
    const baseX = logo.userData.baseX as number;
    const baseY = logo.userData.baseY as number;
    const baseZ = logo.userData.baseZ as number;

    logo.position.set(baseX, baseY, baseZ);
    glow.position.set(baseX, baseY, baseZ - 0.01);

    logo.lookAt(camera.position);
    glow.lookAt(camera.position);

    const logoZoom = hovered ? 1.12 + 0.10 * wave : 1.0 + 0.19 * wave;
    logo.scale.set(logoZoom, logoZoom, 1);

    const logoMaterial = logo.material as THREE.MeshBasicMaterial;
    logoMaterial.opacity = hovered
      ? 1.0
      : THREE.MathUtils.clamp(0.9 + 0.06 * wave, 0.8, 1.0);

    const brightness = hovered ? 1.18 : 1.0 + 0.04 * wave;
    logoMaterial.color.setRGB(brightness, brightness, brightness);

    const glowZoom = hovered ? 1.28 + 0.14 * wave : 1.15 + 0.14 * wave;
    glow.scale.set(glowZoom, glowZoom, 1);

    const glowMaterial = glow.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = hovered
      ? THREE.MathUtils.clamp(0.3 + 0.07 * wave, 0.2, 0.4)
      : THREE.MathUtils.clamp(0.16 + 0.05 * wave, 0.08, 0.24);
  });
}

export function getLogoScreenSize(
  logo: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  viewportHeight: number
): number {
  const worldPos = new THREE.Vector3();
  logo.getWorldPosition(worldPos);
  const distance = camera.position.distanceTo(worldPos);
  const screenHeightWorld =
    2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
  const scale = logo.scale.x;
  const sizePx = ((LOGO_SIZE * scale) / screenHeightWorld) * viewportHeight;
  return Math.max(72, sizePx * 1.5);
}
