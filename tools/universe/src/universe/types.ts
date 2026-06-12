// Canonical shapes — everything downstream of dataParser uses only these.

export type NodeType = 'file' | 'function' | 'class' | 'module' | 'component' | 'unknown';
export type Lang = 'ts' | 'js' | 'py' | 'json' | 'css' | 'other';
export type EdgeType = 'import' | 'call' | 'extends' | 'uses' | 'unknown';

export interface UNode {
  id: string;
  label: string;
  type: NodeType;
  community: number;
  size: number; // degree (or explicit size/weight field when present)
  language: Lang;
  filePath: string;
  kind: string; // raw graphify file_type: code | rationale | document | concept | image
  // populated by the force simulation at runtime
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface UEdge {
  source: string | UNode;
  target: string | UNode;
  weight: number;
  type: EdgeType;
  confidence: string; // EXTRACTED | INFERRED | AMBIGUOUS | ''
}

export interface CommunityInfo {
  id: number;
  name: string;
  count: number;
  colorIndex: number; // id % 12 into CLUSTER_COLORS
  color: string;
  centroid: [number, number, number];
}

export interface Adjacency {
  inIds: string[];
  outIds: string[];
}

export type PerfTier = 'high' | 'mid' | 'low';

export interface ParsedGraph {
  nodes: UNode[];
  links: UEdge[];
  nodeById: Map<string, UNode>;
  communities: CommunityInfo[]; // sorted by count desc
  communityById: Map<number, CommunityInfo>;
  adjacency: Map<string, Adjacency>;
  clusterRadius: number;
  tier: PerfTier;
  counts: { nodes: number; edges: number; communities: number };
}
