import { test, expect } from '@playwright/test';
import { registerUser, verifyEmailViaDevAPI, generateUniqueEmail } from './helpers/auth';
import { createTestCompany } from './helpers/company';

test.describe('Company Members', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
  });

  test('members page loads and displays', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent).toMatch(/[Mm]embers?/);
  });

  test('changing your own role is rejected', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    // The only member is the current user — the backend must refuse to let
    // them change their own role (companies.py: "Cannot change your own role").
    const roleSelect = page.locator('select').first();
    await expect(roleSelect).toHaveValue('admin');
    await roleSelect.selectOption('editor');

    await expect(page.locator('text=Cannot change your own role')).toBeVisible();
  });

  test('remove member with confirmation', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    await page.waitForTimeout(1000);
    const removeButtons = page.locator('button:has-text("Remove")');
    const removeCount = await removeButtons.count();

    if (removeCount > 0) {
      page.once('dialog', (dialog) => { dialog.accept(); });
      await removeButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('members page shows table with role column', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    // Auto-waits for the members fetch — a fixed timeout races it
    await expect(page.locator('th', { hasText: 'Role' })).toBeVisible();
    await expect(page.locator('select').first()).toHaveValue('admin');
  });
});
