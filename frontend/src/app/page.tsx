'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    function handleScroll() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0);

      const sections = ['hero', 'cap-table', 'esop', 'compliance', 'instruments', 'pricing', 'cta'];
      let current = 'hero';
      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= window.innerHeight / 2) {
            current = sectionId;
          }
        }
      }
      setActiveSection(current);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* Left Sidebar Navigation */}
      <nav style={styles.sidebar}>
        <div style={styles.logo}>
          <Logo size={120} />
        </div>

        <div style={styles.timeline}>
          {[
            { id: 'hero', label: 'Overview' },
            { id: 'cap-table', label: 'Cap Table' },
            { id: 'esop', label: 'ESOP' },
            { id: 'compliance', label: 'Compliance' },
            { id: 'instruments', label: 'Instruments' },
            { id: 'pricing', label: 'Pricing' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                const section = document.getElementById(id);
                if (section) section.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                ...styles.dot,
                ...(activeSection === id ? styles.dotActive : {}),
              }}
              title={label}
            />
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Hero */}
        <section id="hero" style={styles.section}>
          <div style={styles.heroContent}>
            <p style={styles.eyebrow}>Equity Management • Cap Table</p>
            <h1 style={styles.h1}>Build and manage your cap table</h1>
            <p style={styles.lead}>Create a flawless cap table in minutes using our safe and secure software. Designed natively around Saudi Companies Law.</p>
            <a href="/register" style={styles.ctaButton}>Get started →</a>
          </div>
          <div style={styles.canvas}>
            <canvas id="canvas-3d" style={{ width: '100%', height: '100%' }} />
          </div>
        </section>

        {/* Cap Table */}
        <section id="cap-table" style={styles.featureSection}>
          <div style={styles.featureContent}>
            <h2 style={styles.h2}>Cap Table Management</h2>
            <p style={styles.sectionSub}>Track every share, every stakeholder, and every transaction with complete transparency and accuracy</p>
            <div style={styles.grid}>
              {[
                { title: 'Real-time Ownership', desc: 'See exactly who owns what, updated instantly as equity events occur.' },
                { title: 'Event-sourced Audit Log', desc: 'Every share issuance, transfer, and capital change is immutably recorded.' },
                { title: 'Legal-grade Accuracy', desc: 'Built on Saudi Companies Law with multi-class shares and governance rules.' },
                { title: 'Multi-stakeholder Support', desc: 'Manage founders, investors, employees, and entities seamlessly.' },
                { title: 'Percentage Ownership', desc: 'Automatic dilution tracking through fundraising rounds.' },
                { title: 'Share Transfers', desc: 'Record transfers with ROFR enforcement and full audit trail.' },
              ].map((card, i) => (
                <div key={i} style={styles.card}>
                  <h3 style={styles.h3}>{card.title}</h3>
                  <p style={styles.cardText}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ESOP */}
        <section id="esop" style={styles.featureSection}>
          <div style={styles.featureContent}>
            <h2 style={styles.h2}>ESOP & Employee Equity</h2>
            <p style={styles.sectionSub}>Align your team with equity grants, vesting schedules, and transparent tracking</p>
            <div style={styles.grid}>
              {[
                { title: 'Plan Creation', desc: 'Set up multiple ESOP plans with individual share pools and cliff periods.' },
                { title: 'Vesting Engine', desc: 'Automatic vesting calculation with cliff + graded monthly vesting.' },
                { title: 'Exercise Tracking', desc: 'Employees can exercise options and track exercisable shares per grant.' },
                { title: 'CMA Disclosures', desc: 'Generate quarterly ESOP disclosure packs for regulatory compliance.' },
                { title: 'Employee Portal', desc: 'Employees see their grants, vesting progress, and exercisable shares.' },
                { title: 'Dilution Impact', desc: 'Model different ESOP scenarios before committing.' },
              ].map((card, i) => (
                <div key={i} style={styles.card}>
                  <h3 style={styles.h3}>{card.title}</h3>
                  <p style={styles.cardText}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section id="compliance" style={styles.featureSection}>
          <div style={styles.featureContent}>
            <h2 style={styles.h2}>Compliance & Filings</h2>
            <p style={styles.sectionSub}>Stay ahead of regulatory requirements. We surface what's required, you decide when to file</p>
            <div style={styles.grid}>
              {[
                { title: 'MoC Filing Tracker', desc: 'Automatically detect Ministry of Commerce filing requirements.' },
                { title: 'Draft Documents', desc: 'Generate watermarked drafts of resolutions and amendments.' },
                { title: 'ZATCA Exports', desc: 'Structured JSON exports for zakat-year reporting.' },
                { title: 'Governance Flags', desc: 'Track ROFR, drag/tag, and profit allocation rules.' },
                { title: 'Audit Log', desc: 'Complete immutable record of every state-changing event.' },
                { title: 'Role-based Access', desc: 'Admin, Editor, Viewer, and Employee roles.' },
              ].map((card, i) => (
                <div key={i} style={styles.card}>
                  <h3 style={styles.h3}>{card.title}</h3>
                  <p style={styles.cardText}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Instruments */}
        <section id="instruments" style={styles.featureSection}>
          <div style={styles.featureContent}>
            <h2 style={styles.h2}>Sophisticated Instruments</h2>
            <p style={styles.sectionSub}>Handle real fundraising scenarios with convertible sukuk, phantom shares, and warrants</p>
            <div style={styles.grid}>
              {[
                { title: 'Sukuk Convertibles', desc: 'Model Sharia-compliant convertible sukuk instruments.' },
                { title: 'Phantom Shares', desc: 'Issue phantom share awards that track value without diluting.' },
                { title: 'Warrants', desc: 'Track warrant grants with exercise prices and expiry dates.' },
                { title: 'Anti-dilution', desc: 'Model weighted-average and full-ratchet anti-dilution provisions.' },
                { title: 'Liquidation Prefs', desc: 'Track preferred share liquidation preferences.' },
                { title: 'Scenario Modeling', desc: 'Test different fundraising scenarios and see the impact.' },
              ].map((card, i) => (
                <div key={i} style={styles.card}>
                  <h3 style={styles.h3}>{card.title}</h3>
                  <p style={styles.cardText}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={styles.featureSection}>
          <div style={styles.featureContent}>
            <h2 style={styles.h2}>Simple, transparent pricing</h2>
            <p style={styles.sectionSub}>Scale your equity management as your company grows</p>
            <div style={styles.grid}>
              {[
                { name: 'Founder', price: '0', items: ['1 company', 'Up to 20 stakeholders', 'Basic cap table', 'Community support'] },
                { name: 'Growth', price: '299', items: ['Up to 5 companies', 'Unlimited stakeholders', 'ESOP & instruments', 'Compliance filings', 'Priority support'] },
                { name: 'Enterprise', price: 'Custom', items: ['Unlimited companies', 'API access', 'Custom integrations', 'Dedicated support', 'SLA guarantees'] },
              ].map((tier, i) => (
                <div key={i} style={styles.pricingCard}>
                  <h3 style={styles.h3}>{tier.name}</h3>
                  <p style={styles.price}>
                    {tier.price === 'Custom' ? 'Custom' : `SAR ${tier.price}`}
                    {tier.price !== 'Custom' && <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>/month</span>}
                  </p>
                  <ul style={styles.priceList}>
                    {tier.items.map((item, j) => (
                      <li key={j} style={styles.priceItem}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" style={styles.featureSection}>
          <div style={styles.ctaContainer}>
            <h2 style={styles.h2}>Ready to manage your equity?</h2>
            <p style={styles.lead}>Join Saudi founders and investors building the future with transparency and compliance at their core.</p>
            <div style={styles.ctaButtons}>
              <a href="/register" style={styles.ctaButton}>Start free trial</a>
              <a href="#cap-table" style={styles.ctaButtonSecondary}>Learn more</a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <p>&copy; 2026 01 Capital. All rights reserved.</p>
          <p style={{ fontSize: '11px', marginTop: '12px', color: 'var(--text-tertiary)' }}>DRAFT — Review all cap table data with legal counsel before relying on it.</p>
        </footer>
      </main>

      {/* Canvas Script */}
      <script dangerouslySetInnerHTML={{ __html: `
        const canvas = document.getElementById('canvas-3d');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          let scrollProgress = 0;

          function resizeCanvas() {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          }

          resizeCanvas();
          window.addEventListener('resize', resizeCanvas);

          function draw() {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.rotate(scrollProgress * Math.PI * 2);

            ctx.fillStyle = 'rgba(166, 125, 250, 0.3)';
            ctx.strokeStyle = 'rgba(166, 125, 250, 0.5)';
            ctx.lineWidth = 2;

            ctx.fillRect(-100, -50, 200, 100);
            ctx.strokeRect(-100, -50, 200, 100);

            ctx.font = '10px monospace';
            ctx.fillStyle = 'rgba(166, 125, 250, 0.8)';
            ctx.textAlign = 'center';
            ctx.fillText('500 SAR', 0, -5);
            ctx.fillText('Central Bank', 0, 15);

            ctx.restore();
            requestAnimationFrame(draw);
          }

          window.addEventListener('scroll', () => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
          });

          draw();
        }
      ` }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '120px',
    height: '100vh',
    background: 'transparent',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 0',
  },
  logo: {
    position: 'absolute',
    top: '60px',
    width: '180px',
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '50px',
    marginTop: '200px',
    position: 'relative',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: 'transparent',
    border: '2px solid var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all 300ms ease',
  },
  dotActive: {
    background: 'var(--brand-purple)',
    borderColor: 'var(--brand-purple)',
    transform: 'scale(1.4)',
    boxShadow: '0 0 20px rgba(166, 125, 250, 0.6)',
  },
  main: {
    marginLeft: '120px',
    position: 'relative',
  },
  section: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 80px',
    gap: '100px',
  },
  heroContent: {
    flex: 1,
  },
  eyebrow: {
    color: 'var(--brand-purple)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '16px',
  },
  h1: {
    fontSize: '56px',
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: '24px',
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '40px',
    fontWeight: 700,
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  h3: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: 'var(--text-primary)',
  },
  lead: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    marginBottom: '40px',
    lineHeight: 1.8,
  },
  sectionSub: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    maxWidth: '650px',
    margin: '0 auto 80px',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--brand-purple)',
    color: '#fff',
    padding: '14px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    transition: 'all 150ms ease',
  },
  ctaButtonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    padding: '14px 32px',
    borderRadius: '10px',
    border: '1px solid var(--border-default)',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 150ms ease',
  },
  canvas: {
    flex: 1,
    height: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureSection: {
    background: 'var(--bg-surface)',
    borderTop: '1px solid var(--border-default)',
    padding: '120px 80px',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '28px',
  },
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: '40px',
    transition: 'all 200ms ease',
  },
  cardText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    lineHeight: 1.8,
  },
  pricingCard: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: '40px',
  },
  price: {
    color: 'var(--brand-purple)',
    fontWeight: 600,
    fontSize: '22px',
    margin: '16px 0 24px',
  },
  priceList: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    lineHeight: 2.2,
    listStyle: 'none',
  },
  priceItem: {
    margin: 0,
  },
  ctaContainer: {
    background: 'linear-gradient(135deg, rgba(166, 125, 250, 0.1) 0%, rgba(166, 125, 250, 0.05) 100%)',
    border: '1px solid rgba(166, 125, 250, 0.2)',
    borderRadius: '16px',
    padding: '80px 60px',
    textAlign: 'center',
    maxWidth: '1000px',
  },
  ctaButtons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footer: {
    marginLeft: 0,
    padding: '40px 80px',
    borderTop: '1px solid var(--border-default)',
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    fontSize: '12px',
  },
};
