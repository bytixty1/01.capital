'use client';

import { useEffect, useState } from 'react';
import { api, CompanyResponse } from '@/lib/api';

function DonutChart({ slices }: { slices: { pct: number; color: string }[] }) {
  const r = 36;
  const cx = 44;
  const cy = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const rotation = (offset / 100) * 360 - 90;
        offset += s.pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'all 0.6s ease' }}
          />
        );
      })}
    </svg>
  );
}

const ENTITY_COLORS: Record<string, string> = {
  LLC: 'var(--brand-purple)',
  SJSC: '#9b6ff0',
  JSC: '#c4a8f8',
};

const ENTITY_DESC: Record<string, string> = {
  LLC: 'Limited Liability Company',
  SJSC: 'Simplified Joint Stock Company',
  JSC: 'Joint Stock Company',
};

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.companies.list()
      .then(setCompanies)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const totalCapital = companies.reduce((sum, c) => sum + (c.paid_up_capital ? Number(c.paid_up_capital) : 0), 0);

  const entityCounts = companies.reduce<Record<string, number>>((acc, c) => {
    acc[c.entity_type] = (acc[c.entity_type] ?? 0) + 1;
    return acc;
  }, {});

  const donutSlices = Object.entries(entityCounts).map(([type, count]) => ({
    pct: companies.length > 0 ? (count / companies.length) * 100 : 0,
    color: ENTITY_COLORS[type] ?? '#666',
    type,
    count,
  }));

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Portfolio Overview</p>
          <h1 style={styles.heading}>
            {totalCapital > 0
              ? `SAR ${totalCapital.toLocaleString('en-SA')}`
              : 'Your companies'}
          </h1>
          {totalCapital > 0 && (
            <p style={styles.sub}>Total paid-up capital across all companies</p>
          )}
        </div>
        <a href="/companies/new" style={styles.cta}>+ New company</a>
      </div>

      {/* Stats strip */}
      {!loading && companies.length > 0 && (
        <div style={styles.statsStrip}>
          {/* Company count */}
          <div style={styles.statBlock}>
            <span style={styles.statLabel}>Companies</span>
            <div style={styles.statRow}>
              <span style={styles.statBig}>{companies.length}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Active companies */}
          <div style={styles.statBlock}>
            <span style={styles.statLabel}>Active</span>
            <div style={styles.statRow}>
              <span style={styles.statBig}>{companies.filter(c => c.status === 'active').length}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Entity breakdown + donut */}
          <div style={{ ...styles.statBlock, flex: 1, flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
            {donutSlices.length > 0 ? (
              <>
                <DonutChart slices={donutSlices} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {donutSlices.map(s => (
                    <div key={s.type} style={styles.legendRow}>
                      <div style={{ ...styles.legendDot, background: s.color }} />
                      <span style={styles.legendLabel}>{s.type}</span>
                      <span style={styles.legendCount}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <span style={styles.statLabel}>—</span>
            )}
          </div>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Compliance */}
          <div style={styles.statBlock}>
            <span style={styles.statLabel}>Compliance</span>
            <div style={styles.statRow}>
              <span style={{ ...styles.statBig, color: 'var(--pos)' }}>Active</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>KSA Regulations</span>
          </div>
        </div>
      )}

      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {/* Empty state */}
      {!loading && !error && companies.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIconWrap}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="var(--brand-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 22V12h6v10" stroke="var(--brand-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={styles.emptyTitle}>No companies yet</p>
          <p style={styles.emptyText}>Create your first company to start managing your equity cap table.</p>
          <a href="/companies/new" style={styles.ctaEmpty}>Create your first company →</a>
        </div>
      )}

      {/* Company grid */}
      {companies.length > 0 && (
        <>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionLabel}>All companies</span>
          </div>
          <div style={styles.grid}>
            {companies.map(c => (
              <a key={c.id} href={`/companies/${c.id}`} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.entityBadge}>{c.entity_type}</span>
                  <div style={{ ...styles.statusDot, background: c.status === 'active' ? 'var(--pos)' : 'var(--text-tertiary)' }} />
                </div>

                <h2 style={styles.cardName}>{c.name_en}</h2>
                {c.name_ar && <p style={styles.cardNameAr}>{c.name_ar}</p>}

                <p style={styles.entityDesc}>{ENTITY_DESC[c.entity_type] ?? c.entity_type}</p>

                <div style={styles.cardMeta}>
                  <div>
                    <p style={styles.metaLabel}>Paid-up capital</p>
                    <p style={styles.metaValue}>
                      {c.paid_up_capital
                        ? `SAR ${Number(c.paid_up_capital).toLocaleString('en-SA')}`
                        : '—'}
                    </p>
                  </div>
                  {c.cr_number && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={styles.metaLabel}>CR No.</p>
                      <p style={styles.metaValue}>{c.cr_number}</p>
                    </div>
                  )}
                </div>

                <div style={styles.cardArrow}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </a>
            ))}

            {/* Add new card */}
            <a href="/companies/new" style={styles.addCard}>
              <div style={styles.addIcon}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="var(--brand-purple)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p style={styles.addLabel}>Add company</p>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '960px' },

  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '32px',
  },
  eyebrow: {
    fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
  },
  heading: {
    fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', marginBottom: '4px',
  },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)' },
  cta: {
    background: 'var(--brand-purple)', color: '#fff', textDecoration: 'none',
    padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px',
    fontWeight: 500, flexShrink: 0, letterSpacing: '0.01em',
  },

  statsStrip: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex', alignItems: 'center',
    padding: '20px 28px',
    gap: '24px',
    marginBottom: '32px',
    flexWrap: 'wrap' as const,
  },
  statBlock: {
    display: 'flex', flexDirection: 'column' as const, gap: '4px', minWidth: '80px',
  },
  statLabel: { fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  statRow: { display: 'flex', alignItems: 'baseline', gap: '6px' },
  statBig: { fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  divider: { width: '1px', height: '48px', background: 'var(--border-default)', flexShrink: 0 },

  legendRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  legendLabel: { fontSize: '12px', color: 'var(--text-secondary)', minWidth: '36px' },
  legendCount: { fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 },

  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  error: { color: 'var(--neg)', fontSize: '13px' },

  empty: {
    padding: '72px 0', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: '10px', textAlign: 'center' as const,
    border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
  },
  emptyIconWrap: {
    width: '56px', height: '56px', borderRadius: '14px',
    background: 'rgba(166,125,250,0.1)', border: '1px solid rgba(166,125,250,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
  },
  emptyTitle: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' },
  emptyText: { fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '340px', lineHeight: '1.6' },
  ctaEmpty: { color: 'var(--brand-purple)', fontSize: '13px', textDecoration: 'none', marginTop: '4px', fontWeight: 500 },

  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  sectionLabel: { fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  card: {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', padding: '20px 22px', textDecoration: 'none',
    display: 'flex', flexDirection: 'column' as const, gap: '0', position: 'relative' as const,
    transition: 'border-color 150ms ease, background 150ms ease',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
  entityBadge: {
    display: 'inline-block', background: 'rgba(166,125,250,0.12)', color: 'var(--brand-purple)',
    fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
    textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: '20px',
    border: '1px solid rgba(166,125,250,0.2)',
  },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%' },
  cardName: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  cardNameAr: { fontSize: '13px', color: 'var(--text-secondary)', direction: 'rtl' as const, marginBottom: '4px' },
  entityDesc: { fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '18px' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' },
  metaLabel: { fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '2px', fontFamily: 'var(--font-mono)' },
  metaValue: { fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 500 },
  cardArrow: { position: 'absolute' as const, bottom: '20px', right: '20px', color: 'var(--text-tertiary)' },

  addCard: {
    border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', gap: '10px', textDecoration: 'none',
    minHeight: '160px', cursor: 'pointer',
  },
  addIcon: {
    width: '44px', height: '44px', borderRadius: '10px',
    background: 'rgba(166,125,250,0.08)', border: '1px solid rgba(166,125,250,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addLabel: { fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 },
};
