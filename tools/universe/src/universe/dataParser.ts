import {
  CLUSTER_COLORS,
  clusterLatticeRadius,
  perfTier,
} from './constants';
import type {
  Adjacency,
  CommunityInfo,
  EdgeType,
  Lang,
  NodeType,
  ParsedGraph,
  UEdge,
  UNode,
} from './types';

// ── raw shapes (loose: graphify variants + the spec's alternate field names) ──

interface RawNode {
  id: string | number;
  label?: string;
  norm_label?: string;
  name?: string;
  community?: number;
  group?: number;
  size?: number;
  weight?: number;
  type?: string;
  file_type?: string;
  language?: string;
  file_path?: string;
  source_file?: string;
}

interface RawEdge {
  source: string | number;
  target: string | number;
  weight?: number;
  type?: string;
  kind?: string;
  relation?: string;
  confidence?: string;
}

interface RawGraph {
  nodes?: RawNode[];
  links?: RawEdge[];
  edges?: RawEdge[];
}

// ── inference helpers ─────────────────────────────────────────────────────────

const FILE_EXT_RE = /\.[a-z0-9]{1,5}$/i;
const PASCAL_RE = /^[A-Z][A-Za-z0-9_]*$/;

function inferLang(filePath: string, label: string): Lang {
  const src = (filePath || label).toLowerCase();
  if (/\.tsx?$/.test(src)) return 'ts';
  if (/\.(jsx?|mjs|cjs)$/.test(src)) return 'js';
  if (/\.py$/.test(src)) return 'py';
  if (/\.json$/.test(src)) return 'json';
  if (/\.css$/.test(src)) return 'css';
  return 'other';
}

function inferType(raw: RawNode, label: string, filePath: string): NodeType {
  const explicit = (raw.type ?? '').toLowerCase();
  if (
    explicit === 'file' ||
    explicit === 'function' ||
    explicit === 'class' ||
    explicit === 'module' ||
    explicit === 'component'
  ) {
    return explicit as NodeType;
  }
  const ft = (raw.file_type ?? '').toLowerCase();
  if (ft === 'concept' || ft === 'rationale') return 'unknown';
  if (ft === 'document' || ft === 'image' || ft === 'paper') return 'file';
  // code nodes: infer from label shape
  if (label.endsWith('()')) return 'function';
  if (FILE_EXT_RE.test(label)) return 'file';
  if (PASCAL_RE.test(label)) {
    return /\.(tsx|jsx)$/.test(filePath) ? 'component' : 'class';
  }
  return 'module';
}

function inferEdgeType(raw: RawEdge): EdgeType {
  const rel = (raw.type ?? raw.kind ?? raw.relation ?? '').toLowerCase();
  if (!rel) return 'unknown';
  if (rel.startsWith('import')) return 'import';
  if (rel === 'call' || rel === 'calls' || rel === 'method') return 'call';
  if (rel === 'extends' || rel === 'inherits' || rel === 'implements') return 'extends';
  return 'uses';
}

// Evenly distribute N community centroids on a sphere.
export function fibonacciSphere(n: number, radius: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return pts;
}

// GRAPH_REPORT.md lists community hubs in community-id order:
// "- [[_COMMUNITY_Auth & Audit Backend|Auth & Audit Backend]]"
function parseReportCommunityNames(md: string): string[] {
  const names: string[] = [];
  const re = /\[\[_COMMUNITY_[^|\]]+\|([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) names.push(m[1]);
  return names;
}

// ── main parser ───────────────────────────────────────────────────────────────

export function parseGraph(
  rawGraph: RawGraph,
  labelsJson: Record<string, unknown> | null,
  reportMd: string | null,
): ParsedGraph {
  const rawNodes = rawGraph.nodes ?? [];
  // Edges array may be called "links" OR "edges".
  const rawEdges = rawGraph.links ?? rawGraph.edges ?? [];

  const rawIds = new Set(rawNodes.map((n) => String(n.id)));

  // .graphify_labels.json: numeric keys → community names; node-id keys → label overrides.
  const nodeOverrides = new Map<string, string>();
  const communityNames = new Map<number, string>();
  if (labelsJson && typeof labelsJson === 'object') {
    for (const [k, v] of Object.entries(labelsJson)) {
      if (typeof v !== 'string') continue;
      if (rawIds.has(k)) nodeOverrides.set(k, v);
      else if (/^\d+$/.test(k)) communityNames.set(Number(k), v);
    }
  }
  const reportNames = reportMd ? parseReportCommunityNames(reportMd) : [];

  // degree (size fallback)
  const degree = new Map<string, number>();
  for (const e of rawEdges) {
    const s = String(e.source);
    const t = String(e.target);
    degree.set(s, (degree.get(s) ?? 0) + 1);
    degree.set(t, (degree.get(t) ?? 0) + 1);
  }

  const nodes: UNode[] = rawNodes.map((raw) => {
    const id = String(raw.id);
    const baseLabel = raw.label ?? raw.norm_label ?? raw.name ?? id;
    const label = nodeOverrides.get(id) ?? baseLabel;
    const filePath = raw.file_path ?? raw.source_file ?? '';
    return {
      id,
      label,
      type: inferType(raw, baseLabel, filePath),
      community: raw.community ?? raw.group ?? 0,
      size: raw.size ?? raw.weight ?? degree.get(id) ?? 1,
      language: (raw.language as Lang) ?? inferLang(filePath, baseLabel),
      filePath,
      kind: raw.file_type ?? 'code',
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const links: UEdge[] = rawEdges
    .filter((e) => nodeById.has(String(e.source)) && nodeById.has(String(e.target)))
    .map((e) => ({
      source: String(e.source),
      target: String(e.target),
      weight: e.weight ?? 1,
      type: inferEdgeType(e),
      confidence: e.confidence ?? '',
    }));

  // adjacency (out = this node is the edge source)
  const adjacency = new Map<string, Adjacency>();
  const adj = (id: string): Adjacency => {
    let a = adjacency.get(id);
    if (!a) {
      a = { inIds: [], outIds: [] };
      adjacency.set(id, a);
    }
    return a;
  };
  for (const e of links) {
    const s = e.source as string;
    const t = e.target as string;
    adj(s).outIds.push(t);
    adj(t).inIds.push(s);
  }

  // communities + fibonacci lattice centroids
  const commCounts = new Map<number, number>();
  for (const n of nodes) commCounts.set(n.community, (commCounts.get(n.community) ?? 0) + 1);
  const commIds = [...commCounts.keys()].sort((a, b) => a - b);
  const radius = clusterLatticeRadius(commIds.length);
  const lattice = fibonacciSphere(commIds.length, radius);

  const communities: CommunityInfo[] = commIds.map((id, i) => ({
    id,
    name: communityNames.get(id) ?? reportNames[id] ?? `Cluster ${id}`,
    count: commCounts.get(id) ?? 0,
    colorIndex: id % CLUSTER_COLORS.length,
    color: CLUSTER_COLORS[id % CLUSTER_COLORS.length],
    centroid: lattice[i],
  }));
  communities.sort((a, b) => b.count - a.count);

  return {
    nodes,
    links,
    nodeById,
    communities,
    communityById: new Map(communities.map((c) => [c.id, c])),
    adjacency,
    clusterRadius: radius,
    tier: perfTier(nodes.length),
    counts: { nodes: nodes.length, edges: links.length, communities: communities.length },
  };
}
