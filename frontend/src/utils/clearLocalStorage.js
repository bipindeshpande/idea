/**
 * Utility function to clear all localStorage data used by the application.
 * This will clear:
 * - Session tokens
 * - Validation data
 * - Discovery/report data
 * - Dashboard runs
 * - Analytics data
 * - Theme preferences
 * - Admin session
 * - Validation tooltips
 * - Revalidate data
 */
export function clearAllLocalStorage() {
  // Clear all known localStorage keys used by the app
  const keysToClear = [
    'session_token',
    'validations',
    'reports',
    'runs',
    'analytics_data',
    'theme',
    'admin_auth',
    'validation_tooltips_dismissed',
    'revalidate_data',
    'sia_validation_questions',
    'sia_intake_fields',
  ];

  // Clear specific keys
  keysToClear.forEach(key => {
    localStorage.removeItem(key);
  });

  // Also clear any keys that might have been added dynamically
  // (This is a fallback - be careful in production)
  const keysToCheck = Object.keys(localStorage);
  keysToCheck.forEach(key => {
    // Clear any key that looks like it belongs to this app
    if (
      key.includes('validation') ||
      key.includes('report') ||
      key.includes('run_') ||
      key.includes('session') ||
      key.includes('sia_')
    ) {
      localStorage.removeItem(key);
    }
  });

  console.log('✅ All localStorage data cleared');
  return true;
}

/**
 * Clear specific localStorage data by category
 */
export function clearLocalStorageByCategory(category) {
  switch (category) {
    case 'auth':
      localStorage.removeItem('session_token');
      localStorage.removeItem('admin_auth');
      break;
    case 'validations':
      localStorage.removeItem('validations');
      localStorage.removeItem('validation_tooltips_dismissed');
      localStorage.removeItem('revalidate_data');
      break;
    case 'reports':
      localStorage.removeItem('reports');
      localStorage.removeItem('runs');
      break;
    case 'analytics':
      localStorage.removeItem('analytics_data');
      break;
    case 'settings':
      localStorage.removeItem('theme');
      break;
    case 'admin':
      localStorage.removeItem('admin_auth');
      localStorage.removeItem('sia_validation_questions');
      localStorage.removeItem('sia_intake_fields');
      break;
    default:
      console.warn(`Unknown category: ${category}`);
  }
}

// Export a global function that can be called from browser console
if (typeof window !== 'undefined') {
  window.clearAppLocalStorage = clearAllLocalStorage;
  console.log('💡 Tip: You can clear localStorage by calling: clearAppLocalStorage()');
}

