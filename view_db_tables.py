#!/usr/bin/env python3
"""
Script to view database tables and their data.
"""
import sys
import os
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.database import db
from sqlalchemy import inspect, text

def view_tables():
    """List all tables and their row counts."""
    app = create_app()
    
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            print("\n" + "="*80)
            print("DATABASE TABLES")
            print("="*80)
            print(f"\nFound {len(tables)} tables:\n")
            
            for table_name in sorted(tables):
                try:
                    # Get row count
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = result.scalar()
                    
                    # Get column names
                    columns = inspector.get_columns(table_name)
                    col_names = [col['name'] for col in columns]
                    
                    print(f"[TABLE] {table_name}")
                    print(f"   Rows: {count}")
                    print(f"   Columns: {', '.join(col_names[:5])}{'...' if len(col_names) > 5 else ''}")
                    print()
                except Exception as e:
                    print(f"[ERROR] {table_name}: Error - {e}\n")
            
        except Exception as e:
            print(f"[ERROR] Error: {e}")
            import traceback
            traceback.print_exc()

def view_table_data(table_name, limit=10):
    """View data from a specific table."""
    app = create_app()
    
    with app.app_context():
        try:
            # Get column names first
            inspector = inspect(db.engine)
            columns = inspector.get_columns(table_name)
            col_names = [col['name'] for col in columns]
            
            # Query data
            query = text(f"SELECT * FROM {table_name} LIMIT {limit}")
            result = db.session.execute(query)
            rows = result.fetchall()
            
            print("\n" + "="*80)
            print(f"TABLE: {table_name} (showing {len(rows)} rows)")
            print("="*80)
            print()
            
            if not rows:
                print("No data found.\n")
                return
            
            # Print header
            print(" | ".join(f"{col:15}" for col in col_names[:8]))
            print("-" * 120)
            
            # Print rows
            for row in rows:
                values = []
                for i, val in enumerate(row[:8]):  # Show first 8 columns
                    if val is None:
                        val = "NULL"
                    elif isinstance(val, (dict, list)):
                        val = json.dumps(val)[:30] + "..."
                    else:
                        val = str(val)[:30]  # Truncate long values
                    values.append(f"{val:15}")
                print(" | ".join(values))
            
            # Show total count
            count_result = db.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            total = count_result.scalar()
            if total > limit:
                print(f"\n... ({total - limit} more rows)\n")
            
        except Exception as e:
            print(f"[ERROR] Error viewing table {table_name}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # View specific table
        table_name = sys.argv[1]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        view_table_data(table_name, limit)
    else:
        # List all tables
        view_tables()
        print("\n[TIP] To view data from a specific table, run:")
        print("   python view_db_tables.py <table_name> [limit]")
        print("\n   Example: python view_db_tables.py user_validations 20")

