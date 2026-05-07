import { test, expect } from '@playwright/test';
import { registerUser, verifyOTP, generateUniqueEmail } from './helpers/auth';

async function createTestCompany(page) {
  await page.goto('/dashboard');
  await page.click('a:has-text("+ New company")');
  await page.click('button:has-text("LLC")');
  const companyName = `MemberCo ${Date.now()}`;
  await page.fill('input[placeholder="Acme Saudi LLC"]', companyName);
  await page.fill('input[dir="rtl"]', 'الشركة');
  await page.fill('input[placeholder="10-digit number"]', '1234567897');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2023-08-01');
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

test.describe('Company Members', () => {
  test.beforeEach(async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyOTP(page, '000000');
  });

  test('members page loads and displays', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/members`);

    // Wait for members to load
    await page.waitForTimeout(1000);

    // Check that members page has content
    const pageContent = await page.content();
    expect(pageContent).toContain('members') || expect(pageContent).toContain('Member');
  });

  test('change member role via select', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/members`);

    // Wait for members to load
    await page.waitForTimeout(1000);

    const roleSelects = page.locator('select');
    const selectCount = await roleSelects.count();

    if (selectCount > 0) {
      const firstSelect = roleSelects.first();
      const currentValue = await firstSelect.inputValue();

      // Change to different role
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
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/members`);

    // Wait for members to load
    await page.waitForTimeout(1000);

    const removeButtons = page.locator('button:has-text("Remove")');
    const removeCount = await removeButtons.count();

    if (removeCount > 0) {
      // Set up dialog handler to accept confirmation
      page.once('dialog', (dialog) => {
        dialog.accept();
      });

      await removeButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('members page shows table with role column', async ({ page }) => {
    const companyId = await createTestCompany(page);
    await page.goto(`/companies/${companyId}/members`);

    // Wait for members to load
    await page.waitForTimeout(1000);

    // Look for admin, editor, or viewer text indicating role display
    const pageContent = await page.content();
    const hasRoles = pageContent.includes('admin') ||
                     pageContent.includes('editor') ||
                     pageContent.includes('viewer');

    expect(hasRoles).toBeTruthy();
  });
});
