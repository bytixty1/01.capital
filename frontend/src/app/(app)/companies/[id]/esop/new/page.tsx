'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewEsopPlanPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [name, setName] = useState('');
  const [totalPool, setTotalPool] = useState('');
  const [shareClass, setShareClass] = useState('esop');
  const [authorizedDate, setAuthorizedDate] = useState('');
  const [planRules, setPlanRules] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const plan = await api.esop.createPlan(companyId, { name, total_pool: Number(totalPool), share_class: shareClass, authorized_date: authorizedDate || undefined, plan_rules: planRules || undefined });
      window.location.href = `/companies/${companyId}/esop/${plan.id}`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}/esop`} style={s.backLink}>← ESOP Plans</a></div>
      <h1 style={s.heading}>New ESOP plan</h1>
      <p style={s.sub}>Define the share pool and rules. Grants are issued against this plan.</p>
      <form onSubmit={handleSubmit} style={s.form}>
        <label style={s.label}>Plan name *<input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Employee Stock Option Plan 2026" style={s.input} /></label>
        <label style={s.label}>Total pool (shares) *<input type="number" value={totalPool} onChange={e => setTotalPool(e.target.value)} required min="1" step="1" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
        <label style={s.label}>Share class<input type="text" value={shareClass} onChange={e => setShareClass(e.target.value)} style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
        <label style={s.label}>Board authorization date<input type="date" value={authorizedDate} onChange={e => setAuthorizedDate(e.target.value)} style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
        <label style={s.label}>Plan rules / notes<textarea value={planRules} onChange={e => setPlanRules(e.target.value)} rows={4} placeholder="Cliff period, vesting schedule, exercise window…" style={{ ...s.input, resize: 'vertical' as const }} /></label>
        {error && <p style={s.error}>{error}</p>}
        <div style={s.actions}><a href={`/companies/${companyId}/esop`} style={s.cancel}>Cancel</a><button type="submit" disabled={loading} style={s.submit}>{loading ? 'Creating…' : 'Create plan'}</button></div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px' }, back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' },
  input: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', padding: '10px 12px', outline: 'none', width: '100%' },
  error: { color: 'var(--neg)', fontSize: '13px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' },
  cancel: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  submit: { background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' },
};
