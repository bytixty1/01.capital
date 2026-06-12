import { CLUSTER_GRAVITY } from './constants';
import type { ParsedGraph, UNode } from './types';

interface D3Force {
  (alpha: number): void;
  initialize?: (nodes: UNode[]) => void;
}

// Pulls every node toward its community's fibonacci-lattice centroid so
// communities condense into visually distinct galaxies.
export function makeClusterForce(parsed: ParsedGraph, k: number = CLUSTER_GRAVITY): D3Force {
  let nodes: UNode[] = [];
  const fallback: [number, number, number] = [0, 0, 0];

  const force: D3Force = () => {
    for (const n of nodes) {
      const c = parsed.communityById.get(n.community)?.centroid ?? fallback;
      n.vx = (n.vx ?? 0) + (c[0] - (n.x ?? 0)) * k;
      n.vy = (n.vy ?? 0) + (c[1] - (n.y ?? 0)) * k;
      n.vz = (n.vz ?? 0) + (c[2] - (n.z ?? 0)) * k;
    }
  };
  force.initialize = (ns: UNode[]) => {
    nodes = ns;
  };
  return force;
}
