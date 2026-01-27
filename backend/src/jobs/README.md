# Background Jobs

This directory contains background jobs for the Customise You platform.

## Available Jobs

### 1. Expire Orders Job

Automatically expires pending ONLINE orders that haven't been paid within the TTL period (default: 30 minutes).

**Features:**
- Finds pending orders older than specified time
- Marks them as 'expired'
- Restores product inventory
- Updates order items status

**Usage:**

```bash
# Build the TypeScript first
npm run build

# Run with default 30 minutes TTL
node dist/jobs/expireOrders.js

# Run with custom TTL (e.g., 15 minutes)
node dist/jobs/expireOrders.js 15
```

## Setting Up Cron Jobs

### Linux/macOS

Edit crontab:
```bash
crontab -e
```

Add this line to run every 5 minutes:
```
*/5 * * * * cd /path/to/backend && node dist/jobs/expireOrders.js 30 >> logs/expiry-job.log 2>&1
```

### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Every 5 minutes
4. Action: Start a program
   - Program: `node`
   - Arguments: `dist/jobs/expireOrders.js 30`
   - Start in: `C:\path\to\backend`

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start the cron job
pm2 start ecosystem.config.js

# View logs
pm2 logs expiry-job

# Monitor
pm2 monit
```

Create `ecosystem.config.js` in backend root:

```javascript
module.exports = {
  apps: [
    {
      name: 'customise-you-api',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'expiry-job',
      script: 'dist/jobs/expireOrders.js',
      args: '30',
      cron_restart: '*/5 * * * *', // Every 5 minutes
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## Alternative: API Endpoint

You can also trigger expiry manually via API (admin only):

```bash
POST /api/v1/orders/expire
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "expiryMinutes": 30
}
```

## Monitoring

Monitor job execution:
- Check logs in `logs/expiry-job.log`
- Monitor database for expired orders: `SELECT COUNT(*) FROM orders WHERE status = 'expired'`
- Set up alerts for failed job executions

## Configuration

**Expiry TTL:**
- Development: 30 minutes (for testing)
- Production: 30 minutes (recommended)
- Can be adjusted via environment variable or job parameter

**Frequency:**
- Recommended: Every 5 minutes
- Can be increased/decreased based on order volume
- Avoid running too frequently to reduce DB load

## Notes

- Job uses transactions to ensure data consistency
- Inventory restoration is atomic
- Failed jobs will rollback changes
- Multiple concurrent runs are safe (idempotent)
