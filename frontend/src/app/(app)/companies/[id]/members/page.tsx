'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, MemberResponse } from '@/lib/api';

export default function MembersPage() {
  const { id: companyId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.members.list(companyId).then(setMembers).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [companyId]);

  async function changeRole(memberId: string, newRole: string) {
    try {
      await api.members.updateRole(companyId, memberId, newRole);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <div style={s.back}><a href={`/companies/${companyId}`} style={s.backLink}>← Back</a></div>
      <h1 style={s.heading}>Team members</h1>
      <p style={s.sub}>Users with access to this company. Invite by sharing your login credentials with your team (email invite coming in a future update).</p>
      {loading && <p style={s.muted}>Loading…</p>}
      {error && <p style={s.error}>{error}</p>}
      <table style={s.table}>
        <thead><tr>
          <th style={s.th}>User</th>
          <th style={{ ...s.th, textAlign: 'right' as const }}>Role</th>
          <th style={{ ...s.th, textAlign: 'right' as const }}>Joined</th>
          <th style={{ ...s.th, textAlign: 'right' as const }}>Actions</th>
        </tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} style={s.row}>
              <td style={s.td}>
                <p style={s.name}>{m.full_name ?? m.email}</p>
                {m.full_name && <p style={s.email}>{m.email}</p>}
              </td>
              <td style={{ ...s.td, textAlign: 'right' as const }}>
                <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} style={s.roleSelect}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td style={{ ...s.td, textAlign: 'right' as const, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                {m.created_at.slice(0, 10)}
              </td>
              <td style={{ ...s.td, textAlign: 'right' as const }}>
                <button onClick={() => { if (confirm('Remove this member?')) api.members.remove(companyId, m.id).then(() => setMembers(prev => prev.filter(x => x.id !== m.id))).catch(e => alert(e.message)); }} style={s.removeBtn}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '720px' }, back: { marginBottom: '24px' },
  backLink: { color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' },
  heading: { fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' },
  sub: { fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '32px' },
  muted: { color: 'var(--text-tertiary)', fontSize: '13px' }, error: { color: 'var(--neg)', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  th: { padding: '10px 20px', textAlign: 'left' as const, fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid var(--border-default)' },
  row: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '14px 20px', fontSize: '13px', color: 'var(--text-primary)' },
  name: { fontWeight: 500 },
  email: { fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' },
  roleSelect: { background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 8px', cursor: 'pointer' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--neg)', fontSize: '12px', cursor: 'pointer', padding: 0 },
};
