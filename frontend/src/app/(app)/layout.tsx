'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

function IconGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

function IconBuilding({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6" y="9" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconClose({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '7px',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--bg-elevated)' : 'transparent',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        transition: 'all 120ms ease',
      }}
    >
      <span style={{ color: active ? 'var(--brand-purple)' : 'var(--text-tertiary)', display: 'flex' }}>
        {icon}
      </span>
      {label}
    </a>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingDot} />
      </div>
    );
  }

  if (!user) return null;

  const isDashboard = pathname === '/dashboard';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
  ];

  const sidebarContent = (
    <>
      <div style={styles.brand}>
        <div style={styles.logoMark}>
          <IconGrid size={14} />
        </div>
        <span style={styles.brandName}>01 Capital</span>
      </div>

      <div style={styles.navSection}>
        <p style={styles.navSectionLabel}>Navigation</p>
        {navItems.map(item => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}

        {!isDashboard && (
          <>
            <p style={{ ...styles.navSectionLabel, marginTop: '20px' }}>This company</p>
            <NavLink href="#cap-table" label="Cap table" icon={<IconBuilding />} active={false} />
          </>
        )}
      </div>

      <div style={styles.sidebarFooter}>
        <div style={styles.userCard}>
          <div style={styles.userAvatar}>
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div style={styles.userInfo}>
            <p style={styles.userName}>{user.full_name ?? 'User'}</p>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <nav className="app-sidebar">
        {sidebarContent}
      </nav>

      {/* Mobile top bar */}
      <div className="app-mobile-bar">
        <span style={styles.mobileBrand}>01 Capital</span>
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={styles.hamburger}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile overlay + drawer */}
      <div
        className={`app-mobile-overlay${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
      >
        <nav style={styles.mobileNav} onClick={e => e.stopPropagation()}>
          {sidebarContent}
        </nav>
      </div>

      <main className="app-content">
        {children}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: '6px',
    height: '6px',
    background: 'var(--brand-purple)',
    borderRadius: '50%',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px',
    borderBottom: '1px solid var(--border-default)',
  },
  logoMark: {
    width: '28px',
    height: '28px',
    background: 'rgba(166,125,250,0.12)',
    border: '1px solid rgba(166,125,250,0.2)',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--brand-purple)',
  },
  brandName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  navSection: {
    flex: 1,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navSectionLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: '0 10px',
    marginBottom: '6px',
  },
  sidebarFooter: {
    padding: '12px 8px',
    borderTop: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '7px',
    background: 'var(--bg-elevated)',
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    background: 'rgba(166,125,250,0.2)',
    border: '1px solid rgba(166,125,250,0.25)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--brand-purple)',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  userEmail: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '6px',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'color 120ms ease',
  },
  mobileBrand: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  hamburger: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  mobileNav: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    bottom: 0,
    width: '260px',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '52px',
  },
};
