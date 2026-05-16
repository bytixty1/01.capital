'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, CapTableResponse, CompanyResponse } from '@/lib/api';

/* ── Donut Chart ──────────────────────────────────────────────────────────── */

const COLORS = [
  'var(--brand-purple)', '#9b6ff0', '#c4a8f8', '#6ee7b7',
  '#fbbf24', '#f87171', '#60a5fa', '#a78bfa',
];

function DonutChart({ slices, onHover }: { slices: { pct: number; color: string; label: string }[]; onHover: (i: number | null) => void }) {
  const r = 36;
  const cx = 44;
  const cy = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="120" height="120" viewBox="0 0 88 88" style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
      {slices.map((s, i) => {
        const dash = (s.pct / 100) * circ;
        const rotation = (offset / 100) * 360 - 90;
        offset += s.pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ 
              transform: `rotate(${rotation}deg)`, 
              transformOrigin: `${cx}px ${cy}px`, 
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
    </svg>
  );
}

/* ── Delete Confirmation Modal ────────────────────────────────────────────── */

function DeleteCompanyModal({
  companyName,
  onCancel,
  onConfirm,
  deleting,
}: {
  companyName: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === companyName;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
<<<<<<< HEAD
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%',
=======
        className="glass-panel"
        style={{
          padding: '32px', maxWidth: '480px', width: '100%',
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        {step === 1 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.12)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Delete company?</h2>
            </div>

            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <p style={{ marginBottom: '12px' }}>
                You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{companyName}</strong>. This will also delete:
              </p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>All stakeholders and their holdings</li>
                <li>All cap table events and transaction history</li>
                <li>All instruments (SAFEs, warrants, etc.)</li>
                <li>All ESOP plans and grants</li>
                <li>All filings and compliance records</li>
              </ul>
            </div>

            <div style={{
              padding: '12px', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
              fontSize: '13px', color: '#ef4444', fontWeight: 500,
            }}>
              This action is irreversible. All data will be permanently lost.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={onCancel} style={{
                background: 'transparent', border: '1px solid var(--border-default)',
                borderRadius: '8px', padding: '10px 20px', fontSize: '14px',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => setStep(2)} style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 20px', fontSize: '14px',
                color: '#ef4444', fontWeight: 600, cursor: 'pointer',
              }}>I understand, continue</button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Confirm deletion
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              To confirm, type the company name exactly:
              <br />
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{companyName}</strong>
            </p>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type company name here..."
              className="glass-input"
              style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={onCancel} style={{
                background: 'transparent', border: '1px solid var(--border-default)',
                borderRadius: '8px', padding: '10px 20px', fontSize: '14px',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={onConfirm}
                disabled={!matches || deleting}
                style={{
                  background: matches ? '#ef4444' : 'rgba(239,68,68,0.15)',
                  border: 'none', borderRadius: '8px', padding: '10px 20px',
                  fontSize: '14px', color: '#fff', fontWeight: 600,
                  cursor: matches && !deleting ? 'pointer' : 'not-allowed',
                  opacity: matches ? 1 : 0.5, transition: 'all 0.2s ease',
                }}
              >
                {deleting ? 'Deleting...' : 'Permanently delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [capTable, setCapTable] = useState<CapTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
<<<<<<< HEAD
=======
  const [diluted, setDiluted] = useState(false);
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)

  useEffect(() => {
    Promise.all([api.companies.get(id), api.capTable.get(id, { diluted })])
      .then(([c, ct]) => {
        setCompany(c);
        setCapTable(ct);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, diluted]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.companies.delete(id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.companies.delete(id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading company data...</p>;
  if (error) return <p style={{ color: 'var(--neg)', fontSize: '14px' }}>{error}</p>;
  if (!company || !capTable) return null;

  const totalShares = Number(capTable.total_shares);

  // Build donut chart data from holdings
  const donutSlices = capTable.holdings.map((h, i) => ({
    pct: Number(h.percentage),
    color: COLORS[i % COLORS.length],
    label: h.stakeholder_name,
  }));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Delete Modal */}
      {showDelete && (
        <DeleteCompanyModal
          companyName={company.name_en}
          onCancel={() => { setShowDelete(false); }}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {/* Header Section */}
      <div>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
            ← Back to Dashboard
          </Link>
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
            <h1 style={{ fontSize: '34px', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-serif)', letterSpacing: '-0.01em' }}>
              {company.name_en}
            </h1>
            {company.name_ar && <p style={{ fontSize: '16px', color: 'var(--text-secondary)', direction: 'rtl' }}>{company.name_ar}</p>}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowDelete(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 16px', fontSize: '13px',
                color: '#ef4444', cursor: 'pointer', fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              Delete
            </button>
            <Link href={`/companies/${id}/stakeholders/new`} className="btn-primary" style={{
              textDecoration: 'none',
              padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            }}>
              + Add stakeholder
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'Cap table', href: `#cap-table`, active: true },
          { label: 'Stakeholders', href: `/companies/${id}/stakeholders`, active: false },
          { label: 'Events', href: `/companies/${id}/cap-table/events`, active: false },
          { label: 'ESOP', href: `/companies/${id}/esop`, active: false },
          { label: 'Instruments', href: `/companies/${id}/instruments`, active: false },
          { label: 'Filings', href: `/companies/${id}/filings`, active: false },
          { label: 'Members', href: `/companies/${id}/members`, active: false },
        ].map(({ label, href, active }) => (
          <Link key={label} href={href} style={{
            padding: '8px 16px', background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '24px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px', fontWeight: active ? 500 : 400, textDecoration: 'none', transition: 'all 0.2s ease'
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Capital Summary Stats */}
      <div className="glass-panel" style={{ 
        padding: 0, overflow: 'hidden', display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1px', background: 'var(--glass-border)',
      }}>
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

      {/* Ownership Chart + Cap Table */}
      <div id="cap-table" className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Cap table</h2>
            {/* Issued / Fully diluted toggle */}
            <div style={{ display: 'inline-flex', padding: '3px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
              {([
                { v: false, label: 'Issued' },
                { v: true,  label: 'Fully diluted' },
              ] as const).map(opt => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setDiluted(opt.v)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: diluted === opt.v ? 'var(--brand-purple-subtle)' : 'transparent',
                    color: diluted === opt.v ? 'var(--brand-purple-hover)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {diluted && capTable.total_shares_diluted && capTable.total_shares_issued && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Issued {Number(capTable.total_shares_issued).toLocaleString('en-SA')} · Diluted {Number(capTable.total_shares_diluted).toLocaleString('en-SA')}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/companies/${id}/cap-table/transfer`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}>
              Transfer
            </Link>
<<<<<<< HEAD
=======
            <Link href={`/companies/${id}/cap-table/capital-increase`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}>
              Capital increase
            </Link>
            <Link href={`/companies/${id}/cap-table/round-modeler`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}>
              Round modeler
            </Link>
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
            <Link href={`/companies/${id}/cap-table/issue`} className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue shares
            </Link>
          </div>
        </div>

        {capTable.holdings.length === 0 ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px' }}>No shares issued yet. Build your cap table by adding stakeholders and issuing equity.</p>
            <Link href={`/companies/${id}/cap-table/issue`} className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
              Issue shares to your first stakeholder →
            </Link>
          </div>
        ) : (
          <>
            {/* Ownership Donut */}
            <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '48px', borderBottom: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
              <DonutChart slices={donutSlices} onHover={setHoveredSlice} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '240px' }}>
                {donutSlices.map((s, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px',
                      opacity: hoveredSlice === null || hoveredSlice === i ? 1 : 0.4,
                      transform: hoveredSlice === i ? 'translateX(8px)' : 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    onMouseEnter={() => setHoveredSlice(i)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: s.color, flexShrink: 0, boxShadow: hoveredSlice === i ? `0 0 12px ${s.color}` : 'none', transition: 'all 0.3s ease' }} />
                    <span style={{ fontSize: '14px', color: hoveredSlice === i ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, fontWeight: hoveredSlice === i ? 600 : 400 }}>{s.label}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Stakeholder</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Share class</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Shares</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Ownership</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Allocation</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
<<<<<<< HEAD
                  {capTable.holdings.map((h, index) => (
                    <tr 
                      key={`${h.stakeholder_id}-${h.share_class}`} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: hoveredSlice === index ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.2s ease'
=======
                  {capTable.holdings.map((h, index) => {
                    const isSynthetic = !!h.synthetic;
                    const badgeColor =
                      h.synthetic === 'esop_pool' ? 'var(--info)' :
                      h.synthetic === 'esop_grants' ? 'var(--warn)' :
                      h.synthetic === 'convertible' ? 'var(--brand-purple)' :
                      'var(--text-tertiary)';
                    const badgeLabel =
                      h.synthetic === 'esop_pool' ? 'ESOP POOL' :
                      h.synthetic === 'esop_grants' ? 'ESOP GRANTS' :
                      h.synthetic === 'convertible' ? 'CONVERTIBLE' : '';
                    return (
                    <tr
                      key={`${h.stakeholder_id ?? `synth-${h.synthetic}-${index}`}-${h.share_class}`}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: hoveredSlice === index ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.2s ease',
                        borderLeft: isSynthetic ? `2px dashed ${badgeColor}` : 'none',
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
                      }}
                      onMouseEnter={() => setHoveredSlice(index)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      <td style={tdStyle}>
<<<<<<< HEAD
                        <Link
                          href={`/companies/${id}/stakeholders/${h.stakeholder_id}`}
                          style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                        >
                          {h.stakeholder_name}
                        </Link>
=======
                        {isSynthetic ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.04)',
                              color: badgeColor,
                              fontFamily: 'var(--font-mono)',
                            }}>{badgeLabel}</span>
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{h.stakeholder_name}</span>
                          </span>
                        ) : (
                          <Link
                            href={`/companies/${id}/stakeholders/${h.stakeholder_id}`}
                            style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                          >
                            {h.stakeholder_name}
                          </Link>
                        )}
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
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
<<<<<<< HEAD
                          <div style={{ 
                            height: '100%', 
                            background: COLORS[index % COLORS.length], 
                            borderRadius: '3px', 
                            width: `${Math.min(Number(h.percentage), 100)}%`,
                            boxShadow: hoveredSlice === index ? `0 0 8px ${COLORS[index % COLORS.length]}` : 'none',
                            transition: 'all 0.3s ease'
=======
                          <div style={{
                            height: '100%',
                            background: isSynthetic ? badgeColor : COLORS[index % COLORS.length],
                            borderRadius: '3px',
                            width: `${Math.min(Number(h.percentage), 100)}%`,
                            boxShadow: hoveredSlice === index ? `0 0 8px ${isSynthetic ? badgeColor : COLORS[index % COLORS.length]}` : 'none',
                            transition: 'all 0.3s ease',
                            opacity: isSynthetic ? 0.6 : 1,
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
                          }} />
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
<<<<<<< HEAD
                        <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                          <Link
                            href={`/companies/${id}/cap-table/issue?stakeholder=${h.stakeholder_id}`}
                            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                            title="Issue more shares"
                          >
                            Issue
                          </Link>
                          <Link
                            href={`/companies/${id}/cap-table/transfer?from=${h.stakeholder_id}`}
                            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                            title="Transfer shares"
                          >
                            Transfer
                          </Link>
                          <Link
                            href={`/companies/${id}/cap-table/reduce?stakeholder=${h.stakeholder_id}`}
                            style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                            title="Reduce / Buyback shares"
                          >
                            Reduce
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
=======
                        {isSynthetic ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end' }}>
                            <Link
                              href={`/companies/${id}/cap-table/issue?stakeholder=${h.stakeholder_id}`}
                              style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                              title="Issue more shares"
                            >
                              Issue
                            </Link>
                            <Link
                              href={`/companies/${id}/cap-table/transfer?from=${h.stakeholder_id}`}
                              style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                              title="Transfer shares"
                            >
                              Transfer
                            </Link>
                            <Link
                              href={`/companies/${id}/cap-table/reduce?stakeholder=${h.stakeholder_id}`}
                              style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                              title="Reduce / Buyback shares"
                            >
                              Reduce
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
>>>>>>> f361866 (feat: implement premium glassmorphism UI, shared WebGL background, and security hardening)
                </tbody>
              </table>
            </div>
          </>
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
