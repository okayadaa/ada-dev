import * as THREE from "three";

export function createClouds(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  cloudTextures: THREE.Texture[],
  clouds: THREE.Mesh[]
) {
  // Sky region to fill. Widened beyond the viewport on the sides/top so the
  // edges and corners stay full as the camera sways. minY stops just above the
  // GitHub/LinkedIn icons (which sit at y: 9, ~y:10 at their tops) so clouds
  // never overlap them.
  const minX = -110;
  const maxX = 110;
  const minY = 13;
  const maxY = 46;

  // Even grid for guaranteed coverage (no empty zones), with per-cloud jitter
  // inside each cell so it reads organic rather than like wallpaper.
  const cols = 12;
  const rows = 8;

  const cellW = (maxX - minX) / cols;
  const cellH = (maxY - minY) / rows;

  function pickTexture() {
    return cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
  }

  function makeCloud(x: number, y: number, far: boolean) {
    const cloudMaterial = new THREE.MeshBasicMaterial({
      map: pickTexture(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: far ? 0.4 + Math.random() * 0.25 : 0.75 + Math.random() * 0.25,
    });

    const sizeMul = far ? 1.4 : 1;
    const width = (4 + Math.random() * 2) * sizeMul;
    const height = (2 + Math.random()) * sizeMul;

    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      cloudMaterial
    );

    // Depth bands: far clouds sit further back and read fainter/larger.
    const z = far ? -6 - Math.random() * 4 : -1 - Math.random() * 2;
    cloud.position.set(x, y, z);

    cloud.userData = {
      baseX: x,
      baseY: y,
      // Distant clouds drift less; small variations keep the layers natural.
      driftAmplitude: (far ? 3 : 5) * (0.9 + Math.random() * 0.2),
      windLag: (z * -0.035) + Math.random() * 0.08,
    };

    scene.add(cloud);
    clouds.push(cloud);
  }

  // 1) Even base coverage: one jittered cloud per grid cell.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellX = minX + col * cellW;
      const cellY = minY + row * cellH;

      // Jitter within the cell (0.7 of the cell) keeps spacing even but breaks
      // up the grid pattern.
      const x = cellX + cellW * (0.15 + Math.random() * 0.7);
      const y = cellY + cellH * (0.15 + Math.random() * 0.7);

      makeCloud(x, y, Math.random() < 0.35);
    }
  }

  // 2) Extra density along all four edges so the frame feels full to the border.
  const edgePerSide = 6;
  for (let i = 0; i < edgePerSide; i++) {
    const tEdge = (i + 0.5) / edgePerSide;
    // Left / right
    makeCloud(minX - cellW * 0.5, minY + tEdge * (maxY - minY), Math.random() < 0.5);
    makeCloud(maxX + cellW * 0.5, minY + tEdge * (maxY - minY), Math.random() < 0.5);
    // Top / bottom (bottom row stays at minY so it sits just above the icons)
    makeCloud(minX + tEdge * (maxX - minX), maxY + cellH * 0.4, Math.random() < 0.5);
    makeCloud(minX + tEdge * (maxX - minX), minY + cellH * 0.15, Math.random() < 0.5);
  }

  // 3) Reinforce the four corners so they never read empty.
  const corners: Array<[number, number]> = [
    [minX, minY],
    [minX, maxY],
    [maxX, minY],
    [maxX, maxY],
  ];
  for (const [cx, cy] of corners) {
    for (let i = 0; i < 2; i++) {
      const x = cx + (Math.random() - 0.5) * cellW * 1.2;
      const y = cy + (Math.random() - 0.5) * cellH * 1.2;
      // Never let bottom-corner clouds drop below the field onto the icons.
      makeCloud(x, Math.max(y, minY), Math.random() < 0.5);
    }
  }
}

/** Gentle horizontal wind: a full left/right cycle takes about 90 seconds. */
export function animateClouds(
  clouds: THREE.Mesh[],
  camera: THREE.PerspectiveCamera,
  elapsedSeconds: number,
  reducedMotion = false,
) {
  const windPhase = elapsedSeconds * (Math.PI * 2 / 90);
  for (const cloud of clouds) {
    const { baseX, baseY, driftAmplitude, windLag } = cloud.userData;
    // Subtract the initial offset so newly loaded clouds never jump. A
    // shared phase keeps the field moving with the same prevailing breeze.
    const drift = reducedMotion
      ? 0
      : (Math.sin(windPhase + windLag) - Math.sin(windLag)) * driftAmplitude;
    cloud.position.set(baseX + drift, baseY, cloud.position.z);
    cloud.lookAt(camera.position);
  }
}
