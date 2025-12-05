/**
 * Common test helpers for E2E tests
 */

/**
 * Check if backend server is available
 */
export async function checkBackendAvailable(page) {
  try {
    const response = await page.request.get('http://localhost:8000/api/health');
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Fill form field with error handling
 */
export async function safeFill(page, selector, value, fieldName = 'field') {
  try {
    const element = page.locator(selector).first();
    const count = await element.count();
    
    if (count === 0) {
      console.warn(`⚠️  ${fieldName} not found: ${selector}`);
      return false;
    }
    
    await element.fill(value);
    return true;
  } catch (error) {
    console.error(`❌ Failed to fill ${fieldName}:`, error.message);
    return false;
  }
}

/**
 * Click button with error handling
 */
export async function safeClick(page, selector, buttonName = 'button') {
  try {
    const element = page.locator(selector).first();
    const count = await element.count();
    
    if (count === 0) {
      console.warn(`⚠️  ${buttonName} not found: ${selector}`);
      return false;
    }
    
    await element.click();
    return true;
  } catch (error) {
    console.error(`❌ Failed to click ${buttonName}:`, error.message);
    return false;
  }
}

/**
 * Wait for navigation with timeout
 */
export async function waitForNavigation(page, urlPattern, timeout = 10000) {
  try {
    await page.waitForURL(urlPattern, { timeout });
    return true;
  } catch (error) {
    console.warn(`⚠️  Navigation timeout. Expected: ${urlPattern}, Current: ${page.url()}`);
    return false;
  }
}

/**
 * Create test user via API
 */
export async function createTestUser(request, email = null, password = 'TestPassword123!') {
  if (!email) {
    email = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
  }
  
  try {
    const response = await request.post('http://localhost:8000/api/auth/register', {
      data: { email, password },
    });
    
    if (response.ok()) {
      const data = await response.json();
      return {
        success: true,
        email,
        password,
        sessionToken: data.data?.session_token || data.session_token,
        user: data.data?.user || data.user,
      };
    } else {
      // Try login if user exists
      const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
        data: { email, password },
      });
      
      if (loginResponse.ok()) {
        const data = await loginResponse.json();
        return {
          success: true,
          email,
          password,
          sessionToken: data.data?.session_token || data.session_token,
          user: data.data?.user || data.user,
        };
      }
    }
    
    return { success: false, error: 'Failed to create or login user' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Set authentication in page
 */
export async function setAuth(page, sessionToken) {
  try {
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('sia_session_token', token);
    }, sessionToken);
    await page.waitForTimeout(500);
    return true;
  } catch (error) {
    console.error('❌ Failed to set auth:', error.message);
    return false;
  }
}

/**
 * Verify page loaded successfully
 */
export async function verifyPageLoaded(page, pageName = 'page') {
  try {
    await page.waitForSelector('body', { timeout: 10000 });
    const bodyVisible = await page.locator('body').isVisible();
    
    if (!bodyVisible) {
      throw new Error('Body element not visible');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ${pageName} failed to load:`, error.message);
    console.error(`   URL: ${page.url()}`);
    return false;
  }
}

