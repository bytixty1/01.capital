'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CapTableResponse, CompanyResponse } from '@/lib/api';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [capTable, setCapTable] = useState<CapTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.companies.get(id), api.capTable.get(id)])
      .then(([c, ct]) => {
        setCompany(c);
        setCapTable(ct);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading company data...</p>;
  if (error) return <p style={{ color: 'var(--neg)', fontSize: '14px' }}>{error}</p>;
  if (!company || !capTable) return null;

  const totalShares = Number(capTable.total_shares);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Section */}
      <div>
        <div style={{ marginBottom: '24px' }}>
          <a href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
            ← Back to Dashboard
          </a>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ 
              display: 'inline-block', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', 
              fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', 
              padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {company.entity_type}
            </span>
            <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              {company.name_en}
            </h1>
            {company.name_ar && <p style={{ fontSize: '16px', color: 'var(--text-secondary)', direction: 'rtl' }}>{company.name_ar}</p>}
          </div>
          <a href={`/companies/${id}/stakeholders/new`} style={{
            background: 'var(--brand-purple)', color: '#fff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            boxShadow: '0 0 20px -5px rgba(139, 92, 246, 0.4)', transition: 'all 0.2s ease'
          }}>
            + Add stakeholder
          </a>
        </div>
      </div>

      {/* Navigation Pills */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'Cap table', href: `#cap-table`, active: true },
          { label: 'ESOP', href: `/companies/${id}/esop`, active: false },
          { label: 'Instruments', href: `/companies/${id}/instruments`, active: false },
          { label: 'Filings', href: `/companies/${id}/filings`, active: false },
          { label: 'Members', href: `/companies/${id}/members`, active: false },
        ].map(({ label, href, active }) => (
          <a key={label} href={href} style={{ 
            padding: '8px 16px', background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent', 
            border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`, 
            borderRadius: '24px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)', 
            fontSize: '13px', fontWeight: active ? 500 : 400, textDecoration: 'none', transition: 'all 0.2s ease'
          }}>
            {label}
          </a>
        ))}
      </div>

      {/* Capital Summary Stats */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: 'rgba(255, 255, 255, 0.1)' }}>
        <div style={{ background: 'var(--glass-bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Paid-up capital</span>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {company.paid_up_capital ? `SAR ${Number(company.paid_up_capital).toLocaleString('en-SA')}` : '—'}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total shares</span>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {totalShares > 0 ? totalShares.toLocaleString('en-SA') : '—'}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Par value</span>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {company.par_value_per_share ? `SAR ${company.par_value_per_share}` : '—'}
          </span>
        </div>
        <div style={{ background: 'var(--glass-bg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CR number</span>
          <span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {company.cr_number ?? '—'}
          </span>
        </div>
      </div>

      {/* Cap Table */}
      <div id="cap-table" className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Cap table</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href={`/companies/${id}/cap-table/transfer`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}>
              Transfer
            </a>
            <a href={`/companies/${id}/cap-table/issue`} style={{ color: 'var(--brand-purple)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue shares
            </a>
          </div>
        </div>

        {capTable.holdings.length === 0 ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px' }}>No shares issued yet. Build your cap table by adding stakeholders and issuing equity.</p>
            <a href={`/companies/${id}/cap-table/issue`} style={{ color: 'var(--brand-purple)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue shares to your first stakeholder →
            </a>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Stakeholder</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Share class</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Shares</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Ownership</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Allocation</th>
                </tr>
              </thead>
              <tbody>
                {capTable.holdings.map(h => (
                  <tr key={`${h.stakeholder_id}-${h.share_class}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.stakeholder_name}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {h.share_class}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {Number(h.quantity).toLocaleString('en-SA')}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {Number(h.percentage).toFixed(2)}%
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', width: '100px', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
                        <div style={{ height: '100%', background: 'var(--brand-purple)', borderRadius: '3px', width: `${Math.min(Number(h.percentage), 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textAlign: 'center', opacity: 0.6 }}>
        DRAFT — Review all cap table data with legal counsel before relying on it for legal purposes.
      </p>
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

