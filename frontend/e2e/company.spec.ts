import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

test.describe('Company Creation', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('complete 3-step company creation wizard (LLC)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("+ New company")');
    expect(page.url()).toContain('/companies/new');

    // Step 1: Identity
    await page.click('button:has-text("LLC")');
    await page.fill('input[placeholder="Acme Saudi LLC"]', 'Test Company LLC');
    await page.fill('input[dir="rtl"][placeholder*="اسم الشركة"]', 'شركة الاختبار');
    await page.fill('input[placeholder="10-digit number"]', '1234567890');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2023-01-15');
    await page.click('button:has-text("Continue to Capital")');
    await page.waitForTimeout(500);

    // Step 2: Capital
    await page.fill('input[type="number"]', '1000000');
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(1).fill('500000');
    await numberInputs.nth(2).fill('100');
    const selectElement = page.locator('select').first();
    await selectElement.selectOption('1');
    await page.click('button:has-text("Continue to Governance")');
    await page.waitForTimeout(500);

    // Step 3: Governance
    await page.click('button:has-text("Create company")');
    await page.waitForURL(/\/companies\/\d+$/);
    expect(page.url()).toMatch(/\/companies\/\d+$/);
  });

  test('complete 3-step creation with SJSC', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("+ New company")');
    await page.click('button:has-text("SJSC")');
    await page.fill('input[placeholder="Acme Saudi LLC"]', 'Test SJSC Company');
    await page.fill('input[dir="rtl"]', 'شركة الاختبار');
    await page.fill('input[placeholder="10-digit number"]', '1234567891');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2023-02-20');
    await page.click('button:has-text("Continue to Capital")');
    await page.waitForTimeout(500);
    await page.fill('input[type="number"]', '2000000');
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(1).fill('1000000');
    await numberInputs.nth(2).fill('50');
    await page.locator('select').first().selectOption('3');
    await page.click('button:has-text("Continue to Governance")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Create company")');
    await page.waitForURL(/\/companies\/\d+$/);
    expect(page.url()).toMatch(/\/companies\/\d+$/);
  });

  test('cannot proceed to step 2 with invalid company name', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("+ New company")');
    await page.click('button:has-text("LLC")');
    await page.fill('input[placeholder="Acme Saudi LLC"]', 'A');
    await page.fill('input[dir="rtl"]', 'ش');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2023-01-15');
    await page.click('button:has-text("Continue to Capital")');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/companies/new');
  });

  test('company appears in dashboard after creation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('a:has-text("+ New company")');
    await page.click('button:has-text("LLC")');
    const companyName = `Company ${Date.now()}`;
    await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
    await page.fill('input[dir="rtl"]', 'شركة');
    await page.fill('input[placeholder="10-digit number"]', '1234567892');
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2023-03-10');
    await page.click('button:has-text("Continue to Capital")');
    await page.waitForTimeout(500);
    await page.fill('input[type="number"]', '1500000');
    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(1).fill('750000');
    await numberInputs.nth(2).fill('75');
    await page.locator('select').first().selectOption('6');
    await page.click('button:has-text("Continue to Governance")');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]:has-text("Create company")');
    await page.waitForURL(/\/companies\/\d+$/);
    await page.goto('/dashboard');
    await expect(page.locator(`text=${companyName}`)).toBeVisible();
  });
});
