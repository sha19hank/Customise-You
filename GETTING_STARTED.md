# Getting Started Guide - CustomiseYou Platform

## 🚀 Quick Start

This guide will help you set up and run the CustomiseYou platform locally and in production.

---

## 📋 Prerequisites

### System Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 50GB available
- **OS**: Ubuntu 20.04+, macOS 11+, or Windows 10+

### Required Software
- **Node.js**: 18.x LTS or higher
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+
- **PostgreSQL**: 13+ (if running locally)
- **Redis**: 6.0+ (if running locally)

### Development Tools
- **VS Code** (recommended editor)
- **Postman** or **Insomnia** (API testing)
- **DBeaver** (database management)
- **Flutter SDK** (for mobile app development)

---

## 🔧 Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/customiseyou/platform.git
cd CustomiseYou
```

### 2. Environment Configuration

Create `.env.local` files for each service:

**Backend (.env.local)**
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/customiseyou
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY=key_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG.xxxx...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1234567890
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx...
AWS_S3_BUCKET=customiseyou-dev
AWS_REGION=us-east-1
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:3001,http://localhost:3002
```

**Web App (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_OAUTH_ID=xxx.apps.googleusercontent.com
```

**Admin Dashboard (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN=admin.customiseyou.com
```

### 3. Start Services with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or start specific services
docker-compose up postgres redis backend

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

This will start:
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ Backend API (port 3000)
- ✅ Web App (port 3001)
- ✅ Admin Dashboard (port 3002)

### 4. Initialize Database

```bash
# Run migrations
cd backend
npm run migration:run

# Seed initial data
npm run db:seed
```

### 5. Verify Installation

```bash
# Test API
curl http://localhost:3000/health

# Access web app
open http://localhost:3001

# Access admin dashboard
open http://localhost:3002

# Database
psql postgresql://user:password@localhost:5432/customiseyou
```

---

## 📱 Mobile App Development

### Flutter Setup

```bash
# Install Flutter SDK
https://flutter.dev/docs/get-started/install

# Check Flutter installation
flutter doctor

# Create Flutter project from existing code
cd mobile-app
flutter pub get

# Run on emulator
flutter emulators --launch android_emulator
flutter run

# Run on physical device
flutter run -d device_id
```

### Firebase Setup (Mobile)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in mobile app
firebase init

# Set up Google Play Services (Android)
# Configure iOS signing certificates
```

---

## 🌐 Web App Development

### Next.js Development

```bash
cd web-app

# Install dependencies
npm install

# Start development server
npm run dev

# Access
open http://localhost:3001

# Build for production
npm run build
npm run start
```

### Environment Variables

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

---

## 🏗️ Backend Development

### API Development

```bash
cd backend

# Install dependencies
npm install

# Start development with hot reload
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

### Database Migrations

```bash
# Create new migration
npm run migration:generate -- CreateUsersTable

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm test -- --coverage
```

### API Testing with Postman

1. Import collection: `documentation/postman-collection.json`
2. Set environment variables
3. Run requests

---

## 📊 Database Management

### PostgreSQL Access

```bash
# Connect with psql
psql -U user -h localhost -d customiseyou

# Useful commands
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

### Redis CLI

```bash
# Connect
redis-cli -h localhost -p 6379

# Check status
PING

# View keys
KEYS *

# Clear database
FLUSHDB
```

---

## 🔍 Debugging

### Backend Debugging

```bash
# VS Code debug configuration (.vscode/launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/src/main.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

### Frontend Debugging

```bash
# Chrome DevTools
# Open browser DevTools (F12)
# Check Network, Console, Application tabs

# VS Code Debugger for Chrome
# Install extension: Debugger for Chrome
# Configure launch.json
```

---

## 🚀 Production Deployment

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f devops/k8s/namespace.yaml
kubectl apply -f devops/k8s/configmap.yaml
kubectl apply -f devops/k8s/secrets.yaml
kubectl apply -f devops/k8s/postgres.yaml
kubectl apply -f devops/k8s/redis.yaml
kubectl apply -f devops/k8s/backend.yaml
kubectl apply -f devops/k8s/ingress.yaml

# Verify deployment
kubectl get pods -n customiseyou
kubectl get services -n customiseyou
kubectl logs -f deployment/backend -n customiseyou
```

### AWS EC2 Deployment

```bash
# SSH into instance
ssh -i key.pem ubuntu@your-instance-ip

# Clone repository
git clone https://github.com/customiseyou/platform.git

# Install dependencies
sudo apt update && sudo apt install -y nodejs npm postgresql redis-server

# Start services
cd platform
npm install
npm run build
npm start
```

### Docker Image Build & Push

```bash
# Build image
docker build -t customiseyou/backend:1.0.0 ./backend

# Tag for registry
docker tag customiseyou/backend:1.0.0 your-registry/backend:1.0.0

# Push to registry
docker push your-registry/backend:1.0.0
```

---

## 📈 Monitoring & Logs

### View Logs

```bash
# Docker logs
docker-compose logs -f backend

# Kubernetes logs
kubectl logs -f deployment/backend -n customiseyou

# Application logs
tail -f logs/error.log
tail -f logs/combined.log
```

### Health Checks

```bash
# API health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/api/v1/admin/health/database

# Redis health
curl http://localhost:3000/api/v1/admin/health/redis
```

---

## 🔐 Security Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] API authentication verified
- [ ] CORS settings correct
- [ ] Security headers applied
- [ ] Logging configured
- [ ] Monitoring active
- [ ] Incident response plan ready
- [ ] Backup tested
- [ ] Security audit completed

---

## 📞 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Database Connection Error**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost

# Check credentials
psql -U user -h localhost -d customiseyou
```

**Redis Connection Error**
```bash
# Verify Redis is running
redis-cli ping

# Check Redis logs
docker logs customiseyou-redis
```

**Build Failures**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run build
```

---

## 📚 Documentation

Detailed documentation is available in:

- [API Reference](documentation/API.md)
- [Database Schema](documentation/DATABASE.md)
- [System Architecture](documentation/ARCHITECTURE.md)
- [Security Guidelines](documentation/SECURITY.md)
- [Deployment Guide](devops/DEPLOYMENT.md)
- [AI Systems](ai-systems/AI_SYSTEMS.md)

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Submit pull request
5. Wait for review and merge

---

## 📞 Support

For issues and questions:

- **GitHub Issues**: [Create an issue](https://github.com/customiseyou/platform/issues)
- **Email**: support@customiseyou.com
- **Slack**: [Join our community](https://customiseyou.slack.com)

---

## 📄 License

This project is licensed under the MIT License.

---

**Version**: 1.0.0  
**Last Updated**: January 2026
**Status**: Production Ready
