#!/usr/bin/env python3
"""
Migration script to add Founder Connect tables.
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
    """Run the migration to add Founder Connect tables."""
    app = api.app
    
    with app.app_context():
        print("Starting migration: Add Founder Connect tables...")
        
        try:
            # Read SQL file
            sql_file = os.path.join(os.path.dirname(__file__), "add_founder_connect_tables.sql")
            with open(sql_file, 'r') as f:
                sql = f.read()
            
            # Execute SQL statements
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
            
            for statement in statements:
                if statement:
                    try:
                        db.session.execute(text(statement))
                        print(f"✓ Executed: {statement[:50]}...")
                    except Exception as e:
                        # Some statements might fail if tables/columns already exist
                        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                            print(f"⚠ Skipped (already exists): {statement[:50]}...")
                        else:
                            print(f"✗ Error executing: {statement[:50]}...")
                            print(f"  Error: {e}")
                            raise
            
            db.session.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Migration failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run_migration()

