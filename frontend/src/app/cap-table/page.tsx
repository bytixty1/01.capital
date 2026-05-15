import MarketingLayout from '@/components/MarketingLayout';

export default function CapTablePage() {
  return (
    <MarketingLayout>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--brand-purple)', textTransform: 'uppercase', marginBottom: 20 }}>
            Cap Table
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, maxWidth: 700, marginBottom: 24 }}>
            Ownership clarity,<br />at every stage
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560 }}>
            A real-time cap table built around the 2023 Saudi Companies Law. Every issuance, transfer, and dilution event is recorded immutably — your ownership register is always audit-ready.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          {[
            {
              title: 'Event-sourced ledger',
              desc: 'Every share movement is an immutable event. Current state is materialized from history — nothing is ever deleted or silently updated.',
              icon: '⬡',
            },
            {
              title: 'Fully diluted view',
              desc: 'Model ESOP pools, convertible instruments, and warrants. See post-money ownership before you sign.',
              icon: '◈',
            },
            {
              title: 'Saudi entity types',
              desc: 'LLC, SJSC, and JSC ownership structures mapped correctly — not imported from US Delaware models.',
              icon: '◇',
            },
            {
              title: 'Waterfall modeling',
              desc: 'Simulate liquidation preferences, participation caps, and pro-rata rights across all share classes.',
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
              Ready to bring your cap table online?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Start with a free import of your existing shareholder register.
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
