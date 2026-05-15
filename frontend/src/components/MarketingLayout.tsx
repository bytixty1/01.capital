'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const MetaballCanvas = dynamic(() => import('./MetaballCanvas'), { ssr: false });

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/cap-table', label: 'Cap Table' },
  { href: '/esop', label: 'ESOP' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/instruments', label: 'Instruments' },
  { href: '/contact', label: 'Contact' },
];

const WORDMARK = (
  <svg style={{ height: 18, width: 'auto', display: 'block' }} viewBox="600 340 820 360" preserveAspectRatio="xMinYMid meet" aria-label="01 Capital">
    <g style={{ fill: 'currentColor' }}>
      <path d="M895.31 680.36C901.84 675.61 909.43 669.72 914.99 663.90Q925.67 652.74 931.58 643.78C949.34 616.87 958.52 585.20 961.38 552.97C962.92 535.56 962.79 521.15 961.94 504.03Q960.97 484.53 956.19 464.30C949.59 436.34 937.98 410.36 919.20 389.81Q911.88 381.79 905.76 377.16A0.42 0.42 0 0 1 905.85 376.44L965.84 351.32A3.72 3.70 -41.2 0 1 969.11 351.53L976.01 355.51A2.25 2.24 15.1 0 1 977.13 357.45Q976.97 512.99 976.99 628.25C976.99 637.90 978.12 646.17 986.44 651.32C990.79 654.01 995.27 656.19 1000.72 658.16Q1011.54 662.07 1026.03 667.30A2.29 2.27 -80.2 0 1 1027.53 669.45L1027.53 680.20A0.67 0.66 90.0 0 1 1026.87 680.87L895.47 680.87A0.28 0.28 0 0 1 895.31 680.36Z"/>
      <path d="M657.92 525.26C658.01 560.42 663.66 595.82 679.47 627.32C689.42 647.14 704.03 665.58 722.21 678.34Q733.65 686.36 745.71 691.74A0.22 0.22 0 0 1 745.60 692.16Q707.48 689.08 676.02 668.80Q657.83 657.07 643.29 638.24Q624.09 613.37 615.92 580.05Q613.03 568.22 612.31 561.75Q611.53 554.72 611.39 553.91C610.39 547.86 610.40 543.80 609.95 536.96Q609.53 530.50 609.51 525.39Q609.50 520.27 609.89 513.82C610.30 506.98 610.27 502.92 611.24 496.86Q611.37 496.05 612.12 489.02Q612.80 482.54 615.63 470.70Q623.62 437.33 642.69 412.36Q657.13 393.45 675.25 381.63Q706.61 361.18 744.71 357.90A0.22 0.22 0 0 1 744.82 358.32Q732.79 363.76 721.39 371.84C703.28 384.70 688.77 403.22 678.92 423.09C663.28 454.67 657.83 490.10 657.92 525.26Z"/>
      <path d="M730.08 427.20A0.19 0.19 0 0 1 729.85 426.92C734.09 420.30 739.11 414.85 744.04 410.00Q763.62 390.77 791.60 386.64Q808.96 384.08 824.50 386.10Q832.79 387.17 844.03 390.47C872.89 398.94 892.76 423.36 903.04 451.46C908.62 466.75 912.20 482.17 913.23 497.77C913.66 504.30 914.50 509.16 914.58 515.76Q914.69 525.46 914.67 530.82C914.63 539.09 913.88 544.91 912.88 555.49C908.85 598.09 889.43 641.23 847.05 657.86Q836.51 662.00 822.50 663.45Q804.29 665.34 785.33 661.38C762.86 656.69 742.90 641.33 730.01 622.47A0.12 0.12 0 0 1 730.17 622.31Q742.45 630.16 757.08 632.18C781.10 635.49 803.53 626.30 817.80 606.97Q829.83 590.66 835.18 568.87Q838.53 555.20 839.27 533.50C840.11 508.80 837.77 483.95 828.44 461.11C820.44 441.53 805.08 424.37 783.68 419.48Q766.78 415.61 750.61 418.87Q746.90 419.62 739.57 422.26C736.62 423.32 732.91 426.16 730.08 427.20Z"/>
    </g>
  </svg>
);

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <MetaballCanvas />

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        background: 'rgba(14,14,16,0.7)',
      }}>
        <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {WORDMARK}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                fontSize: '13px', fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration: 'none', padding: '6px 14px', borderRadius: '6px',
                transition: 'color 150ms ease, background 150ms ease',
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; } }}>
                {label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', padding: '7px 16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 150ms ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--brand-purple)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--brand-purple)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}>
            Sign in
          </Link>
          <Link href="/register" style={{ fontSize: '13px', fontWeight: 500, color: '#fff', textDecoration: 'none', padding: '7px 16px', borderRadius: '6px', background: 'var(--brand-purple)', transition: 'opacity 150ms ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}>
            Get started
          </Link>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 10, paddingTop: '64px' }}>
        {children}
      </div>

      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-primary)' }}>{WORDMARK}</div>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>© 2026 01 Capital. Saudi Companies Law compliance — for review with legal counsel.</p>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: '12px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-tertiary)'; }}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
