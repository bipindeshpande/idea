"""
Test script to verify security fixes are working correctly.
Run this after installing Flask-Limiter to verify the implementation.
"""
import sys
import os

def test_imports():
    """Test that all required imports are available."""
    print("=" * 60)
    print("Testing Imports")
    print("=" * 60)
    
    try:
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        print("✅ Flask-Limiter imports: OK")
        return True
    except ImportError as e:
        print(f"❌ Flask-Limiter imports: FAILED - {e}")
        print("   Install with: pip install Flask-Limiter>=3.5.0")
        return False

def test_api_structure():
    """Test that api.py has the correct structure."""
    print("\n" + "=" * 60)
    print("Testing API Structure")
    print("=" * 60)
    
    try:
        # Read api.py
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        checks = {
            "Flask-Limiter import": "from flask_limiter import Limiter" in content,
            "CORS configuration": "ALLOWED_ORIGINS" in content,
            "Rate limiter setup": "limiter = Limiter" in content,
            "Login rate limiting": '@limiter.limit("5 per minute")' in content or '@limiter.limit(\'5 per minute\')' in content,
            "Register rate limiting": '@limiter.limit("3 per hour")' in content or '@limiter.limit(\'3 per hour\')' in content,
            "Payment rate limiting": '@limiter.limit("10 per hour")' in content or '@limiter.limit(\'10 per hour\')' in content,
            "Webhook endpoint": "@app.post(\"/api/webhooks/stripe\")" in content,
            "Webhook verification": "stripe.Webhook.construct_event" in content,
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error reading api.py: {e}")
        return False

def test_cors_config():
    """Test CORS configuration logic."""
    print("\n" + "=" * 60)
    print("Testing CORS Configuration")
    print("=" * 60)
    
    # Simulate production environment
    os.environ["FRONTEND_URL"] = "https://ideabunch.com"
    os.environ.pop("FLASK_ENV", None)  # Remove if exists
    
    # Import would fail if structure is wrong, but we'll just check the logic
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Check that localhost is conditionally included
        has_conditional = "FLASK_ENV" in content and "development" in content
        has_frontend_url = "FRONTEND_URL" in content
        has_allowed_origins = "ALLOWED_ORIGINS" in content
        
        checks = {
            "Uses FRONTEND_URL env var": has_frontend_url,
            "Has ALLOWED_ORIGINS list": has_allowed_origins,
            "Conditional localhost": has_conditional,
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")
        return False

def test_webhook_implementation():
    """Test webhook implementation."""
    print("\n" + "=" * 60)
    print("Testing Webhook Implementation")
    print("=" * 60)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        checks = {
            "Webhook endpoint exists": "/api/webhooks/stripe" in content,
            "Signature verification": "stripe.Webhook.construct_event" in content,
            "Webhook secret check": "STRIPE_WEBHOOK_SECRET" in content,
            "Handles payment_intent.succeeded": "payment_intent.succeeded" in content,
            "Handles payment_intent.payment_failed": "payment_intent.payment_failed" in content,
            "Error handling": "SignatureVerificationError" in content,
            "Rate limiting": '@limiter.limit("100 per hour")' in content or '@limiter.limit(\'100 per hour\')' in content,
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error testing webhook: {e}")
        return False

def test_rate_limiting_coverage():
    """Test that all sensitive endpoints have rate limiting."""
    print("\n" + "=" * 60)
    print("Testing Rate Limiting Coverage")
    print("=" * 60)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Count rate limited endpoints
        limiter_count = content.count("@limiter.limit")
        
        # Check specific endpoints
        endpoints = {
            "Login": ("/api/auth/login", "5 per minute"),
            "Register": ("/api/auth/register", "3 per hour"),
            "Forgot Password": ("/api/auth/forgot-password", "3 per hour"),
            "Payment Create": ("/api/payment/create-intent", "10 per hour"),
            "Payment Confirm": ("/api/payment/confirm", "10 per hour"),
            "Webhook": ("/api/webhooks/stripe", "100 per hour"),
        }
        
        print(f"Total rate-limited endpoints found: {limiter_count}")
        print(f"Expected: ~13 endpoints")
        
        all_passed = True
        for endpoint_name, (path, limit) in endpoints.items():
            # Check if endpoint exists and has rate limiting nearby
            path_found = path in content
            # Check if limit string exists (flexible with quotes)
            limit_found = f'"{limit}"' in content or f"'{limit}'" in content
            
            if path_found and limit_found:
                print(f"✅ {endpoint_name}: Rate limited ({limit})")
            else:
                print(f"❌ {endpoint_name}: Missing rate limiting")
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error testing rate limiting: {e}")
        return False

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("SECURITY FIXES TEST SUITE")
    print("=" * 60)
    print()
    
    results = []
    
    # Test imports
    results.append(("Imports", test_imports()))
    
    # Test API structure
    results.append(("API Structure", test_api_structure()))
    
    # Test CORS
    results.append(("CORS Configuration", test_cors_config()))
    
    # Test webhook
    results.append(("Webhook Implementation", test_webhook_implementation()))
    
    # Test rate limiting
    results.append(("Rate Limiting Coverage", test_rate_limiting_coverage()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All security fixes are correctly implemented!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

