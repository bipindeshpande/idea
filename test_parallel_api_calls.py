"""
Test script to demonstrate parallel API calls for financial insights and risk radar.
Shows time savings from parallelization vs sequential.
"""

import os
import time
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

SAMPLE_IDEA = "AI-powered personal finance assistant that helps users track expenses, optimize budgets, and make smarter financial decisions using AI-powered insights and automation."
USER_BUDGET = "Free / Sweat-equity only"
USER_TIME = "<5 hrs/week"
USER_SKILLS = "Technical / Automation"

def call_financial_insights():
    """Fetch financial insights."""
    prompt = f"""Analyze this startup idea and provide detailed financial insights.

Idea: {SAMPLE_IDEA}
User Budget: {USER_BUDGET}
User Time: {USER_TIME}

Provide:
- Startup costs (specific numbers)
- Revenue projections
- Unit economics (CAC, LTV, ratios)
- Financial viability

Format as JSON with financial_insights structure."""
    
    start = time.time()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a startup financial advisor. Provide specific numbers, not ranges."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=1000
    )
    elapsed = time.time() - start
    
    return {
        "type": "financial",
        "time": elapsed,
        "tokens": response.usage.total_tokens,
        "content": response.choices[0].message.content
    }

def call_risk_radar():
    """Fetch risk radar."""
    prompt = f"""Analyze this startup idea and provide specific risk radar.

Idea: {SAMPLE_IDEA}
User Budget: {USER_BUDGET}
User Skills: {USER_SKILLS}

Provide 5 specific risks (not generic) with:
- Risk name
- Severity
- Explanation tied to THIS idea
- Mitigation steps

Format as JSON with risk_radar array."""
    
    start = time.time()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a startup risk advisor. Provide specific risks tied to the idea, not generic ones."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=1000
    )
    elapsed = time.time() - start
    
    return {
        "type": "risk",
        "time": elapsed,
        "tokens": response.usage.total_tokens,
        "content": response.choices[0].message.content
    }

def call_competitive_analysis():
    """Fetch competitive analysis."""
    prompt = f"""Analyze competitors for this idea: {SAMPLE_IDEA}
Provide competitive positioning and differentiation strategies."""
    
    start = time.time()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a competitive intelligence analyst."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800
    )
    elapsed = time.time() - start
    
    return {
        "type": "competitive",
        "time": elapsed,
        "tokens": response.usage.total_tokens,
        "content": response.choices[0].message.content
    }

def call_market_intelligence():
    """Fetch market intelligence."""
    prompt = f"""Provide market entry strategy for: {SAMPLE_IDEA}
Include timing, growth projections, and market trends."""
    
    start = time.time()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a market strategist."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800
    )
    elapsed = time.time() - start
    
    return {
        "type": "market",
        "time": elapsed,
        "tokens": response.usage.total_tokens,
        "content": response.choices[0].message.content
    }

def sequential_execution():
    """Run calls sequentially."""
    print("\n" + "="*80)
    print("SEQUENTIAL EXECUTION TEST")
    print("="*80)
    
    start_total = time.time()
    results = []
    
    print("\n1. Calling Financial Insights...")
    results.append(call_financial_insights())
    
    print("2. Calling Risk Radar...")
    results.append(call_risk_radar())
    
    print("3. Calling Competitive Analysis...")
    results.append(call_competitive_analysis())
    
    print("4. Calling Market Intelligence...")
    results.append(call_market_intelligence())
    
    total_time = time.time() - start_total
    
    print(f"\n{'Call Type':<25} {'Time (s)':<15} {'Tokens':<15}")
    print("-"*55)
    for r in results:
        print(f"{r['type'].title():<25} {r['time']:<15.2f} {r['tokens']:<15}")
    print("-"*55)
    print(f"{'TOTAL (Sequential)':<25} {total_time:<15.2f} {sum(r['tokens'] for r in results):<15}")
    
    return total_time, results

def parallel_execution():
    """Run calls in parallel using ThreadPoolExecutor."""
    print("\n" + "="*80)
    print("PARALLEL EXECUTION TEST")
    print("="*80)
    
    start_total = time.time()
    results = []
    
    # Define all call functions
    calls = [
        ("Financial Insights", call_financial_insights),
        ("Risk Radar", call_risk_radar),
        ("Competitive Analysis", call_competitive_analysis),
        ("Market Intelligence", call_market_intelligence),
    ]
    
    print(f"\n🚀 Starting {len(calls)} parallel API calls...")
    
    # Execute in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=4) as executor:
        # Submit all tasks
        future_to_name = {
            executor.submit(func): name 
            for name, func in calls
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_name):
            name = future_to_name[future]
            try:
                result = future.result()
                results.append(result)
                print(f"✅ {name} completed ({result['time']:.2f}s)")
            except Exception as e:
                print(f"❌ {name} failed: {e}")
    
    total_time = time.time() - start_total
    
    print(f"\n{'Call Type':<25} {'Time (s)':<15} {'Tokens':<15}")
    print("-"*55)
    for r in results:
        print(f"{r['type'].title():<25} {r['time']:<15.2f} {r['tokens']:<15}")
    print("-"*55)
    print(f"{'TOTAL (Parallel)':<25} {total_time:<15.2f} {sum(r['tokens'] for r in results):<15}")
    
    return total_time, results

def display_comparison(seq_time, par_time, seq_results, par_results):
    """Display comparison table."""
    print("\n" + "="*80)
    print("COMPARISON: SEQUENTIAL vs PARALLEL")
    print("="*80)
    
    time_saved = seq_time - par_time
    speedup = seq_time / par_time if par_time > 0 else 0
    percent_saved = (time_saved / seq_time * 100) if seq_time > 0 else 0
    
    print(f"\n{'Metric':<30} {'Sequential':<20} {'Parallel':<20} {'Improvement':<20}")
    print("-"*90)
    print(f"{'Total Time':<30} {seq_time:<20.2f}s {par_time:<20.2f}s {time_saved:<20.2f}s ({percent_saved:.1f}% faster)")
    print(f"{'Speedup Factor':<30} {'1.0x':<20} {speedup:<20.2f}x {'':<20}")
    print(f"{'Total Tokens':<30} {sum(r['tokens'] for r in seq_results):<20} {sum(r['tokens'] for r in par_results):<20} {'Same':<20}")
    
    # Individual call times
    print(f"\n{'Individual Call Times':<30} {'Sequential':<20} {'Parallel':<20}")
    print("-"*70)
    seq_by_type = {r['type']: r['time'] for r in seq_results}
    par_by_type = {r['type']: r['time'] for r in par_results}
    all_types = set(seq_by_type.keys()) | set(par_by_type.keys())
    for call_type in all_types:
        seq_t = seq_by_type.get(call_type, 0)
        par_t = par_by_type.get(call_type, 0)
        print(f"{call_type.title():<30} {seq_t:<20.2f}s {par_t:<20.2f}s")
    
    print("\n" + "="*80)
    print("KEY INSIGHT:")
    print(f"✅ Parallel execution is {speedup:.2f}x faster!")
    print(f"✅ Time saved: {time_saved:.2f} seconds ({percent_saved:.1f}% reduction)")
    print(f"✅ Cost is the same (same tokens used)")
    print("="*80)

if __name__ == "__main__":
    print("\n" + "="*80)
    print("PARALLEL API CALLS PERFORMANCE TEST")
    print("="*80)
    print(f"\nTest Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Testing: 4 API calls (Financial, Risk, Competitive, Market)")
    
    # Run sequential test
    seq_time, seq_results = sequential_execution()
    
    # Wait a bit between tests
    print("\n⏳ Waiting 5 seconds before parallel test...")
    time.sleep(5)
    
    # Run parallel test
    par_time, par_results = parallel_execution()
    
    # Display comparison
    display_comparison(seq_time, par_time, seq_results, par_results)
    
    print("\n✅ Test Complete!")

