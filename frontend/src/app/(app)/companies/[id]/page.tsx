'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CapTableResponse, CompanyResponse } from '@/lib/api';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [capTable, setCapTable] = useState<CapTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.companies.get(id), api.capTable.get(id)])
      .then(([c, ct]) => {
        setCompany(c);
        setCapTable(ct);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={styles.muted}>Loading…</p>;
  if (error) return <p style={styles.error}>{error}</p>;
  if (!company || !capTable) return null;

  const totalShares = Number(capTable.total_shares);

  return (
    <div style={styles.page}>
      <div style={styles.back}>
        <a href="/dashboard" style={styles.backLink}>← Dashboard</a>
      </div>

      <div style={styles.header}>
        <div>
          <span style={styles.badge}>{company.entity_type}</span>
          <h1 style={styles.heading}>{company.name_en}</h1>
          {company.name_ar && <p style={styles.nameAr}>{company.name_ar}</p>}
        </div>
        <a href={`/companies/${id}/stakeholders/new`} style={styles.cta}>
          + Add stakeholder
        </a>
      </div>

      {/* Capital summary */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Paid-up capital</span>
          <span style={styles.statValue}>
            {company.paid_up_capital
              ? `SAR ${Number(company.paid_up_capital).toLocaleString('en-SA')}`
              : '—'}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total shares</span>
          <span style={styles.statValue}>
            {totalShares > 0 ? totalShares.toLocaleString('en-SA') : '—'}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Par value</span>
          <span style={styles.statValue}>
            {company.par_value_per_share ? `SAR ${company.par_value_per_share}` : '—'}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>CR number</span>
          <span style={styles.statValue}>{company.cr_number ?? '—'}</span>
        </div>
      </div>

      {/* Cap table */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Cap table</h2>
          <a href={`/companies/${id}/cap-table/issue`} style={styles.secondaryCta}>
            Issue shares
          </a>
        </div>

        {capTable.holdings.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No shares issued yet.</p>
            <a href={`/companies/${id}/cap-table/issue`} style={styles.emptyLink}>
              Issue shares to your first stakeholder →
            </a>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Stakeholder</th>
                <th style={{ ...styles.th, ...styles.right }}>Share class</th>
                <th style={{ ...styles.th, ...styles.right }}>Shares</th>
                <th style={{ ...styles.th, ...styles.right }}>Ownership</th>
                <th style={{ ...styles.th, ...styles.right }}>Ownership bar</th>
              </tr>
            </thead>
            <tbody>
              {capTable.holdings.map(h => (
                <tr key={`${h.stakeholder_id}-${h.share_class}`} style={styles.row}>
                  <td style={styles.td}>{h.stakeholder_name}</td>
                  <td style={{ ...styles.td, ...styles.right, ...styles.mono }}>
                    {h.share_class}
                  </td>
                  <td style={{ ...styles.td, ...styles.right, ...styles.mono }}>
                    {Number(h.quantity).toLocaleString('en-SA')}
                  </td>
                  <td style={{ ...styles.td, ...styles.right, ...styles.mono }}>
                    {Number(h.percentage).toFixed(2)}%
                  </td>
                  <td style={{ ...styles.td, ...styles.right }}>
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.min(Number(h.percentage), 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={styles.draftNotice}>
        DRAFT — Review all cap table data with legal counsel before relying on it for legal purposes.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '960px' },
  back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-block',
    background: 'var(--bg-elevated)',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '8px',
  },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  nameAr: { fontSize: '14px', color: 'var(--text-secondary)', direction: 'rtl' as const },
  cta: {
    background: 'var(--brand-purple)',
    color: '#fff',
    textDecoration: 'none',
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 500,
    flexShrink: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1px',
    background: 'var(--border-default)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: '32px',
  },
  stat: {
    background: 'var(--bg-surface)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statLabel: { fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  statValue: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  section: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-default)',
  },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  secondaryCta: {
    color: 'var(--brand-purple)',
    fontSize: '13px',
    textDecoration: 'none',
  },
  empty: { padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  emptyText: { color: 'var(--text-tertiary)', fontSize: '13px' },
  emptyLink: { color: 'var(--brand-purple)', fontSize: '13px', textDecoration: 'none' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '10px 20px',
    textAlign: 'left' as const,
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border-default)',
  },
  right: { textAlign: 'right' as const },
  row: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '12px 20px', fontSize: '13px', color: 'var(--text-primary)' },
  mono: { fontFamily: 'var(--font-mono)' },
  barTrack: {
    height: '6px',
    background: 'var(--bg-elevated)',
    borderRadius: '3px',
    width: '80px',
    overflow: 'hidden',
    display: 'inline-block',
  },
  barFill: {
    height: '100%',
    background: 'var(--brand-purple)',
    borderRadius: '3px',
  },
  draftNotice: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center' as const,
    padding: '8px',
  },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  error: { color: 'var(--neg)', fontSize: '13px' },
};
