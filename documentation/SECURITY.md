# Security Guidelines & Best Practices

## 🔐 Security Architecture

CustomiseYou implements multi-layered security across all components.

---

## 1️⃣ Authentication & Authorization

### JWT Token Management

```javascript
// Token Structure
{
  "iss": "customiseyou",
  "sub": "user_id",
  "aud": "customiseyou-api",
  "exp": 1700000000,
  "iat": 1699996400,
  "role": "user|seller|admin",
  "permissions": ["read:products", "write:cart", "read:orders"]
}
```

**Token Lifecycle:**
- **Access Token**: 15 minutes validity
- **Refresh Token**: 30 days validity
- **Revocation**: Via blacklist (Redis)

### OAuth2 Integration

```
Supported Providers:
- Google OAuth
- Apple Sign-In
- Email/Phone OTP

Flow:
1. User initiates login with OAuth provider
2. Frontend redirects to provider
3. Provider returns authorization code
4. Backend exchanges code for token
5. Create/update user in database
6. Issue application JWT
```

### Role-Based Access Control (RBAC)

```
Roles:
├── user
│   ├── read:products
│   ├── write:cart
│   ├── create:order
│   ├── read:own_orders
│   └── read:messages
├── seller
│   ├── create:products
│   ├── update:own_products
│   ├── read:own_orders
│   ├── write:messages
│   └── read:payouts
└── admin
    ├── read:all_data
    ├── write:settings
    ├── manage:sellers
    ├── manage:disputes
    └── access:analytics

**Implementation Status:**
- JWT verification and role checks are enforced in `src/middleware/authMiddleware.ts`
- Protected routes use `requireAuth` + `requireRole`
```

---

## 2️⃣ Data Security

### Encryption Standards

**At Rest:**
```
Algorithm: AES-256-GCM
Key Storage: AWS Secrets Manager / HashiCorp Vault
Rotation: Every 90 days

Encrypted Fields:
- payment_card_tokens
- personal_identifiable_information (PII)
- bank_account_details
- api_keys
- refresh_tokens
```

**In Transit:**
```
Protocol: TLS 1.3+
Certificate: Let's Encrypt (auto-renew)
HSTS: max-age=31536000; includeSubDomains
```

### Password Security

```
Requirements:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- Cannot contain username or email
- Not in common password dictionary

Hashing:
- Algorithm: bcryptjs
- Salt Rounds: 12
- No plaintext storage
```

### PII Data Handling

```
Sensitive Fields:
- Email addresses
- Phone numbers
- Addresses
- Payment information
- KYC documents

Security Measures:
1. Encryption at rest
2. Minimal exposure in APIs
3. Never logged or cached
4. Access restricted to authorized personnel
5. Regular anonymization of old data
```

---

## 3️⃣ API Security

### Input Validation

**Implementation: Zod Schema Validation** ✅ (January 25, 2026)

```typescript
// Request validation using Zod schemas
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

// Example: Order creation validation
const createOrderBodySchema = z.object({
  userId: z.string().uuid(),
  cartItems: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    customizations: z.record(z.any()).optional().default({})
  })).min(1, 'At least one cart item is required'),
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid().optional(),
  shippingMethod: z.string().min(1).optional(),
  paymentMethod: z.string().min(1),
  couponCode: z.string().optional()
}).strict();

// Apply validation middleware to routes
router.post('/orders', 
  requireAuth, 
  requireRole('user'),
  validateBody(createOrderBodySchema),
  createOrderHandler
);
```

**Validation Features:**
- ✅ Strict schema enforcement (extra fields stripped)
- ✅ Type-safe validated payloads
- ✅ Consistent 400 error format with field-level details
- ✅ Reusable validation middleware (validateBody, validateParams, validateQuery)
- ✅ Comprehensive schemas for auth, orders, payments

**Error Response Format:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**Validated Endpoints:**
- `/auth/register` - User registration
- `/auth/login` - User login
- `/auth/change-password` - Password change
- `/auth/reset-password` - Password reset
- `/orders` - Order creation
- `/orders/:id/status` - Order status update
- `/payments/create-intent` - Payment intent creation
- `/payments/confirm` - Payment confirmation

### Rate Limiting

```javascript
// Global rate limiter
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.post('/api/v1/auth/login', authLimiter, loginHandler);
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://customiseyou.com',
    'https://admin.customiseyou.com',
    'https://seller.customiseyou.com',
    'https://*.customiseyou.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

### Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.customiseyou.com'],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 4️⃣ Database Security

### SQL Injection Prevention

```javascript
// ✅ Correct: Using parameterized queries
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);

// ❌ Wrong: String concatenation
const result = await db.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

### Connection Pooling & SSL

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./ca-cert.pem')
  },
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Database Auditing

```sql
-- Audit table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  table_name VARCHAR(100),
  operation VARCHAR(10), -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET
);

-- Trigger for auditing
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_audit();
```

---

## 5️⃣ Payment Security

### PCI-DSS Compliance

```
Payment Handling:
1. Never store full card numbers
2. Use tokenization (Stripe/Razorpay)
3. All payment endpoints use HTTPS/TLS 1.3+
4. Regular security audits
5. Implement 3D Secure
6. Fraud monitoring enabled
```

### Webhook Security

```javascript
// Verify webhook signature
const verifyStripeWebhook = (req) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (err) {
    throw new Error('Webhook signature verification failed');
  }
};
```

---

## 6️⃣ File Upload Security

### Image Upload Validation

```javascript
const multer = require('multer');
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// Scan uploaded files for malware
const scanFileForMalware = async (buffer) => {
  // Use ClamAV or similar virus scanning service
  const isSafe = await clamav.scan(buffer);
  return isSafe;
};
```

---

## 7️⃣ Logging & Monitoring

### Secure Logging

```javascript
const Winston = require('winston');

const logger = Winston.createLogger({
  level: 'info',
  format: Winston.format.json(),
  defaultMeta: { service: 'customiseyou-api' },
  transports: [
    // Only log non-sensitive data
    new Winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      format: Winston.format((info) => {
        // Remove sensitive data
        delete info.password;
        delete info.credit_card;
        delete info.cvv;
        return info;
      })()
    }),
    new Winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Intrusion Detection

```
Monitoring for:
- Multiple failed login attempts
- Unusual API call patterns
- Large data exports
- Admin account access
- Database schema changes
- File modification alerts
```

---

## 8️⃣ Compliance

### GDPR Compliance

```
Requirements:
1. Data Processing Agreement with users
2. Privacy Policy published
3. Consent for data collection
4. Right to access personal data
5. Right to be forgotten (data deletion)
6. Data breach notification (within 72 hours)
7. Data Protection Impact Assessment (DPIA)
```

### Data Retention Policy

```
Data Retention:
- Active user accounts: Indefinite
- Deleted user data: 30 days before purge
- Transaction records: 7 years (regulatory)
- Chat messages: 1 year
- Audit logs: 1 year
- Analytics data: 2 years
```

### Privacy Policy Requirements

```
Must include:
- Type of data collected
- Purpose of collection
- Data retention period
- Third-party sharing
- User rights
- Contact information
- Cookie usage
- Third-party links
```

---

## 9️⃣ Third-Party Security

### Vendor Assessment

```
Before integrating external services:
1. Security certification (SOC 2, ISO 27001)
2. Data handling practices
3. Incident response plan
4. Encryption standards
5. Regular security audits
6. SLA and uptime guarantees
7. Data location/residency
```

### API Key Management

```javascript
// Store keys in environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
const razorpayKey = process.env.RAZORPAY_KEY;

// Rotate keys regularly
const rotateAPIKey = async (service) => {
  // Generate new key
  // Update all systems
  // Revoke old key after grace period
};

// Never commit keys to version control
// .gitignore: .env, .env.local
```

---

## 🔟 Security Checklist

### Pre-Deployment

- [ ] All dependencies up-to-date
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Error messages non-descriptive
- [ ] Secrets not in code/logs
- [ ] Database encryption enabled
- [ ] TLS 1.3+ configured
- [ ] Firewalls configured
- [ ] DDoS protection enabled
- [ ] Backup & recovery tested

### Post-Deployment

- [ ] Security monitoring active
- [ ] Logs aggregated and monitored
- [ ] Intrusion detection active
- [ ] Regular security audits scheduled
- [ ] Penetration testing completed
- [ ] Incident response plan active
- [ ] Security patches applied
- [ ] Backup restoration tested
- [ ] Disaster recovery plan ready

---

## 🆘 Incident Response

### Data Breach Protocol

```
1. Identify (immediately)
   - What data was compromised
   - How many users affected
   - When did it occur

2. Contain (within 1 hour)
   - Revoke compromised credentials
   - Block malicious access
   - Preserve evidence

3. Notify (within 72 hours)
   - Affected users
   - Regulatory authorities
   - Credit bureaus (if applicable)

4. Remediate (within 7 days)
   - Implement security patches
   - Update security measures
   - Conduct forensic analysis

5. Learn (ongoing)
   - Implement preventive measures
   - Update security policies
   - Train team members
```

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework/)

---

**Version**: 1.0.0  
**Last Updated**: January 2026
**Classification**: Internal Use Only
