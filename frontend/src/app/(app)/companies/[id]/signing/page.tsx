'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, SigningRecordResponse } from '@/lib/api';

const DOC_TYPES = [
  { value: 'board_resolution', label: 'Board resolution' },
  { value: 'share_certificate', label: 'Share / quota certificate' },
  { value: 'grant_offer', label: 'ESOP grant offer' },
  { value: 'cap_table', label: 'Cap table' },
  { value: 'other', label: 'Other' },
];

const fieldLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

type SignerInput = { name: string; email: string };

function statusColor(s: SigningRecordResponse['status']): string {
  if (s === 'signed') return 'var(--pos)';
  if (s === 'declined' || s === 'voided') return 'var(--neg)';
  return 'var(--brand-purple)';
}

export default function SigningPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [records, setRecords] = useState<SigningRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState('board_resolution');
  const [docName, setDocName] = useState('');
  const [signers, setSigners] = useState<SignerInput[]>([{ name: '', email: '' }]);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.signing.list(companyId)
      .then(setRecords)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [companyId]);

  function updateSigner(i: number, patch: Partial<SignerInput>) {
    setSigners(s => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = signers.filter(s => s.name.trim() && s.email.trim());
    if (!docName.trim()) { setError('Document name is required.'); return; }
    if (cleaned.length === 0) { setError('Add at least one signer.'); return; }
    setSubmitting(true);
    try {
      await api.signing.send(companyId, {
        document_type: docType,
        document_name: docName.trim(),
        signers: cleaned,
      });
      setDocName('');
      setSigners([{ name: '', email: '' }]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkSigned(recordId: string) {
    setError(null);
    try {
      await api.signing.markSigned(companyId, recordId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  return (
    <div style={{ maxWidth: '820px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div><a href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>← Back to company</a></div>

      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>E-signatures</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Send documents for signature and track their status. The active provider is a vendor-neutral stub —
          records are audit-traceable but no email is delivered yet. A real e-sign provider plugs in without changing this screen.
        </p>
      </div>

      {/* Send form */}
      <div className="glass-panel" style={{ padding: '24px 26px' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={fieldLabel}>Document type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className="glass-input">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Document name *</label>
              <input value={docName} onChange={e => setDocName(e.target.value)} className="glass-input" placeholder="e.g. Series A board consent" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={fieldLabel}>Signers</span>
            {signers.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input value={s.name} onChange={e => updateSigner(i, { name: e.target.value })} className="glass-input" placeholder="Name" style={{ flex: 1 }} />
                <input value={s.email} onChange={e => updateSigner(i, { email: e.target.value })} className="glass-input" placeholder="email@example.com" type="email" style={{ flex: 1.4 }} />
                {signers.length > 1 && (
                  <button type="button" onClick={() => setSigners(arr => arr.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--neg)', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setSigners(arr => [...arr, { name: '', email: '' }])} style={{ background: 'transparent', border: 'none', color: 'var(--brand-purple)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0, alignSelf: 'flex-start' }}>+ Add signer</button>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--neg)', fontSize: '13px' }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={submitting} className="btn-primary" style={{ borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Sending…' : 'Send for signature'}
            </button>
          </div>
        </form>
      </div>

      {/* Records */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Signing records</h2>
        </div>
        {loading ? (
          <p style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading…</p>
        ) : records.length === 0 ? (
          <p style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No documents sent for signature yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Document</th>
              <th style={th}>Type</th>
              <th style={th}>Signers</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={td}>
                    {r.document_name}
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{r.envelope_id}</div>
                  </td>
                  <td style={td}>{r.document_type}</td>
                  <td style={td}>{r.signers.map(s => s.name).join(', ')}</td>
                  <td style={td}><span style={{ color: statusColor(r.status), fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>{r.status}</span></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {r.status === 'sent' && (
                      <button onClick={() => handleMarkSigned(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--brand-purple)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Mark signed</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' };
const td: React.CSSProperties = { padding: '11px 20px', fontSize: '13px', color: 'var(--text-primary)' };
