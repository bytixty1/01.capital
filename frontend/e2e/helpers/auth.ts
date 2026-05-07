import { Page } from '@playwright/test';

export async function registerUser(page: Page, email: string, password: string, fullName: string) {
  await page.goto('/register');
  await page.fill('input[placeholder="Mohammed Al-Rashidi"]', fullName);
  await page.fill('input[placeholder="you@company.com"]', email);
  await page.fill('input[placeholder="Min. 8 characters"]', password);
  await page.click('button[type="submit"]:has-text("Create account")');
  await page.waitForURL(/\/verify\?email=/);
}

export async function verifyOTP(page: Page, otp: string = '000000') {
  await page.fill('input[autocomplete="one-time-code"]', otp);
  await page.click('button[type="submit"]:has-text("Verify & Sign in")');
  await page.waitForURL('/dashboard');
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', email);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL('/dashboard');
}

export async function injectToken(page: Page, token: string) {
  await page.evaluate((t) => {
    localStorage.setItem('01capital_token', t);
  }, token);
}

export async function signOut(page: Page) {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login');
}

export async function generateUniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
}
