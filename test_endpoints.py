"""Quick endpoint testing script."""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_endpoint(method, path, headers=None, data=None, description=""):
    """Test an endpoint and print results."""
    url = f"{BASE_URL}{path}"
    print(f"\n{'='*60}")
    print(f"Testing: {method} {path}")
    if description:
        print(f"Description: {description}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        else:
            print(f"[ERROR] Unsupported method: {method}")
            return False
        
        print(f"Status Code: {response.status_code}")
        
        try:
            content = response.json()
            print(f"Response: {json.dumps(content, indent=2)}")
        except:
            print(f"Response: {response.text[:200]}")
        
        if response.status_code in [200, 201]:
            print("[SUCCESS]")
            return True
        else:
            print("[WARNING] Non-success status")
            return False
            
    except requests.exceptions.ConnectionError:
        print("[ERROR] Connection Error: Server not running or not accessible")
        return False
    except requests.exceptions.Timeout:
        print("[ERROR] Timeout: Server took too long to respond")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def main():
    """Run endpoint tests."""
    print("Starting API Endpoint Tests")
    print(f"Base URL: {BASE_URL}")
    print("\nWaiting for server to be ready...")
    time.sleep(2)
    
    results = []
    
    # Health checks
    print("\n" + "="*60)
    print("HEALTH CHECK ENDPOINTS")
    print("="*60)
    results.append(("GET /health", test_endpoint("GET", "/health", description="Simple health check")))
    results.append(("GET /api/health", test_endpoint("GET", "/api/health", description="Detailed health check with database")))
    
    # Auth endpoints (without auth)
    print("\n" + "="*60)
    print("AUTHENTICATION ENDPOINTS (Public)")
    print("="*60)
    
    # Test registration
    test_email = f"test_{int(time.time())}@example.com"
    test_password = "testpass123"
    
    results.append(("POST /api/auth/register", test_endpoint(
        "POST", 
        "/api/auth/register",
        data={"email": test_email, "password": test_password},
        description="Register new user"
    )))
    
    # Test login
    results.append(("POST /api/auth/login", test_endpoint(
        "POST",
        "/api/auth/login",
        data={"email": test_email, "password": test_password},
        description="Login user"
    )))
    
    # Get session token from login
    try:
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": test_password},
            timeout=5
        )
        if login_response.status_code == 200:
            session_token = login_response.json().get("session_token")
            auth_headers = {"Authorization": f"Bearer {session_token}"}
            
            # Test authenticated endpoints
            print("\n" + "="*60)
            print("AUTHENTICATED ENDPOINTS")
            print("="*60)
            
            results.append(("GET /api/auth/me", test_endpoint(
                "GET",
                "/api/auth/me",
                headers=auth_headers,
                description="Get current user"
            )))
            
            results.append(("GET /api/subscription/status", test_endpoint(
                "GET",
                "/api/subscription/status",
                headers=auth_headers,
                description="Get subscription status"
            )))
            
            results.append(("GET /api/user/activity", test_endpoint(
                "GET",
                "/api/user/activity",
                headers=auth_headers,
                description="Get user activity"
            )))
    except Exception as e:
        print(f"[WARNING] Could not test authenticated endpoints: {e}")
    
    # Admin endpoints (test with default password)
    print("\n" + "="*60)
    print("ADMIN ENDPOINTS")
    print("="*60)
    
    admin_headers = {"Authorization": "Bearer admin2024"}
    
    results.append(("GET /admin/stats", test_endpoint(
        "GET",
        "/admin/stats",
        headers=admin_headers,
        description="Get admin statistics"
    )))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    if total > 0:
        print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print("\nDetailed Results:")
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status}: {name}")

if __name__ == "__main__":
    main()
