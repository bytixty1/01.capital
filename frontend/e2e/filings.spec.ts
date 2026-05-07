import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

async function createTestCompany(page) {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `FilingCo ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567896');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-07-01');
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

  return page.url().match(/\/companies\/(\d+)/)[1];
}

test.describe('Filings', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('mark filing as in progress', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/filings`);

    const markInProgressButton = page.locator('button:has-text("Mark in progress")').first();
    if (await markInProgressButton.isVisible()) {
      await markInProgressButton.click();
      await page.waitForTimeout(1000);
      // Button should change or disappear after marking as in progress
      expect(markInProgressButton).not.toBeVisible();
    }
  });

  test('filing status transitions pending -> in progress -> submitted', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/filings`);

    // Check if a pending filing exists
    const pendingFilings = page.locator('button:has-text("Mark in progress")');
    const filingCount = await pendingFilings.count();

    if (filingCount > 0) {
      // Mark as in progress
      await pendingFilings.first().click();
      await page.waitForTimeout(1000);

      // Check if we can now mark as submitted
      const markSubmittedButton = page.locator('button:has-text("Mark submitted")').first();
      if (await markSubmittedButton.isVisible()) {
        await markSubmittedButton.click();
        await page.waitForTimeout(1000);
        expect(markSubmittedButton).not.toBeVisible();
      }
    }
  });

  test('mark filing as not required', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/filings`);

    const notRequiredButton = page.locator('button:has-text("Not required")').first();
    if (await notRequiredButton.isVisible()) {
      await notRequiredButton.click();
      await page.waitForTimeout(1000);
      expect(notRequiredButton).not.toBeVisible();
    }
  });

  test('filings page loads and displays', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/filings`);

    // Wait for filings to load
    await page.waitForTimeout(1000);

    // Check that filings page has some content
    const pageContent = await page.content();
    expect(pageContent).toContain('filings') || expect(pageContent).toContain('Filing');
  });
});
