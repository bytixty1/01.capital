import { z } from 'zod';
import type {
  CapTableEventResponse,
  CapTableResponse,
  CompanyResponse,
  StakeholderDetailResponse,
  StakeholderResponse,
  TokenResponse,
  UserResponse,
} from './api';

// Runtime validation at the API boundary (ADR-0008). Each schema mirrors its
// `*Response` type in api.ts; the AssertExtends block at the bottom fails the
// build if a schema drifts from its type. Coverage starts with the
// legal-correctness surface (auth, companies, cap table) — remaining
// endpoints keep the trusted cast until their schemas land.

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  mfa_required: z.boolean().optional(),
});

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  is_active: z.boolean(),
  mfa_enabled: z.boolean(),
});

export const CompanyResponseSchema = z.object({
  id: z.string(),
  name_en: z.string(),
  name_ar: z.string().nullable(),
  entity_type: z.enum(['LLC', 'SJSC', 'JSC']),
  cr_number: z.string().nullable(),
  status: z.enum(['active', 'suspended', 'dissolved']),
  authorized_capital: z.string().nullable(),
  paid_up_capital: z.string().nullable(),
  par_value_per_share: z.string().nullable(),
  incorporation_date: z.string().nullable(),
  fiscal_year_start: z.number().nullable(),
  has_rofr: z.boolean(),
  rofr_days: z.number().nullable(),
  has_drag_tag: z.boolean(),
  has_tag_along: z.boolean(),
  profit_allocation_notes: z.string().nullable(),
  created_at: z.string(),
});

export const StakeholderResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  stakeholder_type: z.enum(['natural_person', 'legal_entity']),
  name_en: z.string(),
  name_ar: z.string().nullable(),
  nationality: z.string().nullable(),
  cr_number: z.string().nullable(),
  email: z.string().nullable(),
  created_at: z.string(),
});

export const StakeholderDetailResponseSchema = StakeholderResponseSchema.extend({
  holdings: z.array(z.object({ share_class: z.string(), quantity: z.string() })),
});

const SyntheticKindSchema = z.enum(['esop_pool', 'esop_grants', 'convertible']);

export const CapTableResponseSchema = z.object({
  company_id: z.string(),
  total_shares: z.string(),
  holdings: z.array(
    z.object({
      stakeholder_id: z.string().nullable(),
      stakeholder_name: z.string(),
      share_class: z.string(),
      quantity: z.string(),
      percentage: z.string(),
      synthetic: SyntheticKindSchema.nullable().optional(),
    }),
  ),
  total_shares_issued: z.string().nullable().optional(),
  total_shares_diluted: z.string().nullable().optional(),
});

export const CapTableEventResponseSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  event_type: z.enum([
    'share_issuance',
    'share_transfer',
    'share_cancellation',
    'capital_increase',
    'capital_decrease',
  ]),
  event_date: z.string(),
  payload: z.record(z.string(), z.unknown()),
  notes: z.string().nullable(),
  is_draft: z.boolean(),
  created_by: z.string(),
});

// ── compile-time drift guards ─────────────────────────────────────────────────
// If a schema's inferred output stops being assignable to its api.ts type,
// these aliases fail to compile.
type AssertExtends<A extends B, B> = A;
type _DriftChecks = [
  AssertExtends<z.infer<typeof TokenResponseSchema>, TokenResponse>,
  AssertExtends<z.infer<typeof UserResponseSchema>, UserResponse>,
  AssertExtends<z.infer<typeof CompanyResponseSchema>, CompanyResponse>,
  AssertExtends<z.infer<typeof StakeholderResponseSchema>, StakeholderResponse>,
  AssertExtends<z.infer<typeof StakeholderDetailResponseSchema>, StakeholderDetailResponse>,
  AssertExtends<z.infer<typeof CapTableResponseSchema>, CapTableResponse>,
  AssertExtends<z.infer<typeof CapTableEventResponseSchema>, CapTableEventResponse>,
];
