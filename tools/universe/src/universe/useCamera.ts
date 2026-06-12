import { useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-3d';
import { overviewDistance } from './constants';
import type { ParsedGraph, UEdge, UNode } from './types';

export type FgMethods = ForceGraphMethods<NodeObject<UNode>, LinkObject<UNode, UEdge>>;
export type FgRef = MutableRefObject<FgMethods | undefined>;

// OrbitControls surface we rely on (fg.controls() is typed as plain object).
export interface OrbitControlsLike {
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
  addEventListener: (type: string, fn: () => void) => void;
}

export interface CameraApi {
  overviewZ: number;
  introZ: number;
  controls: () => OrbitControlsLike | null;
  setAutoRotate: (on: boolean) => void;
  flyToNode: (node: UNode) => void;
  flyToCluster: (communityId: number) => void;
  reset: (ms?: number) => void;
}

export function useCamera(fgRef: FgRef, data: ParsedGraph | null): CameraApi {
  return useMemo<CameraApi>(() => {
    const overviewZ = data ? overviewDistance(data.counts.communities) : 1500;
    const introZ = overviewZ * 2;

    const controls = (): OrbitControlsLike | null =>
      (fgRef.current?.controls() as OrbitControlsLike | undefined) ?? null;

    const setAutoRotate = (on: boolean) => {
      const c = controls();
      if (c) c.autoRotate = on;
    };

    return {
      overviewZ,
      introZ,
      controls,
      setAutoRotate,
      flyToNode(node: UNode) {
        const fg = fgRef.current;
        if (!fg || node.x === undefined) return;
        setAutoRotate(false);
        const dist = 60 + node.size * 2;
        fg.cameraPosition(
          { x: node.x, y: node.y ?? 0, z: (node.z ?? 0) + dist },
          { x: node.x, y: node.y ?? 0, z: node.z ?? 0 },
          800,
        );
      },
      flyToCluster(communityId: number) {
        const fg = fgRef.current;
        if (!fg || !data) return;
        setAutoRotate(false);
        // zoomToFit() keeps the camera's bearing to the graph origin, which forces
        // a zoom-OUT for off-center clusters on the lattice sphere — so fly to the
        // live centroid instead, approaching from outside the lattice.
        const members = data.nodes.filter(
          (n) => n.community === communityId && n.x !== undefined,
        );
        if (members.length === 0) return;
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (const m of members) {
          cx += m.x ?? 0;
          cy += m.y ?? 0;
          cz += m.z ?? 0;
        }
        cx /= members.length;
        cy /= members.length;
        cz /= members.length;
        let spread = 0;
        for (const m of members) {
          spread = Math.max(
            spread,
            Math.hypot((m.x ?? 0) - cx, (m.y ?? 0) - cy, (m.z ?? 0) - cz),
          );
        }
        const dist = Math.max(180, spread * 2.4);
        const r = Math.hypot(cx, cy, cz) || 1;
        const k = 1 + dist / r;
        fg.cameraPosition({ x: cx * k, y: cy * k, z: cz * k }, { x: cx, y: cy, z: cz }, 1000);
      },
      reset(ms = 1400) {
        const fg = fgRef.current;
        if (!fg) return;
        fg.cameraPosition(
          { x: 0, y: overviewZ * 0.12, z: overviewZ },
          { x: 0, y: 0, z: 0 },
          ms,
        );
        setAutoRotate(true);
      },
    };
  }, [fgRef, data]);
}
