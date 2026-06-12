import * as THREE from 'three';

export interface StarField {
  points: THREE.Points;
  update: (elapsedSeconds: number) => void;
  dispose: () => void;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;
attribute float aSpeed;
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = 0.6 + 0.4 * sin(uTime * aSpeed + aSeed);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(aSize * 6000.0 / -mv.z, aSize * 0.9);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.12, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

const TIER_SIZES: [number, number, number] = [0.4, 0.9, 1.8]; // 70% / 25% / 5%
const STAR_WHITE = new THREE.Color('#FFFFFF');
const STAR_BLUE = new THREE.Color('#AAD4FF');
const STAR_GOLD = new THREE.Color('#FFE4A0');

export function createStarField(count: number, radius = 2500): StarField {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // shell between 0.55R and R so stars always sit behind the graph
    const r = radius * (0.55 + 0.45 * Math.cbrt(Math.random()));
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tierRoll = Math.random();
    sizes[i] = tierRoll < 0.7 ? TIER_SIZES[0] : tierRoll < 0.95 ? TIER_SIZES[1] : TIER_SIZES[2];

    const colorRoll = Math.random();
    const c = colorRoll < 0.8 ? STAR_WHITE : colorRoll < 0.95 ? STAR_BLUE : STAR_GOLD;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    seeds[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.4 + Math.random() * 1.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.renderOrder = -1;

  return {
    points,
    update(elapsedSeconds: number) {
      material.uniforms.uTime.value = elapsedSeconds;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
