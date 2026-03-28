import * as THREE from "three";

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

    // glow copy behind the logo
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 1, 1),
    });

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      glowMaterial
    );
    glow.position.set(x, y, -1.01);

    // real logo in front
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
      color: new THREE.Color(1, 1, 1),
    });

    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      logoMaterial
    );
    logo.position.set(x, y, -1);

    logo.userData = {
      name,
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
  timer: THREE.Timer
) {
  const time = timer.getElapsed();
  const wave = Math.sin(time * 1.5); // same timing as stars

  logos.forEach((logo) => {
    const glow = logo.userData.glow as THREE.Mesh;
    const hovered = logo.userData.hovered as boolean;
    const baseX = logo.userData.baseX as number;
    const baseY = logo.userData.baseY as number;
    const baseZ = logo.userData.baseZ as number;

    logo.position.set(baseX, baseY, baseZ);
    glow.position.set(baseX, baseY, baseZ - 0.01);

    // logo zoom in / out like the stars
    const logoZoom = hovered ? 1.12 + 0.10 * wave : 1.0 + 0.19 * wave;
    logo.scale.set(logoZoom, logoZoom, 1);

    const logoMaterial = logo.material as THREE.MeshBasicMaterial;
    logoMaterial.opacity = hovered
      ? 1.0
      : THREE.MathUtils.clamp(0.9 + 0.06 * wave, 0.8, 1.0);

    const brightness = hovered ? 1.18 : 1.0 + 0.04 * wave;
    logoMaterial.color.setRGB(brightness, brightness, brightness);

    // glow follows the same zoom pattern, slightly larger
    const glowZoom = hovered ? 1.28 + 0.14 * wave : 1.15 + 0.14 * wave;
    glow.scale.set(glowZoom, glowZoom, 1);

    const glowMaterial = glow.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = hovered
      ? THREE.MathUtils.clamp(0.3 + 0.07 * wave, 0.2, 0.4)
      : THREE.MathUtils.clamp(0.16 + 0.05 * wave, 0.08, 0.24);
  });
}