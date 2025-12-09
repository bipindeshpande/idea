#!/usr/bin/env python3
"""Show the final prompts that get created for discovery pipeline."""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.unified_discovery_service import _build_profile_analysis_prompt, _build_idea_research_prompt
from app.services.static_tool_loader import StaticToolLoader

# Sample profile data
profile_data = {
    'goal_type': 'Extra Income',
    'time_commitment': '<5 hrs/week',
    'budget_range': 'Free / Sweat-equity only',
    'interest_area': 'AI / Automation',
    'sub_interest_area': 'Chatbots',
    'work_style': 'Solo',
    'skill_strength': 'Analytical / Strategic',
    'experience_summary': 'Software engineer with 5 years of experience in web development.',
    'founder_psychology': {}
}

print("="*100)
print("STAGE 1 PROMPT (Profile Analysis)")
print("="*100)
prompt1 = _build_profile_analysis_prompt(profile_data)
print(prompt1)
print("\n" + "="*100)
print(f"Stage 1 Prompt Length: {len(prompt1)} characters")
print("="*100)

print("\n\n")

# Get static tool results
tool_results = StaticToolLoader.load('AI / Automation')
print(f"Loaded {len(tool_results)} static tool results")

# Sample Stage 1 output (what would be passed to Stage 2)
sample_profile_analysis = """## 1. Core Motivation
You're driven by the desire to create extra income streams while leveraging your technical expertise. Your 5 years of web development experience shows you value practical, hands-on solutions. The goal of "Extra Income" suggests you're looking for something manageable alongside your current work, not a full-time commitment.

## 2. Constraints
- **Time**: With <5 hrs/week, you need ideas that can be built incrementally
- **Budget**: Free/sweat-equity only means no paid tools or services initially
- **Work Style**: Solo means you'll be handling everything yourself
- **Implications**: Focus on low-maintenance, automated solutions

## 3. Strengths
- **Technical Skills**: Strong web development background
- **Analytical Mindset**: Strategic thinking for system design
- **Domain Experience**: 5 years of practical development experience
- **Transferable Skills**: Can build MVPs quickly

## 4. Skill Gaps
- **Business Development**: Limited experience in sales/marketing
- **Domain Knowledge**: May lack deep AI/automation expertise
- **Customer Acquisition**: Need to learn how to find and convert customers"""

print("\n" + "="*100)
print("STAGE 2 PROMPT (Idea Research)")
print("="*100)
prompt2 = _build_idea_research_prompt(sample_profile_analysis, tool_results)
print(prompt2)
print("\n" + "="*100)
print(f"Stage 2 Prompt Length: {len(prompt2)} characters")
print(f"Static Tool Results JSON Length: {len(str(tool_results))} characters")
print("="*100)

