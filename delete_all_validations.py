#!/usr/bin/env python3
"""
Script to delete all validations from the database.
This performs a hard delete (permanently removes records).
"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from app.models.database import db, UserValidation
from sqlalchemy import delete

def delete_all_validations():
    """Delete all validations from the database."""
    # Create minimal Flask app for database context
    app = Flask(__name__)
    
    # Configure database from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ Error: DATABASE_URL environment variable not set")
        sys.exit(1)
    
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Initialize database
    db.init_app(app)
    
    with app.app_context():
        try:
            # Get count before deletion
            count = UserValidation.query.count()
            print(f"Found {count} validations in the database.")
            
            if count == 0:
                print("No validations to delete.")
                return
            
            # Confirm deletion
            response = input(f"Are you sure you want to delete ALL {count} validations? (yes/no): ")
            if response.lower() != 'yes':
                print("Deletion cancelled.")
                return
            
            # Delete all validations using SQLAlchemy 2.0 style
            deleted_count = db.session.execute(delete(UserValidation)).rowcount
            db.session.commit()
            
            print(f"✅ Successfully deleted {deleted_count} validations.")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error deleting validations: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    delete_all_validations()

