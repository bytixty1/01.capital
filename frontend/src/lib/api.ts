import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TokenResponse = { access_token: string; token_type: string };

export type UserResponse = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
};

export type EntityType = 'LLC' | 'SJSC' | 'JSC';

export type CompanyResponse = {
  id: string;
  name_en: string;
  name_ar: string | null;
  entity_type: EntityType;
  cr_number: string | null;
  status: string;
  authorized_capital: string | null;
  paid_up_capital: string | null;
  par_value_per_share: string | null;
  incorporation_date: string | null;
  fiscal_year_start: number | null;
  created_at: string;
};

export type StakeholderType = 'natural_person' | 'legal_entity';

export type StakeholderResponse = {
  id: string;
  company_id: string;
  stakeholder_type: StakeholderType;
  name_en: string;
  name_ar: string | null;
  nationality: string | null;
  cr_number: string | null;
  email: string | null;
  created_at: string;
};

export type HoldingResponse = {
  stakeholder_id: string;
  stakeholder_name: string;
  share_class: string;
  quantity: string;
  percentage: string;
};

export type CapTableResponse = {
  company_id: string;
  total_shares: string;
  holdings: HoldingResponse[];
};

export type CapTableEventResponse = {
  id: string;
  company_id: string;
  event_type: string;
  event_date: string;
  payload: Record<string, unknown>;
  notes: string | null;
  is_draft: boolean;
  created_by: string;
};

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (email: string, password: string, fullName?: string) =>
      request<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      }),

    login: (email: string, password: string) =>
      request<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () =>
      request<UserResponse>('/api/auth/me', {
        headers: authHeaders(),
      }),
  },

  companies: {
    list: () =>
      request<CompanyResponse[]>('/api/companies', { headers: authHeaders() }),

    get: (id: string) =>
      request<CompanyResponse>(`/api/companies/${id}`, { headers: authHeaders() }),

    create: (body: {
      name_en: string;
      name_ar?: string;
      entity_type: EntityType;
      cr_number?: string;
      authorized_capital?: number;
      paid_up_capital?: number;
      par_value_per_share?: number;
      incorporation_date?: string;
      fiscal_year_start?: number;
    }) =>
      request<CompanyResponse>('/api/companies', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      }),
  },

  stakeholders: {
    list: (companyId: string) =>
      request<StakeholderResponse[]>(`/api/companies/${companyId}/stakeholders`, {
        headers: authHeaders(),
      }),

    create: (
      companyId: string,
      body: {
        stakeholder_type: StakeholderType;
        name_en: string;
        name_ar?: string;
        national_id?: string;
        nationality?: string;
        cr_number?: string;
        email?: string;
      },
    ) =>
      request<StakeholderResponse>(`/api/companies/${companyId}/stakeholders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      }),
  },

  capTable: {
    get: (companyId: string) =>
      request<CapTableResponse>(`/api/companies/${companyId}/cap-table`, {
        headers: authHeaders(),
      }),

    issue: (
      companyId: string,
      body: {
        stakeholder_id: string;
        share_class?: string;
        quantity: number;
        event_date: string;
        notes?: string;
      },
    ) =>
      request<CapTableEventResponse>(`/api/companies/${companyId}/cap-table/issue`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      }),

    events: (companyId: string) =>
      request<CapTableEventResponse[]>(`/api/companies/${companyId}/cap-table/events`, {
        headers: authHeaders(),
      }),
  },
};
