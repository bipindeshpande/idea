"""
Deep security review - checks for missing rate limiting and other security issues.
"""
import re
import sys

def find_all_endpoints():
    """Find all Flask endpoints in api.py."""
    with open("api.py", "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find all @app.route decorators
    endpoints = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Match @app.get, @app.post, @app.put, @app.delete
        match = re.search(r'@app\.(get|post|put|delete|patch)\("([^"]+)"', line)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            
            # Check if next few lines have rate limiting
            has_rate_limit = False
            has_auth = False
            
            # Check up to 5 lines ahead for decorators
            for j in range(i+1, min(i+6, len(lines))):
                if '@limiter.limit' in lines[j]:
                    has_rate_limit = True
                if '@require_auth' in lines[j] or 'check_admin_auth()' in lines[j]:
                    has_auth = True
            
            endpoints.append({
                'method': method,
                'path': path,
                'line': i+1,
                'has_rate_limit': has_rate_limit,
                'has_auth': has_auth,
            })
    
    return endpoints

def categorize_endpoints(endpoints):
    """Categorize endpoints by security priority."""
    critical = []  # Must have rate limiting
    important = []  # Should have rate limiting
    optional = []   # Nice to have
    
    for ep in endpoints:
        path = ep['path']
        
        # Critical - authentication, payments, AI calls
        if any(x in path for x in ['/auth/', '/payment/', '/admin/', '/run', '/validate-idea']):
            if not ep['has_rate_limit']:
                critical.append(ep)
        # Important - subscriptions, contact
        elif any(x in path for x in ['/subscription/', '/contact']):
            if not ep['has_rate_limit']:
                important.append(ep)
        # Optional - health checks, status
        elif any(x in path for x in ['/health', '/status', '/me']):
            optional.append(ep)
        else:
            if not ep['has_rate_limit']:
                important.append(ep)
    
    return critical, important, optional

def check_cors_config():
    """Check CORS configuration."""
    with open("api.py", "r", encoding="utf-8") as f:
        content = f.read()
    
    issues = []
    
    # Check for wildcard origins
    if 'CORS(app)' in content and 'origins=' not in content.split('CORS(app)')[0][-100:]:
        # Check if it's the old unrestricted version
        if 'CORS(app)' in content and 'ALLOWED_ORIGINS' not in content:
            issues.append("CORS might be unrestricted - check for CORS(app) without origins")
    
    # Check for wildcard
    if "origins=['*']" in content or 'origins=["*"]' in content:
        issues.append("CRITICAL: CORS allows all origins with wildcard")
    
    return issues

def check_webhook_security():
    """Check webhook security."""
    with open("api.py", "r", encoding="utf-8") as f:
        content = f.read()
    
    issues = []
    
    # Check if webhook exists
    if '/api/webhooks/stripe' not in content:
        issues.append("Stripe webhook endpoint not found")
        return issues
    
    # Check for signature verification
    if 'stripe.Webhook.construct_event' not in content:
        issues.append("CRITICAL: Webhook signature verification missing")
    
    # Check for webhook secret
    if 'STRIPE_WEBHOOK_SECRET' not in content:
        issues.append("CRITICAL: Webhook secret not checked")
    
    # Check for error handling
    if 'SignatureVerificationError' not in content:
        issues.append("WARNING: Webhook error handling might be incomplete")
    
    return issues

def check_rate_limiting_storage():
    """Check rate limiting storage configuration."""
    with open("api.py", "r", encoding="utf-8") as f:
        content = f.read()
    
    issues = []
    
    # Check storage type
    if 'storage_uri="memory://"' in content:
        issues.append("INFO: Using in-memory rate limiting (resets on restart). Consider Redis for production.")
    
    return issues

def main():
    """Run deep security review."""
    print("=" * 70)
    print("DEEP SECURITY REVIEW")
    print("=" * 70)
    print()
    
    # Find all endpoints
    print("Scanning endpoints...")
    endpoints = find_all_endpoints()
    print(f"Found {len(endpoints)} endpoints\n")
    
    # Categorize endpoints
    critical, important, optional = categorize_endpoints(endpoints)
    
    # Report missing rate limiting
    print("=" * 70)
    print("RATE LIMITING COVERAGE")
    print("=" * 70)
    
    if critical:
        print(f"\n🔴 CRITICAL: {len(critical)} endpoints missing rate limiting:")
        for ep in critical:
            print(f"   - {ep['method']} {ep['path']} (line {ep['line']})")
    else:
        print("\n✅ All critical endpoints have rate limiting")
    
    if important:
        print(f"\n🟡 IMPORTANT: {len(important)} endpoints should have rate limiting:")
        for ep in important:
            print(f"   - {ep['method']} {ep['path']} (line {ep['line']})")
    else:
        print("\n✅ All important endpoints have rate limiting")
    
    if optional:
        print(f"\n🟢 OPTIONAL: {len(optional)} endpoints (rate limiting optional)")
        for ep in optional[:5]:  # Show first 5
            print(f"   - {ep['method']} {ep['path']}")
        if len(optional) > 5:
            print(f"   ... and {len(optional) - 5} more")
    
    # Check CORS
    print("\n" + "=" * 70)
    print("CORS CONFIGURATION")
    print("=" * 70)
    cors_issues = check_cors_config()
    if cors_issues:
        for issue in cors_issues:
            print(f"⚠️  {issue}")
    else:
        print("\n✅ CORS properly configured")
    
    # Check webhook
    print("\n" + "=" * 70)
    print("WEBHOOK SECURITY")
    print("=" * 70)
    webhook_issues = check_webhook_security()
    if webhook_issues:
        for issue in webhook_issues:
            print(f"⚠️  {issue}")
    else:
        print("\n✅ Webhook security properly implemented")
    
    # Check rate limiting storage
    print("\n" + "=" * 70)
    print("RATE LIMITING STORAGE")
    print("=" * 70)
    storage_issues = check_rate_limiting_storage()
    if storage_issues:
        for issue in storage_issues:
            print(f"ℹ️  {issue}")
    else:
        print("\n✅ Rate limiting storage configured")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    total_issues = len(critical) + len(important) + len(cors_issues) + len(webhook_issues)
    
    if total_issues == 0:
        print("\n🎉 Excellent! No security issues found.")
        print("   All critical endpoints are protected.")
    else:
        print(f"\n⚠️  Found {total_issues} potential security improvements:")
        print(f"   - {len(critical)} critical endpoints need rate limiting")
        print(f"   - {len(important)} important endpoints should have rate limiting")
        print(f"   - {len(cors_issues)} CORS configuration issues")
        print(f"   - {len(webhook_issues)} webhook security issues")
    
    print()
    return 0 if total_issues == 0 else 1

if __name__ == "__main__":
    sys.exit(main())

