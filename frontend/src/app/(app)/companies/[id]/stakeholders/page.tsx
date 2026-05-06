'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function StakeholdersPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stakeholders
      .list(companyId)
      .then(setStakeholders)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [companyId]);

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>Stakeholders</h1>
          <p style={s.sub}>Individuals and entities that hold or will hold shares in this company.</p>
        </div>
        <a href={`/companies/${companyId}/stakeholders/new`} style={s.cta}>+ Add stakeholder</a>
      </div>

      {loading && <p style={s.muted}>Loading…</p>}
      {error && <p style={s.error}>{error}</p>}

      {!loading && !error && stakeholders.length === 0 && (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No stakeholders yet</p>
          <p style={s.emptyText}>Add the founders and investors who hold shares in this company.</p>
          <a href={`/companies/${companyId}/stakeholders/new`} style={s.emptyLink}>Add first stakeholder →</a>
        </div>
      )}

      {stakeholders.length > 0 && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Nationality / CR</th>
                <th style={s.th}>Email</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map(st => (
                <tr key={st.id} style={s.row}>
                  <td style={s.td}>
                    <p style={s.name}>{st.name_en}</p>
                    {st.name_ar && <p style={s.nameAr}>{st.name_ar}</p>}
                  </td>
                  <td style={s.td}>
                    <span style={s.badge}>
                      {st.stakeholder_type === 'natural_person' ? 'Individual' : 'Entity'}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {st.nationality ?? st.cr_number ?? '—'}
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {st.email ?? '—'}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <a
                      href={`/companies/${companyId}/cap-table/issue`}
                      style={s.actionLink}
                    >
                      Issue shares
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '820px' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)' },
  cta: {
    background: 'var(--brand-purple)', color: '#fff', textDecoration: 'none',
    padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, flexShrink: 0,
  },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  error: { color: 'var(--neg)', fontSize: '13px' },
  empty: {
    padding: '64px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', textAlign: 'center',
  },
  emptyTitle: { fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' },
  emptyText: { fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '320px' },
  emptyLink: { color: 'var(--brand-purple)', fontSize: '13px', textDecoration: 'none', marginTop: '4px' },
  tableWrap: {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '10px 20px', textAlign: 'left' as const,
    fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border-default)',
  },
  row: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '14px 20px', fontSize: '13px', color: 'var(--text-primary)', verticalAlign: 'middle' as const },
  name: { fontWeight: 500 },
  nameAr: { fontSize: '12px', color: 'var(--text-secondary)', direction: 'rtl', marginTop: '2px' },
  badge: {
    display: 'inline-block',
    background: 'var(--bg-elevated)', color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)', fontSize: '10px',
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
    padding: '2px 7px', borderRadius: 'var(--radius-sm)',
  },
  actionLink: { color: 'var(--brand-purple)', fontSize: '12px', textDecoration: 'none', fontWeight: 500 },
};
