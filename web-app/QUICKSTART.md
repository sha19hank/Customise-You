# Quick Start Guide - CustomiseYou Web App

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd web-app
npm install
```

### 2. Start Backend API

Make sure the backend is running on `http://localhost:3000`:

```bash
cd ../backend
npm run dev
```

### 3. Start Web App

```bash
cd ../web-app
npm run dev
```

The web app will run on **http://localhost:3001**

---

## ✅ What's Implemented

### Authentication System
- ✅ JWT-based authentication with access + refresh tokens
- ✅ Automatic token refresh on 401 errors
- ✅ Persistent authentication (survives page refresh)
- ✅ Protected routes (redirect to login if not authenticated)
- ✅ Guest-only routes (redirect to home if already logged in)

### Pages
- ✅ **Home Page** (`/`) - Landing page with welcome message
- ✅ **Login Page** (`/login`) - User sign in
- ✅ **Register Page** (`/register`) - User registration with terms acceptance

### Components
- ✅ **Header** - Navigation with login/logout
- ✅ **ProtectedRoute** - Wrapper for authenticated pages
- ✅ **GuestOnly** - Wrapper for login/register pages

### API Integration
- ✅ Axios instance with automatic token attachment
- ✅ Token refresh flow on 401 errors
- ✅ Graceful logout on refresh failure
- ✅ Integration with backend auth endpoints

### Styling
- ✅ Material UI theme configured
- ✅ Responsive design
- ✅ Clean, modern UI

---

## 🧪 Testing Authentication

### 1. Register a New User

1. Navigate to http://localhost:3001/register
2. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Password: password123
   - Accept Terms: ✓
3. Click "Create Account"
4. You should be redirected to home page and see "Welcome, john@example.com"

### 2. Logout and Login

1. Click "Logout" in the header
2. Click "Login" in the header
3. Enter credentials:
   - Email: john@example.com
   - Password: password123
4. Click "Sign In"
5. You should be logged in and redirected to home

### 3. Test Token Persistence

1. After logging in, refresh the page
2. You should still be logged in (auth state persists)

### 4. Test Protected Routes

1. Logout
2. Try to access a protected route (once we add them)
3. You should be redirected to `/login?redirect=/protected-route`

---

## 📁 Project Structure

```
web-app/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with theme & auth
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global CSS
│   ├── login/
│   │   └── page.tsx         # Login page
│   └── register/
│       └── page.tsx         # Register page
│
├── components/              # React components
│   ├── auth/
│   │   ├── GuestOnly.tsx   # Guest-only route wrapper
│   │   └── ProtectedRoute.tsx # Protected route wrapper
│   └── layout/
│       └── Header.tsx       # Header component
│
├── context/
│   └── AuthContext.tsx      # Auth context provider
│
├── services/
│   ├── api.ts              # Axios instance with interceptors
│   └── auth.service.ts     # Authentication API calls
│
├── hooks/
│   └── useAuth.ts          # Custom auth hook
│
├── utils/
│   └── token.ts            # Token management utilities
│
├── theme/
│   └── theme.ts            # Material UI theme
│
├── types/
│   └── auth.ts             # TypeScript type definitions
│
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

---

## 🔧 Configuration

### Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### API Endpoints Used

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Token refresh
- `POST /api/v1/auth/logout` - User logout

---

## 🎨 Theme Customization

The Material UI theme is configured in `theme/theme.ts`:

- **Primary Color:** Blue (#2563eb)
- **Secondary Color:** Purple (#7c3aed)
- **Font:** System fonts with Roboto fallback
- **Border Radius:** 8px

To customize, edit `theme/theme.ts`.

---

## 🔐 Security Features

### Token Management
- Access tokens stored in localStorage (MVP approach)
- Refresh tokens stored separately
- Automatic token refresh on 401 errors
- Tokens cleared on logout or refresh failure

### Route Protection
- Protected routes redirect unauthenticated users to login
- Guest-only routes redirect authenticated users to home
- Redirect parameter preserves intended destination

### API Security
- Authorization header automatically attached to all requests
- Failed refresh triggers logout and redirect to login
- Request queue during token refresh prevents duplicate requests

---

## 🚧 Next Steps

Ready to build:

1. **Product Listing Page** - Browse customizable products
2. **Product Details Page** - View product details and customizations
3. **Shopping Cart** - Add products and manage cart
4. **Checkout Flow** - Place orders with payment
5. **User Dashboard** - View orders and profile

---

## 📝 Notes

- **No Redux/Zustand** - Using React Context for simplicity
- **No over-engineering** - Clean, readable MVP code
- **Backend-integrated** - Real API calls, no mocking
- **TypeScript throughout** - Type safety everywhere
- **Material UI** - Consistent, professional design

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on `http://localhost:3000`
- Check `.env.local` has correct API URL
- Verify CORS is enabled in backend

### "Token refresh failed"
- Clear localStorage and login again
- Check backend `/auth/refresh-token` endpoint is working

### "Page won't load"
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `npm install`
- Restart dev server: `npm run dev`

---

**Ready to build the marketplace! 🎉**
