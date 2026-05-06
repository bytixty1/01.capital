'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function IssueGrantPage() {
  const { id: companyId, planId } = useParams<{ id: string; planId: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [stakeholderId, setStakeholderId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [grantDate, setGrantDate] = useState('');
  const [cliffMonths, setCliffMonths] = useState('12');
  const [totalMonths, setTotalMonths] = useState('48');
  const [exercisePrice, setExercisePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSH, setLoadingSH] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGrantDate(new Date().toISOString().slice(0, 10));
    api.stakeholders.list(companyId).then(s => { setStakeholders(s); if (s.length > 0) setStakeholderId(s[0].id); }).catch(e => setError(e.message)).finally(() => setLoadingSH(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      await api.esop.createGrant(companyId, planId, { stakeholder_id: stakeholderId, quantity: Number(quantity), grant_date: grantDate, cliff_months: Number(cliffMonths), total_months: Number(totalMonths), exercise_price: exercisePrice ? Number(exercisePrice) : undefined, notes: notes || undefined });
      window.location.href = `/companies/${companyId}/esop/${planId}`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}/esop/${planId}`} style={s.backLink}>← Plan</a></div>
      <h1 style={s.heading}>Issue grant</h1>
      <p style={s.sub}>Issue an equity grant from this ESOP plan to a stakeholder.</p>
      {loadingSH ? <p style={s.muted}>Loading…</p> : (
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Stakeholder *<select value={stakeholderId} onChange={e => setStakeholderId(e.target.value)} required style={s.input}>{stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}</select></label>
          <label style={s.label}>Number of shares *<input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" step="1" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Grant date *<input type="date" value={grantDate} onChange={e => setGrantDate(e.target.value)} required style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ ...s.label, flex: 1 }}>Cliff (months)<input type="number" value={cliffMonths} onChange={e => setCliffMonths(e.target.value)} min="0" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
            <label style={{ ...s.label, flex: 1 }}>Total vesting (months)<input type="number" value={totalMonths} onChange={e => setTotalMonths(e.target.value)} min="1" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          </div>
          <label style={s.label}>Exercise price per share (SAR)<input type="number" value={exercisePrice} onChange={e => setExercisePrice(e.target.value)} min="0" step="0.0001" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...s.input, resize: 'vertical' as const }} /></label>
          {error && <p style={s.error}>{error}</p>}
          <div style={s.actions}><a href={`/companies/${companyId}/esop/${planId}`} style={s.cancel}>Cancel</a><button type="submit" disabled={loading} style={s.submit}>{loading ? 'Issuing…' : 'Issue grant'}</button></div>
        </form>
      )}
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
  error: { color: 'var(--neg)', fontSize: '13px' }, muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' },
  cancel: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  submit: { background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' },
};
