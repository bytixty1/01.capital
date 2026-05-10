import { Logo } from './Logo';

export function AuthBrandPanel({ tagline = 'Saudi-native cap table for founders' }: { tagline?: string }) {
  return (
    <div
      data-auth-brand-panel="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: '#06060a',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 48px',
      }}
    >
      {/* Animated blobs */}
      <div style={{
        position: 'absolute', top: '12%', left: '8%',
        width: 320, height: 320,
        background: 'rgba(139,92,246,0.32)',
        borderRadius: '50%', filter: 'blur(90px)',
        animation: 'blob-drift-1 12s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 260, height: 260,
        background: 'rgba(217,70,239,0.22)',
        borderRadius: '50%', filter: 'blur(80px)',
        animation: 'blob-drift-2 16s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '45%', left: '35%',
        width: 200, height: 200,
        background: 'rgba(59,130,246,0.18)',
        borderRadius: '50%', filter: 'blur(70px)',
        animation: 'blob-drift-3 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <Logo size={36} />
          <p style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.01em', lineHeight: 1.6, maxWidth: 260,
          }}>
            {tagline}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
          {[
            { num: '2023', label: 'Saudi Law' },
            { num: 'LLC', label: 'SJSC · JSC' },
            { num: 'SAR', label: 'Native' },
          ].map(({ num, label }) => (
            <div key={num} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{num}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
