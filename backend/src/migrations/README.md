# Database Migrations

This directory contains SQL migration files for the CustomiseYou database schema.

## Overview

The migration system uses numbered SQL files that are executed in order to build the complete database schema. Each migration is tracked in the `migrations` table to prevent duplicate execution.

## Migration Files

| # | File | Description |
|---|------|-------------|
| 001 | `001_create_users_table.sql` | User accounts and authentication |
| 002 | `002_create_sellers_table.sql` | Seller/vendor accounts |
| 003 | `003_create_categories_table.sql` | Product categories (hierarchical) |
| 004 | `004_create_products_table.sql` | Product listings |
| 005 | `005_create_customizations_table.sql` | Product customization options |
| 006 | `006_create_addresses_table.sql` | User shipping/billing addresses |
| 007 | `007_create_orders_table.sql` | Customer orders |
| 008 | `008_create_order_items_table.sql` | Order line items |
| 009 | `009_create_order_customizations_table.sql` | Customer customization choices |
| 010 | `010_create_reviews_table.sql` | Product reviews and ratings |
| 011 | `011_create_messages_table.sql` | User-to-user messaging |
| 012 | `012_create_transactions_table.sql` | Payment transactions |
| 013 | `013_create_payouts_table.sql` | Seller payouts |
| 014 | `014_create_wishlist_items_table.sql` | User wishlists |
| 015 | `015_create_cart_items_table.sql` | Shopping cart |
| 016 | `016_create_notifications_table.sql` | User notifications |
| 017 | `017_create_migrations_table.sql` | Migration tracking |

## Database Schema

### Tables Created: 17
- **users** - Customer accounts
- **sellers** - Vendor accounts  
- **categories** - Product categories (hierarchical tree)
- **products** - Product catalog
- **customizations** - Product customization options
- **addresses** - User addresses
- **orders** - Customer orders
- **order_items** - Order line items
- **order_customizations** - User customization selections
- **reviews** - Product reviews
- **messages** - Chat messages
- **transactions** - Payment records
- **payouts** - Seller payment records
- **wishlist_items** - User wishlists
- **cart_items** - Shopping carts
- **notifications** - User notifications
- **migrations** - Migration tracking table

### ENUM Types Created: 12
- `user_status` - active, suspended, deleted
- `kyc_status` - pending, verified, rejected, expired
- `seller_status` - active, suspended, inactive, deleted, pending
- `product_status` - draft, active, archived, deleted
- `customization_type` - text, color, size, image, material, notes, custom
- `address_type` - shipping, billing, both
- `order_status` - pending, confirmed, processing, shipped, delivered, cancelled, refunded
- `payment_status` - pending, completed, failed, refunded
- `order_item_status` - pending, processing, shipped, delivered, cancelled
- `review_status` - pending, approved, rejected
- `transaction_payment_status` - pending, completed, failed, refunded
- `refund_status` - none, partial, full
- `payout_status` - pending, scheduled, processing, completed, failed, cancelled

## Prerequisites

1. **PostgreSQL 13+** installed and running
2. **Database created**: `customiseyou`
3. **Environment variables configured** (see `.env.example`)

```bash
# Create database
createdb customiseyou

# Or using psql
psql -U postgres -c "CREATE DATABASE customiseyou;"
```

## Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=customiseyou
DB_USER=postgres
DB_PASSWORD=your_password
```

## Running Migrations

### Check Migration Status
```bash
npm run migrate:status
```

Shows which migrations have been executed and which are pending.

### Run All Pending Migrations
```bash
npm run migrate
# or
npm run migrate:up
```

This will:
1. Create the migrations tracking table (if needed)
2. Execute all pending migrations in order
3. Record each successful migration
4. Use transactions to ensure atomicity

### Rollback Last Migration
```bash
npm run migrate:down
```

⚠️ **Warning**: This only removes the migration record. You need to manually drop the tables.

### Reset Database (DANGEROUS)
```bash
npm run migrate:reset
```

⚠️ **DANGER**: This will DROP ALL TABLES and data. Use only in development!

## Migration Script Details

The migration runner ([`src/migrate.ts`](../src/migrate.ts)) provides:

- ✅ **Transaction Safety** - Each migration runs in a transaction
- ✅ **Tracking** - Prevents duplicate execution
- ✅ **Ordered Execution** - Files run in numerical order
- ✅ **Error Handling** - Rollback on failure
- ✅ **Status Reporting** - See what's executed/pending

## Manual Migration

If you prefer to run migrations manually:

```bash
# Connect to database
psql -U postgres -d customiseyou

# Run a specific migration
\i backend/src/migrations/001_create_users_table.sql
```

## Troubleshooting

### Migration Fails

1. Check PostgreSQL logs for detailed errors
2. Verify database exists and is accessible
3. Check environment variables are correct
4. Ensure previous migrations completed successfully

```bash
# View recent migrations
psql -U postgres -d customiseyou -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
```

### Reset and Retry

```bash
# Drop all tables
npm run migrate:reset

# Run migrations again
npm run migrate
```

### Connection Issues

```bash
# Test database connection
psql -U postgres -d customiseyou -c "SELECT version();"
```

## Adding New Migrations

1. Create a new file with the next number: `018_your_migration_name.sql`
2. Add your SQL (CREATE TABLE, ALTER TABLE, etc.)
3. Run `npm run migrate` to execute

**Naming Convention**: `{number}_{description}.sql`
- Number: 3 digits, zero-padded (001, 002, etc.)
- Description: lowercase, underscores

## Best Practices

✅ **DO**:
- Use transactions (handled automatically)
- Create indexes for foreign keys
- Add comments to complex migrations
- Test migrations on development database first

❌ **DON'T**:
- Modify existing migration files after they're executed
- Skip migration numbers
- Run migrations directly in production without testing

## Database Relationships

```
users (1) ─── (M) sellers
         └─── (M) orders
         └─── (M) reviews
         └─── (M) addresses

sellers (1) ─── (M) products
         └─── (M) orders

products (1) ─── (M) customizations
          └─── (M) order_items
          └─── (M) reviews

orders (1) ─── (M) order_items
        └─── (1) transactions

order_items (1) ─── (M) order_customizations
```

## Next Steps

After running migrations:

1. ✅ Verify tables created: `\dt` in psql
2. ✅ Check indexes: `\di` in psql
3. ✅ Seed initial data (categories, admin users)
4. ✅ Run backend server: `npm run dev`
5. ✅ Test API endpoints

## Support

For issues or questions:
- Check PostgreSQL logs
- Review migration file SQL
- See [DATABASE.md](../../documentation/DATABASE.md) for schema details
