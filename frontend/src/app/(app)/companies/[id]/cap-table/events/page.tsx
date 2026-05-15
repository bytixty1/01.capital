'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, CapTableEventResponse } from '@/lib/api';

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  issue: { label: 'Share Issuance', color: '#6ee7b7', icon: '↑' },
  transfer: { label: 'Share Transfer', color: '#60a5fa', icon: '↔' },
  capital_increase: { label: 'Capital Increase', color: '#a78bfa', icon: '+' },
  capital_decrease: { label: 'Capital Decrease', color: '#f87171', icon: '−' },
};

function formatPayload(eventType: string, payload: Record<string, unknown>): string {
  const qty = payload.quantity ?? payload.shares_issued;
  const shareClass = (payload.share_class as string) ?? 'ordinary';

  switch (eventType) {
    case 'issue':
      return `${Number(qty).toLocaleString('en-SA')} ${shareClass} shares issued`;
    case 'transfer':
      return `${Number(qty).toLocaleString('en-SA')} ${shareClass} shares transferred`;
    case 'capital_increase':
      return qty ? `${Number(qty).toLocaleString('en-SA')} shares issued` : 'Capital increased';
    case 'capital_decrease':
      return `${Number(qty).toLocaleString('en-SA')} ${shareClass} shares reduced`;
    default:
      return JSON.stringify(payload);
  }
}

export default function EventsPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [events, setEvents] = useState<CapTableEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.capTable.events(companyId)
      .then(setEvents)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <Link href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to Company
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 400, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Transaction History
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Immutable record of all cap table events in chronological order.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading events...</p>}
      {error && <p style={{ color: 'var(--neg)', fontSize: '14px' }}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <div className="glass-panel" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '20px' }}>
            ⏱
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px' }}>
            No events recorded yet. Issue shares or make a transfer to create the first event.
          </p>
          <Link href={`/companies/${companyId}/cap-table/issue`} className="link-accent" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
            Issue shares →
          </Link>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: '19px', top: '24px', bottom: '24px',
            width: '2px', background: 'rgba(255,255,255,0.08)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {events.map((evt, i) => {
              const config = EVENT_CONFIG[evt.event_type] ?? { label: evt.event_type, color: '#888', icon: '•' };
              const isLast = i === events.length - 1;

              return (
                <div key={evt.id} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: isLast ? '0' : '4px' }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                    background: `${config.color}15`, border: `1px solid ${config.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700, color: config.color,
                    zIndex: 1,
                  }}>
                    {config.icon}
                  </div>

                  {/* Event card */}
                  <div className="glass-panel" style={{
                    flex: 1, padding: '20px 24px', marginBottom: '12px',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
                          background: `${config.color}15`, color: config.color,
                          border: `1px solid ${config.color}30`,
                        }}>
                          {config.label}
                        </span>
                        {evt.is_draft && (
                          <span style={{
                            fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>
                            DRAFT
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(evt.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatPayload(evt.event_type, evt.payload)}
                    </p>

                    {evt.notes && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {evt.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textAlign: 'center', opacity: 0.6 }}>
        All events are immutable. Contact support if a correction is needed.
      </p>
    </div>
  );
}
