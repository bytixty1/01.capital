'use client';

import { useState } from 'react';

/**
 * Two-step destructive confirmation: acknowledge consequences, then type the
 * exact company name. Cap table data is a legal record (CLAUDE.md rule 3), so
 * deletion friction is deliberate.
 */
export function DeleteCompanyModal({
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
        className="glass-panel"
        style={{
          padding: '32px', maxWidth: '480px', width: '100%',
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
