'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function TransferSharesPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [shareClass, setShareClass] = useState('ordinary');
  const [quantity, setQuantity] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEventDate(new Date().toISOString().slice(0, 10));
    api.stakeholders.list(companyId)
      .then(s => { setStakeholders(s); if (s.length > 0) { setFromId(s[0].id); setToId(s.length > 1 ? s[1].id : s[0].id); } })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fromId === toId) { setError('From and To stakeholders must be different'); return; }
    setError(null); setLoading(true);
    try {
      await api.capTable.transfer(companyId, { from_stakeholder_id: fromId, to_stakeholder_id: toId, share_class: shareClass, quantity: Number(quantity), event_date: eventDate, notes: notes || undefined });
      window.location.href = `/companies/${companyId}`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Transfer failed'); }
    finally { setLoading(false); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}`} style={s.backLink}>← Back</a></div>
      <h1 style={s.heading}>Transfer shares</h1>
      <p style={s.sub}>Creates an immutable transfer event and updates both holders' positions.</p>
      {loadingStakeholders ? <p style={s.muted}>Loading…</p> : (
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>From stakeholder *<select value={fromId} onChange={e => setFromId(e.target.value)} required style={s.input}>{stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}</select></label>
          <label style={s.label}>To stakeholder *<select value={toId} onChange={e => setToId(e.target.value)} required style={s.input}>{stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}</select></label>
          <label style={s.label}>Share class *<input type="text" value={shareClass} onChange={e => setShareClass(e.target.value)} required style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Number of shares *<input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" step="1" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Event date *<input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...s.input, resize: 'vertical' as const }} /></label>
          {error && <p style={s.error}>{error}</p>}
          <div style={s.actions}><a href={`/companies/${companyId}`} style={s.cancel}>Cancel</a><button type="submit" disabled={loading} style={s.submit}>{loading ? 'Transferring…' : 'Transfer shares'}</button></div>
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
