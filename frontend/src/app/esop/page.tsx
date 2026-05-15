import MarketingLayout from '@/components/MarketingLayout';

export default function ESOPPage() {
  return (
    <MarketingLayout>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--brand-purple)', textTransform: 'uppercase', marginBottom: 20 }}>
            ESOP
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, maxWidth: 700, marginBottom: 24 }}>
            Employee equity,<br />done right
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560 }}>
            CMA-compliant ESOP plans for Saudi companies. Model vesting schedules, track grant status, and give employees a clear view of what they've earned.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          {[
            {
              title: 'CMA ESOP framework',
              desc: 'Plans structured around Capital Market Authority guidelines for Saudi joint stock companies — not US 83(b) elections.',
              icon: '◈',
            },
            {
              title: 'Flexible vesting',
              desc: 'Time-based, milestone-based, or hybrid vesting. Cliff periods, acceleration triggers, and leave-of-absence clauses all supported.',
              icon: '◇',
            },
            {
              title: 'Grant letters',
              desc: 'Generate bilingual (EN/AR) grant agreement documents ready for signature. Watermarked for legal review before execution.',
              icon: '⬡',
            },
            {
              title: 'Employee portal',
              desc: 'Employees see their grant, vesting timeline, and exercisable options. No spreadsheets, no confusion.',
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
              Set up your first ESOP plan
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Model your pool size, vesting schedule, and dilution impact before issuing a single grant.
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
