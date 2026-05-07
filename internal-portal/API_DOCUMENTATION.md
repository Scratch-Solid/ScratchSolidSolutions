# API Documentation

## Overview

This document describes the API endpoints for the Scratch Solid Solutions Internal Portal.

**Base URL**: `https://internal.scrapsolidsolutions.co.za/api`

**API Version**: v1

**Authentication**: Bearer JWT token in Authorization header

## Authentication

All endpoints (except auth endpoints) require authentication via JWT token.

### Headers
```
Authorization: Bearer <jwt_token>
X-CSRF-Token: <csrf_token> (for state-changing operations)
X-API-Version: v1
```

## Endpoints

### Authentication

#### POST /api/auth/login
Authenticate a user and receive access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123...",
  "expiresIn": 3600,
  "role": "admin",
  "username": "user@example.com",
  "user_id": 1,
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### POST /api/auth/refresh
Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "abc123..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def456...",
  "expiresIn": 3600
}
```

#### POST /api/auth/logout
Logout and invalidate the current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/auth/forgot-password
Initiate password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### POST /api/auth/reset-password
Reset password using token.

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### Cleaner Profile

#### GET /api/cleaner-profile
Get cleaner profiles with pagination.

**Query Parameters:**
- `username` (optional): Filter by username
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### POST /api/cleaner-profile
Create a new cleaner profile.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "department": "Cleaning",
  "paysheet_code": "P12345"
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "department": "Cleaning",
  "paysheet_code": "P12345"
}
```

#### PUT /api/cleaner-profile
Update a cleaner profile.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Smith"
}
```

**Response (200):**
```json
{
  "id": 1,
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Smith"
}
```

### Pending Contracts

#### GET /api/pending-contracts
Get pending contracts with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

#### POST /api/pending-contracts
Create a new pending contract.

**Headers:** `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "idPassportNumber": "1234567890123",
  "contactNumber": "+27 82 123 4567",
  "positionAppliedFor": "Cleaner",
  "department": "Cleaning",
  "applicantSignature": true
}
```

**Response (201):**
```json
{
  "id": 1,
  "fullName": "John Doe",
  "status": "pending_approval"
}
```

#### PUT /api/pending-contracts/:id
Update pending contract status.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "status": "approved"
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "approved"
}
```

#### DELETE /api/pending-contracts/:id
Delete a pending contract.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Response (204):** No content

### Bookings

#### GET /api/bookings/:id
Get booking details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "service_id": 1,
  "booking_date": "2025-05-10",
  "status": "confirmed"
}
```

#### PUT /api/bookings/:id
Update booking status.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "completed"
}
```

### Admin Audit

#### GET /api/admin/audit
Get audit logs with pagination.

**Query Parameters:**
- `admin_id` (optional): Filter by admin ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

#### POST /api/admin/audit
Create an audit log entry.

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "admin_id": 1,
  "action": "update",
  "resource_type": "cleaner_profile",
  "resource_id": 10,
  "details": "{}"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Data Rights (POPIA)

#### GET /api/data-rights
Get personal data (data subject access right).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+27 82 123 4567",
    "role": "cleaner",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "cleaner_profile": {...},
  "bookings": [...],
  "audit_activity": [...],
  "data_collected_at": "2025-05-07T10:00:00Z"
}
```

#### DELETE /api/data-rights
Delete personal data (data subject deletion right).

**Headers:** `Authorization: Bearer <token>`, `X-CSRF-Token: <token>`

**Request Body:**
```json
{
  "confirmation": "DELETE_MY_DATA"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Your data has been deleted as per your rights under POPIA"
}
```

### Health & Status

#### GET /api/health
Health check endpoint.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-05-07T10:00:00Z"
}
```

#### GET /api/status
System status endpoint.

**Response (200):**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 86400
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "category": "AUTHENTICATION|AUTHORIZATION|VALIDATION|DATABASE|RATE_LIMIT|CSRF|NOT_FOUND|SERVER_ERROR",
  "severity": "low|medium|high|critical"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

- Default: 100 requests per minute per IP
- Auth endpoints: Stricter limits apply
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Security

- All state-changing operations require CSRF token
- JWT tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Maximum 3 concurrent sessions per user
- Account lockout after 5 failed attempts (15 minutes)

## POPIA Compliance

- Data subject rights implemented via `/api/data-rights`
- Audit logging for all admin operations
- Data retention policies enforced
- Consent management for data collection
