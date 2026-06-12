import { test, expect } from '@playwright/test';
import { registerUser, verifyEmailViaDevAPI, loginViaUI, signOut, generateUniqueEmail } from './helpers/auth';

test.describe('Authentication', () => {
  test('register with valid credentials', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    expect(page.url()).toContain('/verify');
  });

  test('register rejects invalid email format', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="Mohammed Al-Rashidi"]', 'Test User');
    await page.fill('input[placeholder="you@company.com"]', 'invalid-email');
    await page.fill('input[placeholder="Min. 8 characters"]', 'ValidPass123');
    await page.click('button[type="submit"]:has-text("Create account")');
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('/verify');
  });

  test('register rejects password less than 8 characters', async ({ page }) => {
    const email = await generateUniqueEmail();
    await page.goto('/register');
    await page.fill('input[placeholder="Mohammed Al-Rashidi"]', 'Test User');
    await page.fill('input[placeholder="you@company.com"]', email);
    await page.fill('input[placeholder="Min. 8 characters"]', 'Short1');
    await page.click('button[type="submit"]:has-text("Create account")');
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('/verify');
  });

  test('register and verify OTP flow', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
    expect(page.url()).toBe('http://localhost:3000/dashboard');
  });

  test('login with valid credentials', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
    await signOut(page);
    await loginViaUI(page, email, 'ValidPass123');
    expect(page.url()).toBe('http://localhost:3000/dashboard');
  });

  test('login rejects invalid password', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
    await signOut(page);
    await page.goto('/login');
    await page.fill('input[autocomplete="email"]', email);
    await page.fill('input[autocomplete="current-password"]', 'WrongPassword123');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('/dashboard');
  });

  test('logout redirects to login', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await verifyEmailViaDevAPI(page, email);
    await signOut(page);
    expect(page.url()).toBe('http://localhost:3000/login');
  });

  test('unauthenticated user accessing /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // Route guard preserves the intended destination as ?next=
    expect(page.url()).toBe('http://localhost:3000/login?next=%2Fdashboard');
  });

  test('verify page with invalid OTP shows error', async ({ page }) => {
    const email = await generateUniqueEmail();
    await registerUser(page, email, 'ValidPass123', 'Test User');
    await page.fill('input[autocomplete="one-time-code"]', '111111');
    await page.click('button[type="submit"]:has-text("Verify & Sign in")');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/verify');
  });
});
