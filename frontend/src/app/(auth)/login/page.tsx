'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.auth.login(email, password);
      setToken(access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <AnimatedBackground />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#a67dfa" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#a67dfa" opacity="0.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#a67dfa" opacity="0.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#a67dfa" opacity="0.2" />
            </svg>
          </div>
          <span style={styles.logoText}>01 Capital</span>
        </div>

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your cap table dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.5" />
                <path d="M7 4v3.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.75" fill="#f87171" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? (
              <span style={styles.loadingSpinner}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          No account yet?{' '}
          <a href="/register" style={styles.link}>Create one free</a>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--bg-base)',
    position: 'relative',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(19, 19, 22, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--border-default)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(166,125,250,0.08)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '15px',
    letterSpacing: '-0.01em',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(248, 113, 113, 0.08)',
    border: '1px solid rgba(248, 113, 113, 0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--neg)',
  },
  button: {
    marginTop: '4px',
    background: 'var(--brand-purple)',
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
    marginTop: '20px',
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--brand-purple)',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
