'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const NATIONALITIES = [
  { code: 'SAU', label: 'Saudi Arabia' },
  { code: 'ARE', label: 'United Arab Emirates' },
  { code: 'BHR', label: 'Bahrain' },
  { code: 'KWT', label: 'Kuwait' },
  { code: 'OMN', label: 'Oman' },
  { code: 'QAT', label: 'Qatar' },
  { code: 'EGY', label: 'Egypt' },
  { code: 'JOR', label: 'Jordan' },
  { code: 'LBN', label: 'Lebanon' },
  { code: 'USA', label: 'United States' },
  { code: 'GBR', label: 'United Kingdom' },
  { code: 'IND', label: 'India' },
  { code: 'PAK', label: 'Pakistan' },
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

export default function EditStakeholderPage() {
  const { id: companyId, stakeholderId } = useParams<{ id: string; stakeholderId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEntity, setIsEntity] = useState(false);

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nationality, setNationality] = useState('SAU');
  const [customNationality, setCustomNationality] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    api.stakeholders.get(companyId, stakeholderId)
      .then(s => {
        setIsEntity(s.stakeholder_type === 'legal_entity');
        setNameEn(s.name_en);
        setNameAr(s.name_ar ?? '');
        setEmail(s.email ?? '');
        setCrNumber(s.cr_number ?? '');

        const knownCode = NATIONALITIES.find(n => n.code === s.nationality);
        if (s.nationality && !knownCode) {
          setNationality('OTHER');
          setCustomNationality(s.nationality);
        } else {
          setNationality(s.nationality ?? 'SAU');
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholder'))
      .finally(() => setLoading(false));
  }, [companyId, stakeholderId]);

  const isOtherNationality = nationality === 'OTHER';
  const effectiveNationality = isOtherNationality ? customNationality.toUpperCase() : nationality;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEntity && isOtherNationality && customNationality.length !== 3) {
      setError('Nationality code must be exactly 3 letters (ISO 3166-1 alpha-3)');
      return;
    }

    setSaving(true);
    try {
      await api.stakeholders.update(companyId, stakeholderId, {
        name_en: nameEn,
        name_ar: nameAr || undefined,
        nationality: !isEntity ? effectiveNationality || undefined : undefined,
        cr_number: isEntity ? crNumber || undefined : undefined,
        email: email || undefined,
        national_id: !isEntity && nationalId ? nationalId : undefined,
        iban: !isEntity && iban ? iban : undefined,
      });
      router.push(`/companies/${companyId}/stakeholders/${stakeholderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholder...</p>;

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <Link
        href={`/companies/${companyId}/stakeholders/${stakeholderId}`}
        className="link-accent"
        style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to stakeholder
      </Link>

      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Edit stakeholder
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          {isEntity ? 'Update details for this legal entity.' : 'Update details for this individual. National ID and IBAN are encrypted at rest and never shown after saving.'}
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Name fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabel}>Full name (English) *</label>
              <input
                type="text"
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                required
                className="glass-input"
                placeholder="e.g. Mohammed Al-Rashidi"
              />
            </div>
            <div>
              <label style={fieldLabel}>Full name (Arabic)</label>
              <input
                type="text"
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                dir="rtl"
                className="glass-input"
                style={{ textAlign: 'right', fontFamily: 'var(--font-ar)' }}
                placeholder="مثال: محمد الراشدي"
              />
            </div>
          </div>

          {/* Nationality (natural person) */}
          {!isEntity && (
            <div>
              <label style={fieldLabel}>Nationality *</label>
              <select
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                className="glass-input"
              >
                {NATIONALITIES.map(n => (
                  <option key={n.code} value={n.code}>{n.label} ({n.code})</option>
                ))}
                <option value="OTHER">Other...</option>
              </select>
              {isOtherNationality && (
                <input
                  type="text"
                  value={customNationality}
                  onChange={e => setCustomNationality(e.target.value.toUpperCase())}
                  maxLength={3}
                  required
                  className="glass-input"
                  style={{ fontFamily: 'var(--font-mono)', marginTop: '8px' }}
                  placeholder="ISO 3-letter code (e.g. DEU)"
                />
              )}
            </div>
          )}

          {/* CR number (legal entity) */}
          {isEntity && (
            <div>
              <label style={fieldLabel}>CR number</label>
              <input
                type="text"
                value={crNumber}
                onChange={e => setCrNumber(e.target.value)}
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="1010XXXXXX"
              />
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

          {/* Email */}
          <div>
            <label style={fieldLabel}>Email <span style={{ color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="glass-input"
              placeholder="stakeholder@example.com"
            />
          </div>

          {/* PII fields — natural person only */}
          {!isEntity && (
            <>
              <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
              <div style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-disabled)',
                lineHeight: 1.6,
              }}>
                National ID and IBAN are encrypted with AES-256 before storage and are never returned by the API. Leave blank to keep existing values.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={fieldLabel}>National ID <span style={{ color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    className="glass-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    placeholder="Leave blank to keep existing"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label style={fieldLabel}>IBAN <span style={{ color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    type="text"
                    value={iban}
                    onChange={e => setIban(e.target.value)}
                    className="glass-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    placeholder="SA… — leave blank to keep existing"
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          )}

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
              href={`/companies/${companyId}/stakeholders/${stakeholderId}`}
              className="link-accent"
              style={{ fontSize: '13px' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
