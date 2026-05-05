'use client';

import { useState } from 'react';
import { api, EntityType } from '@/lib/api';

export default function NewCompanyPage() {
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('LLC');
  const [crNumber, setCrNumber] = useState('');
  const [paidUpCapital, setPaidUpCapital] = useState('');
  const [parValue, setParValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const company = await api.companies.create({
        name_en: nameEn,
        name_ar: nameAr || undefined,
        entity_type: entityType,
        cr_number: crNumber || undefined,
        paid_up_capital: paidUpCapital ? Number(paidUpCapital) : undefined,
        par_value_per_share: parValue ? Number(parValue) : undefined,
      });
      window.location.href = `/companies/${company.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.back}>
        <a href="/dashboard" style={styles.backLink}>← Back</a>
      </div>

      <h1 style={styles.heading}>New company</h1>
      <p style={styles.sub}>Enter your company details. All fields can be updated later.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Identity</legend>

          <label style={styles.label}>
            Company name (English) *
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Company name (Arabic)
            <input
              type="text"
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              dir="rtl"
              style={{ ...styles.input, textAlign: 'right' }}
            />
          </label>

          <label style={styles.label}>
            Entity type *
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value as EntityType)}
              required
              style={styles.input}
            >
              <option value="LLC">LLC — ذات مسؤولية محدودة</option>
              <option value="SJSC">SJSC — مساهمة مبسطة</option>
              <option value="JSC">JSC — مساهمة</option>
            </select>
          </label>

          <label style={styles.label}>
            Commercial Registration (CR) number
            <input
              type="text"
              value={crNumber}
              onChange={e => setCrNumber(e.target.value)}
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Capital</legend>

          <label style={styles.label}>
            Paid-up capital (SAR)
            <input
              type="number"
              value={paidUpCapital}
              onChange={e => setPaidUpCapital(e.target.value)}
              min="0"
              step="0.01"
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>

          <label style={styles.label}>
            Par value per share (SAR)
            <input
              type="number"
              value={parValue}
              onChange={e => setParValue(e.target.value)}
              min="0.0001"
              step="0.0001"
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>
        </fieldset>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <a href="/dashboard" style={styles.cancel}>Cancel</a>
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Creating…' : 'Create company'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '560px' },
  back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  fieldset: {
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  legend: {
    color: 'var(--text-secondary)',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '0 4px',
  },
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
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' },
  cancel: {
    color: 'var(--text-secondary)',
    fontSize: '13px',
    textDecoration: 'none',
  },
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
