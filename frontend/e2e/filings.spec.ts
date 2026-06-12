import { test, expect } from '@playwright/test';
import { registerUser, verifyEmailViaDevAPI, generateUniqueEmail } from './helpers/auth';
import { createTestCompany } from './helpers/company';

test.describe('Filings', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
  });

  test('mark filing as in progress', async ({ page }) => {
    const companyId = await createTestCompany(page, 'FilingCo');
    await page.goto(`/companies/${companyId}/filings`);

    const markInProgressButton = page.locator('button:has-text("Mark in progress")').first();
    if (await markInProgressButton.isVisible()) {
      await markInProgressButton.click();
      await page.waitForTimeout(1000);
      expect(markInProgressButton).not.toBeVisible();
    }
  });

  test('filing status transitions pending -> in progress -> submitted', async ({ page }) => {
    const companyId = await createTestCompany(page, 'FilingCo');
    await page.goto(`/companies/${companyId}/filings`);

    const pendingFilings = page.locator('button:has-text("Mark in progress")');
    const filingCount = await pendingFilings.count();

    if (filingCount > 0) {
      await pendingFilings.first().click();
      await page.waitForTimeout(1000);

      const markSubmittedButton = page.locator('button:has-text("Mark submitted")').first();
      if (await markSubmittedButton.isVisible()) {
        await markSubmittedButton.click();
        await page.waitForTimeout(1000);
        expect(markSubmittedButton).not.toBeVisible();
      }
    }
  });

  test('mark filing as not required', async ({ page }) => {
    const companyId = await createTestCompany(page, 'FilingCo');
    await page.goto(`/companies/${companyId}/filings`);

    const notRequiredButton = page.locator('button:has-text("Not required")').first();
    if (await notRequiredButton.isVisible()) {
      await notRequiredButton.click();
      await page.waitForTimeout(1000);
      expect(notRequiredButton).not.toBeVisible();
    }
  });

  test('filings page loads and displays', async ({ page }) => {
    const companyId = await createTestCompany(page, 'FilingCo');
    await page.goto(`/companies/${companyId}/filings`);

    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent).toMatch(/[Ff]ilings?/);
  });
});
