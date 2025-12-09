"""
Script to run a REAL discovery pipeline and print performance logs.

This script runs an actual discovery (not unit tests) to diagnose performance issues.
All performance logs will be printed to the console.
"""
import os
import sys
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from app import create_app
from app.services.unified_discovery_service import run_unified_discovery
from app.utils.timing_logger import init_timing_logger, clear_timing_data, save_timing_log

# Sample profile data for testing
SAMPLE_PROFILE_DATA = {
    "goal_type": "Extra Income",
    "time_commitment": "<5 hrs/week",
    "budget_range": "Free / Sweat-equity only",
    "interest_area": "AI / Automation",
    "sub_interest_area": "Chatbots",
    "work_style": "Solo",
    "skill_strength": "Analytical / Strategic",
    "experience_summary": "Software engineer with 5 years of experience in web development.",
    "founder_psychology": {}
}

def main():
    """Run a real discovery and print all performance logs."""
    print("=" * 80)
    print("RUNNING REAL DISCOVERY PIPELINE")
    print("=" * 80)
    print(f"Profile data: {SAMPLE_PROFILE_DATA}")
    print("=" * 80)
    print()
    
    # Create Flask app
    app = create_app()
    
    with app.app_context():
        # Initialize timing logger
        init_timing_logger()  # Uses default docs/timing_logs.json
        clear_timing_data()  # Clear any previous data
        
        # Run discovery (non-streaming for easier log capture)
        print("Starting discovery run...")
        print()
        
        start_time = time.time()
        try:
            outputs, metadata = run_unified_discovery(
                profile_data=SAMPLE_PROFILE_DATA,
                use_cache=False,  # Bypass cache to get real performance
                stream=False,
                cache_bypass=True,  # Force real execution
            )
            
            total_time = time.time() - start_time
            
            print()
            print("=" * 80)
            print("DISCOVERY COMPLETE")
            print("=" * 80)
            print(f"Total execution time: {total_time:.3f} seconds")
            print(f"Metadata: {metadata}")
            print()
            print("Output sections:")
            for key, value in outputs.items():
                if value:
                    print(f"  - {key}: {len(value)} characters")
                else:
                    print(f"  - {key}: EMPTY")
            print("=" * 80)
            
            # Save timing log
            save_timing_log()
            
        except Exception as e:
            print()
            print("=" * 80)
            print("ERROR DURING DISCOVERY")
            print("=" * 80)
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            print("=" * 80)
            # Save timing log even on error
            save_timing_log()
            sys.exit(1)

if __name__ == "__main__":
    main()

