import { Page } from '@playwright/test';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function registerUser(page: Page, email: string, password: string, fullName: string) {
  await page.goto('/register');
  await page.fill('input[placeholder="Mohammed Al-Rashidi"]', fullName);
  await page.fill('input[placeholder="you@company.com"]', email);
  await page.fill('input[placeholder="Min. 8 characters"]', password);
  await page.click('button[type="submit"]:has-text("Create account")');
  await page.waitForURL(/\/verify\?email=/);
}

/**
 * Bypasses email OTP verification by calling the dev-only backend endpoint.
 * Exchanges the returned token for the httpOnly session cookie via
 * /api/session and navigates to /dashboard.
 *
 * Only works when ENVIRONMENT != production. Never use in tests against live data.
 */
export async function verifyEmailViaDevAPI(page: Page, email: string) {
  const response = await page.request.post(`${API_BASE}/api/auth/dev/verify-email`, {
    data: { email, otp: '' },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    throw new Error(`dev/verify-email failed: ${response.status()} ${await response.text()}`);
  }
  const { access_token } = await response.json() as { access_token: string };
  await setSessionCookie(page, access_token);
  await page.goto('/dashboard');
  await page.waitForURL('/dashboard');
}

/** @deprecated Use verifyEmailViaDevAPI instead — backend no longer accepts 000000. */
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

/**
 * Sets the httpOnly session cookie the way the app does: POST the backend
 * token to the Next.js /api/session route. page.request shares the browser
 * context's cookie jar, so the Set-Cookie applies to subsequent page loads.
 */
export async function setSessionCookie(page: Page, token: string) {
  const response = await page.request.post('/api/session', {
    data: { access_token: token },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    throw new Error(`/api/session failed: ${response.status()} ${await response.text()}`);
  }
}

export async function signOut(page: Page) {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('/login');
}

export async function generateUniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
}
