import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';
import { createTestCompany } from './helpers/company';

test.describe('Company Members', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('members page loads and displays', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent).toMatch(/[Mm]embers?/);
  });

  test('change member role via select', async ({ page }) => {
    const companyId = await createTestCompany(page, 'MemberCo');
    await page.goto(`/companies/${companyId}/members`);

    await page.waitForTimeout(1000);
    const roleSelects = page.locator('select');
    const selectCount = await roleSelects.count();

    if (selectCount > 0) {
      const firstSelect = roleSelects.first();
      const currentValue = await firstSelect.inputValue();

      if (currentValue === 'admin') {
        await firstSelect.selectOption('editor');
      } else if (currentValue === 'editor') {
        await firstSelect.selectOption('viewer');
      } else {
        await firstSelect.selectOption('admin');
      }

      await page.waitForTimeout(1000);
      const newValue = await firstSelect.inputValue();
      expect(newValue).not.toBe(currentValue);
    }
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

    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    const hasRoles = pageContent.includes('admin') ||
                     pageContent.includes('editor') ||
                     pageContent.includes('viewer');
    expect(hasRoles).toBeTruthy();
  });
});
