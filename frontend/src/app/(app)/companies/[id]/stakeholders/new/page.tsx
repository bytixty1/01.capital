'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, StakeholderType } from '@/lib/api';

export default function NewStakeholderPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [type, setType] = useState<StakeholderType>('natural_person');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nationality, setNationality] = useState('SAU');
  const [crNumber, setCrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.stakeholders.create(companyId, {
        stakeholder_type: type,
        name_en: nameEn,
        name_ar: nameAr || undefined,
        nationality: type === 'natural_person' ? nationality || undefined : undefined,
        cr_number: type === 'legal_entity' ? crNumber || undefined : undefined,
        email: email || undefined,
      });
      window.location.href = `/companies/${companyId}/stakeholders`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stakeholder');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <a href={`/companies/${companyId}`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
          ← Back to company
        </a>
      </div>

      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Add stakeholder
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          A stakeholder is a person or entity that holds (or will hold) shares in the company.
        </p>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Stakeholder type *
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as StakeholderType)}
              className="glass-input"
              style={{ width: '100%' }}
            >
              <option value="natural_person">Natural person (individual)</option>
              <option value="legal_entity">Legal entity (company / fund)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Full name (English) *
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              required
              className="glass-input"
              placeholder="e.g. John Doe"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Full name (Arabic)
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              dir="rtl"
              className="glass-input"
              style={{ textAlign: 'right' }}
              placeholder="مثال: جون دو"
            />
          </div>

          {type === 'natural_person' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Nationality (ISO 3-letter code) *
              </label>
              <input
                type="text"
                value={nationality}
                onChange={e => setNationality(e.target.value.toUpperCase())}
                maxLength={3}
                required
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="SAU"
              />
            </div>
          )}

          {type === 'legal_entity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                CR number *
              </label>
              <input
                type="text"
                value={crNumber}
                onChange={e => setCrNumber(e.target.value)}
                required
                className="glass-input"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="1010XXXXXX"
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="glass-input"
              placeholder="stakeholder@example.com"
            />
          </div>

          {error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'var(--neg)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <a href={`/companies/${companyId}/stakeholders`} style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', transition: 'color 0.2s ease' }}>
              Cancel
            </a>
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                background: 'var(--brand-purple)', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease', boxShadow: '0 0 20px -5px rgba(139, 92, 246, 0.4)'
              }}
            >
              {loading ? 'Adding...' : 'Add stakeholder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

