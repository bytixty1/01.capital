'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  api,
  EsopPlanResponse,
  GrantResponse,
  IFRS2ExpenseResponse,
  StakeholderResponse,
} from '@/lib/api';
import { formatNumber, formatNumberWhole, formatSAR, formatSARWhole } from '@/lib/format';

export default function EsopPlanPage() {
  const { id: companyId, planId } = useParams<{ id: string; planId: string }>();
  const [plan, setPlan] = useState<EsopPlanResponse | null>(null);
  const [grants, setGrants] = useState<GrantResponse[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── IFRS 2 calculator state ─────────────────────────────────────────────────
  const [selectedGrantId, setSelectedGrantId] = useState('');
  const [spotPrice, setSpotPrice] = useState('');
  const [volatility, setVolatility] = useState('0.40');
  const [riskFreeRate, setRiskFreeRate] = useState('0.045');
  const [dividendYield, setDividendYield] = useState('0');
  const [expectedLifeYears, setExpectedLifeYears] = useState('');
  const [ifrs2Result, setIfrs2Result] = useState<IFRS2ExpenseResponse | null>(null);
  const [ifrs2Loading, setIfrs2Loading] = useState(false);
  const [ifrs2Error, setIfrs2Error] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.esop.getPlan(companyId, planId),
      api.esop.listGrants(companyId, planId),
      api.stakeholders.list(companyId),
    ])
      .then(([p, g, s]) => {
        setPlan(p);
        setGrants(g);
        setStakeholders(s);
        if (g[0]) setSelectedGrantId(g[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, planId]);

  async function computeIfrs2(e: React.FormEvent) {
    e.preventDefault();
    setIfrs2Error(null);
    setIfrs2Result(null);
    if (!selectedGrantId) {
      setIfrs2Error('Pick a grant to value.');
      return;
    }
    if (!spotPrice || Number(spotPrice) <= 0) {
      setIfrs2Error('Spot price must be greater than zero.');
      return;
    }
    setIfrs2Loading(true);
    try {
      const r = await api.esop.ifrs2Expense(companyId, planId, selectedGrantId, {
        spot_price_sar: Number(spotPrice),
        volatility: Number(volatility),
        risk_free_rate: Number(riskFreeRate),
        dividend_yield: dividendYield ? Number(dividendYield) : 0,
        expected_life_years: expectedLifeYears ? Number(expectedLifeYears) : undefined,
      });
      setIfrs2Result(r);
    } catch (err) {
      setIfrs2Error(err instanceof Error ? err.message : 'Failed to compute IFRS 2 expense');
    } finally {
      setIfrs2Loading(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading…</p>;
  if (error) return <p style={{ color: 'var(--neg)', fontSize: '13px' }}>{error}</p>;
  if (!plan) return null;

  const available = Number(plan.total_pool) - Number(plan.allocated);
  const stakeMap = Object.fromEntries(stakeholders.map(s => [s.id, s.name_en]));

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}/esop`} style={s.backLink}>← ESOP Plans</a></div>
      <div style={s.header}>
        <div>
          <h1 style={s.heading}>{plan.name}</h1>
          <span style={{ ...s.badge, color: plan.status === 'active' ? 'var(--pos)' : 'var(--text-tertiary)' }}>{plan.status}</span>
        </div>
        {plan.status === 'active' && <a href={`/companies/${companyId}/esop/${planId}/grant`} className="btn-primary" style={s.cta}>+ Issue grant</a>}
      </div>

      <div style={s.statsRow}>
        {[
          { label: 'Total pool', value: formatNumber(plan.total_pool) },
          { label: 'Allocated', value: formatNumber(plan.allocated) },
          { label: 'Available', value: formatNumber(available) },
          { label: 'Share class', value: plan.share_class },
        ].map(({ label, value }) => (
          <div key={label} style={s.stat}>
            <span style={s.statLabel}>{label}</span>
            <span style={s.statValue}>{value}</span>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}><h2 style={s.sectionTitle}>Grants ({grants.length})</h2></div>
        {grants.length === 0 ? (
          <p style={{ ...s.muted, padding: '24px 20px' }}>No grants issued yet.</p>
        ) : (
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Stakeholder</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Quantity</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Grant date</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Vesting</th>
              <th style={{ ...s.th, textAlign: 'right' as const }}>Status</th>
            </tr></thead>
            <tbody>
              {grants.map(g => (
                <tr key={g.id} style={s.row}>
                  <td style={s.td}>{stakeMap[g.stakeholder_id] ?? g.stakeholder_id}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>{formatNumber(g.quantity)}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>{g.grant_date}</td>
                  <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>
                    {g.vesting_schedule.cliff_months}m cliff / {g.vesting_schedule.total_months}m total
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' as const }}>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── IFRS 2 expense calculator ─────────────────────────────────────── */}
      {grants.length > 0 && (
        <div style={{ ...s.section, marginTop: '28px' }}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>IFRS 2 share-based payment expense</h2>
            <p style={{ ...s.muted, fontSize: '12px', marginTop: '6px' }}>
              Auditor-required calculation. Black-Scholes fair value × quantity, amortised straight-line over the vesting period (yearly).
              Inputs are not persisted — re-enter for each scenario.
            </p>
          </div>

          <form onSubmit={computeIfrs2} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Grant</span>
                <select value={selectedGrantId} onChange={e => setSelectedGrantId(e.target.value)} className="glass-input" style={{ fontFamily: 'var(--font-mono)' }}>
                  {grants.map(g => (
                    <option key={g.id} value={g.id}>
                      {stakeMap[g.stakeholder_id] ?? g.stakeholder_id} — {formatNumber(g.quantity)} ({g.grant_date})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Spot price (SAR/share) *</span>
                <input type="number" min="0" step="0.01" required value={spotPrice} onChange={e => setSpotPrice(e.target.value)} placeholder="10.00" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Volatility (annualised)</span>
                <input type="number" min="0.01" max="2" step="0.01" value={volatility} onChange={e => setVolatility(e.target.value)} placeholder="0.40" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Risk-free rate (annual)</span>
                <input type="number" min="0" max="0.30" step="0.001" value={riskFreeRate} onChange={e => setRiskFreeRate(e.target.value)} placeholder="0.045" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Dividend yield</span>
                <input type="number" min="0" max="0.30" step="0.001" value={dividendYield} onChange={e => setDividendYield(e.target.value)} placeholder="0" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={s.fieldLabel}>Expected life (years, optional)</span>
                <input type="number" min="0.5" max="20" step="0.5" value={expectedLifeYears} onChange={e => setExpectedLifeYears(e.target.value)} placeholder="auto" className="glass-input" style={{ fontFamily: 'var(--font-mono)' }} />
              </label>
            </div>

            {ifrs2Error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--neg)', fontSize: '13px' }}>
                {ifrs2Error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={ifrs2Loading} className="btn-primary" style={{ borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: ifrs2Loading ? 'not-allowed' : 'pointer', opacity: ifrs2Loading ? 0.6 : 1 }}>
                {ifrs2Loading ? 'Computing…' : 'Compute expense'}
              </button>
            </div>
          </form>

          {ifrs2Result && (
            <div style={{ borderTop: '1px solid var(--border-default)' }}>
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--border-default)' }}>
                {[
                  { label: 'Fair value / option', value: formatSAR(ifrs2Result.fair_value_per_option_sar, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
                  { label: 'Total grant expense', value: formatSARWhole(ifrs2Result.total_grant_expense_sar) },
                  { label: 'Vesting period', value: `${ifrs2Result.total_vesting_months} months` },
                  { label: 'Method', value: ifrs2Result.method.replace(/_/g, ' ') },
                ].map(tile => (
                  <div key={tile.label} style={{ background: 'var(--bg-surface)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={s.statLabel}>{tile.label}</span>
                    <span style={{ ...s.statValue, fontSize: '15px' }}>{tile.value}</span>
                  </div>
                ))}
              </div>

              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Period start</th>
                  <th style={s.th}>Period end</th>
                  <th style={{ ...s.th, textAlign: 'right' as const }}>Period expense (SAR)</th>
                  <th style={{ ...s.th, textAlign: 'right' as const }}>Cumulative (SAR)</th>
                </tr></thead>
                <tbody>
                  {ifrs2Result.schedule.map((row, i) => (
                    <tr key={i} style={s.row}>
                      <td style={{ ...s.td, fontFamily: 'var(--font-mono)' }}>{row.period_start}</td>
                      <td style={{ ...s.td, fontFamily: 'var(--font-mono)' }}>{row.period_end}</td>
                      <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)' }}>
                        {formatNumberWhole(row.period_expense_sar)}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatNumberWhole(row.cumulative_expense_sar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '900px' }, back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  badge: { fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  cta: { textDecoration: 'none', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border-default)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '28px' },
  stat: { background: 'var(--bg-surface)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' },
  statLabel: { fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  statValue: { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  section: { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  sectionHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border-default)' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { padding: '10px 20px', textAlign: 'left' as const, fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' },
  row: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '12px 20px', fontSize: '13px', color: 'var(--text-primary)' },
  fieldLabel: { fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
};
