# Migration Guide: Legal Compliance & Delivery Pricing

This guide explains how to apply migration 021 and integrate the new legal compliance features.

---

## 🚀 Quick Start

### 1. Apply Database Migration

```bash
cd backend
npm run migrate
```

This will apply migration `021_add_legal_compliance_and_delivery_pricing.sql`.

**Expected Output:**
```
✓ Running migration: 021_add_legal_compliance_and_delivery_pricing.sql
✓ Migration completed successfully
```

### 2. Verify Migration

```sql
-- Check new columns in sellers table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
  AND column_name IN ('id_type', 'gstin', 'seller_country', 'accepts_cod', 'bank_account_verified', 'accepted_seller_terms_at');

-- Check new column in users table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'accepted_user_terms_at';

-- Check new columns in products table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('delivery_price', 'delivery_price_type');
```

### 3. Rebuild Backend

```bash
npm run build
```

**Expected Output:**
```
✓ TypeScript compilation successful
✓ 0 errors, 0 warnings
```

---

## 📝 Frontend Integration

### User Signup with Terms Acceptance

**Before:**
```typescript
// Old registration call
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password,
    phone,
    firstName,
    lastName
  })
});
```

**After (with terms acceptance):**
```typescript
// New registration call with terms acceptance
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password,
    phone,
    firstName,
    lastName,
    acceptedTerms: true  // NEW: Record terms acceptance
  })
});
```

**UI Example:**
```jsx
<form onSubmit={handleRegister}>
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <input type="text" name="firstName" required />
  <input type="text" name="lastName" required />
  
  {/* NEW: Terms acceptance checkbox */}
  <label>
    <input type="checkbox" name="acceptedTerms" required />
    I accept the <a href="/terms" target="_blank">Terms and Conditions</a>
  </label>
  
  <button type="submit">Register</button>
</form>
```

### Seller Onboarding with Terms Acceptance

```typescript
// After seller creates their seller account
const recordTermsAcceptance = async (sellerId: string) => {
  const response = await fetch('/api/auth/record-seller-terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerId })
  });
  
  return response.json();
};

// Call during seller onboarding
await recordTermsAcceptance(sellerId);
```

**Note:** You'll need to create a new API route that calls `authService.recordSellerTermsAcceptance()`.

---

## 🛡️ Payment Enforcement

### COD Rejection Behavior

The backend now **automatically rejects** COD payment attempts.

**Test Case:**
```typescript
// This will fail with a clear error message
const response = await fetch('/api/payment/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: '123',
    amount: 100,
    currency: 'INR',
    paymentMethod: 'cod'  // This will be rejected
  })
});

// Expected error response:
// {
//   "error": "Cash on Delivery (COD) is not supported at this time. 
//             Please use a prepaid payment method (Stripe, Razorpay, or PayPal)."
// }
```

**Frontend Handling:**
```typescript
// Hide COD option in payment method selector
const paymentMethods = [
  { id: 'stripe', name: 'Credit/Debit Card' },
  { id: 'razorpay', name: 'UPI / Net Banking' },
  { id: 'paypal', name: 'PayPal' },
  // { id: 'cod', name: 'Cash on Delivery' } // HIDE THIS
];
```

---

## 📦 Delivery Pricing Integration

### Product Creation with Delivery Pricing

**Example:**
```typescript
const createProduct = async (productData) => {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Custom T-Shirt',
      basePrice: 500,
      // NEW: Delivery pricing fields
      deliveryPrice: 50,              // ₹50 delivery charge
      deliveryPriceType: 'flat',       // Flat rate delivery
      // ... other fields
    })
  });
  
  return response.json();
};
```

### Delivery Pricing Types

| Type | Description | Example |
|------|-------------|---------|
| `flat` | Fixed delivery charge | ₹50 for all orders |
| `included` | Delivery included in base price | Free delivery (₹0) |
| `calculated` | Dynamic based on location | Calculate at checkout |

### Display Delivery Charges

```jsx
// Product card
<ProductCard>
  <h3>{product.name}</h3>
  <p className="price">₹{product.basePrice}</p>
  
  {/* NEW: Show delivery pricing */}
  {product.deliveryPriceType === 'flat' && product.deliveryPrice > 0 && (
    <p className="delivery">+ ₹{product.deliveryPrice} delivery</p>
  )}
  {product.deliveryPriceType === 'included' && (
    <p className="delivery">Free delivery</p>
  )}
  {product.deliveryPriceType === 'calculated' && (
    <p className="delivery">Delivery calculated at checkout</p>
  )}
</ProductCard>
```

---

## 🏪 Seller Fields Integration

### Seller Onboarding Form

```jsx
<SellerOnboardingForm>
  {/* Existing fields */}
  <input type="text" name="businessName" required />
  <input type="email" name="businessEmail" required />
  
  {/* NEW: Optional fields */}
  <select name="idType">
    <option value="">Select ID Type (Optional)</option>
    <option value="aadhar">Aadhar Card</option>
    <option value="pan">PAN Card</option>
    <option value="passport">Passport</option>
    <option value="driving_license">Driving License</option>
  </select>
  
  <input 
    type="text" 
    name="gstin" 
    placeholder="GSTIN (if GST-registered)" 
    pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}"
  />
  
  <select name="country" defaultValue="IN">
    <option value="IN">India</option>
    {/* Add other countries if needed */}
  </select>
  
  {/* Bank account verification */}
  <input type="text" name="bankAccountNumber" required />
  <input type="text" name="bankIfscCode" required />
  <p className="note">Bank account will be verified for payout eligibility</p>
  
  {/* Terms acceptance */}
  <label>
    <input type="checkbox" name="acceptedSellerTerms" required />
    I accept the <a href="/seller-terms" target="_blank">Seller Terms and Conditions</a>
  </label>
</SellerOnboardingForm>
```

---

## 🔍 Database Queries

### Check User Terms Acceptance

```sql
SELECT 
  id, 
  email, 
  accepted_user_terms_at,
  CASE 
    WHEN accepted_user_terms_at IS NOT NULL THEN 'Accepted'
    ELSE 'Not Accepted'
  END as terms_status
FROM users
WHERE email = 'user@example.com';
```

### Check Seller Terms Acceptance

```sql
SELECT 
  s.id,
  s.business_name,
  s.seller_country,
  s.gstin,
  s.bank_account_verified,
  s.accepted_seller_terms_at,
  CASE 
    WHEN s.accepted_seller_terms_at IS NOT NULL THEN 'Accepted'
    ELSE 'Not Accepted'
  END as terms_status
FROM sellers s
WHERE s.id = 'seller-uuid';
```

### Check Products with Delivery Pricing

```sql
SELECT 
  id,
  name,
  base_price,
  delivery_price,
  delivery_price_type,
  CASE delivery_price_type
    WHEN 'flat' THEN CONCAT('₹', delivery_price::text, ' flat rate')
    WHEN 'included' THEN 'Free delivery'
    WHEN 'calculated' THEN 'Calculated at checkout'
  END as delivery_info
FROM products
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Important Notes

### Backward Compatibility

- **Existing users/sellers:** Unaffected by migration
- **Existing products:** Default to free delivery (`delivery_price = 0`, `delivery_price_type = 'flat'`)
- **Terms acceptance:** Optional, not enforced (nullable fields)

### Production Deployment

1. **Backup database** before applying migration
2. **Test migration** in staging environment first
3. **Apply migration** during low-traffic period
4. **Verify data integrity** after migration
5. **Monitor error logs** for payment rejection messages

### Legal Compliance

- **Review legal terms** with a qualified attorney
- **Update contact emails** in USER_TERMS.md and SELLER_TERMS.md
- **Add jurisdiction details** (city, state) in Governing Law section
- **Implement version tracking** for terms changes (future enhancement)

---

## 🧪 Testing Checklist

- [ ] Migration applies successfully
- [ ] New columns exist in database
- [ ] Existing data is unchanged
- [ ] Backend builds with 0 errors
- [ ] User registration with terms acceptance works
- [ ] Seller terms acceptance recording works
- [ ] COD payment is rejected with clear error
- [ ] Stripe payment still works
- [ ] Products can be created with delivery pricing
- [ ] Delivery pricing displays correctly on frontend

---

## 🆘 Troubleshooting

### Migration Fails

**Issue:** Migration fails with constraint error

**Solution:**
```sql
-- Check for conflicting data
SELECT * FROM sellers WHERE seller_country IS NULL;
SELECT * FROM products WHERE delivery_price_type NOT IN ('flat', 'included', 'calculated');

-- Fix data before migration
UPDATE sellers SET seller_country = 'IN' WHERE seller_country IS NULL;
```

### TypeScript Compilation Errors

**Issue:** Type mismatch errors

**Solution:**
```typescript
// Import new types
import { User, Seller, Product } from '../types/database';

// Use types in service methods
async getUser(userId: string): Promise<User> {
  // ...
}
```

### Payment Rejection Not Working

**Issue:** COD payments still going through

**Solution:**
```typescript
// Verify paymentService.ts has the COD check
if (paymentData.paymentMethod === 'cod') {
  throw new Error('Cash on Delivery (COD) is not supported...');
}
```

---

## 📚 Additional Resources

- **Migration File:** `backend/src/migrations/021_add_legal_compliance_and_delivery_pricing.sql`
- **Type Definitions:** `backend/src/types/database.d.ts`
- **Legal Terms:** `documentation/legal/USER_TERMS.md` and `SELLER_TERMS.md`
- **Implementation Summary:** `LEGAL_COMPLIANCE_SUMMARY.md`

---

**Questions?** Review the implementation summary or check inline comments in the codebase.
