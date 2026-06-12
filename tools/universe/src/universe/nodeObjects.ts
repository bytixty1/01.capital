import * as THREE from 'three';
import { CLUSTER_COLORS, nodeRadius } from './constants';
import type { NodeType, ParsedGraph, UNode } from './types';

type FocusState = 'base' | 'dim' | 'hover';

// Shared unit geometries — meshes scale to their radius, so six geometries
// serve all 1k+ nodes.
const GEOMETRIES: Record<NodeType, THREE.BufferGeometry> = {
  component: new THREE.IcosahedronGeometry(1, 1),
  module: new THREE.IcosahedronGeometry(1, 0),
  class: new THREE.OctahedronGeometry(1, 0),
  function: new THREE.SphereGeometry(1, 8, 8),
  file: new THREE.SphereGeometry(1, 12, 12),
  unknown: new THREE.TetrahedronGeometry(1, 0),
};

// Radial glow texture approximating pow(1 - d, 2.5) falloff.
let glowTexture: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.03)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

interface NodeEntry {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  colorIndex: number;
}

export interface NodeFactory {
  make: (node: UNode) => THREE.Object3D;
  setFocus: (focusId: string | null) => void;
  dispose: () => void;
}

const MESH_OPACITY: Record<FocusState, number> = { base: 1, dim: 0.12, hover: 1 };
const MESH_EMISSIVE: Record<FocusState, number> = { base: 0.55, dim: 0.15, hover: 1.0 };
const GLOW_OPACITY: Record<FocusState, number> = { base: 0.35, dim: 0.05, hover: 0.95 };

export function createNodeFactory(parsed: ParsedGraph): NodeFactory {
  // Pooled materials: 12 cluster colors × 3 focus states; nodes swap material
  // refs on hover instead of mutating per-node materials.
  const meshMats = new Map<string, THREE.MeshStandardMaterial>();
  const glowMats = new Map<string, THREE.SpriteMaterial>();
  const registry = new Map<string, NodeEntry>();

  function meshMat(colorIndex: number, state: FocusState): THREE.MeshStandardMaterial {
    const key = `${colorIndex}-${state}`;
    let m = meshMats.get(key);
    if (!m) {
      const color = new THREE.Color(CLUSTER_COLORS[colorIndex % 12]);
      m = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: MESH_EMISSIVE[state],
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: MESH_OPACITY[state],
        depthWrite: state !== 'dim',
      });
      meshMats.set(key, m);
    }
    return m;
  }

  function glowMat(colorIndex: number, state: FocusState): THREE.SpriteMaterial {
    const key = `${colorIndex}-${state}`;
    let m = glowMats.get(key);
    if (!m) {
      m = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: new THREE.Color(CLUSTER_COLORS[colorIndex % 12]),
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: GLOW_OPACITY[state],
        depthWrite: false,
      });
      glowMats.set(key, m);
    }
    return m;
  }

  let currentFocus: string | null = null;

  return {
    make(node: UNode): THREE.Object3D {
      const colorIndex = parsed.communityById.get(node.community)?.colorIndex ?? 0;
      const r = nodeRadius(node.size);
      const group = new THREE.Group();

      const mesh = new THREE.Mesh(GEOMETRIES[node.type], meshMat(colorIndex, 'base'));
      mesh.scale.setScalar(r);

      const glow = new THREE.Sprite(glowMat(colorIndex, 'base'));
      glow.scale.setScalar(r * 5);
      // glow halo should not steal raycast hits from the core mesh
      glow.raycast = () => undefined;

      group.add(mesh);
      group.add(glow);
      registry.set(node.id, { mesh, glow, colorIndex });
      return group;
    },

    setFocus(focusId: string | null): void {
      if (focusId === currentFocus) return;
      currentFocus = focusId;
      for (const [id, entry] of registry) {
        const state: FocusState =
          focusId === null ? 'base' : id === focusId ? 'hover' : 'dim';
        entry.mesh.material = meshMat(entry.colorIndex, state);
        entry.glow.material = glowMat(entry.colorIndex, state);
      }
    },

    dispose(): void {
      registry.clear();
      for (const m of meshMats.values()) m.dispose();
      for (const m of glowMats.values()) m.dispose();
      meshMats.clear();
      glowMats.clear();
    },
  };
}
