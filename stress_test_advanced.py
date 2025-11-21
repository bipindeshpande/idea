"""Advanced stress test with authentication and multiple endpoint types."""
import asyncio
import aiohttp
import time
import statistics
from datetime import datetime
from collections import defaultdict
import json
import random

BASE_URL = "http://localhost:8000"

# Test configuration
CONCURRENT_USERS = 20
REQUESTS_PER_USER = 30
TOTAL_REQUESTS = CONCURRENT_USERS * REQUESTS_PER_USER

# Test user credentials (for authenticated endpoints)
TEST_EMAIL = f"stress_test_{int(time.time())}@example.com"
TEST_PASSWORD = "testpass123"

# Results storage
results = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "response_times": [],
    "endpoint_stats": defaultdict(lambda: {"success": 0, "failed": 0, "times": []}),
    "status_codes": defaultdict(int),
    "errors": [],
    "start_time": None,
    "end_time": None,
    "auth_tokens": {},  # Store tokens per user
}


async def register_user(session, user_id):
    """Register a test user."""
    email = f"stress_{user_id}_{int(time.time())}@example.com"
    password = "testpass123"
    
    try:
        async with session.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": password},
            timeout=aiohttp.ClientTimeout(total=5)
        ) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("session_token"), email
    except:
        pass
    return None, email


async def make_request(session, method, url, headers=None, data=None, endpoint_name=""):
    """Make a single HTTP request and record metrics."""
    start = time.time()
    try:
        async with session.request(
            method, url, headers=headers, json=data, 
            timeout=aiohttp.ClientTimeout(total=10)
        ) as response:
            elapsed = time.time() - start
            status = response.status
            
            results["total_requests"] += 1
            results["status_codes"][status] += 1
            results["response_times"].append(elapsed)
            results["endpoint_stats"][endpoint_name]["times"].append(elapsed)
            
            if 200 <= status < 300:
                results["successful_requests"] += 1
                results["endpoint_stats"][endpoint_name]["success"] += 1
                return {"success": True, "status": status, "time": elapsed}
            else:
                results["failed_requests"] += 1
                results["endpoint_stats"][endpoint_name]["failed"] += 1
                try:
                    error_text = await response.text()
                except:
                    error_text = "Could not read error"
                results["errors"].append({
                    "endpoint": endpoint_name,
                    "status": status,
                    "error": error_text[:200]
                })
                return {"success": False, "status": status, "time": elapsed}
                
    except asyncio.TimeoutError:
        elapsed = time.time() - start
        results["total_requests"] += 1
        results["failed_requests"] += 1
        results["endpoint_stats"][endpoint_name]["failed"] += 1
        results["errors"].append({
            "endpoint": endpoint_name,
            "status": "timeout",
            "error": "Request timeout"
        })
        return {"success": False, "status": "timeout", "time": elapsed}
        
    except Exception as e:
        elapsed = time.time() - start
        results["total_requests"] += 1
        results["failed_requests"] += 1
        results["endpoint_stats"][endpoint_name]["failed"] += 1
        error_msg = str(e)[:200]
        results["errors"].append({
            "endpoint": endpoint_name,
            "status": "error",
            "error": error_msg
        })
        return {"success": False, "status": "error", "time": elapsed}


async def simulate_user(user_id, session):
    """Simulate a single user making multiple requests."""
    # Register user first
    token, email = await register_user(session, user_id)
    if token:
        results["auth_tokens"][user_id] = token
    
    user_results = []
    
    # Define endpoint patterns with weights
    endpoints = [
        # Public endpoints (80% of requests)
        {"method": "GET", "path": "/health", "auth": False, "weight": 30},
        {"method": "GET", "path": "/api/health", "auth": False, "weight": 30},
        
        # Authenticated endpoints (20% of requests)
        {"method": "GET", "path": "/api/auth/me", "auth": True, "weight": 10},
        {"method": "GET", "path": "/api/subscription/status", "auth": True, "weight": 10},
        {"method": "GET", "path": "/api/user/activity", "auth": True, "weight": 10},
    ]
    
    # Create weighted list
    weighted_endpoints = []
    for endpoint in endpoints:
        weighted_endpoints.extend([endpoint] * endpoint["weight"])
    
    for i in range(REQUESTS_PER_USER):
        # Select random endpoint based on weight
        endpoint = random.choice(weighted_endpoints)
        url = f"{BASE_URL}{endpoint['path']}"
        endpoint_name = f"{endpoint['method']} {endpoint['path']}"
        
        headers = {}
        if endpoint.get("auth") and token:
            headers["Authorization"] = f"Bearer {token}"
        
        result = await make_request(
            session,
            endpoint["method"],
            url,
            headers=headers,
            endpoint_name=endpoint_name
        )
        user_results.append(result)
        
        # Random delay between requests (0-200ms)
        await asyncio.sleep(random.uniform(0, 0.2))
    
    return user_results


async def run_stress_test():
    """Run the advanced stress test."""
    print("=" * 70)
    print("ADVANCED STRESS TEST - Application Load Testing")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"Concurrent Users: {CONCURRENT_USERS}")
    print(f"Requests per User: {REQUESTS_PER_USER}")
    print(f"Total Requests: {TOTAL_REQUESTS}")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print("\nStarting stress test...\n")
    
    results["start_time"] = time.time()
    
    connector = aiohttp.TCPConnector(limit=200, limit_per_host=100)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Create tasks for all users
        tasks = [simulate_user(i, session) for i in range(CONCURRENT_USERS)]
        
        # Run all users concurrently
        all_results = await asyncio.gather(*tasks)
    
    results["end_time"] = time.time()
    
    # Calculate statistics
    total_time = results["end_time"] - results["start_time"]
    requests_per_second = results["total_requests"] / total_time if total_time > 0 else 0
    
    # Print results
    print("\n" + "=" * 70)
    print("STRESS TEST RESULTS")
    print("=" * 70)
    print(f"Total Time: {total_time:.2f} seconds")
    print(f"Total Requests: {results['total_requests']}")
    print(f"Successful Requests: {results['successful_requests']}")
    print(f"Failed Requests: {results['failed_requests']}")
    print(f"Success Rate: {(results['successful_requests'] / results['total_requests'] * 100):.2f}%")
    print(f"Requests per Second: {requests_per_second:.2f}")
    print(f"Users Authenticated: {len(results['auth_tokens'])}/{CONCURRENT_USERS}")
    print()
    
    if results["response_times"]:
        print("Response Time Statistics:")
        print(f"  Min: {min(results['response_times']):.3f}s")
        print(f"  Max: {max(results['response_times']):.3f}s")
        print(f"  Mean: {statistics.mean(results['response_times']):.3f}s")
        print(f"  Median: {statistics.median(results['response_times']):.3f}s")
        if len(results['response_times']) > 1:
            print(f"  Std Dev: {statistics.stdev(results['response_times']):.3f}s")
        
        sorted_times = sorted(results['response_times'])
        p50 = sorted_times[int(len(sorted_times) * 0.50)]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]
        print(f"  50th percentile (p50): {p50:.3f}s")
        print(f"  95th percentile (p95): {p95:.3f}s")
        print(f"  99th percentile (p99): {p99:.3f}s")
        print()
    
    print("Status Code Distribution:")
    for status, count in sorted(results["status_codes"].items()):
        percentage = (count / results["total_requests"] * 100) if results["total_requests"] > 0 else 0
        print(f"  {status}: {count} ({percentage:.2f}%)")
    print()
    
    print("Endpoint Statistics:")
    for endpoint, stats in sorted(results["endpoint_stats"].items()):
        total = stats["success"] + stats["failed"]
        success_rate = (stats["success"] / total * 100) if total > 0 else 0
        avg_time = statistics.mean(stats["times"]) if stats["times"] else 0
        print(f"  {endpoint}:")
        print(f"    Total: {total}, Success: {stats['success']}, Failed: {stats['failed']}")
        print(f"    Success Rate: {success_rate:.2f}%")
        print(f"    Avg Response Time: {avg_time:.3f}s")
    print()
    
    if results["errors"]:
        print(f"Errors ({len(results['errors'])}):")
        error_summary = defaultdict(int)
        for error in results["errors"]:
            error_summary[f"{error['endpoint']} - {error['status']}"] += 1
        
        for error_type, count in sorted(error_summary.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {error_type}: {count}")
        print()
    
    # Performance assessment
    print("=" * 70)
    print("PERFORMANCE ASSESSMENT")
    print("=" * 70)
    
    if results["response_times"]:
        avg_time = statistics.mean(results["response_times"])
        p95_time = sorted(results["response_times"])[int(len(results["response_times"]) * 0.95)]
        
        if avg_time < 0.1:
            print("✅ Excellent: Average response time < 100ms")
        elif avg_time < 0.5:
            print("✅ Good: Average response time < 500ms")
        elif avg_time < 1.0:
            print("⚠️  Acceptable: Average response time < 1s")
        else:
            print("❌ Poor: Average response time >= 1s")
        
        if p95_time < 0.5:
            print("✅ Excellent: 95th percentile < 500ms")
        elif p95_time < 1.0:
            print("✅ Good: 95th percentile < 1s")
        elif p95_time < 2.0:
            print("⚠️  Acceptable: 95th percentile < 2s")
        else:
            print("❌ Poor: 95th percentile >= 2s")
    
    success_rate = (results["successful_requests"] / results["total_requests"] * 100) if results["total_requests"] > 0 else 0
    if success_rate >= 99:
        print("✅ Excellent: Success rate >= 99%")
    elif success_rate >= 95:
        print("✅ Good: Success rate >= 95%")
    elif success_rate >= 90:
        print("⚠️  Acceptable: Success rate >= 90%")
    else:
        print("❌ Poor: Success rate < 90%")
    
    if requests_per_second >= 100:
        print(f"✅ Excellent: Throughput >= 100 req/s ({requests_per_second:.2f} req/s)")
    elif requests_per_second >= 50:
        print(f"✅ Good: Throughput >= 50 req/s ({requests_per_second:.2f} req/s)")
    elif requests_per_second >= 10:
        print(f"⚠️  Acceptable: Throughput >= 10 req/s ({requests_per_second:.2f} req/s)")
    else:
        print(f"❌ Poor: Throughput < 10 req/s ({requests_per_second:.2f} req/s)")
    
    print("=" * 70)
    print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)


if __name__ == "__main__":
    try:
        asyncio.run(run_stress_test())
    except KeyboardInterrupt:
        print("\n\nStress test interrupted by user.")
    except Exception as e:
        print(f"\n\nError running stress test: {e}")
        import traceback
        traceback.print_exc()

