/**
 * Script to capture screenshots of all Founder Connect screens
 * Run with: node e2e/screenshot-founder-connect.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '../screenshots/founder-connect');
const BASE_URL = 'http://localhost:5173';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function createTestUser(request, email, password) {
  try {
    // Try to register
    const registerResponse = await request.post(`${BASE_URL.replace('5173', '8000')}/api/auth/register`, {
      data: { email, password }
    });
    
    if (registerResponse.ok()) {
      const data = await registerResponse.json();
      return data.session_token;
    }
    
    // If registration fails, try login
    const loginResponse = await request.post(`${BASE_URL.replace('5173', '8000')}/api/auth/login`, {
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
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '01_Dashboard_With_Founder_Connect.png'),
      fullPage: true 
    });
    screenshots.push('01_Dashboard_With_Founder_Connect.png');
    
    // 2. Founder Connect - My Profile (Empty State)
    console.log('Taking screenshot: Founder Connect - My Profile (Empty)...');
    await page.goto(`${BASE_URL}/founder-connect?tab=profile`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '02_Founder_Connect_My_Profile_Empty.png'),
      fullPage: true 
    });
    screenshots.push('02_Founder_Connect_My_Profile_Empty.png');
    
    // 3. Create Founder Profile Modal
    console.log('Taking screenshot: Create Founder Profile Modal...');
    await page.click('text=/Create|Edit/i');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '03_Create_Founder_Profile_Modal.png'),
      fullPage: true 
    });
    screenshots.push('03_Create_Founder_Profile_Modal.png');
    
    // Fill in profile form
    await page.fill('input[name="full_name"], input[placeholder*="name" i]', 'John Doe');
    await page.fill('textarea[name="bio"], textarea[placeholder*="bio" i]', 'Experienced entrepreneur looking for co-founders');
    await page.fill('input[name="location"], input[placeholder*="location" i]', 'San Francisco, CA');
    await page.selectOption('select[name="commitment_level"]', 'part-time');
    
    // 4. Founder Profile Filled
    console.log('Taking screenshot: Founder Profile Form Filled...');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '04_Founder_Profile_Form_Filled.png'),
      fullPage: true 
    });
    screenshots.push('04_Founder_Profile_Form_Filled.png');
    
    // Save profile
    await page.click('button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(2000);
    
    // 5. Founder Connect - My Profile (With Data)
    console.log('Taking screenshot: Founder Connect - My Profile (With Data)...');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '05_Founder_Connect_My_Profile_With_Data.png'),
      fullPage: true 
    });
    screenshots.push('05_Founder_Connect_My_Profile_With_Data.png');
    
    // 6. Founder Connect - My Listings (Empty)
    console.log('Taking screenshot: Founder Connect - My Listings (Empty)...');
    await page.goto(`${BASE_URL}/founder-connect?tab=listings`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '06_Founder_Connect_My_Listings_Empty.png'),
      fullPage: true 
    });
    screenshots.push('06_Founder_Connect_My_Listings_Empty.png');
    
    // 7. Create Idea Listing Modal
    console.log('Taking screenshot: Create Idea Listing Modal...');
    await page.click('text=/Create|Add|New/i');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '07_Create_Idea_Listing_Modal.png'),
      fullPage: true 
    });
    screenshots.push('07_Create_Idea_Listing_Modal.png');
    
    // Fill listing form
    await page.fill('input[name="title"], input[placeholder*="title" i]', 'AI-Powered Task Manager');
    await page.selectOption('select[name="industry"]', 'SaaS');
    await page.selectOption('select[name="stage"]', 'idea');
    await page.fill('textarea[name="brief_description"]', 'A smart task manager that uses AI to prioritize and organize your work');
    
    // 8. Idea Listing Form Filled
    console.log('Taking screenshot: Idea Listing Form Filled...');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '08_Idea_Listing_Form_Filled.png'),
      fullPage: true 
    });
    screenshots.push('08_Idea_Listing_Form_Filled.png');
    
    // Save listing
    await page.click('button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(2000);
    
    // 9. Founder Connect - My Listings (With Data)
    console.log('Taking screenshot: Founder Connect - My Listings (With Data)...');
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '09_Founder_Connect_My_Listings_With_Data.png'),
      fullPage: true 
    });
    screenshots.push('09_Founder_Connect_My_Listings_With_Data.png');
    
    // 10. Browse Ideas
    console.log('Taking screenshot: Browse Ideas...');
    await page.goto(`${BASE_URL}/founder-connect?tab=browse-ideas`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '10_Browse_Ideas.png'),
      fullPage: true 
    });
    screenshots.push('10_Browse_Ideas.png');
    
    // 11. Browse Founders
    console.log('Taking screenshot: Browse Founders...');
    await page.goto(`${BASE_URL}/founder-connect?tab=browse-founders`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '11_Browse_Founders.png'),
      fullPage: true 
    });
    screenshots.push('11_Browse_Founders.png');
    
    // 12. Connections - Incoming
    console.log('Taking screenshot: Connections - Incoming...');
    await page.goto(`${BASE_URL}/founder-connect?tab=connections&subtab=incoming`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '12_Connections_Incoming.png'),
      fullPage: true 
    });
    screenshots.push('12_Connections_Incoming.png');
    
    // 13. Connections - Sent
    console.log('Taking screenshot: Connections - Sent...');
    await page.goto(`${BASE_URL}/founder-connect?tab=connections&subtab=sent`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '13_Connections_Sent.png'),
      fullPage: true 
    });
    screenshots.push('13_Connections_Sent.png');
    
    // 14. Connections - Accepted
    console.log('Taking screenshot: Connections - Accepted...');
    await page.goto(`${BASE_URL}/founder-connect?tab=connections&subtab=accepted`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '14_Connections_Accepted.png'),
      fullPage: true 
    });
    screenshots.push('14_Connections_Accepted.png');
    
    // 15. Credit Counter (at top of page)
    console.log('Taking screenshot: Credit Counter...');
    await page.goto(`${BASE_URL}/founder-connect`);
    await page.waitForTimeout(2000);
    // Scroll to top to show credit counter
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '15_Credit_Counter.png'),
      fullPage: false 
    });
    screenshots.push('15_Credit_Counter.png');
    
    // 16. Validation Result with "Open for Collaborators" button
    console.log('Taking screenshot: Validation Result with CTA...');
    // This would require a validation to exist, so we'll navigate to the page
    await page.goto(`${BASE_URL}/validate-result`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '16_Validation_Result_With_CTA.png'),
      fullPage: true 
    });
    screenshots.push('16_Validation_Result_With_CTA.png');
    
    // 17. Discovery Result with "List this idea" button
    console.log('Taking screenshot: Discovery Result with CTA...');
    await page.goto(`${BASE_URL}/results/recommendations`);
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOT_DIR, '17_Discovery_Result_With_CTA.png'),
      fullPage: true 
    });
    screenshots.push('17_Discovery_Result_With_CTA.png');
    
    console.log('\n✅ All screenshots captured!');
    console.log(`📁 Location: ${SCREENSHOT_DIR}`);
    console.log('\nScreenshots taken:');
    screenshots.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
takeScreenshots().catch(console.error);

