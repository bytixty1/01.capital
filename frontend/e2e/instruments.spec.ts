import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';
import { createTestCompanyWithStakeholder } from './helpers/company';

const INVESTOR = {
  type: 'legal_entity' as const,
  nameEn: 'Investor Fund LLC',
  nameAr: 'صندوق الاستثمار',
  crNumber: '1010567890',
  email: 'investor@test.com',
};

test.describe('Instruments', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('create sukuk convertible instrument', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page, 'InstCo', INVESTOR);
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
    const companyId = await createTestCompanyWithStakeholder(page, 'InstCo', INVESTOR);
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
    const companyId = await createTestCompanyWithStakeholder(page, 'InstCo', INVESTOR);
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
    const companyId = await createTestCompanyWithStakeholder(page, 'InstCo', INVESTOR);
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
