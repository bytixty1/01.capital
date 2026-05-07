'use client';

import { useState } from 'react';
import { api, EntityType } from '@/lib/api';

const CR_REGIONS: Record<string, string> = {
  '1': 'Riyadh',
  '2': 'Makkah / Jeddah',
  '3': 'Madinah',
  '4': 'Qassim',
  '5': 'Eastern Province',
  '6': 'Aseer',
  '7': 'Tabouk',
  '8': 'Hail',
  '9': 'Northern Border',
};

function validateCR(cr: string): { ok: boolean; region?: string; error?: string } {
  if (!cr) return { ok: true };
  if (!/^\d+$/.test(cr)) return { ok: false, error: 'Digits only' };
  if (cr.length !== 10) return { ok: false, error: `${cr.length}/10 digits` };
  const region = CR_REGIONS[cr[0]];
  if (!region) return { ok: false, error: 'Unrecognised region code' };
  return { ok: true, region };
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={tg.wrap}>
      <div style={{ ...tg.track, background: checked ? 'var(--brand-purple)' : 'var(--bg-elevated)', border: `1px solid ${checked ? 'var(--brand-purple)' : 'var(--border-default)'}` }}
        onClick={() => onChange(!checked)}>
        <div style={{ ...tg.thumb, transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
      <span style={tg.label}>{label}</span>
    </label>
  );
}

const tg: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' as const },
  track: { width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 150ms, border 150ms', flexShrink: 0 },
  thumb: { width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'transform 150ms', flexShrink: 0 },
  label: { fontSize: '13px', color: 'var(--text-secondary)' },
};

const ENTITY_INFO: Record<EntityType, { arabic: string; desc: string; note: string }> = {
  LLC: { arabic: 'شركة ذات مسؤولية محدودة', desc: 'Limited Liability Company', note: 'Most common for startups. Partners share limited to their contributions. Art. 51–115.' },
  SJSC: { arabic: 'شركة مساهمة مبسطة', desc: 'Simplified Joint Stock Company', note: 'Designed for startups and SMEs. Easier incorporation, ESOP-ready. Art. 154–183.' },
  JSC: { arabic: 'شركة مساهمة', desc: 'Joint Stock Company', note: 'For larger companies. More governance requirements. Art. 57–153.' },
};

export default function NewCompanyPage() {
  // Identity
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('LLC');
  const [crNumber, setCrNumber] = useState('');
  const [incorporationDate, setIncorporationDate] = useState('');

  // Capital
  const [authorizedCapital, setAuthorizedCapital] = useState('');
  const [paidUpCapital, setPaidUpCapital] = useState('');
  const [parValue, setParValue] = useState('');
  const [fiscalYearStart, setFiscalYearStart] = useState('');

  // AoA flags
  const [hasRofr, setHasRofr] = useState(false);
  const [rofrDays, setRofrDays] = useState('30');
  const [hasDragTag, setHasDragTag] = useState(false);
  const [hasTagAlong, setHasTagAlong] = useState(false);
  const [profitNotes, setProfitNotes] = useState('');

  // UI
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mocLoading, setMocLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const crValidation = validateCR(crNumber);
  const nameEnError = touched.nameEn && nameEn.trim().length < 2 ? 'Required — at least 2 characters' : null;
  const crError = touched.cr && !crValidation.ok ? crValidation.error : null;
  const paidUpError = touched.paidUp && paidUpCapital && Number(paidUpCapital) < 0 ? 'Must be ≥ 0' : null;

  function canProceedStep1() {
    return nameEn.trim().length >= 2 && crValidation.ok;
  }

  function handleStep1Next() {
    setTouched(t => ({ ...t, nameEn: true, cr: true }));
    if (canProceedStep1()) setStep(2);
  }

  async function fetchMoCData() {
    if (!crNumber || crNumber.length !== 10 || !crValidation.ok) return;
    setMocLoading(true);
    setError(null);
    try {
      const data = await api.integrations.moc.fetchCompany(crNumber);
      setNameEn(data.name_en || '');
      setNameAr(data.name_ar || '');
      if (data.entity_type) setEntityType(data.entity_type);
      if (data.capital) {
        setAuthorizedCapital(data.capital.toString());
        setPaidUpCapital(data.capital.toString());
      }
      if (data.incorporation_date) setIncorporationDate(data.incorporation_date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MoC data');
    } finally {
      setMocLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const company = await api.companies.create({
        name_en: nameEn.trim(),
        name_ar: nameAr.trim() || undefined,
        entity_type: entityType,
        cr_number: crNumber || undefined,
        incorporation_date: incorporationDate || undefined,
        authorized_capital: authorizedCapital ? Number(authorizedCapital) : undefined,
        paid_up_capital: paidUpCapital ? Number(paidUpCapital) : undefined,
        par_value_per_share: parValue ? Number(parValue) : undefined,
        fiscal_year_start: fiscalYearStart ? Number(fiscalYearStart) : undefined,
        has_rofr: hasRofr,
        rofr_days: hasRofr && rofrDays ? Number(rofrDays) : undefined,
        has_drag_tag: hasDragTag,
        has_tag_along: hasTagAlong,
        profit_allocation_notes: profitNotes.trim() || undefined,
      });
      window.location.href = `/companies/${company.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  const s = styles;

  return (
    <div style={s.page}>
      <div style={s.back}>
        <a href="/dashboard" style={s.backLink}>← Dashboard</a>
      </div>

      <div style={s.titleRow}>
        <div>
          <h1 style={s.heading}>New company</h1>
          <p style={s.sub}>Set up your company's equity structure. All fields can be updated later.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={s.steps}>
        {(['Identity', 'Capital', 'Governance'] as const).map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} style={s.stepItem}>
              <div style={{
                ...s.stepNum,
                background: done ? 'var(--brand-purple)' : active ? 'rgba(166,125,250,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${done || active ? 'var(--brand-purple)' : 'var(--border-default)'}`,
                color: done || active ? (done ? '#fff' : 'var(--brand-purple)') : 'var(--text-tertiary)',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ ...s.stepLabel, color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{label}</span>
              {i < 2 && <div style={s.stepLine} />}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Step 1: Identity ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="glass-panel" style={s.card}>
            <div style={s.cardHead}>
              <h2 style={s.cardTitle}>Company identity</h2>
              <p style={s.cardSub}>Legal name and registration details</p>
            </div>

            <div style={s.fields}>
              {/* Entity type */}
              <div style={s.field}>
                <label style={s.label}>Entity type *</label>
                <div style={s.entityCards}>
                  {(['LLC', 'SJSC', 'JSC'] as EntityType[]).map(et => (
                    <button
                      key={et}
                      type="button"
                      onClick={() => setEntityType(et)}
                      style={{
                        ...s.entityCard,
                        borderColor: entityType === et ? 'var(--brand-purple)' : 'var(--border-default)',
                        background: entityType === et ? 'rgba(166,125,250,0.06)' : 'var(--bg-elevated)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ ...s.entityType, color: entityType === et ? 'var(--brand-purple)' : 'var(--text-primary)' }}>{et}</span>
                        {entityType === et && (
                          <div style={s.radioFilled}>
                            <div style={s.radioDot} />
                          </div>
                        )}
                      </div>
                      <span style={s.entityAr}>{ENTITY_INFO[et].arabic}</span>
                      <span style={s.entityNote}>{ENTITY_INFO[et].note}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={s.row2}>
                {/* English name */}
                <div style={s.field}>
                  <label style={s.label}>Company name (English) *</label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, nameEn: true }))}
                    placeholder="Acme Saudi LLC"
                    style={{ ...s.input, borderColor: nameEnError ? 'var(--neg)' : undefined }}
                  />
                  {nameEnError && <span style={s.fieldError}>{nameEnError}</span>}
                </div>

                {/* Arabic name */}
                <div style={s.field}>
                  <label style={s.label}>Company name (Arabic)</label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    dir="rtl"
                    placeholder="اسم الشركة"
                    style={{ ...s.input, textAlign: 'right' as const }}
                  />
                </div>
              </div>

              <div style={s.row2}>
                {/* CR number */}
                <div style={s.field}>
                  <label style={s.label}>
                    Commercial Registration (CR) number
                    <span style={s.optional}> — optional</span>
                  </label>
                  <div style={{ position: 'relative' as const, display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        value={crNumber}
                        onChange={e => { setCrNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); }}
                        onBlur={() => setTouched(t => ({ ...t, cr: true }))}
                        placeholder="10-digit number"
                        maxLength={10}
                        style={{
                          ...s.input,
                          fontFamily: 'var(--font-mono)',
                          borderColor: crError ? 'var(--neg)' : (crNumber.length === 10 && crValidation.ok) ? 'var(--pos)' : undefined,
                          paddingRight: crValidation.region ? '100px' : undefined,
                        }}
                      />
                      {crValidation.region && (
                        <span style={s.crRegionBadge}>{crValidation.region}</span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={fetchMoCData}
                      disabled={crNumber.length !== 10 || !crValidation.ok || mocLoading}
                      style={{
                        ...s.fetchBtn,
                        opacity: (crNumber.length !== 10 || !crValidation.ok || mocLoading) ? 0.5 : 1
                      }}
                    >
                      {mocLoading ? '...' : 'Fetch'}
                    </button>
                  </div>
                  {crError && <span style={s.fieldError}>{crError}</span>}
                  {!crError && crNumber.length > 0 && crNumber.length < 10 && (
                    <span style={s.fieldHint}>{crNumber.length} / 10 digits entered</span>
                  )}
                  {!crError && !crNumber && (
                    <span style={s.fieldHint}>Required for MoC filings tracking</span>
                  )}
                </div>

                {/* Incorporation date */}
                <div style={s.field}>
                  <label style={s.label}>
                    Incorporation date
                    <span style={s.optional}> — optional</span>
                  </label>
                  <input
                    type="date"
                    value={incorporationDate}
                    onChange={e => setIncorporationDate(e.target.value)}
                    style={{ ...s.input, fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            <div style={s.actions}>
              <a href="/dashboard" style={s.cancelLink}>Cancel</a>
              <button type="button" onClick={handleStep1Next} style={s.nextBtn}>
                Continue to Capital →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Capital ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="glass-panel" style={s.card}>
            <div style={s.cardHead}>
              <h2 style={s.cardTitle}>Capital structure</h2>
              <p style={s.cardSub}>Share capital and fiscal year settings — all optional, can be updated later</p>
            </div>

            <div style={s.fields}>
              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Authorized capital (SAR)</label>
                  <div style={s.inputPrefix}>
                    <span style={s.prefix}>SAR</span>
                    <input
                      type="number"
                      value={authorizedCapital}
                      onChange={e => setAuthorizedCapital(e.target.value)}
                      min="0"
                      step="1"
                      placeholder="0"
                      style={{ ...s.input, ...s.inputWithPrefix, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Paid-up capital (SAR)</label>
                  <div style={s.inputPrefix}>
                    <span style={s.prefix}>SAR</span>
                    <input
                      type="number"
                      value={paidUpCapital}
                      onChange={e => setPaidUpCapital(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, paidUp: true }))}
                      min="0"
                      step="1"
                      placeholder="0"
                      style={{ ...s.input, ...s.inputWithPrefix, fontFamily: 'var(--font-mono)', borderColor: paidUpError ? 'var(--neg)' : undefined }}
                    />
                  </div>
                  {paidUpError && <span style={s.fieldError}>{paidUpError}</span>}
                </div>
              </div>

              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Par value per share (SAR)</label>
                  <div style={s.inputPrefix}>
                    <span style={s.prefix}>SAR</span>
                    <input
                      type="number"
                      value={parValue}
                      onChange={e => setParValue(e.target.value)}
                      min="0.0001"
                      step="0.0001"
                      placeholder="100.00"
                      style={{ ...s.input, ...s.inputWithPrefix, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <span style={s.fieldHint}>Common: SAR 100 (LLC), SAR 1 (SJSC)</span>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Fiscal year start month</label>
                  <select
                    value={fiscalYearStart}
                    onChange={e => setFiscalYearStart(e.target.value)}
                    style={s.input}
                  >
                    <option value="">— Select month</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <span style={s.fieldHint}>Default: January (most Saudi companies)</span>
                </div>
              </div>
            </div>

            <div style={s.actions}>
              <button type="button" onClick={() => setStep(1)} style={s.backBtn}>← Back</button>
              <button type="button" onClick={() => setStep(3)} style={s.nextBtn}>
                Continue to Governance →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Governance / AoA flags ──────────────────────── */}
        {step === 3 && (
          <div className="glass-panel" style={s.card}>
            <div style={s.cardHead}>
              <h2 style={s.cardTitle}>AoA governance flags</h2>
              <p style={s.cardSub}>Protective rights defined in your Articles of Association — all optional</p>
            </div>

            <div style={s.fields}>
              {/* ROFR */}
              <div style={s.flagBlock}>
                <Toggle checked={hasRofr} onChange={setHasRofr} label="Right of First Refusal (ROFR)" />
                <p style={s.flagDesc}>Partners must offer shares to existing partners before transferring to a third party. Required for LLCs under Saudi Companies Law Art. 172.</p>
                {hasRofr && (
                  <div style={{ marginTop: '12px', maxWidth: '200px' }}>
                    <label style={s.label}>ROFR exercise period (days)</label>
                    <input
                      type="number"
                      value={rofrDays}
                      onChange={e => setRofrDays(e.target.value)}
                      min="1"
                      max="365"
                      style={{ ...s.input, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                )}
              </div>

              {/* Drag + Tag */}
              <div style={s.flagBlock}>
                <Toggle checked={hasDragTag} onChange={setHasDragTag} label="Drag-along rights" />
                <p style={s.flagDesc}>Majority shareholders can force minority shareholders to join in a sale on the same terms.</p>
              </div>

              <div style={s.flagBlock}>
                <Toggle checked={hasTagAlong} onChange={setHasTagAlong} label="Tag-along rights" />
                <p style={s.flagDesc}>Minority shareholders can join any sale by a majority shareholder on the same terms.</p>
              </div>

              {/* Profit allocation */}
              <div style={s.field}>
                <label style={s.label}>
                  Profit allocation notes
                  <span style={s.optional}> — optional</span>
                </label>
                <textarea
                  value={profitNotes}
                  onChange={e => setProfitNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special profit distribution rules from the AoA…"
                  style={{ ...s.input, resize: 'vertical' as const }}
                />
              </div>
            </div>

            {error && (
              <div style={s.errorBox}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="8" cy="8" r="7" stroke="var(--neg)" strokeWidth="1.4" />
                  <path d="M8 5v3.5M8 11h.01" stroke="var(--neg)" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <div style={s.actions}>
              <button type="button" onClick={() => setStep(2)} style={s.backBtn}>← Back</button>
              <button type="submit" disabled={loading} style={s.submitBtn}>
                {loading ? 'Creating…' : 'Create company'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '640px' },
  back: { marginBottom: '28px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  titleRow: { marginBottom: '28px' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)' },

  steps: { display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' },
  stepItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  stepNum: { width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0, transition: 'all 200ms' },
  stepLabel: { fontSize: '12px', fontWeight: 500, transition: 'color 200ms', whiteSpace: 'nowrap' as const },
  stepLine: { width: '32px', height: '1px', background: 'var(--border-default)', margin: '0 8px' },

  card: {
    overflow: 'hidden',
  },
  cardHead: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border-default)',
  },
  cardTitle: { fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  cardSub: { fontSize: '12px', color: 'var(--text-tertiary)' },
  fields: { padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '20px' },

  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  label: { fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', userSelect: 'none' as const },
  optional: { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 },
  input: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    fontSize: '13px', padding: '10px 12px', outline: 'none', width: '100%',
    transition: 'border-color 150ms',
    boxSizing: 'border-box' as const,
  },
  inputPrefix: { display: 'flex', alignItems: 'stretch' },
  prefix: {
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
    color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'var(--font-mono)',
    padding: '10px 10px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' as const,
  },
  inputWithPrefix: { borderRadius: '0 var(--radius-md) var(--radius-md) 0' },
  fieldError: { fontSize: '11px', color: 'var(--neg)', marginTop: '-2px' },
  fieldHint: { fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '-2px' },

  entityCards: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  entityCard: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)', padding: '12px', cursor: 'pointer',
    textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const,
    gap: '4px', transition: 'all 150ms', outline: 'none',
  },
  entityType: { fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  entityAr: { fontSize: '10px', color: 'var(--text-tertiary)', direction: 'rtl' as const, display: 'block' },
  entityNote: { fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '1.5', marginTop: '4px', display: 'block' },
  radioFilled: { width: '16px', height: '16px', borderRadius: '50%', background: 'var(--brand-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#fff' },

  crRegionBadge: {
    position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '10px', color: 'var(--pos)', fontFamily: 'var(--font-mono)',
    background: 'rgba(74,222,128,0.08)', padding: '2px 6px', borderRadius: '4px',
    border: '1px solid rgba(74,222,128,0.2)',
  },

  flagBlock: {
    padding: '16px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    display: 'flex', flexDirection: 'column' as const, gap: '8px',
  },
  flagDesc: { fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.6' },

  errorBox: {
    margin: '0 24px',
    padding: '10px 14px', background: 'rgba(248,113,113,0.08)',
    border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)',
    color: 'var(--neg)', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start',
    marginBottom: '16px',
  },

  actions: {
    display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center',
    padding: '16px 24px', borderTop: '1px solid var(--border-default)',
    background: 'var(--bg-elevated)',
  },
  backBtn: { background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', padding: '9px 16px', cursor: 'pointer' },
  nextBtn: { background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' },
  submitBtn: { background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' },
  cancelLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  fetchBtn: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '0 16px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' },
};
