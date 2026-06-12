import * as THREE from 'three';

export interface Nebula {
  sprite: THREE.Sprite;
  update: () => void;
  dispose: () => void;
}

// Faint indigo haze behind the galaxy — canvas radial gradient, additive blend.
export function createNebula(scale = 800): Nebula {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(30, 27, 75, 0.9)');
  g.addColorStop(0.45, 'rgba(30, 27, 75, 0.35)');
  g.addColorStop(1, 'rgba(30, 27, 75, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  sprite.position.set(0, 0, -200);
  sprite.renderOrder = -2;

  return {
    sprite,
    update() {
      material.rotation += 0.00005;
    },
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}
