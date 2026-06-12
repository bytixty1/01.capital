'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CompanyResponse, RoundPreviewResponse, ProjectedSyntheticKind } from '@/lib/api';
import { SHARE_CLASS_SUGGESTIONS, defaultShareClass, isShareClassLocked, shareClassLabel } from '@/lib/share-class';
import { formatNumberWhole, formatSARWhole } from '@/lib/format';
import { thCompact, tdCompact } from '@/lib/table-styles';

const fieldLabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
};

function syntheticMeta(kind: ProjectedSyntheticKind | null | undefined): { color: string; label: string } | null {
  switch (kind) {
    case 'esop_pool':    return { color: 'var(--info)',          label: 'ESOP POOL' };
    case 'esop_grants':  return { color: 'var(--warn)',          label: 'ESOP GRANTS' };
    case 'convertible':  return { color: 'var(--brand-purple)',  label: 'CONVERTIBLE' };
    case 'esop_topup':   return { color: 'var(--info)',          label: 'ESOP TOP-UP' };
    case 'new_investor': return { color: 'var(--pos)',           label: 'NEW INVESTOR' };
    default:             return null;
  }
}

export default function RoundModelerPage() {
  const { id: companyId } = useParams<{ id: string }>();

  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const [roundSize, setRoundSize] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [shareClass, setShareClass] = useState('preferred-a');
  const [investorName, setInvestorName] = useState('');
  const [esopTopupPct, setEsopTopupPct] = useState('');

  const [result, setResult] = useState<RoundPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.companies.get(companyId)
      .then(c => {
        setCompany(c);
        setShareClass(c.entity_type === 'LLC' ? 'quota' : defaultShareClass(c.entity_type));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load company'))
      .finally(() => setLoadingCompany(false));
  }, [companyId]);

  // Default investor share-class label for SJSC/JSC is "preferred-a"; LLC is quota-only.
  useEffect(() => {
    if (company && company.entity_type !== 'LLC') {
      setShareClass('preferred-a');
    }
  }, [company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roundSize || Number(roundSize) <= 0) { setError('Round size must be greater than zero.'); return; }
    if (!pricePerShare || Number(pricePerShare) <= 0) { setError('Price per share must be greater than zero.'); return; }
    setLoading(true);
    try {
      const r = await api.capTable.previewRound(companyId, {
        round_size_sar: Number(roundSize),
        price_per_share: Number(pricePerShare),
        new_share_class: shareClass || undefined,
        new_investor_name: investorName || undefined,
        target_esop_post_money_pct: esopTopupPct ? Number(esopTopupPct) : undefined,
      });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to model round');
    } finally {
      setLoading(false);
    }
  }

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
          Round modeler
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Model a hypothetical priced round against your current cap table. Pure projection — nothing is saved.
        </p>
      </div>

      {/* Projection warning banner */}
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
        PROJECTION — Not committed to the event log. Re-run with different terms to compare scenarios.
      </div>

      {/* Input form */}
      <div className="glass-panel" style={{ padding: '24px 28px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabel}>Round size (SAR) *</label>
              <input
                type="number"
                value={roundSize}
                onChange={e => setRoundSize(e.target.value)}
                required
                min="0"
                step="1000"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="5000000"
              />
            </div>
            <div>
              <label style={fieldLabel}>Price per share (SAR) *</label>
              <input
                type="number"
                value={pricePerShare}
                onChange={e => setPricePerShare(e.target.value)}
                required
                min="0"
                step="0.01"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="10"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={fieldLabel}>{shareClassLabel(company?.entity_type)}</label>
              <input
                type="text"
                value={shareClass}
                onChange={e => setShareClass(e.target.value)}
                disabled={isShareClassLocked(company?.entity_type)}
                list="round-share-classes"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)', opacity: isShareClassLocked(company?.entity_type) ? 0.6 : 1 }}
              />
              {company && (
                <datalist id="round-share-classes">
                  {SHARE_CLASS_SUGGESTIONS[company.entity_type].map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Investor name (optional)</label>
              <input
                type="text"
                value={investorName}
                onChange={e => setInvestorName(e.target.value)}
                className="glass-input"
                placeholder="New Round Investors"
              />
            </div>
            <div>
              <label style={fieldLabel}>ESOP top-up to % post-money (optional)</label>
              <input
                type="number"
                value={esopTopupPct}
                onChange={e => setEsopTopupPct(e.target.value)}
                min="0"
                max="50"
                step="0.5"
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--neg)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
            <button
              type="submit"
              disabled={loading || loadingCompany}
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
              {loading ? 'Modeling…' : 'Model this round'}
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
              { label: 'Pre-money', value: formatSARWhole(result.pre_money_valuation_sar) },
              { label: 'Post-money', value: formatSARWhole(result.post_money_valuation_sar) },
              { label: 'New investor shares', value: formatNumberWhole(result.new_investor_shares) },
              { label: 'ESOP top-up shares', value: formatNumberWhole(result.esop_topup_shares) },
            ].map(tile => (
              <div key={tile.label} className="glass-panel" style={{ padding: '16px 18px' }}>
                <div style={{ ...fieldLabel, marginBottom: '8px' }}>{tile.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {tile.value}
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Pre-round → Post-round
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Pre {formatNumberWhole(result.pre_round_total_shares)} shares · Post {formatNumberWhole(result.post_round_total_shares)} shares
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={thCompact}>Stakeholder</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Share class</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Pre shares</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Pre %</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Post shares</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Post %</th>
                    <th style={{ ...thCompact, textAlign: 'right' }}>Δ pp</th>
                  </tr>
                </thead>
                <tbody>
                  {result.holdings.map((h, i) => {
                    const meta = syntheticMeta(h.synthetic);
                    const delta = Number(h.dilution_delta_pp);
                    const deltaColor = delta > 0.0001 ? 'var(--pos)' : delta < -0.0001 ? 'var(--neg)' : 'var(--text-tertiary)';
                    return (
                      <tr
                        key={`${h.stakeholder_name}-${h.share_class}-${i}`}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          borderLeft: meta ? `2px dashed ${meta.color}` : 'none',
                        }}
                      >
                        <td style={tdCompact}>
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
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{h.stakeholder_name}</span>
                            </span>
                          ) : (
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.stakeholder_name}</span>
                          )}
                        </td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{h.share_class}</td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumberWhole(h.pre_round_quantity)}</td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(h.pre_round_percentage).toFixed(2)}%</td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumberWhole(h.post_round_quantity)}</td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{Number(h.post_round_percentage).toFixed(2)}%</td>
                        <td style={{ ...tdCompact, textAlign: 'right', fontFamily: 'var(--font-mono)', color: deltaColor, fontWeight: 600 }}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                        </td>
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
    </div>
  );
}
