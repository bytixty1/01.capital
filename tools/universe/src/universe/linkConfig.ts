import { CLUSTER_COLORS } from './constants';
import type { ParsedGraph, UEdge, UNode } from './types';

export interface LinkConfig {
  color: (l: UEdge) => string;
  width: (l: UEdge) => number;
  curvature: number;
  opacity: number;
  particles: (l: UEdge) => number;
  particleWidth: number;
  particleSpeed: (l: UEdge) => number;
  particleColor: (l: UEdge) => string;
}

function endpointCommunity(parsed: ParsedGraph, end: string | UNode): number {
  return typeof end === 'object' ? end.community : parsed.nodeById.get(end)?.community ?? 0;
}

export function createLinkConfig(parsed: ParsedGraph): LinkConfig {
  const low = parsed.tier === 'low';
  const commOf = (end: string | UNode) => endpointCommunity(parsed, end);
  const colorOf = (l: UEdge) => CLUSTER_COLORS[commOf(l.source) % 12];
  const crossCluster = (l: UEdge) => commOf(l.source) !== commOf(l.target);

  return {
    color: colorOf,
    // "extends" edges get a real tube (only ~90 of them); the other ~2.6k stay
    // as 1px lines — 2,692 curved tube meshes would sink the 60fps target.
    width: (l) => (l.type === 'extends' ? 1.2 : 0),
    curvature: 0.12,
    opacity: 0.1, // all link colors at ~9% per spec ("#…18") → single global opacity
    particles: (l) => {
      if (l.type === 'extends') return 1;
      if (l.type === 'call') return low ? 3 : 6;
      if (l.type === 'import') return low ? 2 : 3;
      if (l.weight > 5) return low ? 3 : 5;
      // generic edges: at >1000 nodes only cross-cluster bridges carry photons,
      // which is also the prettiest read — light traveling between galaxies.
      return low ? (crossCluster(l) ? 1 : 0) : 2;
    },
    particleWidth: 1.4,
    particleSpeed: (l) =>
      l.type === 'extends' ? 0.0008 : Math.min(0.002 + l.weight * 0.0004, 0.006),
    particleColor: colorOf,
  };
}
