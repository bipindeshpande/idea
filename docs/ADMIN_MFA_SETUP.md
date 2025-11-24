# Admin MFA Setup Guide

## Overview

The admin panel uses Two-Factor Authentication (MFA) with Time-based One-Time Password (TOTP) for enhanced security.

## Current MFA Secret

The default MFA secret is: **`JBSWY3DPEHPK3PXP`**

## Setting Up MFA

### Option 1: Use the Default Secret

1. Install an authenticator app on your phone:
   - **Google Authenticator** (iOS/Android)
   - **Microsoft Authenticator** (iOS/Android)
   - **Authy** (iOS/Android)
   - Any TOTP-compatible app

2. Add a new account manually:
   - Open your authenticator app
   - Choose "Enter a setup key" or "Manual entry"
   - Enter:
     - **Account Name**: Startup Idea Advisor Admin
     - **Secret Key**: `JBSWY3DPEHPK3PXP`
     - **Type**: Time-based (TOTP)
     - **Digits**: 6

3. The app will generate 6-digit codes that refresh every 30 seconds

### Option 2: Generate a New Secret

1. Generate a new secret using Python:
   ```python
   import pyotp
   secret = pyotp.random_base32()
   print(secret)
   ```

2. Set it as an environment variable:
   ```bash
   export ADMIN_MFA_SECRET="YOUR_NEW_SECRET_HERE"
   ```

3. Add it to your authenticator app using the steps above

## Using MFA

1. Go to `/admin`
2. Enter your admin password
3. Enter the 6-digit code from your authenticator app
4. Click "Verify & Login"

## Backend Installation

For proper TOTP validation, install the `pyotp` library:

```bash
pip install pyotp
```

If `pyotp` is not installed, the system will use simplified validation (accepts any 6-digit code) - **NOT SECURE for production**.

## Troubleshooting

### Code Not Working

1. **Check time sync**: Make sure your phone's clock is accurate
2. **Check secret**: Verify you're using the correct secret key
3. **Try adjacent codes**: The system allows a 1-minute window for clock skew
4. **Regenerate**: If needed, generate a new secret and update it

### Installing pyotp

```bash
# Using pip
pip install pyotp

# Or add to requirements.txt
echo "pyotp>=2.9.0" >> requirements.txt
pip install -r requirements.txt
```

## Security Notes

- The MFA secret is stored in the database (Admin model) or environment variable
- Never share your MFA secret
- Keep backup codes in a secure location
- If you lose access to your authenticator, use the password reset flow

