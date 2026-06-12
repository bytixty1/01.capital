import type { Lang, NodeType, PerfTier } from './types';

export const BACKGROUND = '#000008';

export const CLUSTER_COLORS = [
  '#6366F1', // 0 indigo
  '#22D3EE', // 1 cyan
  '#A78BFA', // 2 violet
  '#34D399', // 3 emerald
  '#F472B6', // 4 pink
  '#FB923C', // 5 orange
  '#60A5FA', // 6 blue
  '#F87171', // 7 red
  '#4ADE80', // 8 green
  '#E879F9', // 9 fuchsia
  '#38BDF8', // 10 sky
  '#FACC15', // 11 yellow
] as const;

export const LANG_COLORS: Record<Lang, string> = {
  ts: '#3B82F6',
  js: '#EAB308',
  py: '#22C55E',
  json: '#8B5CF6',
  css: '#F43F5E',
  other: '#64748B',
};

export const TYPE_ICONS: Record<NodeType, string> = {
  function: 'ƒ',
  file: '▤',
  class: '◆',
  module: '●',
  component: '⬡',
  unknown: '▲',
};

// Simulation warm-up: loading screen covers the first WARM_TICKS so there is no pop-in.
export const WARM_TICKS = 300;
export const COOLDOWN_TICKS = 420;
export const D3_ALPHA_DECAY = 0.015;
export const CHARGE_STRENGTH = -150;
export const CLUSTER_GRAVITY = 0.015;
export const LINK_STRENGTH_SAME = 0.7;
export const LINK_STRENGTH_CROSS = 0.05;

export function perfTier(nodeCount: number): PerfTier {
  if (nodeCount > 1000) return 'low';
  if (nodeCount > 600) return 'mid';
  return 'high';
}

export function starCount(tier: PerfTier): number {
  return tier === 'high' ? 8000 : 4000;
}

// 68 communities would put the spec's `200 + n*15` formula at r=1220 — too sparse
// to read as one galaxy cluster. Clamp so the universe stays visually coherent.
export function clusterLatticeRadius(communityCount: number): number {
  return Math.min(200 + communityCount * 15, 680);
}

export function overviewDistance(communityCount: number): number {
  return Math.round(clusterLatticeRadius(communityCount) * 2.7);
}

export function nodeRadius(size: number): number {
  return Math.max(2.5, Math.min(14, Math.sqrt(size) * 2.8));
}
