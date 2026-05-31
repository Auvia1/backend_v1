# Admin Login API Documentation

This document describes the API endpoints for the Admin Login system. The system allows creating new admin accounts and authenticating via manual email login.

## Base URL
`/api/adminlogin`

## Endpoints

### 1. Admin Registration
Registers a new administrator account and hashes their password.

- **URL:** `/api/adminlogin/register`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "name": "Super Admin",
  "email": "admin@example.com",
  "phone": "1234567890",
  "password": "your_secure_password"
}
```

#### Success Response (201 Created)
Returns the created admin profile.

```json
{
  "success": true,
  "message": "Admin registered successfully",
  "admin": {
    "id": "uuid-here",
    "name": "Super Admin",
    "email": "admin@example.com",
    "phone": "1234567890",
    "is_active": true,
    "created_at": "2026-05-31T00:00:00.000Z"
  }
}
```

#### Error Responses
- **400 Bad Request:** Missing fields, or invalid email/phone format constraints.
- **409 Conflict:** An admin with this email already exists.
- **500 Internal Server Error:** Server-side error.

---

### 2. Admin Login
Authenticates an administrator using their email and password and returns a JWT token for subsequent requests.

- **URL:** `/api/adminlogin/`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "admin@example.com",
  "password": "your_secure_password"
}
```

#### Success Response (200 OK)
Returns a JWT token and safe admin details (omitting the password hash).

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "admin": {
    "id": "uuid-here",
    "name": "Super Admin",
    "email": "admin@example.com",
    "phone": "1234567890",
    "is_active": true
  }
}
```

#### Error Responses
- **400 Bad Request:** Missing email or password.
- **401 Unauthorized:** Invalid credentials.
- **403 Forbidden:** Admin account is inactive (`is_active` = false).
- **500 Internal Server Error:** Server-side error.

---

### 3. Get Admin Profile
Retrieves the profile information for the currently authenticated admin. 

- **URL:** `/api/adminlogin/me`
- **Method:** `GET`
- **Auth Required:** Yes (Admin JWT Token)

#### Headers
```
Authorization: Bearer <your_jwt_token>
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "admin": {
    "id": "uuid-here",
    "name": "Super Admin",
    "email": "admin@example.com",
    "phone": "1234567890",
    "is_active": true,
    "created_at": "2026-05-31T00:00:00.000Z",
    "updated_at": "2026-05-31T00:00:00.000Z"
  }
}
```

#### Error Responses
- **401 Unauthorized:** Token is missing, invalid, or expired.
- **403 Forbidden:** The token provided does not have admin privileges.
- **404 Not Found:** Admin not found or inactive.
- **500 Internal Server Error:** Server-side error.

---

### 4. Get All Users
Retrieves a list of all users from the admin_login table. This endpoint is restricted to superadmins.

- **URL:** `/api/adminlogin/users`
- **Method:** `GET`
- **Auth Required:** Yes (Admin JWT Token, role must be `superadmin`)

#### Success Response (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com",
      "phone": "1234567890",
      "approval_status": "approved",
      "role": "regular",
      "is_active": true,
      "created_at": "2026-05-31T00:00:00.000Z",
      "updated_at": "2026-05-31T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Error Responses
- **401 Unauthorized:** Token is missing, invalid, or expired.
- **403 Forbidden:** Token does not have superadmin privileges.
- **500 Internal Server Error:** Server-side error.

---

### 5. Get Pending Users
Retrieves a list of all users whose approval status is `pending`. This endpoint is restricted to superadmins.

- **URL:** `/api/adminlogin/pending`
- **Method:** `GET`
- **Auth Required:** Yes (Admin JWT Token, role must be `superadmin`)

#### Success Response (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "Pending User",
      "email": "pending@example.com",
      "phone": "1234567890",
      "approval_status": "pending",
      "role": "regular",
      "is_active": true,
      "created_at": "2026-05-31T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Error Responses
- **401 Unauthorized:** Token is missing, invalid, or expired.
- **403 Forbidden:** Token does not have superadmin privileges.
- **500 Internal Server Error:** Server-side error.

---

### 6. Approve Registration
Approves a pending user registration. This endpoint is restricted to superadmins.

- **URL:** `/api/adminlogin/:id/approve`
- **Method:** `PATCH`
- **Auth Required:** Yes (Admin JWT Token, role must be `superadmin`)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Registration approved successfully",
  "admin": {
    "id": "uuid",
    "name": "Pending User",
    "email": "pending@example.com",
    "approval_status": "approved"
  }
}
```

#### Error Responses
- **400 Bad Request:** Registration is already approved or rejected.
- **401 Unauthorized:** Token is missing, invalid, or expired.
- **403 Forbidden:** Token does not have superadmin privileges.
- **404 Not Found:** Registration not found.
- **500 Internal Server Error:** Server-side error.

---

### 7. Reject Registration
Rejects a pending user registration. This endpoint is restricted to superadmins.

- **URL:** `/api/adminlogin/:id/reject`
- **Method:** `PATCH`
- **Auth Required:** Yes (Admin JWT Token, role must be `superadmin`)

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Registration rejected",
  "admin": {
    "id": "uuid",
    "name": "Pending User",
    "email": "pending@example.com",
    "approval_status": "rejected"
  }
}
```

#### Error Responses
- **400 Bad Request:** Registration is already approved or rejected.
- **401 Unauthorized:** Token is missing, invalid, or expired.
- **403 Forbidden:** Token does not have superadmin privileges.
- **404 Not Found:** Registration not found.
- **500 Internal Server Error:** Server-side error.

---

## Authentication Mechanism

1. **Tokens:** 
   The endpoints use standard JWT authentication. When an admin successfully logs in, the server generates a token with the payload `{ admin_id: "...", email: "...", role: "admin" }`. This token must be sent in the `Authorization` header as `Bearer <token>` for any secured admin endpoints.

2. **Password Hashing:** 
   The server supports standard bcrypt password hashes (format starting with `$2`). If the stored `password_hash` is not a bcrypt hash, it falls back to a secure plain text comparison. It is highly recommended to store hashes using `bcrypt` rather than plain text.

## Database Constraints Recap
* The `email` field must be valid and unique.
* The `phone` field must contain exactly 10 digits.
* `password_hash` and `name` must not be empty.
