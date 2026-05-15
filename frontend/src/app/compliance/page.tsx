import MarketingLayout from '@/components/MarketingLayout';

export default function CompliancePage() {
  return (
    <MarketingLayout>
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 72 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--brand-purple)', textTransform: 'uppercase', marginBottom: 20 }}>
            Compliance
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, maxWidth: 700, marginBottom: 24 }}>
            Built for Saudi<br />corporate law
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560 }}>
            01 Capital is built around the 2023 Saudi Companies Law from the ground up — not retrofitted from foreign jurisdictions. Every cap table action is traceable, every document is watermarked for legal review.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 80 }}>
          {[
            {
              title: 'Article-level validation',
              desc: 'Share transfers, capital increases, and board resolutions are validated against the relevant articles of the 2023 Saudi Companies Law.',
              icon: '◇',
            },
            {
              title: 'Immutable audit log',
              desc: 'Every action is timestamped and signed by the user who took it. Nothing is edited or deleted — the record is permanent.',
              icon: '⬡',
            },
            {
              title: 'MoC-ready documents',
              desc: 'Generate formatted documents for Ministry of Commerce filings. We structure — you and your lawyer verify before submitting.',
              icon: '◈',
            },
            {
              title: 'Data residency',
              desc: 'All production data is hosted on AWS Bahrain. Saudi corporate records stay within Saudi Arabia.',
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

        <div className="glass-panel" style={{ padding: '48px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 16 }}>
            Important notice
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 700 }}>
            01 Capital is a software tool, not a law firm. All documents generated carry a "DRAFT — REVIEW WITH LEGAL COUNSEL" watermark and must be reviewed by a qualified Saudi legal advisor before use in any corporate or regulatory filing. We surface and structure — we do not provide legal advice.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
