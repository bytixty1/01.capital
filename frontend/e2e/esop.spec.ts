import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

async function createTestCompanyWithStakeholder(page) {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `ESOPCo ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567894');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-05-01');
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
  await typeSelect.selectOption('natural_person');
  await page.fill('input[placeholder="e.g. John Doe"]', 'Employee One');
  await page.fill('input[dir="rtl"]', 'موظف');
  await page.fill('input[placeholder="SAU"]', 'SAU');
  await page.fill('input[placeholder="stakeholder@example.com"]', 'employee@test.com');
  await page.click('button[type="submit"]:has-text("Add stakeholder")');
  await page.waitForURL(`/companies/${companyId}/stakeholders`);

  return companyId;
}

test.describe('ESOP Plans', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('create ESOP plan', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
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
    await page.waitForURL(/\/companies\/\d+\/esop\/\d+$/);

    expect(page.url()).toMatch(/\/companies\/\d+\/esop\/\d+$/);
  });

  test('issue grant in ESOP plan', async ({ page }) => {
    const companyId = await createTestCompanyWithStakeholder(page);
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
    await page.waitForURL(/\/companies\/\d+\/esop\/\d+$/);

    const planId = page.url().match(/\/companies\/\d+\/esop\/(\d+)/)[1];

    // Issue grant
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
    const companyId = await createTestCompanyWithStakeholder(page);
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
    await page.waitForURL(/\/companies\/\d+\/esop\/\d+$/);

    await page.goto(`/companies/${companyId}/esop`);
    await expect(page.locator(`text=${planName}`)).toBeVisible();
  });
});
