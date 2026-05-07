import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

async function createTestCompany(page) {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `TestCo ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567893');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-04-01');
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
}

test.describe('Stakeholders & Shares', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('add natural person stakeholder', async ({ page }) => {
    await createTestCompany(page);
    const companyId = page.url().match(/\/companies\/(\d+)/)[1];
    await page.goto(`/companies/${companyId}/stakeholders/new`);

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('natural_person');
    await page.fill('input[placeholder="e.g. John Doe"]', 'Mohammed Al-Rashidi');
    await page.fill('input[dir="rtl"]', 'محمد الراشدي');
    await page.fill('input[placeholder="SAU"]', 'SAU');
    await page.fill('input[placeholder="stakeholder@example.com"]', 'mohammed@example.com');
    await page.click('button[type="submit"]:has-text("Add stakeholder")');
    await page.waitForURL(`/companies/${companyId}/stakeholders`);

    await expect(page.locator('text=Mohammed Al-Rashidi')).toBeVisible();
  });

  test('add legal entity stakeholder', async ({ page }) => {
    await createTestCompany(page);
    const companyId = page.url().match(/\/companies\/(\d+)/)[1];
    await page.goto(`/companies/${companyId}/stakeholders/new`);

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('legal_entity');
    await page.fill('input[placeholder="e.g. John Doe"]', 'ABC Holdings LLC');
    await page.fill('input[dir="rtl"]', 'شركة اي بي سي');
    await page.fill('input[placeholder="1010XXXXXX"]', '1010123456');
    await page.fill('input[placeholder="stakeholder@example.com"]', 'holdings@example.com');
    await page.click('button[type="submit"]:has-text("Add stakeholder")');
    await page.waitForURL(`/companies/${companyId}/stakeholders`);

    await expect(page.locator('text=ABC Holdings LLC')).toBeVisible();
  });

  test('issue shares to stakeholder', async ({ page }) => {
    await createTestCompany(page);
    const companyId = page.url().match(/\/companies\/(\d+)/)[1];

    // Add stakeholder
    await page.goto(`/companies/${companyId}/stakeholders/new`);
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('natural_person');
    await page.fill('input[placeholder="e.g. John Doe"]', 'Test Shareholder');
    await page.fill('input[dir="rtl"]', 'اختبار');
    await page.fill('input[placeholder="SAU"]', 'SAU');
    await page.fill('input[placeholder="stakeholder@example.com"]', 'shareholder@test.com');
    await page.click('button[type="submit"]:has-text("Add stakeholder")');
    await page.waitForURL(`/companies/${companyId}/stakeholders`);

    // Issue shares
    await page.goto(`/companies/${companyId}/cap-table/issue`);
    const stakeholderSelect = page.locator('select').first();
    await stakeholderSelect.selectOption({ label: 'Test Shareholder' });
    await page.fill('input[placeholder="e.g. ordinary"]', 'ordinary');
    const shareInput = page.locator('input[type="number"]').first();
    await shareInput.fill('1000');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2024-01-01');
    await page.click('button[type="submit"]:has-text("Issue shares")');
    await page.waitForURL(`/companies/${companyId}$`);
  });

  test('transfer shares between stakeholders', async ({ page }) => {
    await createTestCompany(page);
    const companyId = page.url().match(/\/companies\/(\d+)/)[1];

    // Add two stakeholders
    for (let i = 1; i <= 2; i++) {
      await page.goto(`/companies/${companyId}/stakeholders/new`);
      const typeSelect = page.locator('select').first();
      await typeSelect.selectOption('natural_person');
      await page.fill('input[placeholder="e.g. John Doe"]', `Stakeholder ${i}`);
      await page.fill('input[dir="rtl"]', `صاحب مصلحة ${i}`);
      await page.fill('input[placeholder="SAU"]', 'SAU');
      await page.fill('input[placeholder="stakeholder@example.com"]', `stakeholder${i}@test.com`);
      await page.click('button[type="submit"]:has-text("Add stakeholder")');
      await page.waitForURL(`/companies/${companyId}/stakeholders`);
    }

    // Issue shares to first stakeholder
    await page.goto(`/companies/${companyId}/cap-table/issue`);
    let stakeholderSelect = page.locator('select').first();
    await stakeholderSelect.selectOption({ label: 'Stakeholder 1' });
    await page.fill('input[placeholder="e.g. ordinary"]', 'ordinary');
    const shareInput = page.locator('input[type="number"]').first();
    await shareInput.fill('1000');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2024-01-01');
    await page.click('button[type="submit"]:has-text("Issue shares")');
    await page.waitForURL(`/companies/${companyId}$`);

    // Transfer shares
    await page.goto(`/companies/${companyId}/cap-table/transfer`);
    stakeholderSelect = page.locator('select').first();
    await stakeholderSelect.selectOption({ label: 'Stakeholder 1' });
    const selectElements = page.locator('select');
    await selectElements.nth(1).selectOption({ label: 'Stakeholder 2' });
    await page.fill('input[placeholder="e.g. ordinary"]', 'ordinary');
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill('500');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2024-02-01');
    await page.click('button[type="submit"]:has-text("Transfer shares")');
    await page.waitForURL(`/companies/${companyId}$`);
  });
});
