import MarketingLayout from '@/components/MarketingLayout';

export default function InstrumentsPage() {
  return (
    <MarketingLayout>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--brand-purple)', textTransform: 'uppercase', marginBottom: 20 }}>
            Instruments
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, maxWidth: 700, marginBottom: 24 }}>
            Every equity instrument,<br />modeled correctly
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560 }}>
            From ordinary shares to convertible sukuk — model every instrument your company might issue. See real-time dilution impact before you commit to any round.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          {[
            {
              title: 'Ordinary shares',
              desc: 'Track founder shares, investor shares, and multi-class structures with per-class voting rights and liquidation preferences.',
              icon: '◇',
            },
            {
              title: 'Convertible notes',
              desc: 'Model valuation caps, discount rates, and trigger events. See exactly how each note converts at different round valuations.',
              icon: '◈',
            },
            {
              title: 'Warrants',
              desc: 'Issue warrants with strike prices, expiry dates, and anti-dilution provisions. Track exercise status in real time.',
              icon: '⬡',
            },
            {
              title: 'ESOP options',
              desc: 'Options granted under your CMA-compliant ESOP plan, including unvested, vested, exercised, and expired status.',
              icon: '◆',
            },
          ].map(({ title, desc, icon }) => (
            <div key={title} className="glass-panel" style={{ padding: '32px 28px' }}>
              <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.02em' }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
              Model your round before you close it
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              See who owns what, fully diluted, before any term sheet is signed.
            </p>
          </div>
          <a href="/register" style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none', padding: '12px 28px', borderRadius: 8, background: 'var(--brand-purple)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Get started
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
