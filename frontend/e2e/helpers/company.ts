import { Page } from '@playwright/test';

// UUID-safe: matches both UUID and numeric IDs in company URLs
const COMPANY_ID_RE = /\/companies\/([\w-]+)/;

export async function createTestCompany(page: Page, namePrefix: string = 'TestCo'): Promise<string> {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `${namePrefix} ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567890');
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
  const typeSelect = page.locator('select').first();
  await typeSelect.selectOption(stakeholder.type);
  await page.fill('input[placeholder="e.g. John Doe"]', stakeholder.nameEn);
  await page.fill('input[dir="rtl"]', stakeholder.nameAr);

  if (stakeholder.type === 'natural_person' && stakeholder.nationalId) {
    await page.fill('input[placeholder="SAU"]', stakeholder.nationalId);
  } else if (stakeholder.type === 'legal_entity' && stakeholder.crNumber) {
    await page.fill('input[placeholder="1010XXXXXX"]', stakeholder.crNumber);
  }

  await page.fill('input[placeholder="stakeholder@example.com"]', stakeholder.email);
  await page.click('button[type="submit"]:has-text("Add stakeholder")');
  await page.waitForURL(`/companies/${companyId}/stakeholders`);

  return companyId;
}
