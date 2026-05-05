'use client';

import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>Loading…</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={styles.shell}>
      <nav style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandEyebrow}>01 Capital</span>
        </div>

        <div style={styles.nav}>
          <a href="/dashboard" style={styles.navLink}>
            Dashboard
          </a>
        </div>

        <div style={styles.sidebarFooter}>
          <span style={styles.userEmail}>{user.email}</span>
          <button onClick={logout} style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
  },
  loadingText: {
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  },
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-base)',
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  brand: {
    padding: '0 20px 24px',
    borderBottom: '1px solid var(--border-default)',
    marginBottom: '16px',
  },
  brandEyebrow: {
    color: 'var(--brand-purple)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 12px',
  },
  navLink: {
    display: 'block',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '13px',
  },
  sidebarFooter: {
    padding: '16px 20px 0',
    borderTop: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userEmail: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left' as const,
  },
  content: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto' as const,
  },
};
