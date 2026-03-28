import * as THREE from "three";

export function createClouds(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  cloudTextures: THREE.Texture[],
  clouds: THREE.Mesh[]
) {
  const colsClouds = 10;
  const rowsClouds = 10;
  const baseZ = -1;

  const minX = -87;
  const maxX = 87;
  const minY = 13;
  const maxY = 40;

  const xStep = (maxX - minX) / (colsClouds - 1);
  const yStep = (maxY - minY) / (rowsClouds - 1);

  for (let row = 0; row < rowsClouds; row++) {
    for (let col = 0; col < colsClouds; col++) {
      const xBase = minX + col * xStep;
      const yBase = minY + row * yStep;

      // detect left/right edge columns
      const isEdgeColumn = col < 3 || col > colsClouds - 4;

      // small horizontal variation
      const x = xBase + (Math.random() - 0.5) * (xStep * 0.12);

      // MUCH stronger vertical spread on left/right sides
      const y = isEdgeColumn
        ? yBase + (Math.random() - 0.5) * (yStep * 11.5)
        : yBase + (Math.random() - 0.5) * (yStep * 0.30);

      const texture =
        cloudTextures[(row * colsClouds + col) % cloudTextures.length];

      const cloudMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const width = 4 + Math.random() * 2;
      const height = 2 + Math.random();

      const cloud = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        cloudMaterial
      );

      cloud.position.set(x, y, baseZ);

      cloud.userData = {
        baseX: x,
        baseY: y,
        speed: 0.15 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
      };

      scene.add(cloud);
      clouds.push(cloud);
    }
  }
}