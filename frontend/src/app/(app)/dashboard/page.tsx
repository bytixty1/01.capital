'use client';

import { useEffect, useState } from 'react';
import { api, CompanyResponse } from '@/lib/api';

export default function DashboardPage() {
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.companies
      .list()
      .then(setCompanies)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Companies</h1>
          <p style={styles.sub}>Your cap tables</p>
        </div>
        <a href="/companies/new" style={styles.cta}>
          + New company
        </a>
      </div>

      {loading && <p style={styles.muted}>Loading…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && companies.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No companies yet.</p>
          <a href="/companies/new" style={styles.emptyLink}>
            Create your first company →
          </a>
        </div>
      )}

      <div style={styles.grid}>
        {companies.map(c => (
          <a key={c.id} href={`/companies/${c.id}`} style={styles.card}>
            <span style={styles.cardBadge}>{c.entity_type}</span>
            <h2 style={styles.cardName}>{c.name_en}</h2>
            {c.name_ar && <p style={styles.cardNameAr}>{c.name_ar}</p>}
            <p style={styles.cardMeta}>
              {c.paid_up_capital ? `SAR ${Number(c.paid_up_capital).toLocaleString('en-SA')}` : 'Capital not set'}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px' },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)' },
  cta: {
    background: 'var(--brand-purple)',
    color: '#fff',
    textDecoration: 'none',
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 500,
  },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  error: { color: 'var(--neg)', fontSize: '13px' },
  empty: {
    padding: '48px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: { color: 'var(--text-tertiary)', fontSize: '14px' },
  emptyLink: { color: 'var(--brand-purple)', fontSize: '14px', textDecoration: 'none' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    textDecoration: 'none',
    display: 'block',
  },
  cardBadge: {
    display: 'inline-block',
    background: 'var(--bg-elevated)',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '10px',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  cardNameAr: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    direction: 'rtl' as const,
  },
  cardMeta: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    marginTop: '8px',
  },
};
