'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, EsopPlanResponse, GrantResponse } from '@/lib/api';

export default function EsopPlanPage() {
  const { id: companyId, planId } = useParams<{ id: string; planId: string }>();
  const [plan, setPlan] = useState<EsopPlanResponse | null>(null);
  const [grants, setGrants] = useState<GrantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.esop.getPlan(companyId, planId), api.esop.listGrants(companyId, planId)])
      .then(([p, g]) => { setPlan(p); setGrants(g); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, planId]);

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--neg)', fontSize: '13px' }}>{error}</p>;
  if (!plan) return null;

  const available = Number(plan.total_pool) - Number(plan.allocated);

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}/esop`} style={s.backLink}>← ESOP Plans</a></div>
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>{plan.name}</h1>
          <span style={{ ...s.badge, color: plan.status === 'active' ? 'var(--pos)' : 'var(--text-tertiary)' }}>{plan.status}</span>
        </div>
        {plan.status === 'active' && <a href={`/companies/${companyId}/esop/${planId}/grant`} style={s.cta}>+ Issue grant</a>}
      </div>

      <div style={s.statsRow}>
        {[
          { label: 'Total pool', value: Number(plan.total_pool).toLocaleString() },
          { label: 'Allocated', value: Number(plan.allocated).toLocaleString() },
          { label: 'Available', value: available.toLocaleString() },
          { label: 'Share class', value: plan.share_class },
        ].map(({ label, value }) => (
          <div key={label} style={s.stat}>
            <span style={s.statLabel}>{label}</span>
            <span style={s.statValue}>{value}</span>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}><h2 style={s.sectionTitle}>Grants ({grants.length})</h2></div>
        {grants.length === 0 ? (
          <p style={{ ...s.muted, padding: '24px 20px' }}>No grants issued yet.</p>
        ) : (
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Stakeholder</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Quantity</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Grant date</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Vesting</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Status</th>
            </tr></thead>
            <tbody>
              {grants.map(g => (
                <tr key={g.id} style={s.row}>
                  <td style={s.td}>{g.stakeholder_id}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>{Number(g.quantity).toLocaleString()}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>{g.grant_date}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>
                    {g.vesting_schedule.cliff_months}m cliff / {g.vesting_schedule.total_months}m total
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px' }, back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  badge: { fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  cta: { background: 'var(--brand-purple)', color: '#fff', textDecoration: 'none', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border-default)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '28px' },
  stat: { background: 'var(--bg-surface)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' },
  statLabel: { fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  statValue: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  section: { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  sectionHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border-default)' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '10px 20px', textAlign: 'left' as const, fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' },
  row: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '12px 20px', fontSize: '13px', color: 'var(--text-primary)' },
};
