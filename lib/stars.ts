import * as THREE from "three";

export function createStars(
  scene: THREE.Scene,
  starCount: number = 1800
): THREE.Points {
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.27,
    opacity: 1.0,
    transparent: true,
    sizeAttenuation: true,
  });

  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (let star = 0; star < starCount; star++) {
    positions.push(
      (Math.random() - 0.7) * 288, // x
      8 + Math.random() * 20,      // y
      -3 + Math.random() * 6       // z
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const points = new THREE.Points(geometry, starsMaterial);
  scene.add(points);

  return points;
}

export function animateStars(
  points: THREE.Points, 
  timer: THREE.Timer
) {
  const time = timer.getElapsed();
  (points.material as THREE.PointsMaterial).size =
    0.15 + 0.13 * Math.sin(time * 1.5);
}