#!/usr/bin/env python
"""
Main entry point for the Startup Idea Crew
Run this to get personalized startup ideas based on your profile
"""

import sys
from startup_idea_crew.crew import StartupIdeaCrew


def run():
    """
    Run the crew with user inputs.
    """
    print("🚀 Welcome to Startup Idea Crew!")
    print("=" * 50)
    print("\nI'll help you find the perfect startup idea tailored to your goals, time, and interests.")
    print("\nLet's gather some information about you...\n")
    
    # Collect user inputs
    goals = input("What are your main goals? (e.g., 'build a side business', 'create a full-time startup', 'solve a specific problem'): ").strip()
    if not goals:
        goals = "Build a successful startup that aligns with my interests and available time"
    
    time_commitment = input("\nHow much time can you commit per week? (e.g., '5-10 hours', '20+ hours', 'full-time'): ").strip()
    if not time_commitment:
        time_commitment = "10-15 hours per week"
    
    interests = input("\nWhat are your main interests? (e.g., 'AI, technology, healthcare', 'sustainability, e-commerce'): ").strip()
    if not interests:
        interests = "Technology and innovation"
    
    print("\n" + "=" * 50)
    print("Processing your information...")
    print("This may take a few moments...\n")
    
    # Prepare inputs
    inputs = {
        "goals": goals,
        "time_commitment": time_commitment,
        "interests": interests,
        "professional_background": "",
        "skills": "",
        "budget_range": "",
        "risk_tolerance": "",
        "preferred_model": "",
        "resources": "",
        "learning_goals": "",
    }
    
    try:
        # Initialize and run the crew
        print("Initializing crew...")
        crew_instance = StartupIdeaCrew()
        crew = crew_instance.crew()
        print("Crew initialized successfully. Starting execution...\n")
        
        result = crew.kickoff(inputs=inputs)
        
        print("\n" + "=" * 50)
        print("✅ Analysis Complete!")
        print("=" * 50)
        print("\nCheck the 'output' folder for your personalized reports:")
        print("  - profile_analysis.md - Your professional profile analysis")
        print("  - startup_ideas_research.md - Researched startup ideas")
        print("  - personalized_recommendations.md - Top recommendations with next steps")
        print("\n" + "=" * 50)
        
        return result
        
    except Exception as e:
        import traceback
        print(f"\n❌ An error occurred while running the crew: {e}")
        print("\nFull error details:")
        print("-" * 50)
        traceback.print_exc()
        print("-" * 50)
        print("\nTroubleshooting tips:")
        print("1. Check that your .env file has a valid OPENAI_API_KEY")
        print("2. Verify all tools are imported correctly")
        print("3. Check the output/ folder for partial results")
        print("4. Try running with: python -m startup_idea_crew.main")
        raise


def test():
    """
    Test the crew execution with sample inputs.
    """
    inputs = {
        'goals': 'Build a side business that can generate passive income',
        'time_commitment': '10-15 hours per week',
        'interests': 'AI, automation, SaaS products'
    }

    try:
        crew = StartupIdeaCrew().crew()
        crew.test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")


if __name__ == "__main__":
    run()

