import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import {
  BACKGROUND,
  CHARGE_STRENGTH,
  COOLDOWN_TICKS,
  D3_ALPHA_DECAY,
  LINK_STRENGTH_CROSS,
  LINK_STRENGTH_SAME,
  WARM_TICKS,
  starCount,
} from './constants';
import { makeClusterForce } from './clusterForce';
import { createLinkConfig } from './linkConfig';
import { createNodeFactory, type NodeFactory } from './nodeObjects';
import { createNebula } from './NebulaSprite';
import { createStarField } from './StarField';
import { setupPostProcessing } from './PostProcessing';
import { useCamera, type FgMethods, type OrbitControlsLike } from './useCamera';
import { useGraphData } from './useGraphData';
import { useHighlight } from './useHighlight';
import { ClusterLegend } from './ClusterLegend';
import { LoadingScreen } from './LoadingScreen';
import { NodeDetailPanel } from './NodeDetailPanel';
import { SearchOverlay } from './SearchOverlay';
import type { ParsedGraph, UEdge, UNode } from './types';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function Header({ parsed }: { parsed: ParsedGraph }) {
  return (
    <div className="panel-ui header">
      <div className="header-badge">01</div>
      <div>
        <div className="header-title">ZEROCAPS UNIVERSE</div>
        <div className="header-sub">
          {parsed.counts.nodes.toLocaleString()} nodes · {parsed.counts.edges.toLocaleString()}{' '}
          edges · {parsed.counts.communities} clusters
        </div>
      </div>
    </div>
  );
}

function ControlsHint() {
  return (
    <div className="hint">
      Drag · Orbit&nbsp;&nbsp;&nbsp;Scroll · Zoom&nbsp;&nbsp;&nbsp;Click · Explore&nbsp;&nbsp;&nbsp;⌘K
      · Search
    </div>
  );
}

export function UniverseGraph() {
  const { status, data, error } = useGraphData();
  const fgRef = useRef<FgMethods | undefined>(undefined);
  const factoryRef = useRef<NodeFactory | null>(null);
  const sceneReady = useRef(false);
  const tickRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<UNode | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const camera = useCamera(fgRef, data);
  const highlight = useHighlight(factoryRef, camera);

  const factory = useMemo(() => {
    if (!data) return null;
    const f = createNodeFactory(data);
    factoryRef.current = f;
    return f;
  }, [data]);

  const linkCfg = useMemo(() => (data ? createLinkConfig(data) : null), [data]);

  const nodeTooltip = useCallback(
    (node: UNode) => {
      const community = data?.communityById.get(node.community);
      return `<div class="tip"><span class="tip-label">${esc(node.label)}</span><span class="tip-meta">${esc(
        community?.name ?? `cluster ${node.community}`,
      )} · ${node.type}</span></div>`;
    },
    [data],
  );

  // ── one-time scene dressing: forces, controls, lights, stars, nebula, bloom ──
  useEffect(() => {
    const fg = fgRef.current;
    if (!data || !fg || sceneReady.current) return;
    sceneReady.current = true;

    // forces
    fg.d3Force('charge')?.strength?.(CHARGE_STRENGTH);
    const linkForce = fg.d3Force('link');
    linkForce?.strength?.((l: UEdge) => {
      const sc = typeof l.source === 'object' ? l.source.community : 0;
      const tc = typeof l.target === 'object' ? l.target.community : 0;
      return sc === tc ? LINK_STRENGTH_SAME : LINK_STRENGTH_CROSS;
    });
    fg.d3Force('cluster', makeClusterForce(data));

    // controls: cinematic drift until first interaction
    const controls = fg.controls() as OrbitControlsLike;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    // scene dressing
    const scene = fg.scene();
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    // one point light per major cluster centroid (capped — 68 lights would
    // explode the standard-material shader cost)
    const lights: THREE.PointLight[] = [];
    for (const c of data.communities.slice(0, 8)) {
      const light = new THREE.PointLight(new THREE.Color(c.color), 1.5, 360, 0.9);
      light.position.set(c.centroid[0], c.centroid[1], c.centroid[2]);
      scene.add(light);
      lights.push(light);
    }

    const stars = createStarField(starCount(data.tier));
    scene.add(stars.points);

    const nebula = createNebula(Math.max(800, data.clusterRadius * 2.5));
    scene.add(nebula.sprite);

    setupPostProcessing(fg.postProcessingComposer(), data.tier);

    // start far out; the post-load glide brings us in
    fg.cameraPosition({ x: 0, y: 0, z: camera.introZ });

    // twinkle + nebula drift loop (graph runs its own render loop; we only
    // mutate uniforms here)
    const t0 = performance.now();
    let raf = 0;
    const animate = () => {
      stars.update((performance.now() - t0) / 1000);
      nebula.update();
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      scene.remove(stars.points, nebula.sprite, ambient, ...lights);
      stars.dispose();
      nebula.dispose();
    };
  }, [data, camera]);

  // ── cinematic fly-in once the simulation is warm ──
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => camera.reset(2200), 500);
    return () => window.clearTimeout(t);
  }, [ready, camera]);

  // ── global keys: ⌘K search, ESC reset ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setSelected(null);
        highlight.clear();
        camera.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera, highlight]);

  const handleEngineTick = useCallback(() => {
    tickRef.current += 1;
    if (tickRef.current <= WARM_TICKS) {
      if (tickRef.current % 6 === 0 || tickRef.current === WARM_TICKS) {
        setProgress(tickRef.current / WARM_TICKS);
      }
      if (tickRef.current === WARM_TICKS) setReady(true);
    }
  }, []);

  const handleEngineStop = useCallback(() => {
    setProgress(1);
    setReady(true);
  }, []);

  const focusNode = useCallback(
    (node: UNode) => {
      highlight.select(node.id);
      setSelected(node);
      camera.flyToNode(node);
    },
    [camera, highlight],
  );

  const handleBackgroundDblClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      if (highlight.isHovering()) return;
      setSelected(null);
      highlight.clear();
      camera.reset();
    },
    [camera, highlight],
  );

  if (status === 'error') {
    return (
      <div className="error-screen">
        <div className="panel-ui error-panel">
          <div className="header-badge">01</div>
          <div className="error-title">Universe failed to initialize</div>
          <div className="error-msg">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="universe-root" onDoubleClick={handleBackgroundDblClick}>
      {data && factory && linkCfg && (
        <ForceGraph3D<UNode, UEdge>
          ref={fgRef}
          graphData={{ nodes: data.nodes, links: data.links }}
          backgroundColor={BACKGROUND}
          showNavInfo={false}
          controlType="orbit"
          d3AlphaDecay={D3_ALPHA_DECAY}
          warmupTicks={0}
          cooldownTicks={COOLDOWN_TICKS}
          onEngineTick={handleEngineTick}
          onEngineStop={handleEngineStop}
          nodeThreeObject={factory.make}
          nodeThreeObjectExtend={false}
          nodeLabel={nodeTooltip}
          linkColor={linkCfg.color}
          linkOpacity={linkCfg.opacity}
          linkWidth={linkCfg.width}
          linkCurvature={linkCfg.curvature}
          linkDirectionalParticles={linkCfg.particles}
          linkDirectionalParticleWidth={linkCfg.particleWidth}
          linkDirectionalParticleSpeed={linkCfg.particleSpeed}
          linkDirectionalParticleColor={linkCfg.particleColor}
          enableNodeDrag={false}
          onNodeClick={focusNode}
          onNodeHover={highlight.onHover}
        />
      )}

      <LoadingScreen progress={progress} done={ready} />

      {data && (
        <>
          <Header parsed={data} />
          <ClusterLegend
            communities={data.communities}
            onPick={(id) => {
              setSelected(null);
              highlight.select(null);
              camera.flyToCluster(id);
            }}
          />
          {ready && <ControlsHint />}
          {selected && (
            <NodeDetailPanel
              node={selected}
              parsed={data}
              onClose={() => {
                setSelected(null);
                highlight.select(null);
              }}
              onNavigate={focusNode}
            />
          )}
          {searchOpen && (
            <SearchOverlay
              parsed={data}
              onPick={(n) => {
                setSearchOpen(false);
                focusNode(n);
              }}
              onClose={() => setSearchOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
