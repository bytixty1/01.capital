import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

async function createTestCompanyWithStakeholder(page) {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `InstCo ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567895');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-06-01');
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
  await page.waitForURL(/\/companies\/\d+$/);

  const companyId = page.url().match(/\/companies\/(\d+)/)[1];

  // Add stakeholder
  await page.goto(`/companies/${companyId}/stakeholders/new`);
  const typeSelect = page.locator('select').first();
  await typeSelect.selectOption('legal_entity');
  await page.fill('input[placeholder="e.g. John Doe"]', 'Investor Fund LLC');
  await page.fill('input[dir="rtl"]', 'صندوق الاستثمار');
  await page.fill('input[placeholder="1010XXXXXX"]', '1010567890');
  await page.fill('input[placeholder="stakeholder@example.com"]', 'investor@test.com');
  await page.click('button[type="submit"]:has-text("Add stakeholder")');
  await page.waitForURL(`/companies/${companyId}/stakeholders`);

  return companyId;
}

test.describe('Instruments', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('create sukuk convertible instrument', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
    await page.goto(`/companies/${companyId}/instruments/new`);

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('sukuk_convertible');
    const holderSelect = page.locator('select').nth(1);
    await holderSelect.selectOption({ label: 'Investor Fund LLC' });
    const instrumentName = `Convertible Sukuk ${Date.now()}`;
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(instrumentName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('500000');
    await numberInputs.nth(1).fill('500000');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-01-01');
    await dateInputs.nth(1).fill('2027-01-01');
    await page.click('button[type="submit"]:has-text("Save instrument")');
    await page.waitForURL(`/companies/${companyId}/instruments`);
  });

  test('create phantom instrument', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
    await page.goto(`/companies/${companyId}/instruments/new`);

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('phantom');
    const holderSelect = page.locator('select').nth(1);
    await holderSelect.selectOption({ label: 'Investor Fund LLC' });
    const instrumentName = `Phantom Stock ${Date.now()}`;
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(instrumentName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('1000');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-01-15');
    await page.click('button[type="submit"]:has-text("Save instrument")');
    await page.waitForURL(`/companies/${companyId}/instruments`);
  });

  test('create warrant instrument', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
    await page.goto(`/companies/${companyId}/instruments/new`);

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('warrant');
    const holderSelect = page.locator('select').nth(1);
    await holderSelect.selectOption({ label: 'Investor Fund LLC' });
    const instrumentName = `Warrant Series A ${Date.now()}`;
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(instrumentName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('100000');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-02-01');
    await page.click('button[type="submit"]:has-text("Save instrument")');
    await page.waitForURL(`/companies/${companyId}/instruments`);
  });

  test('instrument appears in list after creation', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
    const instrumentName = `Sukuk ${Date.now()}`;

    await page.goto(`/companies/${companyId}/instruments/new`);
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('sukuk_convertible');
    const holderSelect = page.locator('select').nth(1);
    await holderSelect.selectOption({ label: 'Investor Fund LLC' });
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(instrumentName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('250000');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-01-10');
    await page.click('button[type="submit"]:has-text("Save instrument")');
    await page.waitForURL(`/companies/${companyId}/instruments`);

    await expect(page.locator(`text=${instrumentName}`)).toBeVisible();
  });
});
