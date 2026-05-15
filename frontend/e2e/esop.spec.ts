import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';
import { createTestCompanyWithStakeholder } from './helpers/company';

const COMPANY_ESOP_RE = /\/companies\/([\w-]+)\/esop\/([\w-]+)$/;

test.describe('ESOP Plans', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('create ESOP plan', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page, 'ESOPCo', {
      type: 'natural_person',
      nameEn: 'Employee One',
      nameAr: 'موظف',
      nationalId: 'SAU',
      email: 'employee@test.com',
    });
    await page.goto(`/companies/${companyId}/esop/new`);

    const planName = `ESOP Plan ${Date.now()}`;
    await page.fill('input[placeholder="Employee Stock Option Plan 2026"]', planName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('100000');
    await page.fill('input[placeholder="e.g. ordinary"]', 'esop');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2024-01-15');
    await page.fill('textarea', 'Standard ESOP rules and vesting schedule');
    await page.click('button[type="submit"]:has-text("Create plan")');
    await page.waitForURL(COMPANY_ESOP_RE);

    expect(page.url()).toMatch(COMPANY_ESOP_RE);
  });

  test('issue grant in ESOP plan', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page, 'ESOPCo', {
      type: 'natural_person',
      nameEn: 'Employee One',
      nameAr: 'موظف',
      nationalId: 'SAU',
      email: 'employee@test.com',
    });
    await page.goto(`/companies/${companyId}/esop/new`);

    const planName = `ESOP Plan ${Date.now()}`;
    await page.fill('input[placeholder="Employee Stock Option Plan 2026"]', planName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('100000');
    await page.fill('input[placeholder="e.g. ordinary"]', 'esop');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2024-01-15');
    await page.fill('textarea', 'Standard ESOP rules');
    await page.click('button[type="submit"]:has-text("Create plan")');
    await page.waitForURL(COMPANY_ESOP_RE);

    const planId = page.url().match(COMPANY_ESOP_RE)![2];

    await page.goto(`/companies/${companyId}/esop/${planId}/grant`);
    const stakeholderSelect = page.locator('select').first();
    await stakeholderSelect.selectOption({ label: 'Employee One' });
    const shareInputs = page.locator('input[type="number"]');
    await shareInputs.nth(0).fill('5000');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2024-02-01');
    await shareInputs.nth(1).fill('12');
    await shareInputs.nth(2).fill('48');
    await shareInputs.nth(3).fill('10');
    await page.click('button[type="submit"]:has-text("Issue grant")');
    await page.waitForURL(`/companies/${companyId}/esop/${planId}`);
  });

  test('ESOP plan appears in list', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page, 'ESOPCo', {
      type: 'natural_person',
      nameEn: 'Employee One',
      nameAr: 'موظف',
      nationalId: 'SAU',
      email: 'employee@test.com',
    });
    const planName = `TestESOP ${Date.now()}`;

    await page.goto(`/companies/${companyId}/esop/new`);
    await page.fill('input[placeholder="Employee Stock Option Plan 2026"]', planName);
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('50000');
    await page.fill('input[placeholder="e.g. ordinary"]', 'esop');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2024-01-20');
    await page.fill('textarea', 'Test plan');
    await page.click('button[type="submit"]:has-text("Create plan")');
    await page.waitForURL(COMPANY_ESOP_RE);

    await page.goto(`/companies/${companyId}/esop`);
    await expect(page.locator(`text=${planName}`)).toBeVisible();
  });
});
