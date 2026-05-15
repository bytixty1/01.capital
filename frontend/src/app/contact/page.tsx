import MarketingLayout from '@/components/MarketingLayout';

export default function ContactPage() {
  return (
    <MarketingLayout>
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--brand-purple)', textTransform: 'uppercase', marginBottom: 20 }}>
            Contact
          </p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 20 }}>
            Let's talk
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 480 }}>
            Early access is invite-only. If you're a Saudi startup working through a round or restructure, we'd like to hear from you.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
          {[
            { label: 'For founders', email: 'founders@01.capital', desc: 'Setting up your cap table, modeling a round, or converting an Establishment to LLC.' },
            { label: 'For investors', email: 'investors@01.capital', desc: 'Portfolio company cap table access, secondary transactions, or LP reporting.' },
          ].map(({ label, email, desc }) => (
            <div key={label} className="glass-panel" style={{ padding: '28px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--brand-purple)', marginBottom: 10 }}>{email}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: '40px 48px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 24 }}>
            Request early access
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Company name', type: 'text', placeholder: 'ZeroOne IT Solutions' },
              { label: 'Email', type: 'email', placeholder: 'founder@company.sa' },
              { label: 'Entity type', type: 'text', placeholder: 'LLC, Establishment, JSC…' },
            ].map(({ label, type, placeholder }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    padding: '11px 14px',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>What are you working on?</label>
              <textarea
                placeholder="We're closing a Series A and need to clean up our cap table before the data room opens…"
                rows={4}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  padding: '11px 14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="button"
              style={{
                marginTop: 8,
                background: 'var(--brand-purple)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                alignSelf: 'flex-start',
              }}
            >
              Submit request
            </button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
