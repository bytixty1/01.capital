'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PageBackground } from '@/components/PageBackground';

const WORDMARK = (
  <svg style={{ height: 20, width: 'auto', display: 'block' }} viewBox="600 340 820 360" preserveAspectRatio="xMinYMid meet" aria-label="01 Capital">
    <g style={{ fill: 'var(--text-primary)' }}>
      <path d="M895.31 680.36C901.84 675.61 909.43 669.72 914.99 663.90Q925.67 652.74 931.58 643.78C949.34 616.87 958.52 585.20 961.38 552.97C962.92 535.56 962.79 521.15 961.94 504.03Q960.97 484.53 956.19 464.30C949.59 436.34 937.98 410.36 919.20 389.81Q911.88 381.79 905.76 377.16A0.42 0.42 0 0 1 905.85 376.44L965.84 351.32A3.72 3.70 -41.2 0 1 969.11 351.53L976.01 355.51A2.25 2.24 15.1 0 1 977.13 357.45Q976.97 512.99 976.99 628.25C976.99 637.90 978.12 646.17 986.44 651.32C990.79 654.01 995.27 656.19 1000.72 658.16Q1011.54 662.07 1026.03 667.30A2.29 2.27 -80.2 0 1 1027.53 669.45L1027.53 680.20A0.67 0.66 90.0 0 1 1026.87 680.87L895.47 680.87A0.28 0.28 0 0 1 895.31 680.36Z" />
      <path d="M657.92 525.26C658.01 560.42 663.66 595.82 679.47 627.32C689.42 647.14 704.03 665.58 722.21 678.34Q733.65 686.36 745.71 691.74A0.22 0.22 0 0 1 745.60 692.16Q707.48 689.08 676.02 668.80Q657.83 657.07 643.29 638.24Q624.09 613.37 615.92 580.05Q613.03 568.22 612.31 561.75Q611.53 554.72 611.39 553.91C610.39 547.86 610.40 543.80 609.95 536.96Q609.53 530.50 609.51 525.39Q609.50 520.27 609.89 513.82C610.30 506.98 610.27 502.92 611.24 496.86Q611.37 496.05 612.12 489.02Q612.80 482.54 615.63 470.70Q623.62 437.33 642.69 412.36Q657.13 393.45 675.25 381.63Q706.61 361.18 744.71 357.90A0.22 0.22 0 0 1 744.82 358.32Q732.79 363.76 721.39 371.84C703.28 384.70 688.77 403.22 678.92 423.09C663.28 454.67 657.83 490.10 657.92 525.26Z" />
      <path d="M730.08 427.20A0.19 0.19 0 0 1 729.85 426.92C734.09 420.30 739.11 414.85 744.04 410.00Q763.62 390.77 791.60 386.64Q808.96 384.08 824.50 386.10Q832.79 387.17 844.03 390.47C872.89 398.94 892.76 423.36 903.04 451.46C908.62 466.75 912.20 482.17 913.23 497.77C913.66 504.30 914.50 509.16 914.58 515.76Q914.69 525.46 914.67 530.82C914.63 539.09 913.88 544.91 912.88 555.49C908.85 598.09 889.43 641.23 847.05 657.86Q836.51 662.00 822.50 663.45Q804.29 665.34 785.33 661.38C762.86 656.69 742.90 641.33 730.01 622.47A0.12 0.12 0 0 1 730.17 622.31Q742.45 630.16 757.08 632.18C781.10 635.49 803.53 626.30 817.80 606.97Q829.83 590.66 835.18 568.87Q838.53 555.20 839.27 533.50C840.11 508.80 837.77 483.95 828.44 461.11C820.44 441.53 805.08 424.37 783.68 419.48Q766.78 415.61 750.61 418.87Q746.90 419.62 739.57 422.26C736.62 423.32 732.91 426.16 730.08 427.20Z" />
      <path d="M1211.47 659.16C1210.94 661.16 1210.65 663.14 1209.88 665.10C1206.28 674.28 1198.98 680.28 1189.08 681.99C1176.47 684.17 1163.26 679.05 1158.13 666.54Q1152.04 651.66 1160.07 636.79A0.44 0.44 0 0 0 1159.68 636.14L1142.97 636.14A0.82 0.81 -90.0 0 0 1142.16 636.96L1142.16 679.61A1.20 1.19 0 0 1 1140.96 680.80L1133.61 680.80A1.26 1.25 -90.0 0 1 1132.36 679.54L1132.36 628.08A1.04 1.04 0 0 1 1133.40 627.04L1162.59 627.04A0.80 0.78 86.7 0 1 1163.37 627.75L1163.78 631.72A0.27 0.27 0 0 0 1164.21 631.90C1177.30 621.55 1200.58 622.95 1208.47 639.34A0.27 0.27 0 0 0 1208.99 639.25C1210.88 621.27 1220.57 607.71 1238.91 603.69Q1245.24 602.30 1253.81 603.48C1269.28 605.63 1280.05 616.56 1283.82 631.79C1288.39 650.21 1281.09 673.14 1261.01 680.01Q1244.71 685.58 1229.76 678.57Q1217.86 672.99 1211.97 659.13A0.27 0.26 41.3 0 0 1211.47 659.16ZM1219.02 642.76C1219.07 659.25 1229.70 672.80 1247.17 672.75C1264.64 672.69 1275.18 659.07 1275.13 642.58C1275.08 626.10 1264.45 612.54 1246.98 612.60C1229.51 612.65 1218.97 626.27 1219.02 642.76ZM1202.02 651.20A16.80 16.80 0.0 0 0 1185.22 634.40L1181.98 634.40A16.80 16.80 0.0 0 0 1165.18 651.20L1165.18 656.34A16.80 16.80 0.0 0 0 1181.98 673.14L1185.22 673.14A16.80 16.80 0.0 0 0 1202.02 656.34L1202.02 651.20Z" />
      <path d="M1085.56 672.06L1085.56 680.17A0.64 0.64 0 0 1 1084.92 680.81L1034.82 680.81A0.64 0.64 0 0 1 1034.18 680.17L1034.18 671.95A0.64 0.64 0 0 1 1034.29 671.59L1072.89 614.87A0.64 0.64 0 0 0 1072.36 613.87L1035.07 613.87A0.64 0.64 0 0 1 1034.43 613.23L1034.43 605.34A0.64 0.64 0 0 1 1035.07 604.70L1084.78 604.70A0.64 0.64 0 0 1 1085.42 605.34L1085.42 613.65A0.64 0.64 0 0 1 1085.31 614.01L1046.93 670.42A0.64 0.64 0 0 0 1047.46 671.42L1084.92 671.42A0.64 0.64 0 0 1 1085.56 672.06Z" />
      <path d="M1338.23 604.75L1346.13 604.75A0.72 0.72 0 0 1 1346.85 605.47L1346.85 680.07A0.72 0.72 0 0 1 1346.13 680.79L1337.87 680.79A0.72 0.72 0 0 1 1337.27 680.47L1299.98 623.67A0.72 0.72 0 0 0 1298.66 624.07L1298.66 680.04A0.72 0.72 0 0 1 1297.94 680.76L1290.29 680.76A0.72 0.72 0 0 1 1289.57 680.04L1289.57 605.49A0.72 0.72 0 0 1 1290.29 604.77L1298.34 604.77A0.72 0.72 0 0 1 1298.94 605.09L1336.19 661.82A0.72 0.72 0 0 0 1337.51 661.42L1337.51 605.47A0.72 0.72 0 0 1 1338.23 604.75Z" />
      <path d="M1357.63 679.84L1357.63 605.71A0.98 0.98 0 0 1 1358.61 604.73L1400.74 604.73A0.98 0.98 0 0 1 1401.72 605.71L1401.72 612.67A0.98 0.98 0 0 1 1400.74 613.65L1368.45 613.65A0.98 0.98 0 0 0 1367.47 614.63L1367.47 637.63A0.98 0.98 0 0 0 1368.45 638.61L1399.09 638.61A0.98 0.98 0 0 1 1400.07 639.59L1400.07 646.53A0.98 0.98 0 0 1 1399.09 647.51L1368.40 647.51A0.98 0.98 0 0 0 1367.42 648.49L1367.42 670.70A0.98 0.98 0 0 0 1368.40 671.68L1400.77 671.68A0.98 0.98 0 0 1 1401.75 672.66L1401.75 679.84A0.98 0.98 0 0 1 1400.77 680.82L1358.61 680.82A0.98 0.98 0 0 1 1357.63 679.84Z" />
      <path d="M1126.40 673.08L1127.16 680.31A0.22 0.21 79.8 0 1 1127.01 680.53Q1114.56 684.02 1102.78 681.51C1090.65 678.92 1083.37 671.80 1081.34 659.76Q1080.22 653.10 1081.44 645.90C1083.99 630.75 1095.77 623.97 1110.66 625.62Q1125.58 627.27 1130.07 641.13Q1132.48 648.54 1131.39 655.47A2.85 2.85 0 0 1 1128.57 657.88L1091.27 657.88A1.08 1.08 0 0 0 1090.22 659.21Q1092.93 670.98 1104.90 673.43Q1114.17 675.33 1126.01 672.80A0.32 0.32 0 0 1 1126.40 673.08ZM1091.04 650.04L1122.08 650.04A0.91 0.91 0 0 0 1122.99 649.13L1122.99 648.92A15.74 15.54 -0.0 0 0 1107.25 633.38L1105.87 633.38A15.74 15.54 0.0 0 0 1090.13 648.92L1090.13 649.13A0.91 0.91 0 0 0 1091.04 650.04Z" />
    </g>
  </svg>
);

const monoSm: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px',
  letterSpacing: '.2em',
  textTransform: 'uppercase',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState<string | null>(null);

  const companyMatch = pathname.match(/^\/companies\/([^/]+)/);
  const activeCompanyId = companyMatch?.[1];
  const inCompany = !!activeCompanyId && activeCompanyId !== 'new';

  useEffect(() => {
    if (!inCompany || !activeCompanyId) { setCompanyName(null); return; }
    api.companies.get(activeCompanyId)
      .then(c => setCompanyName(c.name_en))
      .catch(() => setCompanyName(null));
  }, [activeCompanyId, inCompany]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, background: 'var(--brand-purple)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const gap = 12;
  const navH = 52;
  const subH = 38;
  const subGap = 6;
  const contentTop = inCompany
    ? gap + navH + subGap + subH + gap
    : gap + navH + gap;

  return (
    <div className="app-shell" style={{ position: 'relative' }}>
      <PageBackground />

      {/* Primary navbar */}
      <nav className="glass-panel" style={{
        position: 'fixed', top: gap, left: gap, right: gap, height: navH, zIndex: 100,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        padding: '0 22px',
        gap: '24px',
        borderRadius: '18px',
      }}>
        {/* Left: wordmark */}
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {WORDMARK}
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', display: 'block' }} />
          <span style={{ ...monoSm, fontSize: '9.5px', letterSpacing: '.18em', color: 'var(--text-tertiary)' }}>Riyadh · 2026</span>
        </Link>

        {/* Center: breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/dashboard" style={{
            ...monoSm, textDecoration: 'none',
            color: pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => { if (pathname !== '/dashboard') (e.currentTarget as HTMLElement).style.color = 'var(--brand-purple)'; }}
            onMouseLeave={e => { if (pathname !== '/dashboard') (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
          >
            Dashboard
          </Link>
          {inCompany && companyName && (
            <>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>·</span>
              <span style={{ ...monoSm, fontSize: '10px', letterSpacing: '.14em', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {companyName}
              </span>
            </>
          )}
        </div>

        {/* Right: user + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-primary)',
            }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <span style={{ ...monoSm, fontSize: '10px', letterSpacing: '.1em', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name || user.email.split('@')[0]}
            </span>
          </div>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', display: 'block' }} />
          <Link href="/account" style={{
            ...monoSm, textDecoration: 'none',
            color: isActive('/account') ? 'var(--text-primary)' : 'var(--text-tertiary)',
            transition: 'color 0.2s',
          }}>
            Account
          </Link>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', display: 'block' }} />
          <button
            onClick={logout}
            style={{
              ...monoSm, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-tertiary)', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-purple)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Company sub-nav */}
      {inCompany && (
        <nav className="glass-panel" style={{
          position: 'fixed',
          top: gap + navH + subGap,
          left: gap, right: gap, height: subH, zIndex: 99,
          display: 'flex', alignItems: 'center',
          padding: '0 22px', gap: '24px',
          borderRadius: '12px',
        }}>
          {[
            { label: 'Overview', href: `/companies/${activeCompanyId}`, exact: true },
            { label: 'Stakeholders', href: `/companies/${activeCompanyId}/stakeholders` },
            { label: 'ESOP', href: `/companies/${activeCompanyId}/esop` },
            { label: 'Instruments', href: `/companies/${activeCompanyId}/instruments` },
            { label: 'Filings', href: `/companies/${activeCompanyId}/filings` },
            { label: 'Members', href: `/companies/${activeCompanyId}/members` },
          ].map(({ label, href, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={label} href={href} style={{
                ...monoSm, fontSize: '10px', letterSpacing: '.18em',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                paddingBottom: '1px',
                borderBottom: active ? '1.5px solid var(--brand-purple)' : '1.5px solid transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}>
                {active && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-purple)', boxShadow: '0 0 10px rgba(139,92,246,.5)', flexShrink: 0 }} />
                )}
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Main content */}
      <main style={{
        position: 'relative', zIndex: 1,
        paddingTop: contentTop,
        paddingLeft: '24px', paddingRight: '24px', paddingBottom: '48px',
        maxWidth: '1200px', margin: '0 auto',
      }}>
        {children}
      </main>
    </div>
  );
}
