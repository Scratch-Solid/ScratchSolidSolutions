# User Seeding Guide

## Admin User Signup/Login Flow

### How Admin Users Are Created
Admin users cannot self-sign up through the UI for security reasons. Admin users must be created through:
1. The `/api/seed-users` endpoint (for development/testing)
2. Direct database insertion (for production)
3. Admin panel (to be implemented)

### Admin Login
- **Username**: Email address (e.g., admin@example.com)
- **Password**: Password set during creation
- **Redirect**: Redirects to `/admin-dashboard` upon successful login

### Cleaner User Signup/Login Flow

### How Cleaner Users Are Created
Cleaner users can be created through:
1. The `/api/seed-users` endpoint (for development/testing)
2. The "Become part of the Team" flow:
   - User fills consent form at `/auth/employee-consent`
   - User creates password
   - Data submitted to `/api/pending-contracts`
   - Admin approves in admin dashboard
   - User account and cleaner profile are created
   - User can then login with paysheet code or phone number

### Cleaner Login
- **Username**: Paysheet code OR phone number
- **Password**: Password set during consent flow
- **Redirect**: Redirects to appropriate dashboard based on department:
  - Scratch → `/cleaner-dashboard`
  - Solid → `/digital-dashboard`
  - Trans → `/transport-dashboard`

## Using the Seed Users API

### Endpoint
`POST /api/seed-users`

### Request Body
```json
{
  "seedKey": "dev-seed-key-123",
  "userType": "admin",
  "email": "admin@example.com",
  "password": "Admin@123",
  "name": "Admin User",
  "phone": "+27123456789",
  "department": "cleaning",
  "paysheetCode": "SCRATCH123"
}
```

### User Types
- `admin`: Creates admin user (login with email)
- `cleaner`: Creates cleaner user (login with paysheet code or phone)
- `digital`: Creates digital team user (login with paysheet code or phone)
- `transport`: Creates transport team user (login with paysheet code or phone)

### Example: Create Admin User
```bash
curl -X POST http://localhost:3000/api/seed-users \
  -H "Content-Type: application/json" \
  -d '{
    "seedKey": "dev-seed-key-123",
    "userType": "admin",
    "email": "admin@scratchsolid.co.za",
    "password": "Admin@123",
    "name": "System Admin"
  }'
```

### Example: Create Cleaner User
```bash
curl -X POST http://localhost:3000/api/seed-users \
  -H "Content-Type: application/json" \
  -d '{
    "seedKey": "dev-seed-key-123",
    "userType": "cleaner",
    "email": "cleaner@scratchsolid.co.za",
    "password": "Cleaner@123",
    "name": "Test Cleaner",
    "phone": "+27821234567",
    "department": "cleaning",
    "paysheetCode": "SCRATCH001"
  }'
```

### Response
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@scratchsolid.co.za",
    "role": "admin",
    "name": "System Admin",
    "phone": "",
    "paysheetCode": null
  },
  "token": "jwt-token-here",
  "loginCredentials": {
    "username": "admin@scratchsolid.co.za",
    "password": "Admin@123"
  }
}
```

## Test Credentials

### Admin User
- **Email**: admin@scratchsolid.co.za
- **Password**: Admin@123
- **Login**: Use email as username

### Cleaner User
- **Paysheet Code**: SCRATCH001
- **Phone**: +27821234567
- **Password**: Cleaner@123
- **Login**: Use paysheet code OR phone as username

## Important Notes

1. **Seed Key**: The default seed key is `dev-seed-key-123`. In production, set `SEED_KEY` environment variable for security.
2. **Password Policy**: Passwords must be at least 8 characters with uppercase, lowercase, number, and special character.
3. **Admin Security**: Admin users should only be created through secure methods in production.
4. **Cleaner Onboarding**: The preferred flow for cleaners is through the "Become part of the Team" consent form, not direct seeding.
