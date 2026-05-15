'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, StakeholderType } from '@/lib/api';

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

const TYPE_OPTIONS = [
  { value: 'natural_person' as StakeholderType, label: 'Natural person', sub: 'Individual' },
  { value: 'legal_entity' as StakeholderType, label: 'Legal entity', sub: 'Company / Fund' },
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

export default function NewStakeholderPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const router = useRouter();
  const [type, setType] = useState<StakeholderType>('natural_person');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nationality, setNationality] = useState('SAU');
  const [customNationality, setCustomNationality] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOtherNationality = nationality === 'OTHER';
  const effectiveNationality = isOtherNationality ? customNationality.toUpperCase() : nationality;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === 'natural_person' && isOtherNationality && customNationality.length !== 3) {
      setError('Nationality code must be exactly 3 letters (ISO 3166-1 alpha-3)');
      return;
    }

    setLoading(true);
    try {
      await api.stakeholders.create(companyId, {
        stakeholder_type: type,
        name_en: nameEn,
        name_ar: nameAr || undefined,
        nationality: type === 'natural_person' ? effectiveNationality || undefined : undefined,
        cr_number: type === 'legal_entity' ? crNumber || undefined : undefined,
        email: email || undefined,
      });
      router.push(`/companies/${companyId}/stakeholders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stakeholder');
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
          Add stakeholder
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          A stakeholder is a person or entity that holds (or will hold) shares in the company.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '28px 32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Type toggle */}
          <div>
            <span style={fieldLabel}>Stakeholder type</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: type === opt.value
                      ? '1px solid var(--brand-purple)'
                      : '1px solid var(--border-default)',
                    background: type === opt.value
                      ? 'var(--brand-purple-subtle)'
                      : 'var(--bg-elevated)',
                    color: type === opt.value ? 'var(--brand-purple-hover)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    boxShadow: type === opt.value ? '0 0 0 1px var(--brand-purple)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '2px' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Name fields — side by side */}
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
          {type === 'natural_person' && (
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
          {type === 'legal_entity' && (
            <div>
              <label style={fieldLabel}>CR number *</label>
              <input
                type="text"
                value={crNumber}
                onChange={e => setCrNumber(e.target.value)}
                required
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="1010XXXXXX"
              />
            </div>
          )}

          {/* Divider */}
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
            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-disabled)' }}>
              Used for portal access invitations — not required now.
            </div>
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
              href={`/companies/${companyId}/stakeholders`}
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
              {loading ? 'Adding...' : 'Add stakeholder'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
