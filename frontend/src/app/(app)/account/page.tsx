'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { UserResponse } from '@/lib/api';

type MFAStep = 'idle' | 'setup' | 'confirm' | 'disable';

export default function AccountPage() {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [mfaStep, setMfaStep] = useState<MFAStep>('idle');
  const [secret, setSecret] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(e => setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to load account' }));
  }, []);

  async function startSetup() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await api.auth.mfaSetup();
      setSecret(res.secret);
      // Same-origin proxy fetch — the session cookie authenticates it.
      const blob = await fetch(api.auth.mfaQrUrl()).then(r => r.blob());
      setQrSrc(URL.createObjectURL(blob));
      setMfaStep('setup');
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Failed to setup MFA' });
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnable() {
    setMsg(null);
    if (code.length !== 6) { setMsg({ type: 'err', text: 'Enter the 6-digit code' }); return; }
    setLoading(true);
    try {
      await api.auth.mfaEnable(code);
      setUser(prev => prev ? { ...prev, mfa_enabled: true } : prev);
      setMfaStep('idle');
      setCode('');
      setMsg({ type: 'ok', text: 'Two-factor authentication is now active on your account.' });
    } catch {
      setMsg({ type: 'err', text: 'Invalid code. Try again.' });
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function confirmDisable() {
    setMsg(null);
    if (code.length !== 6) { setMsg({ type: 'err', text: 'Enter your current 6-digit code to confirm' }); return; }
    setLoading(true);
    try {
      await api.auth.mfaDisable(code);
      setUser(prev => prev ? { ...prev, mfa_enabled: false } : prev);
      setMfaStep('idle');
      setCode('');
      setMsg({ type: 'ok', text: 'Two-factor authentication has been disabled.' });
    } catch {
      setMsg({ type: 'err', text: 'Invalid code.' });
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <h1 style={s.heading}>Account settings</h1>
      <p style={s.sub}>Manage your security preferences</p>

      {/* Profile card */}
      <section style={s.card}>
        <h2 style={s.sectionTitle}>Profile</h2>
        <div style={s.row}>
          <div style={s.avatar}>{user?.email?.[0]?.toUpperCase() ?? '?'}</div>
          <div>
            <p style={s.name}>{user?.full_name ?? '—'}</p>
            <p style={s.email}>{user?.email}</p>
          </div>
        </div>
      </section>

      {/* MFA card */}
      <section style={s.card}>
        <div style={s.sectionHeader}>
          <div>
            <h2 style={s.sectionTitle}>Two-factor authentication</h2>
            <p style={s.sectionDesc}>
              Require a 6-digit code from your authenticator app on every login.
              Strongly recommended for cap table access.
            </p>
          </div>
          <span style={{ ...s.badge, ...(user?.mfa_enabled ? s.badgeOn : s.badgeOff) }}>
            {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {msg && (
          <div style={{ ...s.alert, ...(msg.type === 'ok' ? s.alertOk : s.alertErr) }}>
            {msg.text}
          </div>
        )}

        {/* Idle — show enable/disable button */}
        {mfaStep === 'idle' && (
          <div style={{ marginTop: '16px' }}>
            {!user?.mfa_enabled ? (
              <button onClick={startSetup} disabled={loading} className="btn-primary" style={s.btnPrimary}>
                {loading ? 'Setting up…' : 'Enable two-factor authentication'}
              </button>
            ) : (
              <button onClick={() => { setMfaStep('disable'); setMsg(null); }} style={s.btnDanger}>
                Disable two-factor authentication
              </button>
            )}
          </div>
        )}

        {/* Setup — show QR code */}
        {mfaStep === 'setup' && (
          <div style={s.setupBox}>
            <p style={s.setupStep}><strong>Step 1</strong> — Scan this QR code with Google Authenticator, Authy, or any TOTP app.</p>
            {qrSrc && <img src={qrSrc} alt="MFA QR code" style={s.qr} />}
            <p style={s.setupStep}><strong>Step 2</strong> — Enter your recovery secret (save this somewhere safe):</p>
            <code style={s.secret}>{secret}</code>
            <p style={s.setupStep}><strong>Step 3</strong> — Enter the 6-digit code your app shows to confirm setup:</p>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={{ ...s.codeInput }}
              autoFocus
            />
            {msg?.type === 'err' && <p style={s.errText}>{msg.text}</p>}
            <div style={s.btnRow}>
              <button onClick={confirmEnable} disabled={loading || code.length !== 6} className="btn-primary" style={s.btnPrimary}>
                {loading ? 'Enabling…' : 'Enable MFA'}
              </button>
              <button onClick={() => { setMfaStep('idle'); setCode(''); setMsg(null); }} style={s.btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Disable — confirm with current code */}
        {mfaStep === 'disable' && (
          <div style={s.setupBox}>
            <p style={s.setupStep}>Enter your current authenticator code to disable MFA:</p>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              style={s.codeInput}
              autoFocus
            />
            {msg?.type === 'err' && <p style={s.errText}>{msg.text}</p>}
            <div style={s.btnRow}>
              <button onClick={confirmDisable} disabled={loading || code.length !== 6} style={s.btnDanger}>
                {loading ? 'Disabling…' : 'Confirm disable'}
              </button>
              <button onClick={() => { setMfaStep('idle'); setCode(''); setMsg(null); }} style={s.btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '640px' },
  heading: { fontSize: '28px', fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  card: { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '16px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  sectionDesc: { fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5 },
  badge: { flexShrink: 0, fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: '99px', textTransform: 'uppercase' as const },
  badgeOn: { background: 'rgba(16,185,129,0.12)', color: 'var(--pos)', border: '1px solid rgba(16,185,129,0.25)' },
  badgeOff: { background: 'rgba(113,113,122,0.12)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' },
  row: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 600, flexShrink: 0 },
  name: { fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' },
  email: { fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' },
  alert: { marginTop: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' },
  alertOk: { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--pos)' },
  alertErr: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--neg)' },
  btnPrimary: { border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  btnDanger: { background: 'rgba(239,68,68,0.1)', color: 'var(--neg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  btnGhost: { background: 'none', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' },
  btnRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  setupBox: { marginTop: '20px', display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  setupStep: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 },
  qr: { width: '180px', height: '180px', borderRadius: '8px', background: '#fff', padding: '8px' },
  secret: { display: 'block', fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '10px 14px', color: 'var(--text-secondary)', letterSpacing: '0.08em', wordBreak: 'break-all' as const },
  codeInput: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '22px', padding: '12px 16px', outline: 'none', width: '160px', fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', textAlign: 'center' as const },
  errText: { fontSize: '13px', color: 'var(--neg)', marginTop: '4px' },
};
