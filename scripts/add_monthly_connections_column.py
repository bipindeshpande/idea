#!/usr/bin/env python3
"""
Script to add monthly_connections_used column to users table.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import api
from app.models.database import db
from sqlalchemy import text

def add_column():
    """Add monthly_connections_used column to users table."""
    app = api.app
    
    with app.app_context():
        print("=" * 80)
        print("ADDING monthly_connections_used COLUMN TO users TABLE")
        print("=" * 80)
        print()
        
        # Check if column already exists
        inspector = db.inspect(db.engine)
        users_columns = [col["name"] for col in inspector.get_columns("users")]
        
        if "monthly_connections_used" in users_columns:
            print("✅ Column 'monthly_connections_used' already exists in 'users' table.")
            print("   No action needed.")
            return
        
        print("⚠️  Column 'monthly_connections_used' not found in 'users' table.")
        print("   Adding column...")
        print()
        
        try:
            # Detect database engine and use appropriate SQL
            db_url = str(db.engine.url)
            
            if "postgresql" in db_url.lower():
                sql = "ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;"
                print(f"Executing (PostgreSQL): {sql}")
            elif "sqlite" in db_url.lower():
                sql = "ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;"
                print(f"Executing (SQLite): {sql}")
            elif "mysql" in db_url.lower():
                sql = "ALTER TABLE users ADD COLUMN monthly_connections_used INT DEFAULT 0;"
                print(f"Executing (MySQL): {sql}")
            else:
                sql = "ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;"
                print(f"Executing (Generic): {sql}")
            
            db.session.execute(text(sql))
            db.session.commit()
            
            print()
            print("✅ Successfully added 'monthly_connections_used' column to 'users' table!")
            print()
            
            # Verify it was added
            inspector = db.inspect(db.engine)
            users_columns = [col["name"] for col in inspector.get_columns("users")]
            if "monthly_connections_used" in users_columns:
                col_info = next(c for c in inspector.get_columns("users") if c["name"] == "monthly_connections_used")
                print(f"✅ Verification: Column exists")
                print(f"   Type: {col_info['type']}")
                print(f"   Default: {col_info.get('default', 'None')}")
                print(f"   Nullable: {col_info['nullable']}")
            else:
                print("⚠️  Warning: Column was not found after adding. Please verify manually.")
            
        except Exception as e:
            db.session.rollback()
            print()
            print(f"❌ Error adding column: {e}")
            print()
            print("You may need to run this SQL manually:")
            print("ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;")
            sys.exit(1)
        
        print()
        print("=" * 80)

if __name__ == "__main__":
    try:
        add_column()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

