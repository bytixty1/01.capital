'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

// ── Icons ─────────────────────────────────────────────────────────────────────

function Ico({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  grid: 'M1 1h5.5v5.5H1V1zm8.5 0H15v5.5H9.5V1zM1 9.5h5.5V15H1V9.5zm8.5 0H15V15H9.5V9.5z',
  users: 'M11 14v-1a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v1M7 7A2.5 2.5 0 1 0 7 2a2.5 2.5 0 0 0 0 5zm5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm2 7v-1a3 3 0 0 0-2-2.83',
  table: 'M2 3h12v10H2V3zm0 3.5h12M6 3v10',
  chart: 'M1 12l4-4 3 3 4-5 3 3',
  document: 'M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1zm0 0v5h5',
  tool: 'M12.5 3.5a2 2 0 0 0-2.83 0L3 10.17V13h2.83l6.67-6.67a2 2 0 0 0 0-2.83z',
  shield: 'M8 1L2 4v4c0 3.31 2.58 6.41 6 7 3.42-.59 6-3.69 6-7V4L8 1z',
  arrowLeft: 'M10 13L5 8l5-5',
  menu: 'M2 4h12M2 8h12M2 12h12',
  close: 'M4 4l8 8M12 4l-8 8',
  logout: 'M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3m3-3 3-3-3-3m3 3H6',
};

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  href, label, icon, active, indent = false,
}: {
  href: string; label: string; icon: string; active: boolean; indent?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: indent ? '6px 10px 6px 32px' : '7px 10px',
        borderRadius: '7px',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'rgba(166,125,250,0.1)' : 'transparent',
        textDecoration: 'none', fontSize: '13px',
        fontWeight: active ? 500 : 400,
        transition: 'all 120ms ease',
        borderLeft: active && !indent ? '2px solid var(--brand-purple)' : '2px solid transparent',
      }}
    >
      <span style={{ color: active ? 'var(--brand-purple)' : 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}>
        <Ico d={ICONS[icon as keyof typeof ICONS]} />
      </span>
      {label}
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      padding: '0 10px', margin: '16px 0 4px',
    }}>
      {children}
    </p>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, background: 'var(--brand-purple)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) return null;

  // Detect company context from URL
  const companyMatch = pathname.match(/^\/companies\/([^/]+)/);
  const activeCompanyId = companyMatch?.[1];
  const inCompany = !!activeCompanyId && activeCompanyId !== 'new';

  const is = (path: string) => pathname === path;
  const startsWith = (path: string) => pathname.startsWith(path);

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 16px', borderBottom: '1px solid var(--border-default)' }}>
        <Logo size={24} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>01 Capital</span>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <NavLink href="/dashboard" label="Dashboard" icon="grid" active={is('/dashboard')} />

        {inCompany && (
          <>
            <SectionLabel>Company</SectionLabel>
            <NavLink
              href={`/companies/${activeCompanyId}`}
              label="Overview"
              icon="table"
              active={is(`/companies/${activeCompanyId}`)}
            />
            <NavLink
              href={`/companies/${activeCompanyId}/stakeholders`}
              label="Stakeholders"
              icon="users"
              active={startsWith(`/companies/${activeCompanyId}/stakeholders`)}
            />
            <NavLink
              href={`/companies/${activeCompanyId}/esop`}
              label="ESOP plans"
              icon="chart"
              active={startsWith(`/companies/${activeCompanyId}/esop`)}
            />
            <NavLink
              href={`/companies/${activeCompanyId}/instruments`}
              label="Instruments"
              icon="tool"
              active={startsWith(`/companies/${activeCompanyId}/instruments`)}
            />
            <NavLink
              href={`/companies/${activeCompanyId}/filings`}
              label="Filings"
              icon="document"
              active={startsWith(`/companies/${activeCompanyId}/filings`)}
            />
            <NavLink
              href={`/companies/${activeCompanyId}/members`}
              label="Members"
              icon="shield"
              active={startsWith(`/companies/${activeCompanyId}/members`)}
            />
          </>
        )}
      </div>

      {/* User footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border-default)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: 7,
          background: 'var(--bg-elevated)', marginBottom: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(166,125,250,0.2)', border: '1px solid rgba(166,125,250,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--brand-purple)',
          }}>
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name || user.email.split('@')[0]}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: 12, cursor: 'pointer', padding: '6px 10px',
            borderRadius: 6, width: '100%', textAlign: 'left',
          }}
        >
          <Ico d={ICONS.logout} size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <nav className="app-sidebar">{sidebarContent}</nav>

      {/* Mobile bar */}
      <div className="app-mobile-bar">
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>01 Capital</span>
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <Ico d={mobileOpen ? ICONS.close : ICONS.menu} size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`app-mobile-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)}>
        <nav
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 260,
            background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)',
            paddingTop: 52,
          }}
        >
          {sidebarContent}
        </nav>
      </div>

      <main className="app-content">{children}</main>
    </div>
  );
}
