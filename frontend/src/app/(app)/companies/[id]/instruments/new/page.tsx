'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function NewInstrumentPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [stakeholderId, setStakeholderId] = useState('');
  const [instrumentType, setInstrumentType] = useState('sukuk_convertible');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSH, setLoadingSH] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIssueDate(new Date().toISOString().slice(0, 10));
    api.stakeholders.list(companyId).then(s => { setStakeholders(s); if (s.length > 0) setStakeholderId(s[0].id); }).catch(e => setError(e.message)).finally(() => setLoadingSH(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      await api.instruments.create(companyId, { stakeholder_id: stakeholderId, instrument_type: instrumentType as 'sukuk_convertible' | 'phantom' | 'warrant', name, quantity: Number(quantity), face_value: faceValue ? Number(faceValue) : undefined, issue_date: issueDate, maturity_date: maturityDate || undefined, notes: notes || undefined });
      window.location.href = `/companies/${companyId}/instruments`;
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}/instruments`} style={s.backLink}>← Instruments</a></div>
      <h1 style={s.heading}>New instrument</h1>
      <p style={s.sub}>Record a sukuk-convertible, phantom share award, or warrant.</p>
      {loadingSH ? <p style={s.muted}>Loading…</p> : (
        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Type *<select value={instrumentType} onChange={e => setInstrumentType(e.target.value)} style={s.input}><option value="sukuk_convertible">Sukuk Convertible</option><option value="phantom">Phantom Shares</option><option value="warrant">Warrant</option></select></label>
          <label style={s.label}>Holder (stakeholder) *<select value={stakeholderId} onChange={e => setStakeholderId(e.target.value)} required style={s.input}>{stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}</select></label>
          <label style={s.label}>Name / description *<input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Series A Convertible Sukuk" style={s.input} /></label>
          <label style={s.label}>Quantity / notional units *<input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="0.0001" step="0.0001" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Face value (SAR)<input type="number" value={faceValue} onChange={e => setFaceValue(e.target.value)} min="0" step="0.01" style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Issue date *<input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Maturity date<input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} style={{ ...s.input, fontFamily: 'var(--font-mono)' }} /></label>
          <label style={s.label}>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...s.input, resize: 'vertical' as const }} /></label>
          {error && <p style={s.error}>{error}</p>}
          <div style={s.actions}><a href={`/companies/${companyId}/instruments`} style={s.cancel}>Cancel</a><button type="submit" disabled={loading} className="btn-primary" style={s.submit}>{loading ? 'Saving…' : 'Save instrument'}</button></div>
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
  submit: { border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' },
};
