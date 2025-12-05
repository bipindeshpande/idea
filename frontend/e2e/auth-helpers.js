/**
 * Helper functions for authentication in Playwright tests
 */

/**
 * Create a test user and return session token
 */
export async function createTestUser(request, email = null, password = 'test-password-123') {
  if (!email) {
    email = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
  }
  
  // Try to register
  const registerResponse = await request.post('http://localhost:8000/api/auth/register', {
    data: {
      email,
      password,
    },
  });
  
  if (registerResponse.ok()) {
    const data = await registerResponse.json();
    return {
      email,
      password,
      sessionToken: data.data?.session_token || data.session_token,
      user: data.data?.user || data.user,
    };
  }
  
  // If registration fails, try login (user might exist)
  const loginResponse = await request.post('http://localhost:8000/api/auth/login', {
    data: {
      email,
      password,
    },
  });
  
  if (loginResponse.ok()) {
    const data = await loginResponse.json();
    return {
      email,
      password,
      sessionToken: data.data?.session_token || data.session_token,
      user: data.data?.user || data.user,
    };
  }
  
  throw new Error(`Failed to create or login test user: ${email}`);
}

/**
 * Set authentication in page context
 */
export async function setAuth(page, context, sessionToken) {
  // Set cookie
  await context.addCookies([{
    name: 'session_token',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
  }]);
  
  // Set in localStorage
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('session_token', token);
    // Also set in sessionStorage if your app uses it
    sessionStorage.setItem('session_token', token);
  }, sessionToken);
}

/**
 * Create a founder profile via API
 */
export async function createFounderProfile(request, sessionToken, profileData = {}) {
  const response = await request.post('http://localhost:8000/api/founder/profile', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    data: {
      full_name: profileData.full_name || 'Test Founder',
      bio: profileData.bio || 'Test bio',
      is_public: profileData.is_public !== undefined ? profileData.is_public : true,
      ...profileData,
    },
  });
  
  if (response.ok()) {
    const data = await response.json();
    return data.profile;
  }
  
  return null;
}

/**
 * Create an idea listing via API
 */
export async function createIdeaListing(request, sessionToken, listingData = {}) {
  const response = await request.post('http://localhost:8000/api/founder/ideas', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
    data: {
      title: listingData.title || 'Test Idea',
      industry: listingData.industry || 'SaaS',
      stage: listingData.stage || 'idea',
      source_type: listingData.source_type || 'validation',
      source_id: listingData.source_id || 1,
      ...listingData,
    },
  });
  
  if (response.ok()) {
    const data = await response.json();
    return data.listing;
  }
  
  return null;
}

