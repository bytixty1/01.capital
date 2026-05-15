'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { AuthBrandPanel } from '@/components/AuthBrandPanel';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Email address is missing. Please go back to registration.');
      return;
    }
    if (!otp.trim()) {
      setError('Please enter the verification code');
      return;
    }
    if (otp.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.auth.verifyEmail(email, otp);
      if (!access_token) {
        setError('Invalid response from server');
        return;
      }
      setToken(access_token);
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      if (message.includes('Invalid OTP') || message.includes('invalid') || message.includes('Invalid verification')) {
        setError('Invalid verification code. Please check the 6-digit code sent to your email.');
      } else if (message.includes('expired')) {
        setError('Verification code expired. Please register again to receive a new code.');
      } else if (message.includes('not found')) {
        setError('User not found. Please register first.');
      } else if (message.includes('already')) {
        setError('This email is already verified. Please sign in instead.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel" style={styles.card}>
      <h1 style={styles.heading}>Verify your email</h1>
      <p style={styles.sub}>
        We sent a verification code to <strong>{email || 'your email'}</strong>. <br />
        (For demo purposes, use OTP: 000000)
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Verification Code</label>
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoComplete="one-time-code"
            placeholder="000000"
            style={{ ...styles.input, textAlign: 'center', letterSpacing: '0.2em', fontSize: '18px' }}
          />
        </div>

        {error && (
          <div style={styles.errorBox}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.5" />
              <path d="M7 4v3.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="10" r="0.75" fill="#ef4444" />
            </svg>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary" style={styles.button}>
          {loading ? (
            <span style={styles.loadingSpinner}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Verifying…
            </span>
          ) : 'Verify & Sign in'}
        </button>
      </form>

      <p style={styles.footer}>
        Didn't receive the code?{' '}
        <button type="button" onClick={() => alert('Demo: just use 000000')} className="link-accent" style={styles.link}>Resend</button>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main style={styles.page} data-auth-page="true">
      <AuthBrandPanel tagline="One step away from your cap table" />

      {/* Right Panel — Form */}
      <div style={styles.formPanel}>
        <div className="glass-panel" style={styles.card}>
          <Suspense fallback={<p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    background: 'var(--bg-base)',
  },
  formPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    padding: '48px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    letterSpacing: '0.01em',
  },
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    padding: '11px 14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box' as const,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--neg)',
  },
  button: {
    marginTop: '4px',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '-0.01em',
    transition: 'opacity 150ms ease',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  footer: {
    marginTop: '24px',
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    fontSize: '13px',
  },
};
