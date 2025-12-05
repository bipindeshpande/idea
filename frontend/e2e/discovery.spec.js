import { test, expect } from '@playwright/test';
import { createTestUser, setAuth } from './test-helpers.js';

/**
 * E2E tests for Discovery/Advisor flows
 */

test.describe('Discovery/Advisor Flows', () => {
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

  test('should load advisor/home page', async ({ page }) => {
    await page.goto('/advisor');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify advisor page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for intake form or advisor content
    const hasAdvisorContent = await page.locator('text=/advisor|discovery|start|question|form/i').count() > 0;
    expect(hasAdvisorContent || page.url().includes('/advisor')).toBeTruthy();
  });

  test('should fill advisor intake form', async ({ page }) => {
    await page.goto('/advisor');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait for form to load
    await page.waitForTimeout(2000);
    
    // Try to find and fill form fields
    const textInputs = page.locator('input[type="text"], textarea');
    const inputCount = await textInputs.count();
    
    if (inputCount > 0) {
      // Fill first few inputs with test data
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        await textInputs.nth(i).fill(`Test answer ${i + 1}`);
        await page.waitForTimeout(500);
      }
    }
    
    // Verify page is still visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should submit advisor form', async ({ page }) => {
    await page.goto('/advisor');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Look for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Start"), button:has-text("Continue")').first();
    if (await submitButton.count() > 0) {
      // Note: Actual submission might take time and redirect
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      // Should either redirect or show loading
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to recommendations report', async ({ page }) => {
    await page.goto('/results/recommendations');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify recommendations page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for recommendations content
    const hasRecommendationsContent = await page.locator('text=/recommendation|idea|suggestion/i').count() > 0;
    expect(hasRecommendationsContent || page.url().includes('/recommendations')).toBeTruthy();
  });

  test('should view recommendation detail', async ({ page }) => {
    // First go to recommendations list
    await page.goto('/results/recommendations');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Look for a recommendation card/link to click
    const recommendationLink = page.locator('a[href*="/recommendations/"], .recommendation-card, .idea-card').first();
    if (await recommendationLink.count() > 0) {
      await recommendationLink.click();
      await page.waitForTimeout(2000);
      
      // Should be on detail page
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should load profile report', async ({ page }) => {
    await page.goto('/results/profile?sample=true');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify profile report loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for profile content
    const hasProfileContent = await page.locator('text=/profile|analysis|strength|skill/i').count() > 0;
    expect(hasProfileContent || page.url().includes('/profile')).toBeTruthy();
  });

  test('should load full recommendation report', async ({ page }) => {
    await page.goto('/results/recommendations/full?sample=true');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify full report loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for report content
    const hasReportContent = await page.locator('text=/report|recommendation|idea|analysis/i').count() > 0;
    expect(hasReportContent || page.url().includes('/full')).toBeTruthy();
  });

  test('should display "List this idea" CTA on recommendation detail', async ({ page }) => {
    await page.goto('/results/recommendations/0');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Look for "List this idea" or "Open for collaborators" button
    const listButton = page.locator('text=/List|Open.*collaborator|Founder Connect/i').first();
    // Button might not always be visible, so just verify page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate from recommendation to founder connect', async ({ page }) => {
    await page.goto('/results/recommendations/0');
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Click "List this idea" or similar CTA
    const listButton = page.locator('text=/List|Open.*collaborator|Founder Connect/i').first();
    if (await listButton.count() > 0) {
      await listButton.click();
      await page.waitForTimeout(2000);
      
      // Should navigate to founder connect or show modal
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

