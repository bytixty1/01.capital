'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function IssueSharesPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [stakeholderId, setStakeholderId] = useState('');
  const [shareClass, setShareClass] = useState('ordinary');
  const [quantity, setQuantity] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stakeholders
      .list(companyId)
      .then(s => {
        setStakeholders(s);
        if (s.length > 0) setStakeholderId(s[0].id);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholders'))
      .finally(() => setLoadingStakeholders(false));
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stakeholderId) return;
    setError(null);
    setLoading(true);
    try {
      await api.capTable.issue(companyId, {
        stakeholder_id: stakeholderId,
        share_class: shareClass,
        quantity: Number(quantity),
        event_date: eventDate,
        notes: notes || undefined,
      });
      window.location.href = `/companies/${companyId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue shares');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.back}>
        <a href={`/companies/${companyId}`} style={styles.backLink}>← Back to company</a>
      </div>

      <h1 style={styles.heading}>Issue shares</h1>
      <p style={styles.sub}>
        This creates an immutable share issuance event and updates the cap table.
        All events are drafted — review with legal counsel before treating as official.
      </p>

      {loadingStakeholders ? (
        <p style={styles.muted}>Loading stakeholders…</p>
      ) : stakeholders.length === 0 ? (
        <div style={styles.noStakeholders}>
          <p style={styles.muted}>No stakeholders yet.</p>
          <a href={`/companies/${companyId}/stakeholders/new`} style={styles.link}>
            Add a stakeholder first →
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Stakeholder *
            <select
              value={stakeholderId}
              onChange={e => setStakeholderId(e.target.value)}
              required
              style={styles.input}
            >
              {stakeholders.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name_en}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Share class *
            <input
              type="text"
              value={shareClass}
              onChange={e => setShareClass(e.target.value)}
              required
              placeholder="ordinary"
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>

          <label style={styles.label}>
            Number of shares *
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              min="1"
              step="1"
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>

          <label style={styles.label}>
            Event date *
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              required
              style={{ ...styles.input, fontFamily: 'var(--font-mono)' }}
            />
          </label>

          <label style={styles.label}>
            Notes
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Board resolution reference, context…"
              style={{ ...styles.input, resize: 'vertical' as const }}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <a href={`/companies/${companyId}`} style={styles.cancel}>Cancel</a>
            <button type="submit" disabled={loading} style={styles.submit}>
              {loading ? 'Issuing…' : 'Issue shares'}
            </button>
          </div>
        </form>
      )}
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
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  link: { color: 'var(--brand-purple)', fontSize: '13px', textDecoration: 'none' },
  noStakeholders: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '32px 0' },
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
