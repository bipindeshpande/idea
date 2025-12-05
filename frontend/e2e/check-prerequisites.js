/**
 * Prerequisites checker for E2E tests
 * Run this before running tests to ensure everything is set up correctly
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

async function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkFrontend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173', (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('🔍 Checking prerequisites for E2E tests...\n');
  
  // Check backend
  console.log('Checking backend server (http://localhost:8000)...');
  const backendOk = await checkBackend();
  if (backendOk) {
    console.log('✅ Backend server is running\n');
  } else {
    console.log('❌ Backend server is NOT running');
    console.log('   Please start the backend server on http://localhost:8000\n');
  }
  
  // Check frontend
  console.log('Checking frontend server (http://localhost:5173)...');
  const frontendOk = await checkFrontend();
  if (frontendOk) {
    console.log('✅ Frontend server is running\n');
  } else {
    console.log('⚠️  Frontend server is NOT running');
    console.log('   Playwright will auto-start it, but you can also run: npm run dev\n');
  }
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (backendOk) {
    console.log('✅ Ready to run tests!');
    console.log('   Run: npm run test:e2e');
  } else {
    console.log('❌ Not ready - please start the backend server first');
    process.exit(1);
  }
}

main().catch(console.error);

