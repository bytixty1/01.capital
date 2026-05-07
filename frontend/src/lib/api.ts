import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers, ...restInit } = init || {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...restInit,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (err as { detail?: string | Array<{ msg: string }> }).detail;
    let message = 'Request failed';
    if (typeof detail === 'string') message = detail;
    else if (Array.isArray(detail) && detail.length > 0)
      message = detail.map(d => d.msg).join(', ');
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TokenResponse = { access_token: string; token_type: string };
export type RegisterResponse = { message: string; email: string };

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
  has_rofr: boolean;
  rofr_days: number | null;
  has_drag_tag: boolean;
  has_tag_along: boolean;
  profit_allocation_notes: string | null;
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

export type EsopPlanResponse = {
  id: string;
  company_id: string;
  name: string;
  total_pool: string;
  allocated: string;
  share_class: string;
  authorized_date: string | null;
  plan_rules: string | null;
  status: string;
  created_at: string;
};

export type GrantResponse = {
  id: string;
  plan_id: string;
  company_id: string;
  stakeholder_id: string;
  quantity: string;
  exercised_quantity: string;
  grant_date: string;
  expiry_date: string | null;
  exercise_price: string | null;
  vesting_schedule: { type: string; cliff_months: number; total_months: number };
  status: string;
  notes: string | null;
  created_at: string;
};

export type FilingResponse = {
  id: string;
  company_id: string;
  filing_type: string;
  trigger_event_id: string | null;
  status: string;
  due_date: string | null;
  submitted_date: string | null;
  notes: string | null;
  created_at: string;
};

export type InstrumentResponse = {
  id: string;
  company_id: string;
  stakeholder_id: string;
  instrument_type: string;
  name: string;
  face_value: string | null;
  quantity: string;
  issue_date: string;
  maturity_date: string | null;
  terms: Record<string, unknown>;
  status: string;
  notes: string | null;
  created_at: string;
};

export type MemberResponse = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (email: string, password: string, fullName?: string) =>
      request<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      }),
    verifyEmail: (email: string, otp: string) =>
      request<TokenResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      }),
    login: (email: string, password: string) =>
      request<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () =>
      request<UserResponse>('/api/auth/me', { headers: authHeaders() }),
  },

  companies: {
    list: () =>
      request<CompanyResponse[]>('/api/companies', { headers: authHeaders() }),
    get: (id: string) =>
      request<CompanyResponse>(`/api/companies/${id}`, { headers: authHeaders() }),
    create: (body: {
      name_en: string; name_ar?: string; entity_type: EntityType;
      cr_number?: string; authorized_capital?: number; paid_up_capital?: number;
      par_value_per_share?: number; incorporation_date?: string; fiscal_year_start?: number;
      has_rofr?: boolean; rofr_days?: number; has_drag_tag?: boolean;
      has_tag_along?: boolean; profit_allocation_notes?: string;
    }) =>
      request<CompanyResponse>('/api/companies', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
    update: (id: string, body: Partial<CompanyResponse>) =>
      request<CompanyResponse>(`/api/companies/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      }),
  },

  stakeholders: {
    list: (companyId: string) =>
      request<StakeholderResponse[]>(`/api/companies/${companyId}/stakeholders`, { headers: authHeaders() }),
    create: (companyId: string, body: {
      stakeholder_type: StakeholderType; name_en: string; name_ar?: string;
      national_id?: string; nationality?: string; cr_number?: string; email?: string;
    }) =>
      request<StakeholderResponse>(`/api/companies/${companyId}/stakeholders`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
  },

  capTable: {
    get: (companyId: string) =>
      request<CapTableResponse>(`/api/companies/${companyId}/cap-table`, { headers: authHeaders() }),
    issue: (companyId: string, body: {
      stakeholder_id: string; share_class?: string; quantity: number;
      event_date: string; notes?: string;
    }) =>
      request<CapTableEventResponse>(`/api/companies/${companyId}/cap-table/issue`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
    transfer: (companyId: string, body: {
      from_stakeholder_id: string; to_stakeholder_id: string; share_class?: string;
      quantity: number; event_date: string; notes?: string;
    }) =>
      request<CapTableEventResponse>(`/api/companies/${companyId}/cap-table/transfer`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
    capitalIncrease: (companyId: string, body: {
      new_authorized_capital?: number; new_paid_up_capital?: number;
      share_class?: string; shares_issued?: number; stakeholder_id?: string;
      event_date: string; notes?: string;
    }) =>
      request<CapTableEventResponse>(`/api/companies/${companyId}/cap-table/capital-increase`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
    events: (companyId: string) =>
      request<CapTableEventResponse[]>(`/api/companies/${companyId}/cap-table/events`, { headers: authHeaders() }),
    zatcaExport: (companyId: string) =>
      request<Record<string, unknown>>(`/api/companies/${companyId}/exports/zatca`, { headers: authHeaders() }),
  },

  esop: {
    listPlans: (companyId: string) =>
      request<EsopPlanResponse[]>(`/api/companies/${companyId}/esop`, { headers: authHeaders() }),
    createPlan: (companyId: string, body: {
      name: string; total_pool: number; share_class?: string;
      authorized_date?: string; plan_rules?: string;
    }) =>
      request<EsopPlanResponse>(`/api/companies/${companyId}/esop`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
    getPlan: (companyId: string, planId: string) =>
      request<EsopPlanResponse>(`/api/companies/${companyId}/esop/${planId}`, { headers: authHeaders() }),
    listGrants: (companyId: string, planId: string) =>
      request<GrantResponse[]>(`/api/companies/${companyId}/esop/${planId}/grants`, { headers: authHeaders() }),
    createGrant: (companyId: string, planId: string, body: {
      stakeholder_id: string; quantity: number; grant_date: string;
      expiry_date?: string; exercise_price?: number; cliff_months?: number;
      total_months?: number; notes?: string;
    }) =>
      request<GrantResponse>(`/api/companies/${companyId}/esop/${planId}/grants`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
  },

  filings: {
    list: (companyId: string) =>
      request<FilingResponse[]>(`/api/companies/${companyId}/filings`, { headers: authHeaders() }),
    update: (companyId: string, filingId: string, body: {
      status?: string; submitted_date?: string; notes?: string;
    }) =>
      request<FilingResponse>(`/api/companies/${companyId}/filings/${filingId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      }),
  },

  instruments: {
    list: (companyId: string) =>
      request<InstrumentResponse[]>(`/api/companies/${companyId}/instruments`, { headers: authHeaders() }),
    create: (companyId: string, body: {
      stakeholder_id: string; instrument_type: 'sukuk_convertible' | 'phantom' | 'warrant';
      name: string; quantity: number; face_value?: number; issue_date: string;
      maturity_date?: string; terms?: Record<string, unknown>; notes?: string;
    }) =>
      request<InstrumentResponse>(`/api/companies/${companyId}/instruments`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      }),
  },

  members: {
    list: (companyId: string) =>
      request<MemberResponse[]>(`/api/companies/${companyId}/members`, { headers: authHeaders() }),
    updateRole: (companyId: string, memberId: string, role: string) =>
      request<{ id: string; role: string }>(`/api/companies/${companyId}/members/${memberId}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ role }),
      }),
    remove: (companyId: string, memberId: string) =>
      fetch(`${API_BASE}/api/companies/${companyId}/members/${memberId}`, {
        method: 'DELETE', headers: authHeaders(),
      }),
  },

  integrations: {
    moc: {
      fetchCompany: (crNumber: string) =>
        request<any>(`/api/integrations/moc/cr/${crNumber}`, { headers: authHeaders() }),
    },
  },
};
