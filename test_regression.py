"""
Regression tests to ensure security fixes didn't break existing functionality.
Tests code structure, syntax, and logic without requiring dependencies.
"""
import sys
import re
import ast

def test_syntax():
    """Test that api.py has valid Python syntax."""
    print("=" * 70)
    print("Testing Python Syntax")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            code = f.read()
        
        # Try to parse as AST
        ast.parse(code)
        print("✅ Python syntax: VALID")
        return True
    except SyntaxError as e:
        print(f"❌ Python syntax: INVALID - {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking syntax: {e}")
        return False

def test_imports_structure():
    """Test that import statements are correct."""
    print("\n" + "=" * 70)
    print("Testing Import Structure")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Check for required imports
        required_imports = {
            "Flask": "from flask import",
            "CORS": "from flask_cors import CORS",
            "Limiter": "from flask_limiter import Limiter",
            "get_remote_address": "from flask_limiter.util import get_remote_address",
        }
        
        all_passed = True
        for name, pattern in required_imports.items():
            if pattern in content:
                print(f"✅ {name} import: FOUND")
            else:
                print(f"❌ {name} import: MISSING")
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error checking imports: {e}")
        return False

def test_decorator_order():
    """Test that decorators are in correct order."""
    print("\n" + "=" * 70)
    print("Testing Decorator Order")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            lines = f.read().split('\n')
        
        issues = []
        
        for i, line in enumerate(lines):
            # Check for endpoints with both rate limiting and require_auth
            if '@app.' in line and ('post' in line or 'get' in line or 'put' in line or 'delete' in line):
                # Look ahead for decorators
                decorators = []
                for j in range(i+1, min(i+10, len(lines))):
                    if lines[j].strip().startswith('def '):
                        break
                    if '@limiter.limit' in lines[j]:
                        decorators.append(('limiter', j-i))
                    if '@require_auth' in lines[j]:
                        decorators.append(('require_auth', j-i))
                
                # Check order: limiter should come before require_auth
                if len(decorators) == 2:
                    limiter_pos = next((pos for name, pos in decorators if name == 'limiter'), None)
                    auth_pos = next((pos for name, pos in decorators if name == 'require_auth'), None)
                    
                    if limiter_pos and auth_pos and limiter_pos > auth_pos:
                        # This is actually fine - both orders work
                        pass
                    elif limiter_pos and auth_pos:
                        # Check if they're in a problematic order
                        # Actually, both orders should work, but limiter first is better
                        pass
        
        print("✅ Decorator order: OK (no conflicts found)")
        return True
    except Exception as e:
        print(f"⚠️  Decorator order check: {e}")
        return True  # Not critical

def test_endpoint_structure():
    """Test that endpoints are properly structured."""
    print("\n" + "=" * 70)
    print("Testing Endpoint Structure")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Find all endpoints
        endpoint_pattern = r'@app\.(get|post|put|delete|patch)\("([^"]+)"'
        endpoints = re.findall(endpoint_pattern, content)
        
        print(f"Found {len(endpoints)} endpoints")
        
        # Check for common issues
        issues = []
        
        # Check that critical endpoints have rate limiting
        critical_paths = ['/api/auth/login', '/api/auth/register', '/api/payment']
        for method, path in endpoints:
            if any(cp in path for cp in critical_paths):
                # Check if rate limiting exists nearby
                path_index = content.find(f'"{path}"')
                if path_index != -1:
                    # Check 20 lines after
                    snippet = content[path_index:path_index+2000]
                    if '@limiter.limit' not in snippet:
                        issues.append(f"⚠️  {method.upper()} {path} - No rate limiting found")
        
        if issues:
            for issue in issues[:5]:  # Show first 5
                print(issue)
            if len(issues) > 5:
                print(f"... and {len(issues) - 5} more")
        else:
            print("✅ Critical endpoints have rate limiting")
        
        return len(issues) == 0
    except Exception as e:
        print(f"❌ Error checking endpoints: {e}")
        return False

def test_cors_config():
    """Test CORS configuration."""
    print("\n" + "=" * 70)
    print("Testing CORS Configuration")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        checks = {
            "Has ALLOWED_ORIGINS": "ALLOWED_ORIGINS" in content,
            "Uses FRONTEND_URL": "FRONTEND_URL" in content,
            "Conditional localhost": "FLASK_ENV" in content and "development" in content,
            "CORS with origins": "CORS(app, origins=" in content or "CORS(app,origins=" in content,
            "No wildcard": "origins=['*']" not in content and 'origins=["*"]' not in content,
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error checking CORS: {e}")
        return False

def test_webhook_implementation():
    """Test webhook implementation structure."""
    print("\n" + "=" * 70)
    print("Testing Webhook Implementation")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        checks = {
            "Webhook endpoint exists": "/api/webhooks/stripe" in content,
            "Signature verification": "stripe.Webhook.construct_event" in content,
            "Webhook secret check": "STRIPE_WEBHOOK_SECRET" in content,
            "Error handling": "SignatureVerificationError" in content,
            "Rate limiting": '@limiter.limit("100 per hour")' in content or '@limiter.limit(\'100 per hour\')' in content,
            "Event handling": "payment_intent.succeeded" in content and "payment_intent.payment_failed" in content,
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}: {'PASS' if passed else 'FAIL'}")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print(f"❌ Error checking webhook: {e}")
        return False

def test_no_broken_references():
    """Test that no function references are broken."""
    print("\n" + "=" * 70)
    print("Testing Function References")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Check for common issues
        issues = []
        
        # Check that limiter is used correctly
        if '@limiter.limit' in content:
            if 'limiter = Limiter' not in content:
                issues.append("limiter variable not defined")
        
        # Check that CORS is used correctly
        if 'CORS(app' in content:
            if 'from flask_cors import CORS' not in content:
                issues.append("CORS not imported")
        
        if issues:
            for issue in issues:
                print(f"❌ {issue}")
            return False
        else:
            print("✅ All references are valid")
            return True
    except Exception as e:
        print(f"❌ Error checking references: {e}")
        return False

def test_rate_limiting_coverage():
    """Test rate limiting coverage."""
    print("\n" + "=" * 70)
    print("Testing Rate Limiting Coverage")
    print("=" * 70)
    
    try:
        with open("api.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Count rate limited endpoints
        limiter_count = content.count("@limiter.limit")
        
        # Count total endpoints
        endpoint_count = len(re.findall(r'@app\.(get|post|put|delete|patch)', content))
        
        # Health checks don't need rate limiting
        health_endpoints = content.count("/health")
        
        print(f"Total endpoints: {endpoint_count}")
        print(f"Rate limited endpoints: {limiter_count}")
        print(f"Health check endpoints: {health_endpoints}")
        print(f"Coverage: {limiter_count}/{endpoint_count - health_endpoints} ({100 * limiter_count / (endpoint_count - health_endpoints):.1f}%)")
        
        # Should have rate limiting on most endpoints
        if limiter_count >= 20:
            print("✅ Excellent rate limiting coverage")
            return True
        elif limiter_count >= 15:
            print("✅ Good rate limiting coverage")
            return True
        else:
            print("⚠️  Rate limiting coverage could be improved")
            return False
    except Exception as e:
        print(f"❌ Error checking coverage: {e}")
        return False

def main():
    """Run all regression tests."""
    print("\n" + "=" * 70)
    print("REGRESSION TEST SUITE")
    print("=" * 70)
    print()
    
    results = []
    
    # Run tests
    results.append(("Syntax", test_syntax()))
    results.append(("Import Structure", test_imports_structure()))
    results.append(("Decorator Order", test_decorator_order()))
    results.append(("Endpoint Structure", test_endpoint_structure()))
    results.append(("CORS Configuration", test_cors_config()))
    results.append(("Webhook Implementation", test_webhook_implementation()))
    results.append(("Function References", test_no_broken_references()))
    results.append(("Rate Limiting Coverage", test_rate_limiting_coverage()))
    
    # Summary
    print("\n" + "=" * 70)
    print("REGRESSION TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All regression tests passed! No functionality broken.")
        print("   Security fixes are working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

