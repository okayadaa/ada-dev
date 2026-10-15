import * as THREE from "three";

import { SITE_LINKS, type SiteLinkKey } from "@/lib/siteLinks";

const LOGO_SIZE = 1.9;

export function createLogos(scene: THREE.Scene): THREE.Mesh[] {
  const loader = new THREE.TextureLoader();

  const items = [
    { name: "github", path: "/icons/github-solid.png", x: -4, y: 9 },
    { name: "linkedin", path: "/icons/linkedin-solid.png", x: 0, y: 9 },
    { name: "about", path: "/icons/image-portrait-solid.png", x: 4, y: 9 },
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

// Keep the navigation centered in the sky above the flower field on every screen.
export function getCompactLogoLayout(width: number, height: number) {
  const rowWidth = Math.min(360, Math.max(0, width - 48));
  const cellWidth = rowWidth / 3;
  return {
    centers: [0, 1, 2].map((i) => width / 2 + (i - 1) * cellWidth),
    y: Math.max(48, Math.min(height * 0.45, height - 48)),
    size: Math.min(50, cellWidth / 1.5),
    targetSize: Math.max(44, Math.min(80, cellWidth - 8)),
  };
}

export function animateLogos(
  logos: THREE.Mesh[],
  camera: THREE.PerspectiveCamera,
  viewport?: { width: number; height: number },
) {

  const compact = viewport
    ? getCompactLogoLayout(viewport.width, viewport.height)
    : null;
  const distance = 19;
  const worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
  const position = new THREE.Vector3();
  // Preserve the original desktop composition, using the resting camera as
  // the reference instead of allowing pointer sway to move the navigation.
  const restingCamera = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);
  restingCamera.position.set(0, 8, 18);
  restingCamera.lookAt(0, 6.5, 0);
  restingCamera.updateMatrixWorld();

  logos.forEach((logo, index) => {
    const glow = logo.userData.glow as THREE.Mesh;
    const hovered = logo.userData.hovered as boolean;
    const baseX = logo.userData.baseX as number;
    const baseY = logo.userData.baseY as number;
    const baseZ = logo.userData.baseZ as number;

    position.set(baseX, baseY, baseZ);
    const restingDepth = -position.clone().applyMatrix4(restingCamera.matrixWorldInverse).z;
    position.project(restingCamera);
    let layoutScale = distance / restingDepth;
    if (compact && viewport) {
      position.set(
        (compact.centers[index] / viewport.width) * 2 - 1,
        1 - (compact.y / viewport.height) * 2,
        0,
      );
      layoutScale = (compact.size / viewport.height) * worldHeight / LOGO_SIZE;
    }
    position.z = 0;
    position.unproject(camera);
    position.sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
    position.multiplyScalar(distance / -position.z);
    position.applyQuaternion(camera.quaternion).add(camera.position);
    logo.position.copy(position);
    glow.position.copy(position);
    logo.quaternion.copy(camera.quaternion);
    glow.quaternion.copy(camera.quaternion);

    const logoZoom = 1;
    logo.scale.set(logoZoom * layoutScale, logoZoom * layoutScale, 1);

    const logoMaterial = logo.material as THREE.MeshBasicMaterial;
    logoMaterial.opacity = hovered ? 1 : 0.95;

    const brightness = hovered ? 1.18 : 1;
    logoMaterial.color.setRGB(brightness, brightness, brightness);

    const glowZoom = 1.15;
    glow.scale.set(glowZoom * layoutScale, glowZoom * layoutScale, 1);

    const glowMaterial = glow.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = hovered ? 0.3 : 0.18;
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
