"""Script to check and create tool_cache table if missing."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models.database import db, ToolCacheEntry
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    print(f"Database: {db.engine.url}")
    print(f"Tables found: {len(tables)}")
    
    if 'tool_cache' in tables:
        print("✓ tool_cache table exists")
        
        # Check columns
        columns = [col['name'] for col in inspector.get_columns('tool_cache')]
        print(f"  Columns: {', '.join(columns)}")
        
        expected_columns = ['id', 'cache_key', 'tool_name', 'tool_params', 'result', 'hit_count', 'created_at', 'expires_at']
        missing_columns = [col for col in expected_columns if col not in columns]
        
        if missing_columns:
            print(f"✗ Missing columns: {', '.join(missing_columns)}")
            print("  Run the migration: migrations/add_tool_cache_table.sql")
        else:
            print("✓ All expected columns present")
    else:
        print("✗ tool_cache table does NOT exist")
        print("\nCreating table...")
        try:
            db.create_all()
            print("✓ Table created successfully")
        except Exception as e:
            print(f"✗ Error creating table: {e}")
            print("\nTry running the migration manually:")
            print("  psql -d your_database < migrations/add_tool_cache_table.sql")


