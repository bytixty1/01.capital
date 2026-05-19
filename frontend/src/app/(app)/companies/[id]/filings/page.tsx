'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, FilingResponse } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--warn)',
  in_progress: 'var(--info)',
  submitted: 'var(--pos)',
  not_required: 'var(--text-tertiary)',
};

const FILING_LABELS: Record<string, string> = {
  moc_partner_register: 'MoC — Partner register update',
  moc_aoa_amendment: 'MoC — AoA amendment',
  moc_capital_change: 'MoC — Capital change',
  zatca_zakat_year: 'ZATCA — Zakat-year disclosure',
  cma_esop_disclosure: 'CMA — ESOP quarterly disclosure',
};

export default function FilingsPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [filings, setFilings] = useState<FilingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.filings.list(companyId).then(setFilings).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [companyId]);

  async function markStatus(id: string, newStatus: string) {
    setError(null);
    try {
      const updated = await api.filings.update(companyId, id, { status: newStatus, submitted_date: newStatus === 'submitted' ? new Date().toISOString().slice(0, 10) : undefined });
      setFilings(prev => prev.map(f => f.id === id ? updated : f));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update filing status');
    }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}`} style={s.backLink}>← Back</a></div>
      <h1 style={s.heading}>Filings tracker</h1>
      <p style={s.sub}>Compliance obligations triggered by cap table events. Review with your legal advisor before filing.</p>
      {loading && <p style={s.muted}>Loading…</p>}
      {error && <p style={s.error}>{error}</p>}
      {!loading && filings.length === 0 && <p style={s.muted}>No filings triggered yet. Issue shares or record capital changes to generate filing requirements.</p>}
      <div style={s.list}>
        {filings.map(f => (
          <div key={f.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={s.filingType}>{FILING_LABELS[f.filing_type] ?? f.filing_type}</span>
              <span style={{ ...s.statusBadge, color: STATUS_COLORS[f.status] ?? 'var(--text-tertiary)' }}>{f.status.replace('_', ' ')}</span>
            </div>
            {f.due_date && <p style={s.meta}>Due: <span style={s.mono}>{f.due_date}</span></p>}
            {f.submitted_date && <p style={s.meta}>Submitted: <span style={s.mono}>{f.submitted_date}</span></p>}
            {f.notes && <p style={s.notes}>{f.notes}</p>}
            <div style={s.actions}>
              {f.status === 'pending' && <button onClick={() => markStatus(f.id, 'in_progress')} style={s.actionBtn}>Mark in progress</button>}
              {f.status === 'in_progress' && <button onClick={() => markStatus(f.id, 'submitted')} style={s.actionBtn}>Mark submitted</button>}
              {f.status === 'pending' && <button onClick={() => markStatus(f.id, 'not_required')} style={{ ...s.actionBtn, color: 'var(--text-tertiary)' }}>Not required</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px' }, back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  heading: { fontSize: '28px', fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' }, error: { color: 'var(--neg)', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  filingType: { fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' },
  statusBadge: { fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  meta: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' },
  mono: { fontFamily: 'var(--font-mono)' },
  notes: { fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' },
  actions: { display: 'flex', gap: '12px', marginTop: '14px' },
  actionBtn: { background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '12px', padding: '6px 12px', cursor: 'pointer' },
};
