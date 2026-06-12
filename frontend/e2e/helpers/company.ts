import { Page } from '@playwright/test';

// Matches only real company UUIDs — must NOT match /companies/new, or the
// helper returns "new" as the id before the post-create redirect happens.
/**
 * 10-digit CR number unique per call — the companies table has a unique index
 * on it. First digit is forced to 1 because validateCR requires a Saudi
 * region code (1-9) as the leading digit.
 */
export function uniqueCrNumber(): string {
  return '1' + String(Date.now() * 1000 + Math.floor(Math.random() * 1000)).slice(-9);
}

const COMPANY_ID_RE = /\/companies\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;

export async function createTestCompany(page: Page, namePrefix: string = 'TestCo'): Promise<string> {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `${namePrefix} ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  // CR number is globally unique in the DB (persistent Supabase) — never hardcode
  await page.fill('input[placeholder="10-digit number"]', uniqueCrNumber());
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-01-01');
  await page.click('button:has-text("Continue to Capital")');
  await page.waitForTimeout(500);
  await page.fill('input[type="number"]', '1000000');
  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(1).fill('500000');
  await numberInputs.nth(2).fill('100');
  await page.locator('select').first().selectOption('1');
  await page.click('button:has-text("Continue to Governance")');
  await page.waitForTimeout(500);
  await page.click('button[type="submit"]:has-text("Create company")');
  await page.waitForURL(COMPANY_ID_RE);
  // Non-null assertions are sound: waitForURL above guarantees the URL matches
  // COMPANY_ID_RE, so both the match and its capture group exist.
  return page.url().match(COMPANY_ID_RE)![1]!;
}

interface StakeholderData {
  type: 'natural_person' | 'legal_entity';
  nameEn: string;
  nameAr: string;
  email: string;
  nationalId?: string;   // natural_person: nationality code e.g. "SAU"
  crNumber?: string;     // legal_entity: CR number
}

export async function createTestCompanyWithStakeholder(
  page: Page,
  namePrefix: string,
  stakeholder: StakeholderData,
): Promise<string> {
  const companyId = await createTestCompany(page, namePrefix);

  await page.goto(`/companies/${companyId}/stakeholders/new`);
  // Stakeholder type is a button toggle, not a <select>
  const typeLabel = stakeholder.type === 'natural_person' ? 'Natural person' : 'Legal entity';
  await page.click(`button:has-text("${typeLabel}")`);
  await page.fill('input[placeholder="e.g. Mohammed Al-Rashidi"]', stakeholder.nameEn);
  await page.fill('input[dir="rtl"]', stakeholder.nameAr);

  if (stakeholder.type === 'natural_person' && stakeholder.nationalId) {
    // Nationality is a dropdown of ISO codes (defaults to SAU)
    await page.locator('select').first().selectOption(stakeholder.nationalId);
  } else if (stakeholder.type === 'legal_entity' && stakeholder.crNumber) {
    await page.fill('input[placeholder="1010XXXXXX"]', stakeholder.crNumber);
  }

  await page.fill('input[placeholder="stakeholder@example.com"]', stakeholder.email);
  await page.click('button[type="submit"]:has-text("Add stakeholder")');
  await page.waitForURL(`/companies/${companyId}/stakeholders`);

  return companyId;
}
