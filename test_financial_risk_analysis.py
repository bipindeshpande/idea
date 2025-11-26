"""
Test script to fetch financial insights and risk radar via OpenAI API.
Measures time and displays results in table format.
"""

import os
import time
import json
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    print("❌ ERROR: OPENAI_API_KEY not found in .env file or environment!")
    print("Please add OPENAI_API_KEY=your-key-here to your .env file")
    exit(1)

client = OpenAI(api_key=api_key)

# Sample idea for testing
SAMPLE_IDEA = "AI-powered personal finance assistant that helps users track expenses, optimize budgets, and make smarter financial decisions using AI-powered insights and automation."
USER_BUDGET = "Free / Sweat-equity only"
USER_TIME = "<5 hrs/week"
USER_SKILLS = "Technical / Automation"

def get_financial_insights_and_risk_radar():
    """Fetch financial insights and risk radar in one API call."""
    
    prompt = f"""Analyze this startup idea and provide detailed financial insights and risk radar.

Idea: {SAMPLE_IDEA}
User Budget: {USER_BUDGET}
User Time Commitment: {USER_TIME}
User Skills: {USER_SKILLS}

Provide the following in a structured format:

## Financial Insights

### Startup Costs
- Initial setup costs (specific numbers, not ranges)
- Monthly operating costs
- Tool/platform costs breakdown

### Revenue Projections
- Revenue model recommendation
- Pricing strategy
- Monthly revenue projections (months 1-6)
- Annual revenue potential

### Unit Economics
- Customer Acquisition Cost (CAC) estimate
- Customer Lifetime Value (LTV) estimate
- LTV:CAC ratio
- Payback period
- Break-even timeline

### Financial Viability
- Cash flow projections (first 6 months)
- Funding requirements
- Profitability timeline

## Risk Radar

For each risk, provide:
- Risk name
- Severity (Low/Medium/High)
- Specific explanation tied to THIS idea and user constraints
- Concrete mitigation steps with specific tools/platforms

Provide at least 5 specific risks (not generic ones like "market saturation" unless you explain HOW it specifically impacts this idea).

Format the response as JSON with this structure:
{{
  "financial_insights": {{
    "startup_costs": {{...}},
    "revenue_projections": {{...}},
    "unit_economics": {{...}},
    "financial_viability": {{...}}
  }},
  "risk_radar": [
    {{
      "risk_name": "...",
      "severity": "...",
      "explanation": "...",
      "mitigation": "..."
    }}
  ]
}}
"""

    start_time = time.time()
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a startup financial advisor. Provide detailed, specific financial analysis and risk assessment. Always use specific numbers, not generic ranges."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        elapsed_time = time.time() - start_time
        
        content = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        total_tokens = response.usage.total_tokens
        
        # Try to parse as JSON, if not, use raw text
        try:
            result = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            # If not JSON, extract structured data from text
            result = {"raw_response": response.choices[0].message.content}
        
        return {
            "success": True,
            "time_elapsed": elapsed_time,
            "tokens": {
                "input": content,
                "output": output_tokens,
                "total": total_tokens
            },
            "data": result,
            "raw_response": response.choices[0].message.content
        }
        
    except Exception as e:
        elapsed_time = time.time() - start_time
        return {
            "success": False,
            "error": str(e),
            "time_elapsed": elapsed_time
        }

def display_results_table(result):
    """Display results in table format."""
    
    print("\n" + "="*80)
    print("FINANCIAL INSIGHTS & RISK RADAR ANALYSIS")
    print("="*80)
    print(f"\nTest Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API Call Time: {result['time_elapsed']:.2f} seconds")
    print(f"Tokens Used: {result['tokens']['total']} (Input: {result['tokens']['input']}, Output: {result['tokens']['output']})")
    
    if not result['success']:
        print(f"\n❌ Error: {result['error']}")
        return
    
    data = result.get('data', {})
    
    # Financial Insights Table
    print("\n" + "-"*80)
    print("FINANCIAL INSIGHTS")
    print("-"*80)
    
    if 'financial_insights' in data:
        fi = data['financial_insights']
        
        print("\n📊 Startup Costs:")
        print(f"{'Category':<30} {'Amount':<30}")
        print("-"*60)
        if 'startup_costs' in fi:
            for key, value in fi['startup_costs'].items():
                print(f"{key.replace('_', ' ').title():<30} {str(value):<30}")
        
        print("\n💰 Revenue Projections:")
        if 'revenue_projections' in fi:
            rp = fi['revenue_projections']
            for key, value in rp.items():
                print(f"  {key.replace('_', ' ').title()}: {value}")
        
        print("\n📈 Unit Economics:")
        if 'unit_economics' in fi:
            ue = fi['unit_economics']
            print(f"{'Metric':<30} {'Value':<30}")
            print("-"*60)
            for key, value in ue.items():
                print(f"{key.replace('_', ' ').title():<30} {str(value):<30}")
        
        print("\n✅ Financial Viability:")
        if 'financial_viability' in fi:
            fv = fi['financial_viability']
            for key, value in fv.items():
                print(f"  {key.replace('_', ' ').title()}: {value}")
    else:
        print("\n⚠️  Financial insights not in expected format. Showing raw response:")
        print(result['raw_response'][:500] + "...")
    
    # Risk Radar Table
    print("\n" + "-"*80)
    print("RISK RADAR")
    print("-"*80)
    
    if 'risk_radar' in data and isinstance(data['risk_radar'], list):
        print(f"\n{'Risk Name':<30} {'Severity':<15} {'Explanation':<35}")
        print("-"*80)
        for i, risk in enumerate(data['risk_radar'], 1):
            name = risk.get('risk_name', f'Risk {i}')[:28]
            severity = risk.get('severity', 'N/A')[:13]
            explanation = risk.get('explanation', '')[:33]
            print(f"{name:<30} {severity:<15} {explanation:<35}")
        
        print("\n" + "-"*80)
        print("MITIGATION STRATEGIES")
        print("-"*80)
        for i, risk in enumerate(data['risk_radar'], 1):
            print(f"\n{i}. {risk.get('risk_name', f'Risk {i}')}")
            print(f"   Mitigation: {risk.get('mitigation', 'N/A')}")
    else:
        print("\n⚠️  Risk radar not in expected format. Showing raw response:")
        print(result['raw_response'][:500] + "...")
    
    # Cost Estimate
    print("\n" + "-"*80)
    print("COST ESTIMATE")
    print("-"*80)
    # Rough estimate: $0.03 per 1K input tokens + $0.06 per 1K output tokens
    input_cost = (result['tokens']['input'] / 1000) * 0.03
    output_cost = (result['tokens']['output'] / 1000) * 0.06
    total_cost = input_cost + output_cost
    print(f"Estimated API Cost: ${total_cost:.4f}")
    print(f"  - Input tokens: {result['tokens']['input']} (${input_cost:.4f})")
    print(f"  - Output tokens: {result['tokens']['output']} (${output_cost:.4f})")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    print("\n🚀 Starting Financial Insights & Risk Radar Analysis Test...")
    print(f"📝 Sample Idea: {SAMPLE_IDEA[:60]}...")
    print(f"💰 User Budget: {USER_BUDGET}")
    print(f"⏰ User Time: {USER_TIME}")
    print(f"🛠️  User Skills: {USER_SKILLS}")
    print("\n⏳ Calling OpenAI API...")
    
    result = get_financial_insights_and_risk_radar()
    display_results_table(result)
    
    print("\n✅ Test Complete!")
    print(f"⏱️  Total Time: {result['time_elapsed']:.2f} seconds")

