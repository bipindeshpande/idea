"""Simplified stress test for Startup Idea Advisor application."""
import requests
import time
import statistics
from datetime import datetime
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
CONCURRENT_USERS = 20
REQUESTS_PER_USER = 5

# Test endpoints
ENDPOINTS = [
    {"method": "GET", "path": "/health", "auth": False},
    {"method": "GET", "path": "/api/health", "auth": False},
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

lock = threading.Lock()

def make_request(method, url, headers=None, json_data=None):
    """Make a single HTTP request and measure response time."""
    start_time = time.time()
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=json_data, timeout=5)
        else:
            return {
                "status": 0,
                "response_time": time.time() - start_time,
                "success": False,
                "error": "Unsupported method",
            }
        
        response_time = time.time() - start_time
        
        try:
            body_json = response.json()
        except:
            body_json = None
        
        return {
            "status": response.status_code,
            "response_time": response_time,
            "success": 200 <= response.status_code < 400,
            "body": body_json,
        }
    except requests.exceptions.Timeout:
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

def test_user(user_id):
    """Simulate a single user making multiple requests."""
    user_results = []
    
    for i in range(REQUESTS_PER_USER):
        # Select endpoint (round-robin)
        endpoint = ENDPOINTS[i % len(ENDPOINTS)]
        
        url = f"{BASE_URL}{endpoint['path']}"
        headers = {}
        json_data = endpoint.get("body")
        
        result = make_request(endpoint["method"], url, headers=headers, json_data=json_data)
        result["endpoint"] = endpoint["path"]
        result["user_id"] = user_id
        result["request_num"] = i + 1
        user_results.append(result)
        
        # Small delay between requests
        time.sleep(0.1)
    
    return user_results

def run_stress_test():
    """Run the stress test with concurrent users."""
    print("=" * 60)
    print("STRESS TEST - Startup Idea Advisor")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Concurrent Users: {CONCURRENT_USERS}")
    print(f"Requests per User: {REQUESTS_PER_USER}")
    print(f"Total Expected Requests: {CONCURRENT_USERS * REQUESTS_PER_USER}")
    print("=" * 60)
    print()
    
    # Check if server is running
    print("Checking server status...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code == 200:
            print("[OK] Backend server is running")
        else:
            print(f"[WARNING] Backend server responded with status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Backend server is not accessible: {e}")
        print("   Please start the backend server first (python api.py)")
        return None
    
    print()
    start_time = time.time()
    
    # Run concurrent requests
    print(f"Starting stress test at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}...")
    print("Running concurrent requests...")
    print()
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        futures = [executor.submit(test_user, user_id) for user_id in range(1, CONCURRENT_USERS + 1)]
        
        for future in as_completed(futures):
            try:
                user_results = future.result()
                with lock:
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
            except Exception as e:
                with lock:
                    results["failed_requests"] += 1
                    results["errors"][str(e)] += 1
    
    end_time = time.time()
    total_time = end_time - start_time
    
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
    if results['total_requests'] > 0:
        print(f"Successful: {results['successful_requests']} ({results['successful_requests']/results['total_requests']*100:.1f}%)")
        print(f"Failed: {results['failed_requests']} ({results['failed_requests']/results['total_requests']*100:.1f}%)")
    print(f"Total Time: {total_time:.2f} seconds")
    if total_time > 0:
        print(f"Requests per Second: {results['total_requests']/total_time:.2f}")
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
        p99 = sorted_times[int(len(sorted_times) * 0.99)] if len(sorted_times) > 1 else sorted_times[0]
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
            if total > 0:
                success_rate = (stats["success"] / total) * 100
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
        success_rate = (results["successful_requests"] / results["total_requests"]) * 100 if results["total_requests"] > 0 else 0
        
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

def test_frontend():
    """Test frontend routes."""
    print("Testing Frontend Routes...")
    print("-" * 60)
    
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
            response = requests.get(url, timeout=5)
            response_time = time.time() - start
            frontend_results.append({
                "route": route,
                "status": response.status_code,
                "time": response_time,
                "success": response.status_code == 200,
            })
            print(f"  {route}: {response.status_code} ({response_time:.3f}s)")
        except Exception as e:
            print(f"  {route}: ERROR - {e}")
            frontend_results.append({
                "route": route,
                "status": 0,
                "time": 0,
                "success": False,
                "error": str(e),
            })
    
    print()
    return frontend_results

def main():
    """Main function to run all tests."""
    print("\n" + "=" * 60)
    print("COMPREHENSIVE STRESS TEST")
    print("=" * 60)
    print()
    
    # Run backend stress test
    backend_results = run_stress_test()
    
    # Test frontend
    print()
    try:
        frontend_results = test_frontend()
    except Exception as e:
        print(f"Frontend test failed: {e}")
    
    print("=" * 60)
    print("STRESS TEST COMPLETE")
    print("=" * 60)
    
    return backend_results

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nStress test interrupted by user")
    except Exception as e:
        print(f"\n\nError running stress test: {e}")
        import traceback
        traceback.print_exc()

