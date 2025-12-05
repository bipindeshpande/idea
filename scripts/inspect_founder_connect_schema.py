#!/usr/bin/env python3
"""
Debug script to inspect Founder Connect database schema.
Verifies that all required tables and columns exist.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import api
from app.models.database import db
from sqlalchemy import inspect, text

def inspect_schema():
    """Inspect the database schema for Founder Connect tables."""
    app = api.app
    
    with app.app_context():
        inspector = inspect(db.engine)
        
        print("=" * 80)
        print("FOUNDER CONNECT SCHEMA INSPECTION")
        print("=" * 80)
        print()
        
        # List all tables
        all_tables = inspector.get_table_names()
        print(f"📋 All tables in database ({len(all_tables)}):")
        for table in sorted(all_tables):
            print(f"   - {table}")
        print()
        
        # Required tables for Founder Connect
        required_tables = {
            "users": ["monthly_connections_used"],
            "founder_profiles": ["id", "user_id", "full_name", "bio", "is_public", "is_active"],
            "idea_listings": ["id", "founder_profile_id", "title", "source_type", "source_id", "is_active"],
            "connection_requests": ["id", "sender_id", "recipient_id", "status", "idea_listing_id"],
            "connection_credit_ledger": ["id", "user_id", "connection_request_id", "action", "credits_before", "credits_after"],
        }
        
        issues = []
        missing_tables = []
        
        # Check each required table
        for table_name, required_columns in required_tables.items():
            print("=" * 80)
            print(f"🔍 Inspecting table: {table_name}")
            print("=" * 80)
            
            if table_name not in all_tables:
                print(f"❌ TABLE MISSING: {table_name}")
                missing_tables.append(table_name)
                print()
                continue
            
            # Get all columns for this table
            columns = inspector.get_columns(table_name)
            column_names = [col["name"] for col in columns]
            
            print(f"✅ Table exists")
            print(f"   Columns ({len(column_names)}):")
            
            # Check each required column
            missing_columns = []
            for req_col in required_columns:
                if req_col in column_names:
                    # Get column details
                    col_info = next(c for c in columns if c["name"] == req_col)
                    col_type = str(col_info["type"])
                    nullable = "NULL" if col_info["nullable"] else "NOT NULL"
                    default = f" DEFAULT {col_info['default']}" if col_info.get("default") is not None else ""
                    print(f"   ✅ {req_col}: {col_type} {nullable}{default}")
                else:
                    print(f"   ❌ {req_col}: MISSING")
                    missing_columns.append(req_col)
            
            # Show all columns (including optional ones)
            optional_columns = [c for c in column_names if c not in required_columns]
            if optional_columns:
                print(f"   Additional columns ({len(optional_columns)}):")
                for opt_col in sorted(optional_columns):
                    col_info = next(c for c in columns if c["name"] == opt_col)
                    col_type = str(col_info["type"])
                    nullable = "NULL" if col_info["nullable"] else "NOT NULL"
                    default = f" DEFAULT {col_info['default']}" if col_info.get("default") is not None else ""
                    print(f"   • {opt_col}: {col_type} {nullable}{default}")
            
            if missing_columns:
                issues.append({
                    "table": table_name,
                    "missing_columns": missing_columns
                })
            
            # Check primary key
            pk_constraint = inspector.get_pk_constraint(table_name)
            if pk_constraint and pk_constraint.get("constrained_columns"):
                print(f"   Primary Key: {', '.join(pk_constraint['constrained_columns'])}")
            else:
                print(f"   ⚠️  WARNING: No primary key found")
                issues.append({
                    "table": table_name,
                    "issue": "Missing primary key"
                })
            
            # Check foreign keys
            fks = inspector.get_foreign_keys(table_name)
            if fks:
                print(f"   Foreign Keys ({len(fks)}):")
                for fk in fks:
                    print(f"      {fk['constrained_columns']} → {fk['referred_table']}.{fk['referred_columns']}")
            
            print()
        
        # Summary and recommendations
        print("=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)
        print()
        
        if missing_tables:
            print(f"❌ Missing tables ({len(missing_tables)}):")
            for table in missing_tables:
                print(f"   - {table}")
            print()
            print("💡 Solution: Run db.create_all() or the migration script")
            print()
        
        if issues:
            print(f"⚠️  Issues found ({len(issues)}):")
            for issue in issues:
                if "missing_columns" in issue:
                    print(f"   Table '{issue['table']}' missing columns: {', '.join(issue['missing_columns'])}")
                elif "issue" in issue:
                    print(f"   Table '{issue['table']}': {issue['issue']}")
            print()
        
        # Generate SQL for missing monthly_connections_used
        if "users" in all_tables:
            users_columns = [col["name"] for col in inspector.get_columns("users")]
            if "monthly_connections_used" not in users_columns:
                print("=" * 80)
                print("🔧 SQL TO ADD MISSING COLUMN")
                print("=" * 80)
                print()
                print("The 'monthly_connections_used' column is missing from 'users' table.")
                print()
                print("Run this SQL statement:")
                print()
                
                # Detect database engine
                db_url = str(db.engine.url)
                if "postgresql" in db_url.lower():
                    print("-- PostgreSQL")
                    print("ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;")
                elif "sqlite" in db_url.lower():
                    print("-- SQLite")
                    print("-- Note: SQLite has limited ALTER TABLE support")
                    print("-- You may need to recreate the table or use a migration tool")
                    print("ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;")
                elif "mysql" in db_url.lower():
                    print("-- MySQL/MariaDB")
                    print("ALTER TABLE users ADD COLUMN monthly_connections_used INT DEFAULT 0;")
                else:
                    print("-- Generic SQL (adjust for your database)")
                    print("ALTER TABLE users ADD COLUMN monthly_connections_used INTEGER DEFAULT 0;")
                print()
        
        if not missing_tables and not issues:
            if "users" in all_tables:
                users_columns = [col["name"] for col in inspector.get_columns("users")]
                if "monthly_connections_used" in users_columns:
                    print("✅ All Founder Connect tables and columns are present!")
                    print()
                    print("Schema is correct and ready to use.")
                else:
                    print("✅ All Founder Connect tables exist!")
                    print("⚠️  Only missing: monthly_connections_used column on users table")
                    print("   (See SQL statement above)")
            else:
                print("✅ All Founder Connect tables exist!")
        else:
            print("⚠️  Some issues need to be resolved before using Founder Connect.")
        
        print()
        print("=" * 80)

if __name__ == "__main__":
    try:
        inspect_schema()
    except Exception as e:
        print(f"❌ Error inspecting schema: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

