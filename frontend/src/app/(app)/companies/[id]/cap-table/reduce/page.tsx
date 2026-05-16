'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
<<<<<<< HEAD
import { api, StakeholderResponse } from '@/lib/api';
=======
import { api, StakeholderResponse, CompanyResponse } from '@/lib/api';
import { SHARE_CLASS_SUGGESTIONS, defaultShareClass, isShareClassLocked, shareClassLabel } from '@/lib/share-class';
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)

export default function ReduceSharesPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStakeholder = searchParams.get('stakeholder');

  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
<<<<<<< HEAD
=======
  const [company, setCompany] = useState<CompanyResponse | null>(null);
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
  const [stakeholderId, setStakeholderId] = useState('');
  const [shareClass, setShareClass] = useState('ordinary');
  const [quantity, setQuantity] = useState('');
  const [newPaidUpCapital, setNewPaidUpCapital] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEventDate(new Date().toISOString().slice(0, 10));
<<<<<<< HEAD
=======
    api.companies.get(companyId)
      .then(c => { setCompany(c); setShareClass(defaultShareClass(c.entity_type)); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'));
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
    api.stakeholders.list(companyId)
      .then(s => {
        setStakeholders(s);
        if (preselectedStakeholder && s.find(st => st.id === preselectedStakeholder)) {
          setStakeholderId(preselectedStakeholder);
        } else if (s.length > 0) {
          setStakeholderId(s[0].id);
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholders'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId, preselectedStakeholder]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stakeholderId) return;
    setError(null);
    setLoading(true);
    try {
      await api.capTable.capitalDecrease(companyId, {
        stakeholder_id: stakeholderId,
        share_class: shareClass,
        quantity: Number(quantity),
        event_date: eventDate,
        notes: notes || undefined,
      });
      router.push(`/companies/${companyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reduce shares');
    } finally {
      setLoading(false);
    }
  }

  const selectedName = stakeholders.find(s => s.id === stakeholderId)?.name_en;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <Link href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to company
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Reduce shares
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          This records a share cancellation, buyback, or capital reduction.
        </p>
        {preselectedStakeholder && selectedName && (
          <p style={{ fontSize: '13px', color: 'var(--brand-purple)', marginTop: '8px', fontWeight: 500 }}>
            Reducing shares for: {selectedName}
          </p>
        )}
      </div>

      {loadingStakeholders ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholders...</p>
      ) : stakeholders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No stakeholders found.</p>
        </div>
      ) : (
        <div className="glass-panel">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Stakeholder *
              </label>
              <select value={stakeholderId} onChange={e => setStakeholderId(e.target.value)} required className="glass-input" style={{ width: '100%' }}>
                {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
<<<<<<< HEAD
                Share class *
              </label>
              <input type="text" value={shareClass} onChange={e => setShareClass(e.target.value)} required className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
=======
                {shareClassLabel(company?.entity_type)} *
              </label>
              <input
                type="text"
                value={shareClass}
                onChange={e => setShareClass(e.target.value)}
                required
                disabled={isShareClassLocked(company?.entity_type)}
                list="reduce-share-classes"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)', opacity: isShareClassLocked(company?.entity_type) ? 0.6 : 1 }}
              />
              {company && (
                <datalist id="reduce-share-classes">
                  {SHARE_CLASS_SUGGESTIONS[company.entity_type].map(c => <option key={c} value={c} />)}
                </datalist>
              )}
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Number of shares to reduce *
              </label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" step="1" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="1000" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                New total paid-up capital (optional)
              </label>
              <input type="number" value={newPaidUpCapital} onChange={e => setNewPaidUpCapital(e.target.value)} className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} placeholder="SAR 100,000" />
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Leave empty if only the share count changes, not the legal capital.</p>
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
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="glass-input" style={{ resize: 'vertical' }} placeholder="Buyback resolution, etc." />
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
              <button type="submit" disabled={loading} className="btn-primary" style={{
                border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Reducing...' : 'Reduce shares'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
