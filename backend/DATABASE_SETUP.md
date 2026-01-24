# Database Setup Guide

Complete guide to setting up the CustomiseYou PostgreSQL database from scratch.

## Quick Start

```bash
# 1. Create database
createdb customiseyou

# 2. Copy environment file
cd backend
cp .env.example .env

# 3. Edit .env with your database credentials
# (Update DB_PASSWORD at minimum)

# 4. Run migrations
npm run migrate

# 5. Verify setup
npm run migrate:status
```

## Detailed Setup

### 1. Install PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

**Option A: Using createdb command**
```bash
createdb -U postgres customiseyou
```

**Option B: Using psql**
```bash
psql -U postgres
```
```sql
CREATE DATABASE customiseyou;
\q
```

**Option C: Using pgAdmin**
1. Open pgAdmin
2. Right-click "Databases"
3. Create → Database
4. Name: `customiseyou`
5. Save

### 3. Configure Environment

Create `.env` file in `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=customiseyou
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Redis (for later)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (generate strong keys!)
JWT_SECRET=replace_with_random_64_char_string
JWT_REFRESH_SECRET=replace_with_different_random_64_char_string

# Server
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

**Generate Strong Secrets:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or online
# https://randomkeygen.com/
```

### 4. Run Migrations

```bash
cd backend

# Check status first (optional)
npm run migrate:status

# Run all migrations
npm run migrate
```

**Expected Output:**
```
🚀 Starting database migrations...

✓ Migrations tracking table ready
Found 17 pending migration(s):

  - 001_create_users_table.sql
  - 002_create_sellers_table.sql
  - 003_create_categories_table.sql
  ...

🔄 Running: 001_create_users_table.sql
✓ Completed: 001_create_users_table.sql

🔄 Running: 002_create_sellers_table.sql
✓ Completed: 002_create_sellers_table.sql

...

✅ Successfully executed 17 migration(s)!
```

### 5. Verify Database Schema

**Using psql:**
```bash
psql -U postgres -d customiseyou
```

```sql
-- List all tables
\dt

-- Should show:
-- addresses, cart_items, categories, customizations,
-- messages, migrations, notifications, order_customizations,
-- order_items, orders, payouts, products, reviews,
-- sellers, transactions, users, wishlist_items

-- Check specific table structure
\d users

-- List all indexes
\di

-- List all ENUM types
\dT

-- Count migrations executed
SELECT COUNT(*) FROM migrations;
-- Should return: 17

-- Exit
\q
```

**Using pgAdmin:**
1. Open pgAdmin
2. Navigate to: Servers → PostgreSQL → Databases → customiseyou
3. Expand "Schemas" → "public" → "Tables"
4. Should see 17 tables

### 6. Verify Migration Status

```bash
npm run migrate:status
```

**Expected Output:**
```
📊 Migration Status:

======================================================================
Status      Migration
======================================================================
✓ Executed  001_create_users_table.sql
✓ Executed  002_create_sellers_table.sql
✓ Executed  003_create_categories_table.sql
...
✓ Executed  017_create_migrations_table.sql
======================================================================

Total: 17 | Executed: 17 | Pending: 0
```

## Testing the Database

### Insert Test Data

```sql
-- Connect to database
psql -U postgres -d customiseyou

-- Insert test user
INSERT INTO users (email, first_name, last_name, password_hash, status)
VALUES ('test@example.com', 'John', 'Doe', 'hashed_password_here', 'active');

-- Verify
SELECT id, email, first_name, created_at FROM users;

-- Insert test category
INSERT INTO categories (name, slug, is_active)
VALUES ('Electronics', 'electronics', true);

-- Verify
SELECT id, name, slug FROM categories;
```

### Run Backend Server

```bash
# Start development server
npm run dev

# Should see:
# ✅ Database connected successfully!
# ✅ Redis connected successfully!
# 🚀 Server running on port 3000
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get categories (should be empty unless you seeded data)
curl http://localhost:3000/api/v1/products/categories
```

## Troubleshooting

### Connection Refused

**Problem:** `ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service -Name postgresql*

# macOS:
brew services list

# Linux:
sudo systemctl status postgresql

# Start if not running
# Windows: Start service from Services app
# macOS: brew services start postgresql@15
# Linux: sudo systemctl start postgresql
```

### Authentication Failed

**Problem:** `password authentication failed for user "postgres"`

**Solution:**
1. Check `.env` file has correct password
2. Reset postgres password:
```bash
# Linux/macOS
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q

# Windows (run psql as Administrator)
ALTER USER postgres PASSWORD 'new_password';
```

### Database Does Not Exist

**Problem:** `database "customiseyou" does not exist`

**Solution:**
```bash
createdb -U postgres customiseyou
```

### Migration Already Executed

**Problem:** Migration fails with "already exists" error

**Solution:**
```bash
# Check migration status
npm run migrate:status

# If stuck, reset (⚠️ DELETES ALL DATA)
npm run migrate:reset

# Then run again
npm run migrate
```

### Permission Denied

**Problem:** `permission denied to create database`

**Solution:**
```sql
-- Grant permissions
psql -U postgres
ALTER USER postgres CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE customiseyou TO postgres;
\q
```

## Reset Database

⚠️ **WARNING: This deletes ALL data!**

```bash
# Option 1: Using migration script (keeps database, drops tables)
npm run migrate:reset
npm run migrate

# Option 2: Drop and recreate database
dropdb -U postgres customiseyou
createdb -U postgres customiseyou
npm run migrate
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Enable SSL/TLS for PostgreSQL connections
- [ ] Restrict database access to application server only
- [ ] Use environment-specific credentials
- [ ] Enable database backups
- [ ] Set up connection pooling
- [ ] Monitor database performance

### Production Migration

```bash
# 1. Backup existing database
pg_dump -U postgres customiseyou > backup_$(date +%Y%m%d).sql

# 2. Test migrations on staging
npm run migrate:status  # Check current state
npm run migrate         # Run new migrations

# 3. Verify
npm run migrate:status

# 4. If issues, restore backup
psql -U postgres customiseyou < backup_20260124.sql
```

## Database Maintenance

### Backup

```bash
# Full backup
pg_dump -U postgres customiseyou > customiseyou_backup.sql

# Compressed backup
pg_dump -U postgres customiseyou | gzip > customiseyou_backup.sql.gz

# Schema only
pg_dump -U postgres --schema-only customiseyou > schema.sql
```

### Restore

```bash
# From plain SQL
psql -U postgres customiseyou < customiseyou_backup.sql

# From compressed
gunzip -c customiseyou_backup.sql.gz | psql -U postgres customiseyou
```

### Monitoring

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('customiseyou'));

-- Table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;

-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'customiseyou';
```

## Next Steps

1. ✅ Database created and migrated
2. ⏳ Seed initial data (categories, admin users)
3. ⏳ Set up Redis for caching
4. ⏳ Configure Stripe for payments
5. ⏳ Test API endpoints
6. ⏳ Set up authentication

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DATABASE.md](../../documentation/DATABASE.md) - Schema details
- [API.md](../../documentation/API.md) - API endpoints
- [Migration README](./migrations/README.md) - Migration system details
