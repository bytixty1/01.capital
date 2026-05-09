import { Logo } from './Logo';

const WORDMARK = (
  <svg width="140" height="18" viewBox="0 0 420 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ZeroOne Capital">
    <path d="M0 42.12L24.84 11.88H1.08V5.4H33.48V12.24L8.64 42.48H33.84V48.96H0V42.12Z" fill="white"/>
    <path d="M38.16 27.36C38.16 13.68 47.64 4.68 60.24 4.68C72.84 4.68 82.32 13.68 82.32 27.36C82.32 41.04 72.84 50.04 60.24 50.04C47.64 50.04 38.16 41.04 38.16 27.36ZM74.88 27.36C74.88 17.28 68.64 11.16 60.24 11.16C51.84 11.16 45.6 17.28 45.6 27.36C45.6 37.44 51.84 43.56 60.24 43.56C68.64 43.56 74.88 37.44 74.88 27.36Z" fill="white"/>
    <path d="M87.6 48.96V5.4H105.36C115.44 5.4 121.44 10.8 121.44 19.68C121.44 26.4 117.6 31.44 111.12 33.36L122.64 48.96H114.24L103.44 34.08H94.92V48.96H87.6ZM94.92 27.72H105.12C111 27.72 114.12 24.6 114.12 19.8C114.12 14.88 111 11.88 105.12 11.88H94.92V27.72Z" fill="white"/>
    <path d="M127.44 48.96V5.4H159.6V11.88H134.76V23.88H157.44V30.36H134.76V42.48H159.84V48.96H127.44Z" fill="white"/>
    <path d="M183.6 48.96V5.4H190.92V48.96H183.6Z" fill="white" opacity="0.4"/>
    <path d="M198 48.96V5.4H205.32V48.96H198Z" fill="white" opacity="0.4"/>
    <path d="M225.84 27.36C225.84 13.68 235.32 4.68 247.92 4.68C260.52 4.68 270 13.68 270 27.36C270 41.04 260.52 50.04 247.92 50.04C235.32 50.04 225.84 41.04 225.84 27.36ZM262.56 27.36C262.56 17.28 256.32 11.16 247.92 11.16C239.52 11.16 233.28 17.28 233.28 27.36C233.28 37.44 239.52 43.56 247.92 43.56C256.32 43.56 262.56 37.44 262.56 27.36Z" fill="white"/>
    <path d="M310.56 48.96H275.76V5.4H283.08V42.48H310.56V48.96Z" fill="white" opacity="0.5"/>
    <path d="M321.96 48.96H314.28L332.64 5.4H340.2L358.56 48.96H350.76L346.44 38.52H326.28L321.96 48.96ZM328.8 32.04H343.92L336.36 13.44L328.8 32.04Z" fill="white"/>
    <path d="M362.4 27.36C362.4 13.44 372 4.68 384.96 4.68C393.72 4.68 400.08 8.64 403.44 15.36L397.44 18.6C395.04 13.92 390.6 11.16 384.96 11.16C376.2 11.16 369.84 17.52 369.84 27.36C369.84 37.2 376.2 43.56 384.96 43.56C390.6 43.56 395.04 40.8 397.44 36.12L403.44 39.36C400.08 46.08 393.72 50.04 384.96 50.04C372 50.04 362.4 41.28 362.4 27.36Z" fill="white"/>
    <path d="M418.56 48.96H411.24V5.4H418.56V48.96Z" fill="white"/>
  </svg>
);

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
        <Logo size={56} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div style={{ opacity: 0.9 }}>{WORDMARK}</div>
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
