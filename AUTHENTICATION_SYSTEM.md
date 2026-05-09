# Authentication System Documentation

## Overview
The Scratch Solid Solutions authentication system provides secure login and signup functionality for both admin and staff users. The system uses JWT tokens, bcrypt password hashing, and comprehensive security measures.

## User Roles
- **Admin**: Full access to all system features including user management, service management, and administrative functions
- **Staff**: Limited access to assigned features and client management
- **Cleaner**: Access to cleaning schedules, client information, and task completion

## Authentication Flow

### Login Process
1. **Endpoint**: `POST /api/auth/login`
2. **Request Body**:
   ```json
   {
     "username": "email@domain.com",  // Admin users use email
     "password": "user_password"
   }
   ```
3. **Response**:
   ```json
   {
     "token": "jwt_token",
     "refreshToken": "refresh_token",
     "expiresIn": 3600,
     "role": "admin|staff|cleaner",
     "username": "user_email",
     "user_id": 123,
     "email": "user_email",
     "name": "User Name"
   }
   ```

### Signup Process
1. **Endpoint**: `POST /api/auth/signup`
2. **Request Body**:
   ```json
   {
     "email": "email@domain.com",
     "password": "user_password",
     "name": "Full Name",
     "phone": "optional_phone",
     "role": "admin|staff"  // Optional, defaults to 'staff'
   }
   ```
3. **Response**:
   ```json
   {
     "message": "User created successfully",
     "user": {
       "id": 123,
       "email": "user_email",
       "name": "Full Name",
       "role": "admin|staff",
       "phone": "optional_phone"
     }
   }
   ```

## Security Features

### Password Security
- **Hashing**: bcrypt with salt rounds = 12
- **Validation**: Password strength requirements enforced
- **Storage**: Only password hashes stored, never plain text

### Rate Limiting
- **Login Attempts**: Limited to prevent brute force attacks
- **Account Lockout**: 5 failed attempts = 15 minute lockout
- **IP Tracking**: All authentication attempts logged with IP addresses

### Session Management
- **JWT Tokens**: 1-hour expiration
- **Refresh Tokens**: 30-day expiration
- **Concurrent Sessions**: Maximum 3 sessions per user
- **Automatic Cleanup**: Expired sessions automatically removed

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'cleaner')),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  business_name TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked INTEGER DEFAULT 0,
  revoked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Admin Credentials

### Current Admin Users
1. **Jason Tshaka**
   - Email: `it@scratchsolidsolutions.org`
   - Password: `0736417176`
   - Phone: `0736417176`
   - Role: `admin`

2. **Arnica Nqayi**
   - Email: `customerservice@scratchsolidsolutions.org`
   - Password: `0746998097`
   - Phone: `0746998097`
   - Role: `admin`

## Environment Variables

### Required Environment Variables
```bash
JWT_SECRET=your_32_character_minimum_secret_key
```

### Security Warnings
- JWT_SECRET must be set in production
- Minimum 32 characters recommended for JWT_SECRET
- Database connections must be secure
- All authentication attempts are logged

## Error Handling

### Common Error Responses
```json
{
  "error": "Missing credentials"        // HTTP 400
}
{
  "error": "Invalid credentials"        // HTTP 401
}
{
  "error": "Account temporarily locked. Try again later."  // HTTP 423
}
{
  "error": "User with this email already exists"  // HTTP 409
}
```

## Testing

### Test Admin Login
```javascript
const testLogin = async () => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'it@scratchsolidsolutions.org',
      password: '0736417176'
    })
  });
  
  const result = await response.json();
  console.log('Login Result:', result);
};
```

## Security Best Practices

### For Developers
1. **Never** store plain text passwords
2. **Always** use bcrypt for password hashing
3. **Always** validate and sanitize inputs
4. **Always** use HTTPS in production
5. **Always** implement rate limiting
6. **Always** log authentication attempts
7. **Always** use environment variables for secrets

### For Users
1. **Never** share passwords
2. **Always** use strong passwords
3. **Always** log out after use
4. **Always** report suspicious activity
5. **Always** use official company email addresses

## Troubleshooting

### Common Issues
1. **"Login failed"**: Check email/password, verify user exists in database
2. **"Account locked"**: Wait 15 minutes or contact admin
3. **"JWT_SECRET error"**: Set environment variable
4. **"Database not available"**: Check database connection

### Debug Commands
```bash
# Check admin users
npx wrangler d1 execute scratchsolid_db --command "SELECT email, role, name FROM users WHERE role = 'admin'"

# Check failed attempts
npx wrangler d1 execute scratchsolid_db --command "SELECT email, failed_attempts, locked_until FROM users WHERE failed_attempts > 0"
```

## Deployment Notes

### Database Migration
- Run SQL scripts to create admin users
- Verify password hashes are correctly generated
- Test login functionality before deployment

### Environment Setup
- Ensure JWT_SECRET is set in production
- Configure database bindings correctly
- Test all authentication endpoints

This documentation provides comprehensive information for future developers to understand, maintain, and extend the authentication system.
