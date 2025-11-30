# How to Access Database and View/Delete Records

This guide shows you **exactly** how to access your PostgreSQL database and manage records.

## Quick Start: View Database

### Method 1: Using the Python Script (Easiest)

```bash
# Navigate to project directory
cd c:\outsideonedrive\projects\idea

# List all tables and row counts
python view_db_tables.py

# View data from a specific table (shows first 10 rows)
python view_db_tables.py user_validations

# View more rows
python view_db_tables.py user_validations 20
python view_db_tables.py users 50
```

---

## Method 2: Using Docker + PostgreSQL CLI (psql)

### Step 1: Connect to PostgreSQL

```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor
```

This will open a PostgreSQL prompt that looks like:
```
postgres=#
```

### Step 2: Run SQL Commands

Once connected, you can run SQL commands:

#### View Tables
```sql
-- List all tables
\dt

-- Get detailed table info
\d user_validations
\d users
```

#### View Data
```sql
-- Count rows in a table
SELECT COUNT(*) FROM user_validations;

-- View all columns from a table (first 10 rows)
SELECT * FROM user_validations LIMIT 10;

-- View specific columns
SELECT id, validation_id, user_id, created_at FROM user_validations LIMIT 10;

-- View all validations for a specific user
SELECT * FROM user_validations WHERE user_id = 1;
```

#### Delete Records
```sql
-- Delete ALL validations (CAREFUL!)
DELETE FROM user_validations;

-- Delete validations for a specific user
DELETE FROM user_validations WHERE user_id = 1;

-- Delete a specific validation
DELETE FROM user_validations WHERE validation_id = 'val_1234567890';

-- Delete related actions for validations
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';

-- Delete related notes for validations
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';
```

#### Exit psql
```sql
\q
```

---

## Method 3: Run SQL Commands Directly (One-Liner)

You can run SQL commands without entering the interactive prompt:

```bash
# View table structure
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "\d user_validations"

# Count rows
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "SELECT COUNT(*) FROM user_validations;"

# View data (first 5 rows)
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "SELECT * FROM user_validations LIMIT 5;"

# Delete all validations
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "DELETE FROM user_validations;"
```

---

## Common Tasks

### Task 1: View All Validations

**Option A - Using Python script:**
```bash
python view_db_tables.py user_validations 50
```

**Option B - Using Docker:**
```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "SELECT id, validation_id, user_id, created_at FROM user_validations ORDER BY created_at DESC;"
```

### Task 2: Delete All Validations

**Option A - Using Python script:**
```python
# Create a file: delete_validations.py
from app import create_app
from app.models.database import db

app = create_app()
with app.app_context():
    db.session.execute(db.text("DELETE FROM user_validations"))
    db.session.commit()
    print("Deleted all validations")
```

Run it:
```bash
python delete_validations.py
```

**Option B - Using Docker:**
```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "DELETE FROM user_validations;"
```

### Task 3: View All Users

```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "SELECT id, email, subscription_type, created_at FROM users;"
```

### Task 4: View User Runs

```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "SELECT run_id, user_id, created_at FROM user_runs ORDER BY created_at DESC LIMIT 10;"
```

### Task 5: Complete Cleanup (Validations + Related Data)

```bash
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';
DELETE FROM user_validations;
SELECT 'Cleanup complete' AS status;
"
```

---

## Useful PostgreSQL Commands Reference

### Navigation & Help
- `\?` - Show help for psql commands
- `\h` - Show help for SQL commands
- `\q` - Quit psql

### Table Operations
- `\dt` - List all tables
- `\d table_name` - Describe table structure
- `\d+ table_name` - Detailed table info

### Database Info
- `\l` - List all databases
- `\c database_name` - Connect to a database
- `\du` - List all users

### Query Formatting
- `\x` - Toggle expanded display (useful for wide tables)
- `\timing` - Toggle query timing
- `\set AUTOCOMMIT off` - Disable auto-commit (for transactions)

---

## Database Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: startup_idea_advisor
- **Username**: postgres
- **Password**: devpassword
- **Docker Container**: postgres-dev

### Connection String
```
postgresql://postgres:devpassword@localhost:5432/startup_idea_advisor
```

---

## Troubleshooting

### Docker Container Not Running
```bash
# Check if container is running
docker ps | grep postgres-dev

# If not running, start it
docker-compose up -d postgres
```

### Can't Connect to Database
```bash
# Check container logs
docker logs postgres-dev

# Restart container
docker restart postgres-dev
```

### Permission Denied
Make sure you're using the correct username (`postgres`) and database name (`startup_idea_advisor`).

---

## Example: Complete Workflow to Delete All Validations

```bash
# 1. First, check what we have
python view_db_tables.py user_validations

# 2. Connect to database
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor

# 3. View current data (optional)
SELECT COUNT(*) FROM user_validations;

# 4. Delete validations
DELETE FROM user_validations;

# 5. Delete related data (optional)
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';

# 6. Verify deletion
SELECT COUNT(*) FROM user_validations;

# 7. Exit
\q

# 8. Verify via Python script
python view_db_tables.py user_validations
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| View all tables | `python view_db_tables.py` |
| View table data | `python view_db_tables.py <table_name>` |
| Connect to DB | `docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor` |
| List tables | `\dt` |
| View table structure | `\d <table_name>` |
| View data | `SELECT * FROM <table_name> LIMIT 10;` |
| Count rows | `SELECT COUNT(*) FROM <table_name>;` |
| Delete all | `DELETE FROM <table_name>;` |
| Exit | `\q` |

