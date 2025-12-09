#!/usr/bin/env python3
"""
Migration script to add founder_psychology column to users table.
Run this script to apply the migration to your database.
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app directly (api.py creates app as module-level variable)
import api
from app.models.database import db
from sqlalchemy import text

def run_migration():
    """Run the migration to add founder_psychology column."""
    app = api.app
    
    with app.app_context():
        print("Starting migration: Add founder_psychology column to users table...")
        
        try:
            # Read SQL file
            sql_file = os.path.join(os.path.dirname(__file__), "add_founder_psychology_column.sql")
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            # Execute the SQL (it's a DO block that checks if column exists)
            db.session.execute(text(sql))
            db.session.commit()
            
            print("✅ Migration completed successfully!")
            print("   Column 'founder_psychology' has been added to the 'users' table.")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            print(f"   Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    run_migration()

