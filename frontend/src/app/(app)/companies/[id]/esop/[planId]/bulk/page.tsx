'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, BulkGrantResponse, EsopPlanResponse, StakeholderResponse } from '@/lib/api';
import { formatNumber, todayISO } from '@/lib/format';

type ParsedRow = {
  raw: string;
  stakeholder_id: string;
  quantity: number;
  grant_date: string;
  exercise_price: number | undefined;
  cliff_months: number;
  total_months: number;
  localError: string | undefined;
};

const SAMPLE = `# name_or_id, quantity, grant_date(YYYY-MM-DD), exercise_price, cliff_months, total_months
Mohammed Al-Rashidi, 5000, 2026-01-01, 1.00, 12, 48
Sara Al-Otaibi, 3000, 2026-01-01, 1.00, 12, 48`;

export default function BulkGrantPage() {
  const { id: companyId, planId } = useParams<{ id: string; planId: string }>();
  const [plan, setPlan] = useState<EsopPlanResponse | null>(null);
  const [stakeholders, setStakeholders] = useState<StakeholderResponse[]>([]);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<BulkGrantResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.esop.getPlan(companyId, planId), api.stakeholders.list(companyId)])
      .then(([p, s]) => { setPlan(p); setStakeholders(s); })
      .catch(e => setError(e.message));
  }, [companyId, planId]);

  // Resolve a CSV cell to a stakeholder UUID — accepts either the UUID or an exact name match.
  const nameToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stakeholders) map.set(s.name_en.trim().toLowerCase(), s.id);
    return map;
  }, [stakeholders]);
  const idSet = useMemo(() => new Set(stakeholders.map(s => s.id)), [stakeholders]);

  function parseRows(): ParsedRow[] {
    const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      const who = parts[0] ?? '';
      const qty = parts[1] ?? '';
      const gdate = parts[2] ?? '';
      const price = parts[3] ?? '';
      const cliff = parts[4] ?? '';
      const total = parts[5] ?? '';
      let stakeholder_id = '';
      let localError: string | undefined;
      if (idSet.has(who)) stakeholder_id = who;
      else if (nameToId.has(who.toLowerCase())) stakeholder_id = nameToId.get(who.toLowerCase())!;
      else localError = `unknown stakeholder "${who}"`;

      const quantity = Number(qty);
      if (!quantity || quantity <= 0) localError = localError ?? 'invalid quantity';

      return {
        raw: line,
        stakeholder_id,
        quantity,
        grant_date: gdate || todayISO(),
        exercise_price: price ? Number(price) : undefined,
        cliff_months: cliff ? Number(cliff) : 12,
        total_months: total ? Number(total) : 48,
        localError,
      };
    });
  }

  async function runPreview() {
    setError(null); setCommitted(false); setPreview(null);
    const rows = parseRows();
    if (rows.length === 0) { setError('No rows to import. Paste CSV data above.'); return; }
    const localErr = rows.find(r => r.localError);
    if (localErr) { setError(`Fix row "${localErr.raw}": ${localErr.localError}`); return; }
    setBusy(true);
    try {
      const res = await api.esop.bulkGrants(companyId, planId, {
        dry_run: true,
        grants: rows.map(r => ({
          stakeholder_id: r.stakeholder_id, quantity: r.quantity, grant_date: r.grant_date,
          exercise_price: r.exercise_price, cliff_months: r.cliff_months, total_months: r.total_months,
        })),
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally { setBusy(false); }
  }

  async function commit() {
    setError(null);
    const rows = parseRows();
    setBusy(true);
    try {
      const res = await api.esop.bulkGrants(companyId, planId, {
        dry_run: false,
        grants: rows.map(r => ({
          stakeholder_id: r.stakeholder_id, quantity: r.quantity, grant_date: r.grant_date,
          exercise_price: r.exercise_price, cliff_months: r.cliff_months, total_months: r.total_months,
        })),
      });
      setPreview(res);
      setCommitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally { setBusy(false); }
  }

  const idToName = useMemo(() => Object.fromEntries(stakeholders.map(s => [s.id, s.name_en])), [stakeholders]);

  return (
    <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div><a href={`/companies/${companyId}/esop/${planId}`} style={{ color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>← Plan</a></div>

      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Bulk grant import</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Paste CSV: one grant per line as <span style={{ fontFamily: 'var(--font-mono)' }}>name_or_id, quantity, grant_date, exercise_price, cliff_months, total_months</span>.
          Preview validates every row against the pool; nothing is created until you confirm.
        </p>
        {plan && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            Pool available: {formatNumber(Number(plan.total_pool) - Number(plan.allocated))} of {formatNumber(plan.total_pool)}
          </p>
        )}
      </div>

      <textarea
        value={csv}
        onChange={e => { setCsv(e.target.value); setPreview(null); setCommitted(false); }}
        rows={10}
        placeholder={SAMPLE}
        className="glass-input"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'vertical', lineHeight: 1.6 }}
      />

      {error && (
        <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: 'var(--neg)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={runPreview} disabled={busy} className="btn-primary" style={{ borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Validating…' : 'Preview'}
        </button>
      </div>

      {preview && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{preview.valid_rows}/{preview.total_rows}</span> rows valid ·
              total <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(preview.total_quantity)}</span> ·
              pool after <span style={{ fontFamily: 'var(--font-mono)' }}>{formatNumber(preview.pool_remaining_after)}</span>
            </div>
            {committed ? (
              <span style={{ fontSize: '13px', color: 'var(--pos)', fontWeight: 600 }}>✓ {preview.committed} grants created</span>
            ) : (
              <button
                onClick={commit}
                disabled={busy || preview.valid_rows !== preview.total_rows}
                className="btn-primary"
                style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: (busy || preview.valid_rows !== preview.total_rows) ? 'not-allowed' : 'pointer', opacity: (busy || preview.valid_rows !== preview.total_rows) ? 0.5 : 1 }}
              >
                Confirm & create {preview.total_rows} grants
              </button>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Stakeholder</th>
              <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
              <th style={{ ...th, textAlign: 'right' }}>Status</th>
            </tr></thead>
            <tbody>
              {preview.results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={td}>{idToName[r.stakeholder_id] ?? r.stakeholder_id}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatNumber(r.quantity)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {r.ok
                      ? <span style={{ color: 'var(--pos)', fontSize: '12px' }}>✓ ok</span>
                      : <span style={{ color: 'var(--neg)', fontSize: '12px' }}>{r.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {committed && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--glass-border)' }}>
              <a href={`/companies/${companyId}/esop/${planId}`} className="link-accent" style={{ fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
                ← Back to plan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' };
const td: React.CSSProperties = { padding: '11px 20px', fontSize: '13px', color: 'var(--text-primary)' };
