# Clinic Authentication APIs

This document outlines the authentication endpoints for the clinic side of the application. These endpoints allow clinics to authenticate, retrieve their profile details, and log out.

**Base Path:** `/api/auth`

---

## 1. Clinic Login

Authenticates a clinic using their clinic name, username, and password. All three fields must be provided. On successful authentication, a JSON Web Token (JWT) is returned which should be used for subsequent authorized requests.

**Endpoint:** `POST /api/auth/login`

### Request Body (JSON)

| Field        | Type   | Required | Description                                     |
| ------------ | ------ | -------- | ----------------------------------------------- |
| `clinicName` | String | Yes      | The clinic's name                               |
| `username`   | String | Yes      | The clinic's username                           |
| `password`   | String | Yes      | The clinic's password                           |

**Example:**
```json
{
  "clinicName": "My Clinic",
  "username": "myclinic",
  "password": "securepassword123"
}
```

### Success Response (200 OK)

Returns the JWT token and the clinic details (excluding sensitive fields like `password` and `deleted_at`).

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "clinic": {
    "id": "uuid-here",
    "name": "My Clinic",
    "email": "contact@myclinic.com",
    "phone": "1234567890",
    "address": "123 Health St",
    "timezone": "UTC",
    "subscription_plan": "Starter",
    "subscription_status": "active",
    "username": "myclinic"
  }
}
```

### Error Responses

- **400 Bad Request:** Missing `username` or `password`.
  ```json
  { "success": false, "error": "username and password are required" }
  ```
- **401 Unauthorized:** Invalid credentials or the clinic has been deleted.
  ```json
  { "success": false, "error": "Invalid credentials" }
  ```
- **403 Forbidden:** The clinic account is `suspended` or `canceled`.
  ```json
  { "success": false, "error": "Your clinic account has been suspended. Please contact support." }
  ```

---

## 2. Get Current Clinic Details (Me)

Retrieves the details of the currently authenticated clinic. 

*Note: In the current implementation (`auth.js`), this route relies on `req.clinic_id`, which is typically populated by the `authenticateToken` middleware.*

**Endpoint:** `GET /api/auth/me`

### Headers

| Header          | Value                 | Required |
| --------------- | --------------------- | -------- |
| `Authorization` | `Bearer <jwt_token>`  | Yes      |

### Success Response (200 OK)

```json
{
  "success": true,
  "clinic": {
    "id": "uuid-here",
    "name": "My Clinic",
    "email": "contact@myclinic.com",
    "phone": "1234567890",
    "address": "123 Health St",
    "timezone": "UTC",
    "subscription_plan": "Starter",
    "subscription_status": "active",
    "username": "myclinic",
    "created_at": "2023-10-01T12:00:00.000Z"
  }
}
```

### Error Responses

- **404 Not Found:** Clinic not found in the database.
  ```json
  { "success": false, "error": "Clinic not found" }
  ```

---

## 3. Logout

Logs out the currently authenticated clinic. Since the system uses stateless JWT tokens, this endpoint acts primarily as an acknowledgment. The client should discard the token locally to effectively log out the user.

**Endpoint:** `POST /api/auth/logout`

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Authentication Middleware

The `auth.js` file also exports an `authenticateToken` middleware that can be used to protect other routes across the application. 

### Behavior:
1. It expects the JWT token in the `Authorization` header in the format `Bearer <token>`.
2. If the token is missing, it returns a **401 Unauthorized** error.
3. If the token is invalid or expired, it returns a **401 Unauthorized** error with a descriptive message.
4. On success, it decodes the token and attaches `clinic_id` and `username` to the request object (`req.clinic_id`, `req.username`) for downstream use.
