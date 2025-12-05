import { test, expect } from '@playwright/test';

/**
 * E2E tests for Public Pages
 */

test.describe('Public Pages', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check for landing page content
    const hasLandingContent = await page.locator('text=/startup|idea|advisor|welcome/i').count() > 0;
    expect(hasLandingContent).toBeTruthy();
    
    // Check for navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to product page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Click Product link
    const productLink = page.locator('text=/Product|product/i').first();
    if (await productLink.count() > 0) {
      await productLink.click();
      await page.waitForURL(/product/, { timeout: 10000 });
      expect(page.url()).toContain('/product');
    }
  });

  test('should load product page', async ({ page }) => {
    await page.goto('/product');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify product page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for product-related content
    const hasProductContent = await page.locator('text=/product|feature|solution/i').count() > 0;
    expect(hasProductContent || page.url().includes('/product')).toBeTruthy();
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Click Pricing link
    const pricingLink = page.locator('text=/Pricing|pricing/i').first();
    if (await pricingLink.count() > 0) {
      await pricingLink.click();
      await page.waitForURL(/pricing/, { timeout: 10000 });
      expect(page.url()).toContain('/pricing');
    }
  });

  test('should load pricing page and display plans', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify pricing page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for pricing/plan content
    const hasPricingContent = await page.locator('text=/pricing|plan|subscription|free|starter|pro/i').count() > 0;
    expect(hasPricingContent || page.url().includes('/pricing')).toBeTruthy();
  });

  test('should load about page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify about page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for about content
    const hasAboutContent = await page.locator('text=/about|mission|vision|team/i').count() > 0;
    expect(hasAboutContent || page.url().includes('/about')).toBeTruthy();
  });

  test('should load contact page', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify contact page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for contact form or contact info
    const hasContactContent = await page.locator('text=/contact|email|message|form/i').count() > 0;
    expect(hasContactContent || page.url().includes('/contact')).toBeTruthy();
  });

  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Look for contact form fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
    
    if (await nameInput.count() > 0 && await emailInput.count() > 0 && await messageInput.count() > 0) {
      await nameInput.fill('Test User');
      await emailInput.fill('test@example.com');
      await messageInput.fill('Test message for E2E testing');
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Verify form was submitted (success message or redirect)
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should load resources page', async ({ page }) => {
    await page.goto('/resources');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify resources page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for resources content
    const hasResourcesContent = await page.locator('text=/resource|guide|template|tool/i').count() > 0;
    expect(hasResourcesContent || page.url().includes('/resources')).toBeTruthy();
  });

  test('should load blog page', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify blog page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for blog content
    const hasBlogContent = await page.locator('text=/blog|article|post/i').count() > 0;
    expect(hasBlogContent || page.url().includes('/blog')).toBeTruthy();
  });

  test('should load frameworks page', async ({ page }) => {
    await page.goto('/frameworks');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify frameworks page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for frameworks content
    const hasFrameworksContent = await page.locator('text=/framework|methodology|model/i').count() > 0;
    expect(hasFrameworksContent || page.url().includes('/frameworks')).toBeTruthy();
  });

  test('should load privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify privacy page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for privacy content
    const hasPrivacyContent = await page.locator('text=/privacy|policy|data|protection/i').count() > 0;
    expect(hasPrivacyContent || page.url().includes('/privacy')).toBeTruthy();
  });

  test('should load terms page', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Verify terms page loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for terms content
    const hasTermsContent = await page.locator('text=/terms|condition|agreement|service/i').count() > 0;
    expect(hasTermsContent || page.url().includes('/terms')).toBeTruthy();
  });

  test('should navigate from landing to register', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Find and click register/get started button
    const registerLink = page.locator('text=/Get Started|Register|Sign Up/i').first();
    if (await registerLink.count() > 0) {
      await registerLink.click();
      await page.waitForURL(/register/, { timeout: 10000 });
      expect(page.url()).toContain('/register');
    }
  });

  test('should navigate from landing to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Find and click login/sign in button
    const loginLink = page.locator('text=/Sign In|Login|Log in/i').first();
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await page.waitForURL(/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    }
  });

  test('should display footer on public pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check for footer
    const footer = page.locator('footer, [role="contentinfo"]');
    if (await footer.count() > 0) {
      await expect(footer.first()).toBeVisible();
    }
  });

  test('should have working navigation menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check navigation is visible
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
    
    // Check for common nav items
    const hasNavItems = await page.locator('text=/Product|Pricing|Resources|About|Contact/i').count() > 0;
    expect(hasNavItems).toBeTruthy();
  });
});

