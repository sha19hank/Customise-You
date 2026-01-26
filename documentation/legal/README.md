# Legal Documentation

This folder contains the legal terms and conditions for the CustomiseYou marketplace platform.

## Files

### USER_TERMS.md
Platform terms and conditions for customers using the marketplace.

**Key Points:**
- Platform acts as an intermediary between customers and sellers
- Sellers are responsible for product quality, delivery, and refunds
- All payments are prepaid via platform (COD not supported)
- Delivery charges are set by sellers and shown transparently
- Governing law: India

**Usage:**
- Display to users during signup (optional checkbox)
- Record acceptance timestamp in `users.accepted_user_terms_at`
- Store legal text externally (not in database)

---

### SELLER_TERMS.md
Platform terms and conditions for sellers operating on the marketplace.

**Key Points:**
- Sellers are independent contractors
- Sellers responsible for product legality, quality, taxes, and delivery
- GST required only if legally applicable
- Platform commission: 0% (orders 1-10), 3% (11-50), 7% (51+)
- Platform may delist sellers for fraud or repeated violations
- Governing law: India

**Usage:**
- Display to sellers during onboarding
- Record acceptance timestamp in `sellers.accepted_seller_terms_at`
- Store legal text externally (not in database)

---

## Implementation Notes

### Terms Acceptance Timestamps

Both user and seller tables have optional timestamp fields to track when users accepted the platform terms:

- `users.accepted_user_terms_at` (TIMESTAMP NULL)
- `sellers.accepted_seller_terms_at` (TIMESTAMP NULL)

These fields are:
- **Optional** (nullable) to avoid breaking existing data
- **Timestamp-based** (no version tracking yet)
- **Non-enforced** (no blocking logic for unaccepted terms)

### Recording Acceptance

**For Users (during signup):**
```typescript
// In authService.register()
const acceptedTermsAt = acceptedTerms ? new Date() : null;

await db.query(
  `INSERT INTO users (..., accepted_user_terms_at)
   VALUES (..., $9)`,
  [..., acceptedTermsAt]
);
```

**For Sellers (during onboarding):**
```sql
-- When creating a seller record
UPDATE sellers 
SET accepted_seller_terms_at = NOW()
WHERE id = $1 AND accepted_seller_terms_at IS NULL;
```

### Future Enhancements

- **Versioning:** Track which version of terms user/seller accepted
- **Re-acceptance:** Prompt users to re-accept when terms change
- **Enforcement:** Block access until terms are accepted
- **Legal text storage:** Store full legal text with version history

---

## Legal Compliance Notes

### India-First Compliance

These terms are designed for India-first marketplace operations:

- **Governing law:** Indian law and jurisdiction
- **GST compliance:** Required only if seller exceeds threshold
- **Grievance redressal:** Contact details provided as per Indian law
- **Consumer protection:** Aligned with Indian consumer protection laws

### Prepaid-Only Policy

- **COD is NOT supported** (backend enforces this)
- All orders must be prepaid via platform payment gateways
- This ensures legal and financial compliance

### Delivery Pricing Transparency

- Delivery charges are set by sellers
- Charges must be displayed separately and upfront
- Pricing type options: `flat`, `included`, `calculated`

---

## Updating Terms

When updating terms:

1. Update the relevant `.md` file
2. Change the "Last Updated" date
3. Increment version number (if versioning is implemented)
4. Notify users/sellers of changes
5. Optionally require re-acceptance

---

## Contact

For questions about legal terms, contact:

- **User Support:** support@customiseyou.com
- **Seller Support:** seller-support@customiseyou.com
- **Grievance Officer:** grievance@customiseyou.com

---

**Disclaimer:** These terms are templates and should be reviewed by a qualified legal professional before production use.
