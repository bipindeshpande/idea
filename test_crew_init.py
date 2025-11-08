"""Quick test to verify crew initialization works"""
import os
from startup_idea_crew.crew import StartupIdeaCrew

print("Testing crew initialization...")

# Check API key
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    print(f"✓ OpenAI API key found (starts with: {api_key[:10]}...)")
else:
    print("✗ OPENAI_API_KEY not found in environment")

# Test crew initialization
try:
    print("\nInitializing StartupIdeaCrew...")
    crew_instance = StartupIdeaCrew()
    print("✓ Crew instance created")
    
    print("\nGetting crew...")
    crew = crew_instance.crew()
    print("✓ Crew object created")
    
    print(f"✓ Crew has {len(crew.agents)} agents")
    print(f"✓ Crew has {len(crew.tasks)} tasks")
    
    print("\n✓ All checks passed! Crew should work.")
    
except Exception as e:
    import traceback
    print(f"\n✗ Error: {e}")
    print("\nFull traceback:")
    traceback.print_exc()

