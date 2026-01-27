# Razorpay Integration - Next Steps

## ✅ Completed

All backend and frontend code is production-ready with:
- ✅ Environment variable validation
- ✅ Comprehensive logging with `[Razorpay]` prefix
- ✅ Security (amount from DB only, signature verification)
- ✅ Clear error messages (no generic "Unknown error")
- ✅ SDK availability checks
- ✅ UI updated to show Razorpay as enabled

## 🔧 Required Setup

### 1. Add Razorpay Test Keys to Backend

Open `backend/.env` and add these lines:

```env
# Get these from https://dashboard.razorpay.com (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Where to get these keys:**
1. Go to https://dashboard.razorpay.com
2. Make sure you're in **Test Mode** (toggle at top)
3. Go to Settings → API Keys
4. Click "Generate Test Key" if you don't have one
5. Copy both `Key Id` and `Key Secret`
6. For webhook secret: Settings → Webhooks → Create webhook → Copy secret

### 2. Restart Backend Server

After adding keys to `.env`:

```bash
cd backend
npm run dev
```

### 3. Test Payment Flow

1. **Create Test Order:**
   - Go to http://localhost:3001
   - Add products to cart
   - Proceed to checkout
   - Select "Online Payment"
   - Click "Proceed to Payment"

2. **Complete Payment:**
   - Razorpay modal should open
   - Use test card: `4111 1111 1111 1111`
   - Any future CVV (e.g., `123`)
   - Any future expiry (e.g., `12/25`)
   - Any name
   - Click "Pay"

3. **Verify Success:**
   - Order status should change to "confirmed"
   - Inventory should reduce
   - Check backend console for `[Razorpay]` logs

## 🐛 Troubleshooting

### Error: "Razorpay keys not configured"
**Solution:** Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env`

### Error: "Payment gateway not ready"
**Solution:** Refresh the payment page to reload Razorpay SDK

### Error: "Bad request error"
**Solution:** Check backend console for exact error. Common issues:
- Invalid amount (must be positive integer in paise)
- Missing order in database
- Razorpay API down (check https://status.razorpay.com)

### Payment Modal Doesn't Open
**Check:**
1. Browser console for JavaScript errors
2. Razorpay SDK loaded (check Network tab for `https://checkout.razorpay.com/v1/checkout.js`)
3. Browser extensions blocking scripts (disable ad blockers)

### Payment Verification Failed
**Check:**
1. Backend console for signature verification logs
2. Ensure `RAZORPAY_KEY_SECRET` is correct
3. Check order exists and is in `pending` status

## 📊 What to Expect in Logs

**Successful Payment Flow:**
```
[Razorpay] Configuration validated successfully
[Razorpay] Creating order for orderId: 123
[Razorpay] Amount calculation: rupees=100, paise=10000
[Razorpay] Order created successfully: razorpay_order_id=order_xxxxx
[Razorpay] Verifying payment for order 123
[Razorpay] Signature matched: true
[Razorpay] Order confirmed, reducing inventory...
[Razorpay] Payment verified and order confirmed successfully
```

**Failed Payment (Missing Keys):**
```
[Razorpay] Error creating order: Razorpay keys not configured in environment. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file
```

## 🚀 Production Deployment

When ready for live payments:

1. **Switch to Live Mode:**
   - Go to Razorpay Dashboard → Settings → Toggle to "Live Mode"
   - Generate Live API Keys
   - Update `.env` with live keys (start with `rzp_live_`)

2. **Configure Webhook:**
   - Settings → Webhooks → Add webhook URL
   - URL: `https://yourdomain.com/api/payments/razorpay/webhook`
   - Events: Select "payment.captured", "payment.failed"
   - Copy webhook secret to `.env`

3. **Test with Real Transactions:**
   - Start with ₹1 test orders
   - Verify webhooks are received
   - Check settlement in Razorpay dashboard

4. **Enable Auto-Capture:**
   - Razorpay Dashboard → Settings → Payment Configuration
   - Set Auto-Capture to "ON" (recommended)

## 📖 Documentation

- Full setup guide: `RAZORPAY_SETUP.md`
- Test cards: https://razorpay.com/docs/payments/payments/test-card-details/
- Razorpay docs: https://razorpay.com/docs/

## ⚠️ Important Notes

- **Test Mode:** Free, no real money, unlimited transactions
- **Live Mode:** Real transactions, Razorpay charges 2% + GST per transaction
- **Security:** Amount is always fetched from database, never from frontend
- **Expiry:** ONLINE orders expire after 30 minutes if unpaid
- **Inventory:** Reduced only after successful payment for ONLINE orders

## 🎯 Quick Start Command

```bash
# In backend directory
echo "RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID" >> .env
echo "RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET" >> .env
npm run dev
```

Then test payment flow at http://localhost:3001

---

**Need Help?** Check backend console for detailed error messages with `[Razorpay]` prefix.
