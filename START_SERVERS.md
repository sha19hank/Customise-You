# How to Start CustomiseYou Servers

## Quick Start (Every Time)

### Option 1: Using PowerShell (Recommended)

Open **two separate terminals** in VS Code:

#### Terminal 1 - Backend Server:
```powershell
cd "C:\Users\KIIT0001\Documents\Customise You\backend"
npm run dev
```

#### Terminal 2 - Frontend Server:
```powershell
cd "C:\Users\KIIT0001\Documents\Customise You\web-app"
$env:PORT=3001
npm run dev
```

### Option 2: Using Single Command (Background)

```powershell
# Start backend (background)
cd "C:\Users\KIIT0001\Documents\Customise You\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Start frontend (background)
cd "C:\Users\KIIT0001\Documents\Customise You\web-app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=3001; npm run dev"
```

---

## What's Running?

- **Backend**: http://localhost:3000
  - API endpoints: http://localhost:3000/api/v1/*
  - Using in-memory cache (Redis optional mode)
  
- **Frontend**: http://localhost:3001
  - Next.js web application
  - Login/Register pages ready

---

## Issues Fixed

### ✅ Redis Connection Error (ECONNREFUSED)
**Problem**: Backend couldn't connect to Redis server

**Solution**: Added `REDIS_OPTIONAL=true` in [backend/.env](backend/.env)
- Backend now uses in-memory cache instead of Redis
- No need to run Redis server for development
- To use real Redis later: Remove or set `REDIS_OPTIONAL=false` and run Docker Compose

### ✅ npm install Error (next-image-export-optimizer)
**Problem**: Package version `^0.18.1` doesn't exist

**Solution**: Removed the package from [web-app/package.json](web-app/package.json)
- This was an optional optimization package
- Not needed for core functionality

---

## First Time Setup (Already Done)

These steps were already completed:

1. ✅ Fixed [web-app/package.json](web-app/package.json) - removed invalid package
2. ✅ Created [backend/.env](backend/.env) with `REDIS_OPTIONAL=true`
3. ✅ Installed dependencies: `npm install` in both folders
4. ✅ Started both servers

---

## Running Without These Issues

The fixes are permanent. You can now:

1. **Start backend** → It will use in-memory cache (no Redis needed)
2. **Start frontend** → All dependencies are valid
3. **No errors** → Both servers start cleanly

---

## Optional: Using Docker for Redis

If you want to use real Redis instead of in-memory cache:

```powershell
# In backend folder
docker-compose up -d redis

# Then edit backend/.env
# Set: REDIS_OPTIONAL=false
# Or remove the line entirely

# Restart backend
npm run dev
```

---

## Stopping Servers

Press **Ctrl+C** in each terminal to stop the servers.

Or use Task Manager to kill Node.js processes if needed.

---

## Troubleshooting

### Port Already in Use
If you see "Port 3000 is in use":
```powershell
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### Database Connection Error
Make sure PostgreSQL is running:
```powershell
# Check if PostgreSQL is running
Get-Service -Name postgresql*

# Or use Docker
cd backend
docker-compose up -d postgres
```

---

## Environment Variables

Key variables in [backend/.env](backend/.env):

- `REDIS_OPTIONAL=true` - Use in-memory cache (no Redis needed)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT=3000` - Backend port
- `JWT_ACCESS_SECRET` - JWT signing secret

Key variables in [web-app/.env.local](web-app/.env.local):

- `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` - Backend API URL
