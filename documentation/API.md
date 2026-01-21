# CustomiseYou API Architecture

## 🌐 API Overview

RESTful API with real-time WebSocket support. All endpoints require authentication (JWT tokens) except public endpoints.

**Base URL**: `https://api.customiseyou.com/v1`

---

## 🔐 Authentication

### Registration & Login

#### POST `/auth/register`
Register a new user account.

```json
Request:
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePassword123!",
  "registration_source": "mobile_app"
}

Response (201 Created):
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### POST `/auth/login`
Login with email/phone and password.

```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response (200 OK):
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": { ...user object }
}
```

#### POST `/auth/verify-otp`
Verify OTP for email/phone verification.

```json
Request:
{
  "phone": "+1234567890",
  "otp": "123456"
}

Response (200 OK):
{
  "verified": true,
  "token": "jwt_token"
}
```

#### POST `/auth/refresh-token`
Refresh access token.

```json
Request:
{
  "refresh_token": "refresh_token"
}

Response (200 OK):
{
  "access_token": "new_jwt_token",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600
}
```

#### POST `/auth/logout`
Logout user (invalidate tokens).

```
Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👤 User Profile

### GET `/users/me`
Get current user profile.

```json
Response (200 OK):
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "profile_image_url": "https://...",
  "bio": "I love customized products",
  "email_verified": true,
  "phone_verified": true,
  "status": "active",
  "preferences": {
    "notifications_enabled": true,
    "marketing_emails": false,
    "preferred_language": "en"
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### PUT `/users/me`
Update user profile.

```json
Request:
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Updated bio",
  "profile_image_url": "https://..."
}

Response (200 OK):
{ ...updated user object }
```

### POST `/users/change-password`
Change user password.

```json
Request:
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}

Response (200 OK):
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 📍 Addresses

### GET `/addresses`
Get all user addresses.

```json
Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "type": "shipping",
      "label": "Home",
      "full_name": "John Doe",
      "phone_number": "+1234567890",
      "address_line_1": "123 Main St",
      "address_line_2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "USA",
      "is_default": true,
      "is_active": true
    }
  ],
  "total": 1
}
```

### POST `/addresses`
Create new address.

```json
Request:
{
  "type": "shipping",
  "label": "Home",
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "address_line_1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA",
  "is_default": true
}

Response (201 Created):
{ ...address object }
```

### PUT `/addresses/{id}`
Update address.

```
Response (200 OK):
{ ...updated address object }
```

### DELETE `/addresses/{id}`
Delete address.

```
Response (204 No Content)
```

---

## 🏪 Products

### GET `/products`
Get products with filters and pagination.

```
Query Parameters:
- category_id: Filter by category
- search: Search products by name/description
- min_price: Minimum price filter
- max_price: Maximum price filter
- sort_by: 'newest', 'popular', 'price_asc', 'price_desc', 'rating'
- page: Page number (default: 1)
- limit: Items per page (default: 20)
- customizable_only: true/false

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "seller_id": "uuid",
      "category_id": "uuid",
      "name": "Custom Mug",
      "slug": "custom-mug",
      "description": "Personalize your own mug",
      "base_price": 29.99,
      "final_price": 29.99,
      "discount_percentage": 0,
      "quantity_available": 100,
      "is_customizable": true,
      "customization_types": ["text", "color", "image"],
      "main_image_url": "https://...",
      "thumbnail_url": "https://...",
      "images": ["https://..."],
      "average_rating": 4.5,
      "total_reviews": 120,
      "is_featured": true,
      "views_count": 5000,
      "wishlist_count": 250,
      "seller": {
        "id": "uuid",
        "business_name": "Artisan Crafts",
        "average_rating": 4.7,
        "total_orders": 1500
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20,
  "total_pages": 25
}
```

### GET `/products/{id}`
Get product details with customization options.

```json
Response (200 OK):
{
  "id": "uuid",
  "name": "Custom Mug",
  "seller_id": "uuid",
  "category_id": "uuid",
  "description": "...",
  "base_price": 29.99,
  "final_price": 29.99,
  "quantity_available": 100,
  "is_customizable": true,
  "customizations": [
    {
      "id": "uuid",
      "type": "text",
      "label": "Name",
      "description": "Engraved on mug",
      "is_required": true,
      "input_type": "text",
      "max_length": 30,
      "price_adjustment": 0,
      "display_order": 1
    },
    {
      "id": "uuid",
      "type": "color",
      "label": "Mug Color",
      "is_required": true,
      "input_type": "select",
      "allowed_values": ["white", "black", "blue", "red"],
      "price_adjustment": 0,
      "display_order": 2
    }
  ],
  "reviews": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "rating": 5,
      "title": "Love it!",
      "content": "Perfect customization options",
      "helpful_count": 15,
      "verified_purchase": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "seller": { ...seller object }
}
```

### GET `/categories`
Get all product categories.

```json
Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "name": "Home & Kitchen",
      "slug": "home-kitchen",
      "description": "...",
      "image_url": "https://...",
      "icon_url": "https://...",
      "parent_category_id": null,
      "level": 1,
      "is_active": true,
      "subcategories": [
        {
          "id": "uuid",
          "name": "Mugs & Cups",
          "slug": "mugs-cups",
          "parent_category_id": "uuid",
          "level": 2
        }
      ]
    }
  ]
}
```

---

## 🛒 Cart

### GET `/cart`
Get user's shopping cart.

```json
Response (200 OK):
{
  "id": "uuid",
  "user_id": "uuid",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Custom Mug",
      "quantity": 2,
      "unit_price": 29.99,
      "subtotal": 59.98,
      "selected_customizations": {
        "text_name": "John Doe",
        "color": "white"
      },
      "customization_price_adjustment": 0
    }
  ],
  "subtotal": 59.98,
  "tax": 4.80,
  "shipping": 5.00,
  "discount": 0,
  "total": 69.78,
  "currency": "USD"
}
```

### POST `/cart/items`
Add item to cart.

```json
Request:
{
  "product_id": "uuid",
  "quantity": 1,
  "selected_customizations": {
    "text_name": "John Doe",
    "color": "white"
  }
}

Response (201 Created):
{ ...updated cart }
```

### PUT `/cart/items/{id}`
Update cart item.

```json
Request:
{
  "quantity": 2
}

Response (200 OK):
{ ...updated cart }
```

### DELETE `/cart/items/{id}`
Remove item from cart.

```
Response (204 No Content)
```

### POST `/cart/clear`
Clear entire cart.

```
Response (200 OK):
{
  "success": true,
  "message": "Cart cleared"
}
```

---

## 📦 Orders

### POST `/orders`
Place a new order.

```json
Request:
{
  "shipping_address_id": "uuid",
  "billing_address_id": "uuid",
  "payment_method": "credit_card",
  "shipping_method": "standard",
  "coupon_code": "SAVE10",
  "order_notes": "Please handle with care"
}

Response (201 Created):
{
  "id": "uuid",
  "order_number": "ORD-2024-001234",
  "status": "pending",
  "user_id": "uuid",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Custom Mug",
      "quantity": 2,
      "unit_price": 29.99,
      "customizations": { ...customization details }
    }
  ],
  "subtotal": 59.98,
  "tax": 4.80,
  "shipping_cost": 5.00,
  "discount_amount": 5.99,
  "total_amount": 63.79,
  "shipping_address": { ...address },
  "payment_status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET `/orders`
Get user's orders with pagination.

```
Query Parameters:
- status: Filter by order status
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001234",
      "status": "shipped",
      "total_amount": 63.79,
      "items_count": 2,
      "tracking_number": "TRACK123456",
      "created_at": "2024-01-15T10:30:00Z",
      "estimated_delivery_date": "2024-01-20T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1
}
```

### GET `/orders/{id}`
Get order details.

```json
Response (200 OK):
{
  "id": "uuid",
  "order_number": "ORD-2024-001234",
  "status": "shipped",
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Custom Mug",
      "quantity": 2,
      "unit_price": 29.99,
      "subtotal": 59.98,
      "customizations": [
        {
          "customization_type": "text",
          "label": "Name",
          "value": "John Doe"
        }
      ]
    }
  ],
  "shipping_address": { ...address },
  "tracking_number": "TRACK123456",
  "estimated_delivery_date": "2024-01-20T00:00:00Z",
  "timeline": [
    {
      "status": "pending",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "status": "confirmed",
      "timestamp": "2024-01-15T11:00:00Z"
    },
    {
      "status": "processing",
      "timestamp": "2024-01-16T09:00:00Z"
    },
    {
      "status": "shipped",
      "timestamp": "2024-01-17T14:30:00Z"
    }
  ]
}
```

### PUT `/orders/{id}/cancel`
Cancel an order.

```json
Request:
{
  "reason": "Changed my mind"
}

Response (200 OK):
{
  "id": "uuid",
  "status": "cancelled",
  "refund_initiated": true,
  "estimated_refund_date": "2024-01-25T00:00:00Z"
}
```

---

## ⭐ Reviews & Ratings

### POST `/products/{id}/reviews`
Submit a review for a product.

```json
Request:
{
  "order_id": "uuid",
  "rating": 5,
  "title": "Excellent product!",
  "content": "Perfect customization quality and fast delivery",
  "customization_quality_rating": 5,
  "images": ["https://..."]
}

Response (201 Created):
{
  "id": "uuid",
  "product_id": "uuid",
  "user_id": "uuid",
  "rating": 5,
  "title": "Excellent product!",
  "content": "Perfect customization quality and fast delivery",
  "customization_quality_rating": 5,
  "status": "pending",
  "verified_purchase": true,
  "created_at": "2024-01-20T10:30:00Z"
}
```

### GET `/products/{id}/reviews`
Get product reviews.

```
Query Parameters:
- sort_by: 'newest', 'helpful', 'rating_high', 'rating_low'
- rating_filter: 1-5
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "John Doe",
      "user_image": "https://...",
      "rating": 5,
      "title": "Excellent product!",
      "content": "...",
      "customization_quality_rating": 5,
      "images": ["https://..."],
      "helpful_count": 45,
      "unhelpful_count": 2,
      "verified_purchase": true,
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "average_rating": 4.5,
  "total_reviews": 120,
  "rating_distribution": {
    "5": 95,
    "4": 20,
    "3": 4,
    "2": 1,
    "1": 0
  }
}
```

### POST `/reviews/{id}/helpful`
Mark review as helpful.

```
Response (200 OK):
{
  "helpful_count": 46,
  "unhelpful_count": 2
}
```

---

## 💬 Chat & Messaging

### GET `/messages`
Get conversation list.

```
Query Parameters:
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "conversation_with_id": "uuid",
      "conversation_with_name": "John Doe",
      "conversation_with_type": "customer|seller",
      "profile_image_url": "https://...",
      "last_message": "When will you deliver?",
      "last_message_timestamp": "2024-01-20T15:30:00Z",
      "unread_count": 2,
      "related_order_id": "uuid",
      "related_product_id": "uuid"
    }
  ],
  "total": 15,
  "page": 1
}
```

### GET `/messages/{user_id}`
Get messages with a specific user.

```
Query Parameters:
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "sender_name": "John Doe",
      "sender_image": "https://...",
      "message_type": "text",
      "content": "Hello, when will this be ready?",
      "file_url": null,
      "is_read": true,
      "read_at": "2024-01-20T15:35:00Z",
      "created_at": "2024-01-20T15:30:00Z"
    }
  ],
  "total": 50,
  "page": 1
}
```

### POST `/messages/{user_id}`
Send a message to a user.

```json
Request:
{
  "message_type": "text",
  "content": "When will this be ready?",
  "order_id": "uuid",
  "product_id": "uuid"
}

Response (201 Created):
{
  "id": "uuid",
  "sender_id": "uuid",
  "recipient_id": "uuid",
  "message_type": "text",
  "content": "When will this be ready?",
  "is_read": false,
  "created_at": "2024-01-20T15:30:00Z"
}
```

### POST `/messages/{user_id}/mark-as-read`
Mark conversation messages as read.

```
Response (200 OK):
{
  "success": true,
  "marked_count": 5
}
```

---

## ❤️ Wishlist

### GET `/wishlist`
Get user's wishlist.

```
Query Parameters:
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "product_name": "Custom Mug",
      "price_at_addition": 29.99,
      "current_price": 27.99,
      "price_change": -2.00,
      "main_image_url": "https://...",
      "seller_name": "Artisan Crafts",
      "added_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 8,
  "page": 1
}
```

### POST `/wishlist/{product_id}`
Add product to wishlist.

```
Response (201 Created):
{
  "id": "uuid",
  "product_id": "uuid",
  "added_at": "2024-01-20T10:30:00Z"
}
```

### DELETE `/wishlist/{product_id}`
Remove product from wishlist.

```
Response (204 No Content)
```

---

## 🏪 Seller Management

### POST `/seller/register`
Register as a seller.

```json
Request:
{
  "business_name": "Artisan Crafts",
  "business_email": "business@example.com",
  "business_phone": "+1234567890",
  "business_description": "Handcrafted custom items",
  "country": "USA",
  "state": "NY",
  "city": "New York",
  "postal_code": "10001",
  "address": "123 Business St",
  "aadhar_number": "123456789012",
  "pan_number": "ABCDE1234F",
  "gst_number": "18AABCT1234H1Z0",
  "bank_account_number": "1234567890123456",
  "bank_ifsc_code": "HDFC0001234",
  "bank_account_holder_name": "John Doe"
}

Response (201 Created):
{
  "id": "uuid",
  "user_id": "uuid",
  "business_name": "Artisan Crafts",
  "kyc_status": "pending",
  "status": "pending"
}
```

### GET `/seller/dashboard`
Get seller dashboard overview.

```json
Response (200 OK):
{
  "seller_id": "uuid",
  "business_name": "Artisan Crafts",
  "status": "active",
  "kyc_status": "verified",
  "total_products": 45,
  "active_products": 42,
  "total_orders": 500,
  "pending_orders": 12,
  "monthly_earnings": 5000.00,
  "average_rating": 4.7,
  "total_reviews": 120,
  "response_time_hours": 2,
  "fulfillment_rate": 98.5,
  "analytics": {
    "views_this_month": 15000,
    "sales_this_month": 50,
    "revenue_this_month": 5000.00,
    "top_selling_products": [
      {
        "id": "uuid",
        "name": "Custom Mug",
        "quantity_sold": 25,
        "revenue": 749.75
      }
    ]
  }
}
```

### GET `/seller/products`
Get seller's products.

```
Query Parameters:
- status: Filter by product status
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "name": "Custom Mug",
      "slug": "custom-mug",
      "base_price": 29.99,
      "quantity_available": 100,
      "status": "active",
      "is_customizable": true,
      "average_rating": 4.5,
      "total_reviews": 45,
      "views_count": 1500,
      "sales_count": 25,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1
}
```

### POST `/seller/products`
Create a new product.

```json
Request:
{
  "category_id": "uuid",
  "name": "Custom T-Shirt",
  "description": "Personalize your own t-shirt",
  "base_price": 19.99,
  "quantity_available": 500,
  "is_customizable": true,
  "main_image_url": "https://...",
  "images": ["https://..."],
  "attributes": {
    "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
    "materials": ["cotton", "polyester"]
  },
  "customization_types": ["text", "color", "image"]
}

Response (201 Created):
{ ...product object }
```

### GET `/seller/orders`
Get seller's orders.

```
Query Parameters:
- status: Filter by order status
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001234",
      "status": "processing",
      "customer_name": "Jane Smith",
      "total_amount": 63.79,
      "items_count": 2,
      "created_at": "2024-01-15T10:30:00Z",
      "timeline": [
        {
          "status": "confirmed",
          "timestamp": "2024-01-15T11:00:00Z"
        },
        {
          "status": "processing",
          "timestamp": "2024-01-16T09:00:00Z"
        }
      ]
    }
  ],
  "total": 12,
  "page": 1
}
```

### PUT `/seller/orders/{id}/status`
Update order status.

```json
Request:
{
  "status": "shipped",
  "tracking_number": "TRACK123456",
  "notes": "Order shipped via express delivery"
}

Response (200 OK):
{ ...updated order }
```

### GET `/seller/payouts`
Get seller payout history.

```json
Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "payout_period_start": "2024-01-01",
      "payout_period_end": "2024-01-31",
      "gross_earnings": 5000.00,
      "platform_commission": 500.00,
      "processing_fees": 25.00,
      "refunds": 100.00,
      "net_payout_amount": 4375.00,
      "status": "completed",
      "processed_at": "2024-02-05T10:00:00Z"
    }
  ],
  "total_earned": 125000.00,
  "pending_payout": 2500.00
}
```

---

## 📊 Admin Endpoints

### GET `/admin/sellers`
List all sellers with KYC status.

```
Query Parameters:
- kyc_status: Filter by verification status
- status: Filter by account status
- page: Page number
- limit: Items per page

Response (200 OK):
{
  "data": [
    {
      "id": "uuid",
      "business_name": "Artisan Crafts",
      "email": "business@example.com",
      "kyc_status": "pending",
      "status": "pending",
      "submitted_at": "2024-01-20T10:30:00Z"
    }
  ],
  "total": 150
}
```

### PUT `/admin/sellers/{id}/kyc-verify`
Approve seller KYC.

```json
Request:
{
  "status": "verified",
  "notes": "KYC documents verified successfully"
}

Response (200 OK):
{ ...updated seller }
```

### GET `/admin/analytics`
Get platform analytics.

```json
Response (200 OK):
{
  "total_users": 15000,
  "total_sellers": 150,
  "total_products": 5000,
  "total_orders_count": 50000,
  "total_revenue": 500000.00,
  "monthly_stats": [
    {
      "month": "2024-01",
      "users": 5000,
      "orders": 15000,
      "revenue": 150000.00
    }
  ],
  "top_categories": [...],
  "top_sellers": [...]
}
```

---

## 🔔 Real-time WebSocket Events

### Connect
```
WS: wss://api.customiseyou.com/ws
Authentication: Bearer {jwt_token}
```

### Subscribe to Events
```json
{
  "type": "subscribe",
  "channels": ["order_updates", "messages", "notifications"]
}
```

### Order Status Update Event
```json
{
  "type": "order_status_updated",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-2024-001234",
    "status": "shipped",
    "timestamp": "2024-01-17T14:30:00Z"
  }
}
```

### New Message Event
```json
{
  "type": "new_message",
  "data": {
    "message_id": "uuid",
    "sender_id": "uuid",
    "sender_name": "John Doe",
    "content": "Your order is ready",
    "timestamp": "2024-01-20T15:30:00Z"
  }
}
```

---

## 🔐 Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "status": 400,
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

---

## 📋 Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Request successful, no response body |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

**Version**: 1.0.0  
**Last Updated**: January 2026
