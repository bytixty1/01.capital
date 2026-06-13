'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, CompanyResponse } from '@/lib/api';
import { SHARE_CLASS_SUGGESTIONS, defaultShareClass, isShareClassLocked, shareClassLabel } from '@/lib/share-class';
import { todayISO } from '@/lib/format';

const fieldLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
};

export default function ShareSplitPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();

  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [shareClass, setShareClass] = useState('ordinary');
  const [numerator, setNumerator] = useState('2');
  const [denominator, setDenominator] = useState('1');
  const [eventDate, setEventDate] = useState(todayISO);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.companies.get(companyId)
      .then(c => { setCompany(c); setShareClass(defaultShareClass(c.entity_type)); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'));
  }, [companyId]);

  const num = parseInt(numerator, 10) || 0;
  const den = parseInt(denominator, 10) || 1;
  const isForward = num > den;
  const splitLabel = num > 0 && den > 0 ? `${num}-for-${den} ${isForward ? 'split' : 'reverse split'}` : '—';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (num <= 0 || den <= 0) { setError('Ratio values must be positive integers'); return; }
    if (num === den) { setError('Split ratio must not be 1:1 — no change would occur'); return; }
    setError(null);
    setLoading(true);
    try {
      await api.capTable.split(companyId, {
        share_class: shareClass,
        split_ratio_numerator: num,
        split_ratio_denominator: den,
        event_date: eventDate,
        notes: notes || undefined,
      });
      router.push(`/companies/${companyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Link
        href={`/companies/${companyId}`}
        className="link-accent"
        style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to company
      </Link>

      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Share split
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Multiplies every holder's shares in the selected class by the split ratio. Use a ratio less than 1:1 for a reverse split. Fractional shares are rounded to whole shares per Saudi Companies Law.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Share class */}
          <div>
            <label style={fieldLabel}>{shareClassLabel(company?.entity_type)} *</label>
            <input
              type="text"
              value={shareClass}
              onChange={e => setShareClass(e.target.value)}
              required
              disabled={isShareClassLocked(company?.entity_type)}
              list="split-share-classes"
              className="glass-input"
              style={{ fontFamily: 'var(--font-mono)', opacity: isShareClassLocked(company?.entity_type) ? 0.6 : 1 }}
            />
            {company && (
              <datalist id="split-share-classes">
                {SHARE_CLASS_SUGGESTIONS[company.entity_type].map(c => <option key={c} value={c} />)}
              </datalist>
            )}
          </div>

          {/* Split ratio */}
          <div>
            <label style={fieldLabel}>Split ratio *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                value={numerator}
                onChange={e => setNumerator(e.target.value)}
                min="1"
                step="1"
                required
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)', width: '100px' }}
                placeholder="2"
              />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>for</span>
              <input
                type="number"
                value={denominator}
                onChange={e => setDenominator(e.target.value)}
                min="1"
                step="1"
                required
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)', width: '100px' }}
                placeholder="1"
              />
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Result: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{splitLabel}</span>
              {' — '}each share becomes <span style={{ fontFamily: 'var(--font-mono)' }}>{den > 0 ? (num / den).toFixed(4).replace(/\.?0+$/, '') : '?'}</span> shares
            </div>
          </div>

          {/* Event date */}
          <div>
            <label style={fieldLabel}>Effective date *</label>
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
            <label style={fieldLabel}>Notes <span style={{ color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="glass-input"
              style={{ resize: 'vertical' }}
              placeholder="Board resolution reference, rationale…"
            />
          </div>

          {/* Warning banner */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            This action modifies all holdings in the selected share class simultaneously and cannot be undone. The split event is recorded in the immutable audit log.
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
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center',
            paddingTop: '4px', borderTop: '1px solid var(--glass-border)',
          }}>
            <Link href={`/companies/${companyId}`} className="link-accent" style={{ fontSize: '13px' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Applying split...' : 'Apply split'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
