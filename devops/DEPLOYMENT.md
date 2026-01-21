# DevOps & Deployment Configuration

## 🚀 Deployment Architecture

CustomiseYou is designed for cloud-native deployment on Kubernetes with multi-region support.

---

## 📦 Docker Configuration

### Docker Compose (Local Development)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: customiseyou-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: customiseyou-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: customiseyou-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      RAZORPAY_KEY: ${RAZORPAY_KEY}
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  # Web App (Next.js)
  web:
    build:
      context: ./web-app
      dockerfile: Dockerfile
    container_name: customiseyou-web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api/v1
      NEXT_PUBLIC_WS_URL: ws://localhost:3000
    ports:
      - "3001:3000"
    depends_on:
      - backend
    volumes:
      - ./web-app:/app
      - /app/node_modules

  # Admin Dashboard
  admin:
    build:
      context: ./admin-dashboard
      dockerfile: Dockerfile
    container_name: customiseyou-admin
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api/v1
    ports:
      - "3002:3000"
    depends_on:
      - backend
    volumes:
      - ./admin-dashboard:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: customiseyou-network
```

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

CMD ["npm", "start"]
```

---

## ☸️ Kubernetes Configuration

### Namespace & ConfigMap

```yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: customiseyou

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: customiseyou-config
  namespace: customiseyou
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://customiseyou.com,https://admin.customiseyou.com,https://seller.customiseyou.com"
  STRIPE_PUBLIC_KEY: ${STRIPE_PUBLIC_KEY}
  RAZORPAY_KEY: ${RAZORPAY_KEY}
  PAYPAL_MODE: "live"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "customiseyou"
```

### Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: customiseyou-secrets
  namespace: customiseyou
type: Opaque
stringData:
  DB_USER: ${DB_USER}
  DB_PASSWORD: ${DB_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
  JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
  RAZORPAY_SECRET: ${RAZORPAY_SECRET}
  PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}
  PAYPAL_SECRET: ${PAYPAL_SECRET}
  SENDGRID_API_KEY: ${SENDGRID_API_KEY}
  TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
  AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
  AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
```

### PostgreSQL StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: customiseyou
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: DB_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: DB_PASSWORD
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: DB_NAME
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "$(POSTGRES_USER)"]
          initialDelaySeconds: 30
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: customiseyou
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### Redis Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: customiseyou
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: redis-storage
          mountPath: /data
      volumes:
      - name: redis-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: customiseyou
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: customiseyou
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: backend
        image: customiseyou/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: NODE_ENV
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: DB_HOST
        - name: DB_PORT
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: DB_PORT
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: DB_NAME
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: JWT_SECRET
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: customiseyou-config
              key: REDIS_HOST
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: customiseyou-secrets
              key: STRIPE_SECRET_KEY
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: customiseyou
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
    name: http
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: customiseyou
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: customiseyou-ingress
  namespace: customiseyou
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.customiseyou.com
    - customiseyou.com
    - admin.customiseyou.com
    - seller.customiseyou.com
    secretName: customiseyou-tls
  rules:
  - host: api.customiseyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3000
  - host: customiseyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 3000
  - host: admin.customiseyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 3000
  - host: seller.customiseyou.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: seller-service
            port:
              number: 3000
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

### Deploy Workflow

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: |
        cd backend
        npm ci

    - name: Run linter
      run: |
        cd backend
        npm run lint

    - name: Run tests
      run: |
        cd backend
        npm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: ${{ secrets.DOCKER_USERNAME }}/customiseyou-backend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

    - name: Build and push Web App
      uses: docker/build-push-action@v4
      with:
        context: ./web-app
        push: true
        tags: ${{ secrets.DOCKER_USERNAME }}/customiseyou-web:${{ github.sha }}

    - name: Build and push Admin Dashboard
      uses: docker/build-push-action@v4
      with:
        context: ./admin-dashboard
        push: true
        tags: ${{ secrets.DOCKER_USERNAME }}/customiseyou-admin:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config

    - name: Update Kubernetes deployment images
      run: |
        kubectl set image deployment/backend backend=${{ secrets.DOCKER_USERNAME }}/customiseyou-backend:${{ github.sha }} -n customiseyou
        kubectl set image deployment/web web=${{ secrets.DOCKER_USERNAME }}/customiseyou-web:${{ github.sha }} -n customiseyou
        kubectl set image deployment/admin admin=${{ secrets.DOCKER_USERNAME }}/customiseyou-admin:${{ github.sha }} -n customiseyou

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/backend -n customiseyou
        kubectl rollout status deployment/web -n customiseyou
        kubectl rollout status deployment/admin -n customiseyou

    - name: Verify deployment
      run: |
        kubectl get pods -n customiseyou
        kubectl get svc -n customiseyou
```

---

## 📊 Monitoring & Logging

### Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3000']
```

### ELK Stack Setup

**Elasticsearch**: Centralized log storage
**Logstash**: Log parsing and enrichment
**Kibana**: Log visualization

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: customiseyou
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      enabled: true
      paths:
        - '/var/lib/docker/containers/*/*.log'
    
    processors:
      - add_kubernetes_metadata:
          in_cluster: true
    
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
      index: "customiseyou-%{+yyyy.MM.dd}"
```

---

## 🔒 Security

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: customiseyou-network-policy
  namespace: customiseyou
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    - podSelector:
        matchLabels:
          app: backend
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
```

---

## 📈 Scaling Strategy

### Cluster Autoscaler

Auto-scales Kubernetes cluster nodes based on pod requirements.

```bash
helm install cluster-autoscaler autoscaling/cluster-autoscaler \
  --set autoDiscovery.clusterName=customiseyou-cluster \
  --set awsRegion=us-east-1
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: customiseyou-quota
  namespace: customiseyou
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
    limits.cpu: "100"
    limits.memory: "200Gi"
```

---

## 🔄 Backup & Disaster Recovery

### PostgreSQL Backups

```bash
#!/bin/bash
# Backup script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/backup_$TIMESTAMP.sql" s3://customiseyou-backups/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

### Disaster Recovery Plan

1. **RTO**: 1 hour
2. **RPO**: 15 minutes
3. **Backup Frequency**: Every 6 hours
4. **Backup Location**: AWS S3 (cross-region)

---

## 📚 Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Database migrations completed
- [ ] Redis cluster operational
- [ ] Load balancer configured
- [ ] CDN configured
- [ ] Monitoring and alerting active
- [ ] Logging aggregated and searchable
- [ ] Auto-scaling policies defined
- [ ] Backup and recovery tested
- [ ] Security policies applied
- [ ] DNS records updated

---

**Version**: 1.0.0  
**Last Updated**: January 2026
