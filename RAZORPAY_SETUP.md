# Razorpay Integration Setup Guide

## Overview
This guide explains how to set up Razorpay test mode for the CustomiseYou platform.

## Prerequisites
- Razorpay account (https://razorpay.com)
- Backend server running on port 3000
- Frontend server running on port 3001

## Step 1: Get Razorpay Test Keys

1. Sign up or login to Razorpay Dashboard: https://dashboard.razorpay.com
2. Switch to **Test Mode** (toggle in top-left corner)
3. Go to **Settings** → **API Keys**
4. Generate Test API Keys
5. Copy both:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret**

## Step 2: Configure Backend

1. Open `backend/.env` file
2. Add your Razorpay credentials:

```env
# Razorpay Test Mode
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

3. Restart backend server:
```powershell
cd "C:\Users\KIIT0001\Documents\Customise You\backend"
npm run dev
```

## Step 3: Test Payment Flow

### ONLINE Payment Test:
1. Add product to cart
2. Go to checkout
3. Select **"Online Payment"** method
4. Click "Place Order"
5. You'll be redirected to payment page
6. Click "Pay Now" button
7. Razorpay modal will open

### Test Cards (Test Mode Only):
- **Success**: `4111 1111 1111 1111`
- **Failure**: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

### Test UPI:
- UPI ID: `success@razorpay`
- Pin: Any 4-6 digits

### Expected Results:
✅ **Success**: Order confirmed, payment verified, inventory reduced, redirected to order details
❌ **Failure**: Payment failed, order remains pending, no inventory change

## Step 4: Verify Database

After successful payment, check:

```sql
-- Order should be confirmed
SELECT id, order_number, status, payment_status, payment_id 
FROM orders 
WHERE payment_method = 'online';

-- Transaction should exist
SELECT * FROM transactions 
WHERE payment_method = 'razorpay' 
ORDER BY created_at DESC LIMIT 1;

-- Inventory should be reduced
SELECT id, name, quantity_available 
FROM products;
```

## Step 5: Webhook Setup (Optional)

For production, configure webhooks:

1. Go to Razorpay Dashboard → **Webhooks**
2. Create webhook with URL: `https://your-domain.com/api/v1/payments/razorpay/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
4. Copy webhook secret
5. Add to `.env`:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Troubleshooting

### "Payment gateway is still loading"
- Check browser console for Razorpay SDK loading errors
- Ensure internet connection is stable
- Clear browser cache and reload

### "Backend API not reachable"
- Verify backend server is running on port 3000
- Check `.env` has correct Razorpay keys
- Review backend logs for errors

### "Payment verification failed"
- Check Razorpay Key Secret is correct in `.env`
- Ensure order exists and is in `pending` state
- Review backend logs for signature verification errors

### Order expires during payment
- Default expiry: 30 minutes from order creation
- Complete payment within countdown timer
- Expired orders cannot be paid (create new order)

## Production Checklist

Before going live:

1. ✅ Switch Razorpay to **Live Mode**
2. ✅ Update `.env` with **Live Keys** (not test keys)
3. ✅ Configure production webhook URL
4. ✅ Test with real cards in small amounts
5. ✅ Set up SSL certificate (HTTPS required)
6. ✅ Enable Razorpay settlement to bank account
7. ✅ Configure payment failure notifications
8. ✅ Set up refund handling process

## API Endpoints

### Create Razorpay Order
```
POST /api/v1/payments/razorpay/create
Authorization: Bearer <token>
Body: { "orderId": "uuid" }
```

### Verify Payment
```
POST /api/v1/payments/razorpay/verify
Authorization: Bearer <token>
Body: {
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_signature": "signature_xxxxx",
  "orderId": "uuid"
}
```

### Webhook Handler
```
POST /api/v1/payments/razorpay/webhook
Headers: {
  "x-razorpay-signature": "signature"
}
Body: { webhook_payload }
```

## Support

- Razorpay Docs: https://razorpay.com/docs/
- Razorpay Support: https://razorpay.com/support/
- CustomiseYou Issues: Contact development team
