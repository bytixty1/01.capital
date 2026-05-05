export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '48px',
        maxWidth: '720px',
        margin: '0 auto',
      }}
    >
      <span
        style={{
          color: 'var(--brand-purple)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}
      >
        ZeroCaps · v0.1.0
      </span>

      <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '16px', lineHeight: 1.1 }}>
        Cap table software for Saudi startups.
      </h1>

      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
        Built natively around the 2023 Saudi Companies Law. SJSC, LLC, and JSC. ESOPs,
        sukuk-convertibles, family charters, ZATCA exports. Currently in discovery phase.
      </p>

      <div
        style={{
          padding: '16px 20px',
          border: '1px solid var(--border-default)',
          borderLeft: '3px solid var(--brand-purple)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          fontSize: '14px',
        }}
      >
        Pre-product. No sign-up yet. We are interviewing Saudi founders to validate the
        problem space before building. If you&apos;re a Saudi founder dealing with cap
        table headaches, we&apos;d love 30 minutes of your time. Reach out:{' '}
        <a
          href="mailto:zeroone.techcompany@gmail.com"
          style={{ color: 'var(--brand-purple)', textDecoration: 'none' }}
        >
          zeroone.techcompany@gmail.com
        </a>
      </div>
    </main>
  );
}
