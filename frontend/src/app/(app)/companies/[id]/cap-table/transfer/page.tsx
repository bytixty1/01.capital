'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, StakeholderResponse, CompanyResponse } from '@/lib/api';
import { SHARE_CLASS_SUGGESTIONS, defaultShareClass, isShareClassLocked, shareClassLabel } from '@/lib/share-class';
import { todayISO } from '@/lib/format';

export default function TransferSharesPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFrom = searchParams.get('from');

  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [shareClass, setShareClass] = useState('ordinary');
  const [quantity, setQuantity] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [eventDate, setEventDate] = useState(todayISO);
  const [notes, setNotes] = useState('');
  const [rofrWaived, setRofrWaived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.companies.get(companyId)
      .then(c => { setCompany(c); setShareClass(defaultShareClass(c.entity_type)); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'));
    api.stakeholders.list(companyId)
      .then(s => { 
        setStakeholders(s);
        const first = s[0];
        if (first) {
          // Pre-select from query param or default to first
          if (preselectedFrom && s.find(st => st.id === preselectedFrom)) {
            setFromId(preselectedFrom);
            // Set "to" to the first stakeholder that isn't the "from"
            const other = s.find(st => st.id !== preselectedFrom);
            setToId(other ? other.id : first.id);
          } else {
            setFromId(first.id);
            const second = s[1];
            setToId(second ? second.id : first.id);
          }
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholders'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId, preselectedFrom]);

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
        price_per_share: pricePerShare ? Number(pricePerShare) : undefined,
        event_date: eventDate,
        notes: notes || undefined,
        rofr_waived: rofrWaived,
      });
      router.push(`/companies/${companyId}`);
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Transfer failed'); 
    } finally { 
      setLoading(false); 
    }
  }

  const fromName = stakeholders.find(s => s.id === fromId)?.name_en;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <Link href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to company
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Transfer shares
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Creates an immutable transfer event and updates both holders' positions.
        </p>
        {preselectedFrom && fromName && (
          <p style={{ fontSize: '13px', color: 'var(--brand-purple)', marginTop: '8px', fontWeight: 500 }}>
            Transferring from: {fromName}
          </p>
        )}
      </div>

      {loadingStakeholders ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholders...</p>
      ) : stakeholders.length < 2 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>You need at least two stakeholders to transfer shares.</p>
          <Link href={`/companies/${companyId}/stakeholders/new`} className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
            Add another stakeholder →
          </Link>
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
                {shareClassLabel(company?.entity_type)} *
              </label>
              <input
                type="text"
                value={shareClass}
                onChange={e => setShareClass(e.target.value)}
                required
                disabled={isShareClassLocked(company?.entity_type)}
                list="transfer-share-classes"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)', opacity: isShareClassLocked(company?.entity_type) ? 0.6 : 1 }}
              />
              {company && (
                <datalist id="transfer-share-classes">
                  {SHARE_CLASS_SUGGESTIONS[company.entity_type].map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Number of shares *
                </label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" step="1" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Price per share (SAR) <span style={{ opacity: 0.5, fontWeight: 400 }}>optional</span>
                </label>
                <input
                  type="number"
                  value={pricePerShare}
                  onChange={e => setPricePerShare(e.target.value)}
                  min="0"
                  step="0.01"
                  className="glass-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="For audit trail"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Event date *
              </label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* ROFR waiver — shown for all companies; relevant for LLCs with ROFR */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rofrWaived}
                onChange={e => setRofrWaived(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--brand-purple)', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I confirm that the pre-emption (ROFR) period has elapsed or been waived in writing by all other quota holders, as required by the AoA and Art. 170 of the Saudi Companies Law.
              </span>
            </label>

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
              <Link href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
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
