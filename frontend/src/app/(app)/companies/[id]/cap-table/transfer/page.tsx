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
      .then(s => { 
        setStakeholders(s); 
        if (s.length > 0) { 
          setFromId(s[0].id); 
          setToId(s.length > 1 ? s[1].id : s[0].id); 
        } 
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholders'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fromId === toId) { setError('From and To stakeholders must be different'); return; }
    setError(null); setLoading(true);
    try {
      await api.capTable.transfer(companyId, { 
        from_stakeholder_id: fromId, 
        to_stakeholder_id: toId, 
        share_class: shareClass, 
        quantity: Number(quantity), 
        event_date: eventDate, 
        notes: notes || undefined 
      });
      window.location.href = `/companies/${companyId}`;
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Transfer failed'); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <a href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to company
        </a>
      </div>

      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Transfer shares
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Creates an immutable transfer event and updates both holders' positions.
        </p>
      </div>

      {loadingStakeholders ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholders...</p>
      ) : stakeholders.length < 2 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You need at least two stakeholders to transfer shares.</p>
          <a href={`/companies/${companyId}/stakeholders/new`} style={{ color: 'var(--brand-purple)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
            Add another stakeholder →
          </a>
        </div>
      ) : (
        <div className="glass-panel">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  From stakeholder *
                </label>
                <select value={fromId} onChange={e => setFromId(e.target.value)} required className="glass-input" style={{ width: '100%' }}>
                  {stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  To stakeholder *
                </label>
                <select value={toId} onChange={e => setToId(e.target.value)} required className="glass-input" style={{ width: '100%' }}>
                  {stakeholders.map(st => <option key={st.id} value={st.id}>{st.name_en}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Share class *
              </label>
              <input type="text" value={shareClass} onChange={e => setShareClass(e.target.value)} required className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Number of shares *
              </label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" step="1" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Event date *
              </label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Notes (optional)
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="glass-input" style={{ resize: 'vertical' }} />
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'var(--neg)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
              <a href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
                Cancel
              </a>
              <button 
                type="submit" 
                disabled={loading} 
                style={{
                  background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease', boxShadow: '0 0 20px -5px rgba(139, 92, 246, 0.4)'
                }}
              >
                {loading ? 'Transferring...' : 'Transfer shares'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

