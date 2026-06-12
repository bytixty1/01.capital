import type { CSSProperties } from 'react';

// Shared table cell styles. Two families exist in the product:
//  - "compact": dense mono-header analysis tables (waterfall, round modeler)
//  - "data":    primary data tables (company cap table, stakeholders)
// Callers extend with spreads, e.g. { ...thCompact, textAlign: 'right' }.

export const thCompact: CSSProperties = {
  padding: '12px 16px',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  textAlign: 'left',
  borderBottom: '1px solid var(--glass-border)',
  fontFamily: 'var(--font-mono)',
};

export const tdCompact: CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  color: 'var(--text-secondary)',
};

export const thData: CSSProperties = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--glass-border)',
  background: 'rgba(255,255,255,0.02)',
};

export const tdData: CSSProperties = {
  padding: '16px 24px',
  fontSize: '14px',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};
