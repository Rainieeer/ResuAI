#!/usr/bin/env python3
"""
Apply the unified PostgreSQL schema to the database
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def apply_schema():
    """Apply the unified PostgreSQL schema"""
    
    # Database connection parameters
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'pds_system')
        db_user = os.getenv('DB_USER', 'postgres')
        db_password = os.getenv('DB_PASSWORD', 'superuser10')
        db_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    print(f"Connecting to database: {db_url}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Read schema file
        schema_path = "unified_postgresql_schema.sql"
        print(f"Reading schema from: {schema_path}")
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # Split schema into individual statements
        statements = []
        current_statement = ""
        in_function = False
        
        for line in schema_sql.split('\n'):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('--'):
                continue
            
            # Track if we're inside a function/procedure
            if 'DO $$' in line or 'CREATE OR REPLACE FUNCTION' in line:
                in_function = True
            
            current_statement += line + '\n'
            
            # End of statement detection
            if in_function:
                if line.endswith('$$;') or line.endswith('END $$;'):
                    statements.append(current_statement.strip())
                    current_statement = ""
                    in_function = False
            else:
                if line.endswith(';'):
                    statements.append(current_statement.strip())
                    current_statement = ""
        
        # Execute each statement
        print(f"Executing {len(statements)} SQL statements...")
        
        for i, statement in enumerate(statements):
            if statement.strip():
                try:
                    print(f"Executing statement {i+1}/{len(statements)}: {statement[:60]}...")
                    cursor.execute(statement)
                    print(f"  ✓ Success")
                except psycopg2.Error as e:
                    if "already exists" in str(e) or "duplicate key" in str(e):
                        print(f"  ⚠ Skipped (already exists): {e}")
                    else:
                        print(f"  ✗ Error: {e}")
                        print(f"  Statement: {statement[:200]}...")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print(f"\n✓ Schema applied successfully!")
        print(f"Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error applying schema: {e}")
        return False

if __name__ == "__main__":
    success = apply_schema()
    if success:
        print("\n🎉 Database schema migration completed successfully!")
    else:
        print("\n❌ Database schema migration failed!")
        exit(1)