'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderResponse } from '@/lib/api';

export default function StakeholdersPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stakeholders
      .list(companyId)
      .then(setStakeholders)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ marginBottom: '8px' }}>
        <a href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to Company
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Stakeholders
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Individuals and entities that hold or will hold shares in this company.
          </p>
        </div>
        <a href={`/companies/${companyId}/stakeholders/new`} style={{ 
          background: 'var(--brand-purple)', color: '#fff', textDecoration: 'none', 
          padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, 
          boxShadow: '0 0 20px -5px rgba(139, 92, 246, 0.4)', transition: 'all 0.2s ease'
        }}>
          + Add stakeholder
        </a>
      </div>

      {loading && <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading stakeholders...</p>}
      {error && <p style={{ color: 'var(--neg)', fontSize: '14px' }}>{error}</p>}

      {!loading && !error && stakeholders.length === 0 && (
        <div className="glass-panel" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>No stakeholders yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '320px', margin: '0 auto' }}>Add the founders and investors who hold shares in this company.</p>
          </div>
          <a href={`/companies/${companyId}/stakeholders/new`} style={{ color: 'var(--brand-purple)', fontSize: '14px', textDecoration: 'none', fontWeight: 500, marginTop: '8px' }}>
            Add first stakeholder →
          </a>
        </div>
      )}

      {stakeholders.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Nationality / CR</th>
                <th style={thStyle}>Email</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map(st => (
                <tr key={st.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={tdStyle}>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{st.name_en}</p>
                    {st.name_ar && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', direction: 'rtl', marginTop: '2px' }}>{st.name_ar}</p>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      display: 'inline-block', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', 
                      fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', 
                      padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {st.stakeholder_type === 'natural_person' ? 'Individual' : 'Entity'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>
                    {st.nationality ?? st.cr_number ?? '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {st.email ?? '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <a
                      href={`/companies/${companyId}/cap-table/issue`}
                      style={{ color: 'var(--brand-purple)', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      Issue shares
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid var(--glass-border)',
  background: 'rgba(255,255,255,0.02)',
};

const tdStyle: React.CSSProperties = {
  padding: '16px 24px',
  fontSize: '14px',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

