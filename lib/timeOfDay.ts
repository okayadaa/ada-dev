import * as THREE from "three";

// Each sky is a vertical gradient of 5 color stops, ordered bottom (horizon)
// -> top. Stops are evenly spaced and blended smoothly in the shader.
export const STOP_COUNT = 5;

export type SkyState = {
  stops: THREE.Color[]; // length STOP_COUNT, bottom -> top
  ambient: number;
  dirIntensity: number;
  dirColor: THREE.Color;
  starOpacity: number;
};

type RawKeyframe = {
  hour: number;
  // bottom (horizon) -> top
  stops: [number, number, number, number, number];
  ambient: number;
  dir: number;
  dirColor: number;
  stars: number;
};

// Color stops across a 24h day (visitor's local time), interpolated
// continuously so there are no hard switch points. hour 0 and 24 match so the
// day wraps seamlessly. "Hold" keyframes (e.g. 4:00, 22:00) keep night from
// turning to dawn/dusk too early.
const RAW_KEYFRAMES: RawKeyframe[] = [
  // Deep night — navy, never black
  { hour: 0, stops: [0x2c3d63, 0x243456, 0x1d2c49, 0x18253f, 0x142036], ambient: 0.3, dir: 0.22, dirColor: 0x9bb0ff, stars: 1 },
  // Hold deep night until just before dawn
  { hour: 4, stops: [0x2c3d63, 0x243456, 0x1d2c49, 0x18253f, 0x142036], ambient: 0.3, dir: 0.22, dirColor: 0x9bb0ff, stars: 1 },
  // Predawn — warm orange horizon under a teal/blue sky
  { hour: 5, stops: [0xf7a361, 0xd6beac, 0x90b1af, 0x49a3b5, 0x1e7fa3], ambient: 0.45, dir: 0.5, dirColor: 0xffd9b0, stars: 0.12 },
  // Sunrise — orange -> gold -> cream -> periwinkle -> deep sky blue
  { hour: 7, stops: [0xf48b29, 0xf9c75e, 0xefe1da, 0xaec9fa, 0x0086ff], ambient: 0.6, dir: 0.85, dirColor: 0xffe8c8, stars: 0 },
  // Morning
  { hour: 9, stops: [0xdceefb, 0xcfeaff, 0xaed4f5, 0x74b0ef, 0x2f86e8], ambient: 0.68, dir: 0.95, dirColor: 0xfff6e8, stars: 0 },
  // Midday
  { hour: 13, stops: [0xeaf6ff, 0xd6efff, 0xa9d6f5, 0x5fa3ef, 0x2f86e8], ambient: 0.7, dir: 1.0, dirColor: 0xffffff, stars: 0 },
  // Afternoon
  { hour: 16, stops: [0xffe9c8, 0xf3e3cf, 0xcfdcec, 0x6f9fdd, 0x3f7fce], ambient: 0.66, dir: 0.92, dirColor: 0xfff0d0, stars: 0 },
  // Sunset — orange -> golden peach -> warm sand -> dusty mauve -> lavender-blue
  { hour: 19, stops: [0xeda159, 0xeaa96c, 0xd6a686, 0xb196a3, 0x7f82a0], ambient: 0.55, dir: 0.6, dirColor: 0xffc890, stars: 0 },
  // Dusk — fading warm horizon into purple/navy
  { hour: 20.5, stops: [0xb06a4e, 0x7c5f6e, 0x4e496a, 0x2c3457, 0x1c2845], ambient: 0.4, dir: 0.32, dirColor: 0xb0a0ff, stars: 0.5 },
  // Back to deep night, held to midnight
  { hour: 22, stops: [0x2c3d63, 0x243456, 0x1d2c49, 0x18253f, 0x142036], ambient: 0.3, dir: 0.22, dirColor: 0x9bb0ff, stars: 1 },
  { hour: 24, stops: [0x2c3d63, 0x243456, 0x1d2c49, 0x18253f, 0x142036], ambient: 0.3, dir: 0.22, dirColor: 0x9bb0ff, stars: 1 },
];

const KEYFRAMES = RAW_KEYFRAMES.map((k) => ({
  hour: k.hour,
  stops: k.stops.map((c) => new THREE.Color(c)),
  ambient: k.ambient,
  dir: k.dir,
  dirColor: new THREE.Color(k.dirColor),
  stars: k.stars,
}));

/** Fractional local hour in [0, 24), e.g. 18.5 for 6:30pm. */
export function getCurrentHour(date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function createSkyState(): SkyState {
  return {
    stops: Array.from({ length: STOP_COUNT }, () => new THREE.Color()),
    ambient: 0,
    dirIntensity: 0,
    dirColor: new THREE.Color(),
    starOpacity: 0,
  };
}

/**
 * Writes the interpolated sky state for the given fractional hour into `out`
 * (mutated in place to avoid per-frame allocations).
 */
export function getSkyState(hour: number, out: SkyState): SkyState {
  const h = ((hour % 24) + 24) % 24;

  let a = KEYFRAMES[0];
  let b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (h >= KEYFRAMES[i].hour && h <= KEYFRAMES[i + 1].hour) {
      a = KEYFRAMES[i];
      b = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = b.hour - a.hour || 1;
  const t = (h - a.hour) / span;

  for (let i = 0; i < STOP_COUNT; i++) {
    out.stops[i].copy(a.stops[i]).lerp(b.stops[i], t);
  }
  out.dirColor.copy(a.dirColor).lerp(b.dirColor, t);
  out.ambient = THREE.MathUtils.lerp(a.ambient, b.ambient, t);
  out.dirIntensity = THREE.MathUtils.lerp(a.dir, b.dir, t);
  out.starOpacity = THREE.MathUtils.lerp(a.stars, b.stars, t);

  return out;
}

export type Sky = {
  mesh: THREE.Mesh;
  uniforms: {
    stops: { value: THREE.Color }[];
  };
};

/**
 * Builds a large gradient skydome whose 5 vertical color stops can be animated
 * via the returned uniforms. Stops run from the horizon (stop 0) to the top of
 * the sky (stop 4).
 */
export function createSky(scene: THREE.Scene, initial: SkyState): Sky {
  const stopUniforms = initial.stops.map((c) => ({ value: c.clone() }));

  const uniforms: Record<string, { value: THREE.Color }> = {};
  stopUniforms.forEach((u, i) => {
    uniforms[`c${i}`] = u;
  });

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 c0; // horizon
      uniform vec3 c1;
      uniform vec3 c2;
      uniform vec3 c3;
      uniform vec3 c4; // top of sky
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition).y;
        // Map the visible sky (slightly below horizon -> overhead) to 0..1.
        float t = clamp((h + 0.08) / 0.68, 0.0, 1.0);

        // Smoothly blend across the 5 evenly spaced stops.
        vec3 col = c0;
        col = mix(col, c1, smoothstep(0.0, 0.25, t));
        col = mix(col, c2, smoothstep(0.25, 0.5, t));
        col = mix(col, c3, smoothstep(0.5, 0.75, t));
        col = mix(col, c4, smoothstep(0.75, 1.0, t));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const geometry = new THREE.SphereGeometry(120, 32, 16);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -1;
  scene.add(mesh);

  return { mesh, uniforms: { stops: stopUniforms } };
}

/** Copies a SkyState's gradient stops into the sky's shader uniforms. */
export function applySkyToUniforms(sky: Sky, state: SkyState) {
  for (let i = 0; i < STOP_COUNT; i++) {
    sky.uniforms.stops[i].value.copy(state.stops[i]);
  }
}
