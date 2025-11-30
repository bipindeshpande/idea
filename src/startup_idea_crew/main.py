#!/usr/bin/env python
"""
Main entry point for the Startup Idea Crew
Run this to get personalized startup ideas based on your profile
"""

import sys
from pathlib import Path
from startup_idea_crew.crew import StartupIdeaCrew

# Import output manager for archiving (if available)
try:
    # Try importing from app (when running from project root)
    from app.utils.output_manager import archive_existing_outputs
except ImportError:
    try:
        # Fallback: add project root to path
        project_root = Path(__file__).parent.parent.parent
        sys.path.insert(0, str(project_root))
        from app.utils.output_manager import archive_existing_outputs
    except ImportError:
        # If still can't import, define a no-op function
        def archive_existing_outputs():
            pass


def run():
    """
    Run the crew with user inputs.
    """
    print("🚀 Welcome to Startup Idea Crew!")
    print("=" * 50)
    print("\nI'll help you find the perfect startup idea tailored to your goals, focus, and working preferences.")
    print("\nLet's gather some information about you...\n")
    
    # Collect user inputs
    goal_type = input(
        "What is your primary goal type? (e.g., 'Extra Income', 'Replace Full-Time Job', 'Passive Income'): "
    ).strip()
    if not goal_type:
        goal_type = "Extra Income"
    
    time_commitment = input(
        "\nHow much time can you commit per week? (e.g., '<5 hrs/week', '5–10 hrs/week', '10–20 hrs/week', 'Full-time'): "
    ).strip()
    if not time_commitment:
        time_commitment = "<5 hrs/week"
    
    budget_range = input(
        "\nWhat budget range can you invest? (e.g., 'Free / Sweat-equity only', '< $1 K', 'Up to $5 K', 'Up to $10 K', 'Up to $20 K', '$20 K and Above'): "
    ).strip()
    if not budget_range:
        budget_range = "Free / Sweat-equity only"

    interest_area = input(
        "\nWhich interest area are you most drawn to? (e.g., 'AI / Automation', 'Healthcare / Wellness', 'E-commerce / Retail'): "
    ).strip()
    if not interest_area:
        interest_area = "AI / Automation"

    sub_interest_area = input(
        "\nDo you have a specific sub-interest focus? (e.g., 'Chatbots', 'Predictive Analytics', 'Clean Energy'): "
    ).strip()
    if not sub_interest_area:
        sub_interest_area = "Chatbots"

    work_style = input(
        "\nWhat work style do you prefer? (e.g., 'Solo', 'Small Team', 'Community-Based', 'Remote Only', 'Requires Physical Presence'): "
    ).strip()
    if not work_style:
        work_style = "Solo"

    skill_strength = input(
        "\nWhat is your primary skill strength? (e.g., 'Technical / Automation', 'Analytical / Strategic', 'Creative / Design'): "
    ).strip()
    if not skill_strength:
        skill_strength = "Analytical / Strategic"

    experience_summary = input(
        "\nShare a short experience summary (max 120 characters, press Enter to skip): "
    ).strip()
    if not experience_summary:
        experience_summary = "No detailed experience summary provided."
    
    print("\n" + "=" * 50)
    print("Processing your information...")
    print("This may take a few moments...\n")
    
    # Prepare inputs
    inputs = {
        "goal_type": goal_type,
        "time_commitment": time_commitment,
        "budget_range": budget_range,
        "interest_area": interest_area,
        "sub_interest_area": sub_interest_area,
        "work_style": work_style,
        "skill_strength": skill_strength,
        "experience_summary": experience_summary,
    }
    
    try:
        # Archive existing output files before running (preserves history)
        try:
            archive_existing_outputs()
            print("Archived previous output files.\n")
        except Exception as e:
            print(f"Note: Could not archive previous outputs: {e}\n")
        
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
        "goal_type": "Passive Income",
        "time_commitment": "10–20 hrs/week",
        "budget_range": "Up to $5 K",
        "interest_area": "AI / Automation",
        "sub_interest_area": "Workflow Automation",
        "work_style": "Solo",
        "skill_strength": "Technical / Automation",
        "experience_summary": "Product manager exploring automation side hustles",
    }

    try:
        crew = StartupIdeaCrew().crew()
        crew.test(n_iterations=int(sys.argv[1]), eval_llm=sys.argv[2], inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while testing the crew: {e}")


if __name__ == "__main__":
    run()

