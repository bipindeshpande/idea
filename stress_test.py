"""Stress test script for Startup Idea Advisor application."""
import asyncio
import aiohttp
import time
import statistics
from datetime import datetime
from collections import defaultdict
import json

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
CONCURRENT_USERS = 50
REQUESTS_PER_USER = 10
TEST_DURATION = 60  # seconds

# Test endpoints
ENDPOINTS = [
    {"method": "GET", "path": "/health", "auth": False},
    {"method": "GET", "path": "/api/health", "auth": False},
    {"method": "POST", "path": "/api/auth/register", "auth": False, "body": {"email": "test@example.com", "password": "testpass123"}},
    {"method": "POST", "path": "/api/auth/login", "auth": False, "body": {"email": "test@example.com", "password": "testpass123"}},
    {"method": "GET", "path": "/api/subscription/status", "auth": True},
    {"method": "GET", "path": "/api/user/activity", "auth": True},
]

# Results storage
results = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "response_times": [],
    "errors": defaultdict(int),
    "endpoint_stats": defaultdict(lambda: {"success": 0, "failed": 0, "times": []}),
    "status_codes": defaultdict(int),
}

async def make_request(session, method, url, headers=None, json_data=None):
    """Make a single HTTP request and measure response time."""
    start_time = time.time()
    try:
        async with session.request(method, url, headers=headers, json=json_data, timeout=aiohttp.ClientTimeout(total=10)) as response:
            response_time = time.time() - start_time
            body = await response.text()
            try:
                body_json = json.loads(body)
            except:
                body_json = None
            
            return {
                "status": response.status,
                "response_time": response_time,
                "success": 200 <= response.status < 400,
                "body": body_json,
            }
    except asyncio.TimeoutError:
        return {
            "status": 0,
            "response_time": time.time() - start_time,
            "success": False,
            "error": "Timeout",
        }
    except Exception as e:
        return {
            "status": 0,
            "response_time": time.time() - start_time,
            "success": False,
            "error": str(e),
        }

async def test_user(session, user_id, auth_token=None):
    """Simulate a single user making multiple requests."""
    user_results = []
    
    for i in range(REQUESTS_PER_USER):
        # Select endpoint (round-robin)
        endpoint = ENDPOINTS[i % len(ENDPOINTS)]
        
        # Skip auth-required endpoints if no token
        if endpoint.get("auth") and not auth_token:
            continue
        
        url = f"{BASE_URL}{endpoint['path']}"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        json_data = endpoint.get("body")
        
        result = await make_request(session, endpoint["method"], url, headers=headers, json_data=json_data)
        
        # Extract session token from login/register
        if endpoint["path"] in ["/api/auth/login", "/api/auth/register"] and result["success"] and result.get("body"):
            auth_token = result["body"].get("session_token")
        
        result["endpoint"] = endpoint["path"]
        result["user_id"] = user_id
        result["request_num"] = i + 1
        user_results.append(result)
        
        # Small delay between requests
        await asyncio.sleep(0.1)
    
    return user_results

async def run_stress_test():
    """Run the stress test with concurrent users."""
    print("=" * 60)
    print("STRESS TEST - Startup Idea Advisor")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Concurrent Users: {CONCURRENT_USERS}")
    print(f"Requests per User: {REQUESTS_PER_USER}")
    print(f"Total Expected Requests: {CONCURRENT_USERS * REQUESTS_PER_USER}")
    print(f"Test Duration: {TEST_DURATION} seconds")
    print("=" * 60)
    print()
    
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        # Create tasks for all users
        tasks = []
        for user_id in range(1, CONCURRENT_USERS + 1):
            task = test_user(session, user_id)
            tasks.append(task)
        
        # Run all tasks concurrently
        print(f"Starting stress test at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}...")
        print("Running concurrent requests...")
        print()
        
        all_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # Process results
    for user_results in all_results:
        if isinstance(user_results, Exception):
            results["failed_requests"] += 1
            results["errors"][str(user_results)] += 1
            continue
        
        for result in user_results:
            results["total_requests"] += 1
            
            if result["success"]:
                results["successful_requests"] += 1
            else:
                results["failed_requests"] += 1
            
            results["response_times"].append(result["response_time"])
            results["status_codes"][result["status"]] += 1
            
            endpoint = result["endpoint"]
            results["endpoint_stats"][endpoint]["times"].append(result["response_time"])
            
            if result["success"]:
                results["endpoint_stats"][endpoint]["success"] += 1
            else:
                results["endpoint_stats"][endpoint]["failed"] += 1
            
            if "error" in result:
                results["errors"][result["error"]] += 1
    
    # Print results
    print_results(total_time)
    
    return results

def print_results(total_time):
    """Print stress test results."""
    print()
    print("=" * 60)
    print("STRESS TEST RESULTS")
    print("=" * 60)
    print()
    
    # Overall statistics
    print("OVERALL STATISTICS")
    print("-" * 60)
    print(f"Total Requests: {results['total_requests']}")
    print(f"Successful: {results['successful_requests']} ({results['successful_requests']/max(results['total_requests'], 1)*100:.1f}%)")
    print(f"Failed: {results['failed_requests']} ({results['failed_requests']/max(results['total_requests'], 1)*100:.1f}%)")
    print(f"Total Time: {total_time:.2f} seconds")
    print(f"Requests per Second: {results['total_requests']/max(total_time, 1):.2f}")
    print()
    
    # Response time statistics
    if results["response_times"]:
        print("RESPONSE TIME STATISTICS")
        print("-" * 60)
        print(f"Min: {min(results['response_times']):.3f}s")
        print(f"Max: {max(results['response_times']):.3f}s")
        print(f"Mean: {statistics.mean(results['response_times']):.3f}s")
        if len(results['response_times']) > 1:
            print(f"Median: {statistics.median(results['response_times']):.3f}s")
            print(f"Std Dev: {statistics.stdev(results['response_times']):.3f}s")
        
        # Percentiles
        sorted_times = sorted(results['response_times'])
        p50 = sorted_times[int(len(sorted_times) * 0.50)]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]
        print(f"50th percentile: {p50:.3f}s")
        print(f"95th percentile: {p95:.3f}s")
        print(f"99th percentile: {p99:.3f}s")
        print()
    
    # Status codes
    if results["status_codes"]:
        print("HTTP STATUS CODES")
        print("-" * 60)
        for status, count in sorted(results["status_codes"].items()):
            print(f"  {status}: {count}")
        print()
    
    # Endpoint statistics
    if results["endpoint_stats"]:
        print("ENDPOINT STATISTICS")
        print("-" * 60)
        for endpoint, stats in sorted(results["endpoint_stats"].items()):
            total = stats["success"] + stats["failed"]
            success_rate = (stats["success"] / max(total, 1)) * 100
            avg_time = statistics.mean(stats["times"]) if stats["times"] else 0
            print(f"  {endpoint}:")
            print(f"    Total: {total}, Success: {stats['success']} ({success_rate:.1f}%), Failed: {stats['failed']}")
            print(f"    Avg Response Time: {avg_time:.3f}s")
        print()
    
    # Errors
    if results["errors"]:
        print("ERRORS")
        print("-" * 60)
        for error, count in sorted(results["errors"].items(), key=lambda x: x[1], reverse=True):
            print(f"  {error}: {count}")
        print()
    
    # Performance assessment
    print("PERFORMANCE ASSESSMENT")
    print("-" * 60)
    if results["response_times"]:
        avg_time = statistics.mean(results["response_times"])
        p95_time = sorted(results["response_times"])[int(len(results["response_times"]) * 0.95)]
        success_rate = (results["successful_requests"] / max(results["total_requests"], 1)) * 100
        
        if avg_time < 0.5 and p95_time < 1.0 and success_rate > 95:
            print("[EXCELLENT] Application handles load very well")
        elif avg_time < 1.0 and p95_time < 2.0 and success_rate > 90:
            print("[GOOD] Application handles load well")
        elif avg_time < 2.0 and p95_time < 5.0 and success_rate > 80:
            print("[ACCEPTABLE] Application handles load but could be optimized")
        else:
            print("[NEEDS IMPROVEMENT] Application struggles under load")
        
        print(f"   Average Response Time: {avg_time:.3f}s")
        print(f"   95th Percentile: {p95_time:.3f}s")
        print(f"   Success Rate: {success_rate:.1f}%")
    print()

async def test_frontend():
    """Test frontend routes."""
    print("Testing Frontend Routes...")
    print("-" * 60)
    
    async with aiohttp.ClientSession() as session:
        frontend_routes = [
            "/",
            "/product",
            "/pricing",
            "/resources",
            "/blog",
            "/about",
            "/contact",
        ]
        
        frontend_results = []
        for route in frontend_routes:
            url = f"{FRONTEND_URL}{route}"
            start = time.time()
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    response_time = time.time() - start
                    frontend_results.append({
                        "route": route,
                        "status": response.status,
                        "time": response_time,
                        "success": response.status == 200,
                    })
                    print(f"  {route}: {response.status} ({response_time:.3f}s)")
            except Exception as e:
                print(f"  {route}: ERROR - {e}")
        
        print()
        return frontend_results

async def main():
    """Main function to run all tests."""
    print("\n" + "=" * 60)
    print("COMPREHENSIVE STRESS TEST")
    print("=" * 60)
    print()
    
    # Check if servers are running
    print("Checking server status...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/health", timeout=aiohttp.ClientTimeout(total=2)) as response:
                if response.status == 200:
                    print("[OK] Backend server is running")
                else:
                    print("[WARNING] Backend server responded with non-200 status")
    except Exception as e:
        print(f"[ERROR] Backend server is not accessible: {e}")
        print("   Please start the backend server first (python api.py)")
        return
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{FRONTEND_URL}/", timeout=aiohttp.ClientTimeout(total=2)) as response:
                if response.status == 200:
                    print("[OK] Frontend server is running")
                else:
                    print("[WARNING] Frontend server responded with non-200 status")
    except Exception as e:
        print(f"[WARNING] Frontend server is not accessible: {e}")
        print("   Frontend tests will be skipped")
    
    print()
    
    # Run backend stress test
    await run_stress_test()
    
    # Test frontend
    try:
        await test_frontend()
    except Exception as e:
        print(f"Frontend test failed: {e}")
    
    print("=" * 60)
    print("STRESS TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nStress test interrupted by user")
    except Exception as e:
        print(f"\n\nError running stress test: {e}")
        import traceback
        traceback.print_exc()
