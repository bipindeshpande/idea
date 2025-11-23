"""
Migration script to add usage tracking fields to existing database.
Run this if login fails due to missing database columns.
"""
from app import create_app
from app.models.database import db
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    print("Current columns in users table:", columns)
    
    missing_columns = []
    
    if 'free_validations_used' not in columns:
        missing_columns.append('free_validations_used INTEGER DEFAULT 0')
    if 'free_discoveries_used' not in columns:
        missing_columns.append('free_discoveries_used INTEGER DEFAULT 0')
    if 'monthly_validations_used' not in columns:
        missing_columns.append('monthly_validations_used INTEGER DEFAULT 0')
    if 'monthly_discoveries_used' not in columns:
        missing_columns.append('monthly_discoveries_used INTEGER DEFAULT 0')
    if 'usage_reset_date' not in columns:
        missing_columns.append('usage_reset_date DATE')
    
    if missing_columns:
        print(f"\nAdding {len(missing_columns)} missing columns...")
        for col_def in missing_columns:
            col_name = col_def.split()[0]
            try:
                db.session.execute(text(f"ALTER TABLE users ADD COLUMN {col_def}"))
                db.session.commit()
                print(f"✓ Added column: {col_name}")
            except Exception as e:
                db.session.rollback()
                print(f"✗ Failed to add {col_name}: {e}")
        
        # Update subscription_type default for existing users
        try:
            db.session.execute(text("UPDATE users SET subscription_type = 'free' WHERE subscription_type = 'free_trial' OR subscription_type IS NULL"))
            db.session.commit()
            print("✓ Updated subscription_type defaults")
        except Exception as e:
            db.session.rollback()
            print(f"✗ Failed to update subscription_type: {e}")
        print("\nMigration complete!")
    else:
        print("\nAll columns already exist. No migration needed.")

