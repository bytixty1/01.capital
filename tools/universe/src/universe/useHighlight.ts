import { useCallback, useRef } from 'react';
import type { NodeFactory } from './nodeObjects';
import type { CameraApi } from './useCamera';
import type { UNode } from './types';

export interface HighlightApi {
  onHover: (node: UNode | null) => void;
  select: (id: string | null) => void;
  isHovering: () => boolean;
  clear: () => void;
}

// Hover/selection focus state, applied imperatively (material swaps) so
// hovering 1,000+ nodes never triggers a React re-render.
export function useHighlight(
  factoryRef: { current: NodeFactory | null },
  camera: CameraApi,
): HighlightApi {
  const hoverIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const resumeTimer = useRef<number | null>(null);

  const applyFocus = useCallback(() => {
    factoryRef.current?.setFocus(hoverIdRef.current ?? selectedIdRef.current);
  }, [factoryRef]);

  const cancelResume = useCallback(() => {
    if (resumeTimer.current !== null) {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  }, []);

  const onHover = useCallback(
    (node: UNode | null) => {
      hoverIdRef.current = node?.id ?? null;
      applyFocus();
      document.body.style.cursor = node ? 'pointer' : 'default';
      if (node) {
        cancelResume();
        camera.setAutoRotate(false);
      } else if (selectedIdRef.current === null) {
        // resume the cinematic drift 2s after hover-out (unless a node is selected)
        cancelResume();
        resumeTimer.current = window.setTimeout(() => camera.setAutoRotate(true), 2000);
      }
    },
    [applyFocus, camera, cancelResume],
  );

  const select = useCallback(
    (id: string | null) => {
      selectedIdRef.current = id;
      if (id) cancelResume();
      applyFocus();
    },
    [applyFocus, cancelResume],
  );

  const clear = useCallback(() => {
    cancelResume();
    hoverIdRef.current = null;
    selectedIdRef.current = null;
    factoryRef.current?.setFocus(null);
    document.body.style.cursor = 'default';
  }, [cancelResume, factoryRef]);

  return {
    onHover,
    select,
    isHovering: () => hoverIdRef.current !== null,
    clear,
  };
}
