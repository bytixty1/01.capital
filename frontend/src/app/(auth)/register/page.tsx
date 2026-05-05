'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.auth.register(email, password, fullName || undefined);
      localStorage.setItem('token', access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <span style={styles.eyebrow}>01 Capital</span>
        <h1 style={styles.heading}>Create account</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoComplete="name"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              style={styles.input}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <a href="/login" style={styles.link}>
            Sign in
          </a>
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
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
  },
  eyebrow: {
    display: 'block',
    color: 'var(--brand-purple)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '28px',
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
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
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    padding: '10px 12px',
    outline: 'none',
    width: '100%',
  },
  error: {
    color: 'var(--neg)',
    fontSize: '13px',
  },
  button: {
    marginTop: '8px',
    background: 'var(--brand-purple)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '11px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
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
  },
};
