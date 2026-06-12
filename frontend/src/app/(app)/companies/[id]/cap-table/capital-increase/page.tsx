'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, StakeholderResponse, CompanyResponse } from '@/lib/api';
import { SHARE_CLASS_SUGGESTIONS, defaultShareClass, isShareClassLocked, shareClassLabel } from '@/lib/share-class';
import { todayISO } from '@/lib/format';

const MODE_OPTIONS = [
  { value: 'capital' as const, label: 'Capital only', sub: 'Update legal capital figures' },
  { value: 'shares' as const, label: 'Capital + issue shares', sub: 'Also issue new shares to a stakeholder' },
];

const fieldLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
};

export default function CapitalIncreasePage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();

  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [company, setCompany] = useState<CompanyResponse | null>(null);

  const [newAuthorizedCapital, setNewAuthorizedCapital] = useState('');
  const [newPaidUpCapital, setNewPaidUpCapital] = useState('');

  const [mode, setMode] = useState<'capital' | 'shares'>('capital');
  const [stakeholderId, setStakeholderId] = useState('');
  const [shareClass, setShareClass] = useState('ordinary');
  const [sharesIssued, setSharesIssued] = useState('');

  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEventDate(todayISO());
    api.companies.get(companyId)
      .then(c => {
        setCompany(c);
        setShareClass(defaultShareClass(c.entity_type));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'));
    api.stakeholders.list(companyId)
      .then(s => {
        setStakeholders(s);
        if (s[0]) setStakeholderId(s[0].id);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholders'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const issuingShares = mode === 'shares';
    const hasAuth = newAuthorizedCapital.trim() !== '';
    const hasPaid = newPaidUpCapital.trim() !== '';
    const hasShares = issuingShares && sharesIssued.trim() !== '' && Number(sharesIssued) > 0;

    if (!hasAuth && !hasPaid && !hasShares) {
      setError('Specify at least one capital change or issue shares.');
      return;
    }
    if (issuingShares) {
      if (!stakeholderId) { setError('Select a stakeholder.'); return; }
      if (!hasShares) { setError('Enter the number of shares to issue.'); return; }
    }

    setLoading(true);
    try {
      await api.capTable.capitalIncrease(companyId, {
        new_authorized_capital: hasAuth ? Number(newAuthorizedCapital) : undefined,
        new_paid_up_capital: hasPaid ? Number(newPaidUpCapital) : undefined,
        share_class: issuingShares ? shareClass : undefined,
        shares_issued: issuingShares ? Number(sharesIssued) : undefined,
        stakeholder_id: issuingShares ? stakeholderId : undefined,
        event_date: eventDate,
        notes: notes || undefined,
      });
      router.push(`/companies/${companyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record capital increase');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Link
        href={`/companies/${companyId}`}
        className="link-accent"
        style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to company
      </Link>

      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Capital increase
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Record an increase to the company&apos;s authorized or paid-up capital. Optionally issue new shares to a stakeholder in the same event.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Capital change — two optional figures side by side */}
          <div>
            <span style={fieldLabel}>Capital change</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  New authorized capital (SAR)
                </label>
                <input
                  type="number"
                  value={newAuthorizedCapital}
                  onChange={e => setNewAuthorizedCapital(e.target.value)}
                  min="0"
                  step="0.01"
                  className="glass-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="e.g. 500000"
                />
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-disabled)' }}>
                  Leave blank if unchanged.
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                  New paid-up capital (SAR)
                </label>
                <input
                  type="number"
                  value={newPaidUpCapital}
                  onChange={e => setNewPaidUpCapital(e.target.value)}
                  min="0"
                  step="0.01"
                  className="glass-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="e.g. 250000"
                />
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-disabled)' }}>
                  Leave blank if unchanged.
                </div>
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <span style={fieldLabel}>Issue shares?</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: mode === opt.value
                      ? '1px solid var(--brand-purple)'
                      : '1px solid var(--border-default)',
                    background: mode === opt.value
                      ? 'var(--brand-purple-subtle)'
                      : 'var(--bg-elevated)',
                    color: mode === opt.value ? 'var(--brand-purple-hover)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    boxShadow: mode === opt.value ? '0 0 0 1px var(--brand-purple)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '2px' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional share issuance section */}
          {mode === 'shares' && (
            loadingStakeholders ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading stakeholders…</p>
            ) : stakeholders.length === 0 ? (
              <div style={{
                padding: '14px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                color: 'var(--warn)',
                fontSize: '13px',
              }}>
                No stakeholders found. Add a stakeholder first to issue shares.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={fieldLabel}>Stakeholder *</label>
                  <select
                    value={stakeholderId}
                    onChange={e => setStakeholderId(e.target.value)}
                    required
                    className="glass-input"
                  >
                    {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={fieldLabel}>{shareClassLabel(company?.entity_type)} *</label>
                    <input
                      type="text"
                      value={shareClass}
                      onChange={e => setShareClass(e.target.value)}
                      required
                      disabled={isShareClassLocked(company?.entity_type)}
                      list="cap-share-classes"
                      className="glass-input"
                      style={{ fontFamily: 'var(--font-mono)', opacity: isShareClassLocked(company?.entity_type) ? 0.6 : 1 }}
                    />
                    {company && (
                      <datalist id="cap-share-classes">
                        {SHARE_CLASS_SUGGESTIONS[company.entity_type].map(c => <option key={c} value={c} />)}
                      </datalist>
                    )}
                  </div>
                  <div>
                    <label style={fieldLabel}>Shares to issue *</label>
                    <input
                      type="number"
                      value={sharesIssued}
                      onChange={e => setSharesIssued(e.target.value)}
                      required
                      min="1"
                      step="1"
                      className="glass-input"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      placeholder="1000"
                    />
                  </div>
                </div>
              </div>
            )
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Event date */}
          <div>
            <label style={fieldLabel}>Event date *</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              required
              className="glass-input"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={fieldLabel}>
              Notes <span style={{ color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="glass-input"
              style={{ resize: 'vertical' }}
              placeholder="Board resolution reference, funding round, etc."
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: 'var(--neg)',
              fontSize: '13px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingTop: '4px',
            borderTop: '1px solid var(--glass-border)',
          }}>
            <Link
              href={`/companies/${companyId}`}
              className="link-accent"
              style={{ fontSize: '13px' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Recording…' : 'Record capital increase'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
