'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, StakeholderDetailResponse } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { thData, tdData } from '@/lib/table-styles';

export default function StakeholderDetailPage() {
  const { id: companyId, stakeholderId } = useParams<{ id: string; stakeholderId: string }>();
  const router = useRouter();
  const [stakeholder, setStakeholder] = useState<StakeholderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExportCertificate() {
    setExporting(true);
    setError(null);
    try {
      await api.documents.certificatePdf(companyId, stakeholderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Certificate export failed');
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    api.stakeholders.get(companyId, stakeholderId)
      .then(setStakeholder)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load stakeholder'))
      .finally(() => setLoading(false));
  }, [companyId, stakeholderId]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.stakeholders.delete(companyId, stakeholderId);
      router.push(`/companies/${companyId}/stakeholders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholder...</p>;
  if (error) return <p style={{ color: 'var(--neg)', fontSize: '14px' }}>{error}</p>;
  if (!stakeholder) return null;

  const totalShares = stakeholder.holdings.reduce((sum, h) => sum + Number(h.quantity), 0);
  const isEntity = stakeholder.stakeholder_type === 'legal_entity';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <Link href={`/companies/${companyId}/stakeholders`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to Stakeholders
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{
            display: 'inline-block', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {isEntity ? 'Legal Entity' : 'Individual'}
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {stakeholder.name_en}
          </h1>
          {stakeholder.name_ar && (
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', direction: 'rtl' }}>{stakeholder.name_ar}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 16px', fontSize: '13px',
              color: '#ef4444', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Remove
          </button>
          {totalShares > 0 && (
            <button
              onClick={handleExportCertificate}
              disabled={exporting}
              style={{
                background: 'transparent', border: '1px solid var(--border-default)',
                borderRadius: '8px', padding: '10px 16px', fontSize: '13px',
                color: 'var(--text-secondary)', cursor: exporting ? 'wait' : 'pointer', fontWeight: 500,
              }}
            >
              {exporting ? 'Exporting…' : 'Certificate PDF'}
            </button>
          )}
          <Link
            href={`/companies/${companyId}/stakeholders/${stakeholderId}/edit`}
            style={{
              background: 'transparent', border: '1px solid var(--border-default)',
              borderRadius: '8px', padding: '10px 16px', fontSize: '13px',
              color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}
          >
            Edit
          </Link>
          <Link
            href={`/companies/${companyId}/cap-table/issue?stakeholder=${stakeholderId}`}
            className="btn-primary"
            style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}
          >
            Issue shares
          </Link>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="glass-panel" style={{
          padding: '20px', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
              Remove {stakeholder.name_en}?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              This will also delete all their holdings. This cannot be undone.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{
              background: 'transparent', border: '1px solid var(--border-default)',
              borderRadius: '8px', padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              background: '#ef4444', border: 'none', borderRadius: '8px',
              padding: '8px 16px', fontSize: '13px', color: '#fff', fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
            }}>{deleting ? 'Removing...' : 'Confirm remove'}</button>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'rgba(255, 255, 255, 0.1)' }}>
        <div style={{ background: 'var(--glass-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Total shares</span>
          <span style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {totalShares > 0 ? formatNumber(totalShares) : '—'}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            {isEntity ? 'CR Number' : 'Nationality'}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {isEntity ? (stakeholder.cr_number ?? '—') : (stakeholder.nationality ?? '—')}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Email</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {stakeholder.email ?? '—'}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Added</span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {new Date(stakeholder.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Holdings</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link href={`/companies/${companyId}/cap-table/transfer?from=${stakeholderId}`}
              style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Transfer
            </Link>
            <Link href={`/companies/${companyId}/cap-table/reduce?stakeholder=${stakeholderId}`}
              style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Reduce
            </Link>
            <Link href={`/companies/${companyId}/cap-table/issue?stakeholder=${stakeholderId}`}
              className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue more
            </Link>
          </div>
        </div>

        {stakeholder.holdings.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>No shares held yet.</p>
            <Link href={`/companies/${companyId}/cap-table/issue?stakeholder=${stakeholderId}`}
              className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue first shares →
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thData}>Share class</th>
                <th style={{ ...thData, textAlign: 'right' }}>Shares held</th>
              </tr>
            </thead>
            <tbody>
              {stakeholder.holdings.map(h => (
                <tr key={h.share_class} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={tdData}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{h.share_class}</span>
                  </td>
                  <td style={{ ...tdData, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600 }}>
                    {formatNumber(h.quantity)}
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

