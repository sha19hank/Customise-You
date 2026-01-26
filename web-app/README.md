# CustomiseYou Web Application

Next.js 13+ web application for the CustomiseYou marketplace platform.

## Stack

- **Next.js 13+** with App Router
- **TypeScript**
- **React 18**
- **Material UI (MUI)**
- **Axios** for API calls
- **JWT Authentication**

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Backend API running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
/app
  /layout.tsx          - Root layout with theme and auth
  /page.tsx            - Home page
  /login/page.tsx      - Login page
  /register/page.tsx   - Registration page

/components
  /auth                - Authentication components
  /layout              - Layout components (Header, etc.)

/context
  /AuthContext.tsx     - Authentication context and provider

/services
  /api.ts              - Axios instance with interceptors
  /auth.service.ts     - Authentication API calls

/utils
  /token.ts            - Token management utilities

/theme
  /theme.ts            - Material UI theme configuration

/types
  /auth.ts             - TypeScript type definitions
```

## Features Implemented

✅ User registration with terms acceptance  
✅ User login with JWT tokens  
✅ Automatic token refresh on 401  
✅ Protected routes  
✅ Guest-only routes (login/register)  
✅ Persistent authentication  
✅ Clean Material UI design  
✅ TypeScript throughout  

## API Integration

The app integrates with the backend API:

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Token refresh
- `POST /api/v1/auth/logout` - Logout

## Authentication Flow

1. User logs in or registers
2. Backend returns access token + refresh token
3. Tokens stored in localStorage
4. Access token attached to all API requests
5. On 401 error, automatically refresh token
6. If refresh fails, redirect to login

## Next Steps

- Product listing page
- Product details page
- Shopping cart
- Checkout flow
- User dashboard
