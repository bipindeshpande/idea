/**
 * Simplified script to capture screenshots of all Founder Connect screens
 * Run with: node e2e/screenshot-founder-connect-simple.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/founder-connect');
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8000';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function createTestUser(request, email, password) {
  try {
    // Try to register
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: { email, password }
    });
    
    if (registerResponse.ok()) {
      const data = await registerResponse.json();
      return data.session_token;
    }
    
    // If registration fails, try login
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { email, password }
    });
    
    if (loginResponse.ok()) {
      const data = await loginResponse.json();
      return data.session_token;
    }
    
    return null;
  } catch (error) {
    console.error('Error creating test user:', error);
    return null;
  }
}

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const request = context.request;
  const testEmail = `screenshot_test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('Creating test user...');
  const sessionToken = await createTestUser(request, testEmail, testPassword);
  
  if (!sessionToken) {
    console.error('Failed to create test user. Make sure backend is running on port 8000');
    await browser.close();
    return;
  }
  
  // Set authentication
  await page.goto(BASE_URL);
  await page.evaluate((token) => {
    localStorage.setItem('sia_session_token', token);
  }, sessionToken);
  
  const screenshots = [];
  
  try {
    // 1. Dashboard with Founder Connect section
    console.log('Taking screenshot: Dashboard with Founder Connect...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '01_Dashboard_With_Founder_Connect.png'),
      fullPage: true 
    });
    screenshots.push('01_Dashboard_With_Founder_Connect.png');
    
    // 2. Founder Connect - Main Page (Credit Counter)
    console.log('Taking screenshot: Founder Connect - Main Page...');
    await page.goto(`${BASE_URL}/founder-connect`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02_Founder_Connect_Main_Page.png'),
      fullPage: true 
    });
    screenshots.push('02_Founder_Connect_Main_Page.png');
    
    // 3. Founder Connect - My Profile (Empty State)
    console.log('Taking screenshot: Founder Connect - My Profile (Empty)...');
    await page.goto(`${BASE_URL}/founder-connect?tab=profile`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '03_Founder_Connect_My_Profile_Empty.png'),
      fullPage: true 
    });
    screenshots.push('03_Founder_Connect_My_Profile_Empty.png');
    
    // Try to find and click edit/create button
    try {
      const editButton = page.locator('button:has-text("Edit"), button:has-text("Create"), button:has-text("Update")').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(2000);
        
        // 4. Create/Edit Founder Profile Modal
        console.log('Taking screenshot: Create/Edit Founder Profile Modal...');
        await page.screenshot({ 
          path: path.join(SCREENSHOT_DIR, '04_Create_Edit_Founder_Profile_Modal.png'),
          fullPage: true 
        });
        screenshots.push('04_Create_Edit_Founder_Profile_Modal.png');
      }
    } catch (e) {
      console.log('Could not find edit button, skipping modal screenshot');
    }
    
    // 5. Founder Connect - My Listings (Empty)
    console.log('Taking screenshot: Founder Connect - My Listings (Empty)...');
    await page.goto(`${BASE_URL}/founder-connect?tab=listings`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05_Founder_Connect_My_Listings_Empty.png'),
      fullPage: true 
    });
    screenshots.push('05_Founder_Connect_My_Listings_Empty.png');
    
    // 6. Browse Ideas
    console.log('Taking screenshot: Browse Ideas...');
    await page.goto(`${BASE_URL}/founder-connect?tab=browse-ideas`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06_Browse_Ideas.png'),
      fullPage: true 
    });
    screenshots.push('06_Browse_Ideas.png');
    
    // 7. Browse Founders
    console.log('Taking screenshot: Browse Founders...');
    await page.goto(`${BASE_URL}/founder-connect?tab=browse-people`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '07_Browse_Founders.png'),
      fullPage: true 
    });
    screenshots.push('07_Browse_Founders.png');
    
    // 8. Connections - Incoming
    console.log('Taking screenshot: Connections - Incoming...');
    await page.goto(`${BASE_URL}/founder-connect?tab=connections`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '08_Connections_Incoming.png'),
      fullPage: true 
    });
    screenshots.push('08_Connections_Incoming.png');
    
    // 9. Credit Counter (close-up)
    console.log('Taking screenshot: Credit Counter...');
    await page.goto(`${BASE_URL}/founder-connect`);
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Take a partial screenshot of just the credit counter area
    const creditSection = page.locator('.bg-brand-50, .bg-brand-900').first();
    if (await creditSection.count() > 0) {
      await creditSection.screenshot({ 
        path: path.join(SCREENSHOT_DIR, '09_Credit_Counter.png')
      });
      screenshots.push('09_Credit_Counter.png');
    }
    
    // 10. Validation Result page (if accessible)
    console.log('Taking screenshot: Validation Result page...');
    await page.goto(`${BASE_URL}/validate-result`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '10_Validation_Result_Page.png'),
      fullPage: true 
    });
    screenshots.push('10_Validation_Result_Page.png');
    
    // 11. Discovery/Recommendations page
    console.log('Taking screenshot: Discovery/Recommendations page...');
    await page.goto(`${BASE_URL}/results/recommendations`);
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '11_Discovery_Recommendations_Page.png'),
      fullPage: true 
    });
    screenshots.push('11_Discovery_Recommendations_Page.png');
    
    console.log('\n✅ All screenshots captured!');
    console.log(`📁 Location: ${SCREENSHOT_DIR}`);
    console.log('\nScreenshots taken:');
    screenshots.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('\n💡 You can now compile these screenshots into a Word document.');
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    // Keep browser open for a moment so user can see
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

// Run the script
takeScreenshots().catch(console.error);

