"""Script to ensure tool_cache table exists."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models.database import db, ToolCacheEntry
from sqlalchemy import inspect

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    
    print(f"Database: {db.engine.url}")
    
    if 'tool_cache' in tables:
        print("✓ tool_cache table already exists")
        
        # Check columns
        columns = [col['name'] for col in inspector.get_columns('tool_cache')]
        expected_columns = ['id', 'cache_key', 'tool_name', 'tool_params', 'result', 'hit_count', 'created_at', 'expires_at']
        missing_columns = [col for col in expected_columns if col not in columns]
        
        if missing_columns:
            print(f"✗ Missing columns: {', '.join(missing_columns)}")
            print("  Please run: migrations/add_tool_cache_table.sql")
        else:
            print("✓ All columns present")
    else:
        print("✗ tool_cache table does NOT exist")
        print("Creating table...")
        try:
            db.create_all()
            # Verify it was created
            inspector = inspect(db.engine)
            if 'tool_cache' in inspector.get_table_names():
                print("✓ Table created successfully!")
            else:
                print("✗ Table creation failed. Please run migration manually:")
                print("  psql -d your_database < migrations/add_tool_cache_table.sql")
        except Exception as e:
            print(f"✗ Error: {e}")
            print("\nPlease run the migration manually:")
            if 'postgresql' in str(db.engine.url):
                print("  psql -d your_database < migrations/add_tool_cache_table.sql")
            else:
                print("  The table should be created automatically. Check database permissions.")


