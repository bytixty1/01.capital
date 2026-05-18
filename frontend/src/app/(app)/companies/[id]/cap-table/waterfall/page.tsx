'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  api,
  Breakpoint,
  CapTableResponse,
  CompanyResponse,
  ParticipationType,
  SyntheticKind,
  WaterfallPreference,
  WaterfallResponse,
} from '@/lib/api';

const fieldLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '13px',
  color: 'var(--text-secondary)',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  textAlign: 'left',
  borderBottom: '1px solid var(--glass-border)',
  fontFamily: 'var(--font-mono)',
};

function syntheticMeta(kind: SyntheticKind | null | undefined): { color: string; label: string } | null {
  switch (kind) {
    case 'esop_pool':   return { color: 'var(--info)',         label: 'ESOP POOL' };
    case 'esop_grants': return { color: 'var(--warn)',         label: 'ESOP GRANTS' };
    case 'convertible': return { color: 'var(--brand-purple)', label: 'CONVERTIBLE' };
    default:            return null;
  }
}

function breakpointMeta(type: Breakpoint['breakpoint_type']): { color: string; label: string } {
  switch (type) {
    case 'common_starts': return { color: 'var(--info)',         label: 'COMMON STARTS' };
    case 'conversion':    return { color: 'var(--brand-purple)', label: 'CONVERSION' };
    case 'cap_hit':       return { color: 'var(--warn)',         label: 'CAP HIT' };
  }
}

function fmtSAR(n: number): string {
  return n.toLocaleString('en-SA', { maximumFractionDigits: 0 });
}

type PrefRowState = {
  share_class: string;
  isSynthetic: boolean;
  seniority: string;
  multiplier: string;
  participation: ParticipationType;
  cap_multiplier: string;
  original_investment_sar: string;
};

export default function WaterfallPage() {
  const { id: companyId } = useParams<{ id: string }>();

  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [capTable, setCapTable] = useState<CapTableResponse | null>(null);
  const [loadingCap, setLoadingCap] = useState(true);

  const [exitValue, setExitValue] = useState('');
  const [prefRows, setPrefRows] = useState<PrefRowState[]>([]);

  const [result, setResult] = useState<WaterfallResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load company + diluted cap table; derive preference rows from share classes present.
  useEffect(() => {
    Promise.all([
      api.companies.get(companyId),
      api.capTable.get(companyId, { diluted: true }),
    ])
      .then(([c, ct]) => {
        setCompany(c);
        setCapTable(ct);
        // Build rows: one per share_class, marked synthetic if all holdings of that class are synthetic.
        const byClass = new Map<string, { allSynth: boolean }>();
        for (const h of ct.holdings) {
          const prev = byClass.get(h.share_class);
          const thisSynth = h.synthetic != null;
          if (prev) prev.allSynth = prev.allSynth && thisSynth;
          else byClass.set(h.share_class, { allSynth: thisSynth });
        }
        const rows: PrefRowState[] = Array.from(byClass.entries()).map(([cls, meta]) => ({
          share_class: cls,
          isSynthetic: meta.allSynth,
          seniority: '1',
          multiplier: meta.allSynth || cls === 'ordinary' || cls === 'quota' ? '0' : '1',
          participation: 'non_participating' as ParticipationType,
          cap_multiplier: '',
          original_investment_sar: '0',
        }));
        // Stable sort: real classes first, alpha within.
        rows.sort((a, b) => {
          if (a.isSynthetic !== b.isSynthetic) return a.isSynthetic ? 1 : -1;
          return a.share_class.localeCompare(b.share_class);
        });
        setPrefRows(rows);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'))
      .finally(() => setLoadingCap(false));
  }, [companyId]);

  function updateRow(idx: number, patch: Partial<PrefRowState>) {
    setPrefRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!exitValue || Number(exitValue) <= 0) {
      setError('Exit value must be greater than zero.');
      return;
    }
    setLoading(true);
    try {
      const preferences: WaterfallPreference[] = prefRows
        .filter(r => !r.isSynthetic)
        .map(r => ({
          share_class: r.share_class,
          seniority: Number(r.seniority) || 1,
          multiplier: Number(r.multiplier) || 0,
          participation: r.participation,
          cap_multiplier: r.participation === 'capped' && r.cap_multiplier
            ? Number(r.cap_multiplier)
            : undefined,
          original_investment_sar: Number(r.original_investment_sar) || 0,
        }));
      const r = await api.capTable.waterfall(companyId, {
        exit_value_sar: Number(exitValue),
        preferences,
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compute waterfall');
    } finally {
      setLoading(false);
    }
  }

  const commonStartsAt = useMemo(() => {
    if (!result) return null;
    const bp = result.breakpoints.find(b => b.breakpoint_type === 'common_starts');
    return bp ? Number(bp.exit_value_sar) : 0;
  }, [result]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Link
        href={`/companies/${companyId}`}
        className="link-accent"
        style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to company
      </Link>

      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Waterfall analysis
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Model an exit: distribute proceeds across share classes per liquidation preferences,
          and surface the breakpoints where each class becomes economically meaningful.
        </p>
      </div>

      {/* Projection banner */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '12px 16px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '8px',
        color: 'var(--warn)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
          <circle cx="8" cy="8" r="7" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M8 5v3.5M8 11h.01" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        PROJECTION — Not committed to the event log. Preferences are not saved; re-enter for each scenario.
      </div>

      {/* Input form */}
      <div className="glass-panel" style={{ padding: '24px 28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabel}>Exit value (SAR) *</label>
              <input
                type="number"
                value={exitValue}
                onChange={e => setExitValue(e.target.value)}
                required
                min="0"
                step="1000"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="50000000"
              />
            </div>
          </div>

          <div>
            <div style={{ ...fieldLabel, marginBottom: '10px' }}>Liquidation preferences per share class</div>
            {loadingCap ? (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading classes…</p>
            ) : prefRows.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>No share classes detected on this cap table.</p>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Share class</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Seniority</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Multiplier</th>
                      <th style={thStyle}>Participation</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Cap (x)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Original investment (SAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prefRows.map((r, idx) => (
                      <tr
                        key={r.share_class}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          opacity: r.isSynthetic ? 0.55 : 1,
                        }}
                      >
                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {r.share_class}
                          {r.isSynthetic && (
                            <span style={{ fontSize: '10px', marginLeft: '8px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                              synthetic — common pro-rata
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            disabled={r.isSynthetic}
                            value={r.seniority}
                            onChange={e => updateRow(idx, { seniority: e.target.value })}
                            className="glass-input"
                            style={{ width: '70px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            disabled={r.isSynthetic}
                            value={r.multiplier}
                            onChange={e => updateRow(idx, { multiplier: e.target.value })}
                            className="glass-input"
                            style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                        <td style={tdStyle}>
                          <select
                            disabled={r.isSynthetic || Number(r.multiplier) === 0}
                            value={r.participation}
                            onChange={e => updateRow(idx, { participation: e.target.value as ParticipationType })}
                            className="glass-input"
                            style={{ fontFamily: 'var(--font-mono)', padding: '8px 10px' }}
                          >
                            <option value="non_participating">Non-participating</option>
                            <option value="participating">Participating</option>
                            <option value="capped">Capped</option>
                          </select>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            disabled={r.isSynthetic || r.participation !== 'capped'}
                            value={r.cap_multiplier}
                            onChange={e => updateRow(idx, { cap_multiplier: e.target.value })}
                            placeholder="—"
                            className="glass-input"
                            style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            disabled={r.isSynthetic || Number(r.multiplier) === 0}
                            value={r.original_investment_sar}
                            onChange={e => updateRow(idx, { original_investment_sar: e.target.value })}
                            className="glass-input"
                            style={{ width: '160px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: 1.6 }}>
              Common, quotas, and synthetic rows (ESOP pool, grants, convertibles) participate pro-rata in the common pool.
              Preferred classes elect to convert when convert-value exceeds pref-value.
            </p>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--neg)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
            <button
              type="submit"
              disabled={loading || loadingCap}
              className="btn-primary"
              style={{
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Computing…' : 'Compute waterfall'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Exit value', value: `SAR ${fmtSAR(Number(result.exit_value_sar))}` },
              { label: 'Total distributed', value: `SAR ${fmtSAR(Number(result.total_distributed_sar))}` },
              { label: 'Breakpoints', value: String(result.breakpoints.length) },
              {
                label: 'Common starts at',
                value: commonStartsAt != null && commonStartsAt > 0
                  ? `SAR ${fmtSAR(commonStartsAt)}`
                  : 'SAR 0',
              },
            ].map(tile => (
              <div key={tile.label} className="glass-panel" style={{ padding: '16px 18px' }}>
                <div style={{ ...fieldLabel, marginBottom: '8px' }}>{tile.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {/* Breakpoints */}
          {result.breakpoints.length > 0 && (
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Breakpoints</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Exit values at which class behaviour changes. Ordered ascending.
                </p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Type</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Exit value (SAR)</th>
                      <th style={thStyle}>Share class</th>
                      <th style={thStyle}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakpoints.map((b, i) => {
                      const meta = breakpointMeta(b.breakpoint_type);
                      return (
                        <tr
                          key={`${b.breakpoint_type}-${b.share_class}-${i}`}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.04)',
                              color: meta.color,
                              fontFamily: 'var(--font-mono)',
                            }}>{meta.label}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {fmtSAR(Number(b.exit_value_sar))}
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>
                            {b.share_class ?? '—'}
                          </td>
                          <td style={{ ...tdStyle, fontStyle: 'italic' }}>{b.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-class distribution */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Distribution by share class</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Share class</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Distribution (SAR)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>% of exit</th>
                    <th style={thStyle}>Election</th>
                  </tr>
                </thead>
                <tbody>
                  {result.class_distributions.map(c => (
                    <tr key={c.share_class} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{c.share_class}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>SAR {fmtSAR(Number(c.total_distribution_sar))}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(c.pct_of_exit).toFixed(2)}%</td>
                      <td style={tdStyle}>
                        {c.converted ? (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--brand-purple)',
                            fontFamily: 'var(--font-mono)',
                          }}>CONVERTED</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-stakeholder distribution */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Distribution by stakeholder</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Stakeholder</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Share class</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Shares</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Distribution (SAR)</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>% of exit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stakeholder_distributions.map((s, i) => {
                    const meta = syntheticMeta(s.synthetic);
                    return (
                      <tr
                        key={`${s.stakeholder_name}-${s.share_class}-${i}`}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          borderLeft: meta ? `2px dashed ${meta.color}` : 'none',
                        }}
                      >
                        <td style={tdStyle}>
                          {meta ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.04)',
                                color: meta.color,
                                fontFamily: 'var(--font-mono)',
                              }}>{meta.label}</span>
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{s.stakeholder_name}</span>
                            </span>
                          ) : (
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.stakeholder_name}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.share_class}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmtSAR(Number(s.quantity))}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                          SAR {fmtSAR(Number(s.distribution_sar))}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(s.pct_of_exit).toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-disabled)', textAlign: 'center', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            Re-run with different terms to compare scenarios. Nothing on this page is saved.
          </p>
        </>
      )}
      {company === null && !loadingCap && error == null && (
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading company…</p>
      )}
    </div>
  );
}
