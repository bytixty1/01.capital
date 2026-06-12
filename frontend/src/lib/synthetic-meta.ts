import type { ProjectedSyntheticKind } from './api';

// Badge color/label for synthetic (projected, not-yet-real) cap table rows.
// ProjectedSyntheticKind is a superset of SyntheticKind, so waterfall and
// round-modeler share this single source of truth.
export function syntheticMeta(
  kind: ProjectedSyntheticKind | null | undefined,
): { color: string; label: string } | null {
  switch (kind) {
    case 'esop_pool':    return { color: 'var(--info)',         label: 'ESOP POOL' };
    case 'esop_grants':  return { color: 'var(--warn)',         label: 'ESOP GRANTS' };
    case 'convertible':  return { color: 'var(--brand-purple)', label: 'CONVERTIBLE' };
    case 'esop_topup':   return { color: 'var(--info)',         label: 'ESOP TOP-UP' };
    case 'new_investor': return { color: 'var(--pos)',          label: 'NEW INVESTOR' };
    default:             return null;
  }
}
