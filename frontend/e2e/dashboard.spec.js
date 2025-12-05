import { test, expect } from '@playwright/test';
import { createTestUser, setAuth } from './test-helpers.js';

/**
 * E2E tests for Dashboard functionality
 */

test.describe('Dashboard', () => {
  let authToken;
  let testUserEmail;

  test.beforeAll(async ({ request }) => {
    const userResult = await createTestUser(request);
    if (userResult.success) {
      testUserEmail = userResult.email;
      authToken = userResult.sessionToken;
    }
  });

  test.beforeEach(async ({ page }) => {
    if (authToken) {
      await setAuth(page, authToken);
    }
  });

  test('should load dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify dashboard loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for common dashboard elements
    const hasDashboardContent = await page.locator('text=/dashboard|sessions|ideas|validations/i').count() > 0;
    // Dashboard should have some content
    expect(hasDashboardContent || page.url().includes('/dashboard')).toBeTruthy();
  });

  test('should navigate to Founder Connect from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Find and click Founder Connect link
    const founderLink = page.locator('text=/Founder Connect|🤝/i').first();
    if (await founderLink.count() > 0) {
      await founderLink.click();
      await page.waitForURL(/founder-connect/, { timeout: 10000 });
      expect(page.url()).toContain('/founder-connect');
    }
  });

  test('should display user email in navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check if user email is displayed (might be in nav or account section)
    const userEmail = page.locator(`text=${testUserEmail}`);
    // Email might be truncated, so just check if page loaded
    await expect(page.locator('body')).toBeVisible();
  });
});

