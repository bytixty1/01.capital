'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderType } from '@/lib/api';

export default function NewStakeholderPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [type, setType] = useState<StakeholderType>('natural_person');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nationality, setNationality] = useState('SAU');
  const [crNumber, setCrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.stakeholders.create(companyId, {
        stakeholder_type: type,
        name_en: nameEn,
        name_ar: nameAr || undefined,
        nationality: type === 'natural_person' ? nationality || undefined : undefined,
        cr_number: type === 'legal_entity' ? crNumber || undefined : undefined,
        email: email || undefined,
      });
      window.location.href = `/companies/${companyId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stakeholder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.back}>
        <a href={`/companies/${companyId}`} style={styles.backLink}>← Back to company</a>
      </div>

      <h1 style={styles.heading}>Add stakeholder</h1>
      <p style={styles.sub}>A stakeholder is a person or entity that holds (or will hold) shares.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Stakeholder type
          <select
            value={type}
            onChange={e => setType(e.target.value as StakeholderType)}
            style={styles.input}
          >
            <option value="natural_person">Natural person (individual)</option>
            <option value="legal_entity">Legal entity (company / fund)</option>
          </select>
        </label>

        <label style={styles.label}>
          Full name (English) *
          <input
            type="text"
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Full name (Arabic)
          <input
            type="text"
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
            dir="rtl"
            style={{ ...styles.input, textAlign: 'right' }}
          />
        </label>

        {type === 'natural_person' && (
          <label style={styles.label}>
            Nationality (ISO 3-letter code)
            <input
              type="text"
              value={nationality}
              onChange={e => setNationality(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="SAU"
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>
        )}

        {type === 'legal_entity' && (
          <label style={styles.label}>
            CR number
            <input
              type="text"
              value={crNumber}
              onChange={e => setCrNumber(e.target.value)}
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>
        )}

        <label style={styles.label}>
          Email (optional)
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
          />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <a href={`/companies/${companyId}`} style={styles.cancel}>Cancel</a>
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Adding…' : 'Add stakeholder'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '480px' },
  back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    padding: '10px 12px',
    outline: 'none',
    width: '100%',
  },
  error: { color: 'var(--neg)', fontSize: '13px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '8px' },
  cancel: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  submit: {
    background: 'var(--brand-purple)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
