# Auvia Backend API Documentation

## Overview
- **Base URL**: `http://localhost:4002/api` (or your deployed URL)
- **Authentication**: JWT Bearer token (except `/auth/login` and `/clinics/register`)
- **Default Headers**: `Content-Type: application/json`
- **Auth Header Format**: `Authorization: Bearer <jwt_token>`

---

## 🔐 Authentication APIs (3 Total)

### 1. POST /auth/login

### 1. POST /auth/login
**Login clinic admin**

**Input:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "clinic": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "timezone": "string",
    "subscription_plan": "string",
    "subscription_status": "string",
    "username": "string",
    "created_at": "ISO timestamp"
  }
}
```

**Output (Error 401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 2. GET /auth/me
**Get current logged-in clinic info**

**Authentication**: Required ✅

**Input**: None (uses token from header)

**Output (Success 200):**
```json
{
  "success": true,
  "clinic": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "timezone": "string",
    "subscription_plan": "string",
    "subscription_status": "string",
    "username": "string",
    "created_at": "ISO timestamp"
  }
}
```

---

### 3. POST /auth/logout
**Logout (invalidates token on frontend)**

**Authentication**: Required ✅

**Input**: None

**Output (Success 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🏥 Clinic Registration & Management (6 Total)

### 4. POST /clinics/register
**Complete clinic registration (multi-step form submission)**
This is the main endpoint for your NewClinicDialog component.

**Authentication**: NOT required ❌

**Input:**
```json
{
  "username": "string (required, unique username for clinic login)",
  "password": "string (required, clinic login password)",

  "clinicName": "string (required)",
  "clinicType": "string (optional)",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "postal": "string (optional)",
  "phone": "string (required, must be 10 digits)",
  "email": "string (required, valid email)",
  "latitude": "number (optional, decimal format)",
  "longitude": "number (optional, decimal format)",

  "ownerName": "string (required)",
  "ownerEmail": "string (required, valid email)",
  "ownerPhone": "string (optional)",
  "ownerId": "string (optional, govt ID/license)",

  "receptionistName": "string (optional)",
  "receptionistEmail": "string (optional, valid email)",
  "receptionistPhone": "string (optional)",
  "receptionistShift": "string (optional, e.g., '9AM-6PM')",

  "plan": "string (optional, Starter/Growth/Enterprise/trial)",
  "billingCycle": "string (optional, Monthly/Quarterly/Annually)",
  "paymentMethod": "string (optional, Card/UPI/Bank Transfer)",
  "gstNumber": "string (optional, 15 chars GST format)",

  "contractStart": "date string (YYYY-MM-DD, optional)",
  "contractEnd": "date string (YYYY-MM-DD, optional)",
  "agreement": "boolean (optional, default false)",

  "documents": [
    {
      "name": "string (filename)",
      "url": "string (cloud storage URL)",
      "type": "string (MIME type, e.g., application/pdf)",
      "docType": "string (clinic_license, tax_id, etc.)"
    }
  ]
}
```

**Output (Success 201):**
```json
{
  "success": true,
  "message": "Clinic registered successfully",
  "data": {
    "clinic_id": "uuid"
  }
}
```

**Output (Error 400):**
```json
{
  "success": false,
  "error": "Clinic name, email, and phone are required"
}
```

---

### 5. GET /clinics/:id
**Get clinic details**

**Authentication**: Required ✅

**Input**:
- Path Parameter: `id` (clinic_id)

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "timezone": "string",
    "subscription_plan": "string",
    "subscription_status": "string",
    "username": "string",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

---

### 6. PATCH /clinics/:id
**Update clinic info**

**Authentication**: Required ✅

**Input:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "timezone": "string (optional, e.g., 'Asia/Kolkata')"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "timezone": "string",
    "subscription_plan": "string",
    "subscription_status": "string",
    "username": "string",
    "updated_at": "ISO timestamp"
  }
}
```

---

### 7. POST /clinics/:id/change-password
**Change clinic password**

**Authentication**: Required ✅

**Input:**
```json
{
  "current_password": "string (required)",
  "new_password": "string (required)"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### 8. GET /clinics/admin/stats
**Get dashboard statistics (total clinics, phone numbers, breakdown by status/plan)**

**Authentication**: Required ✅

**Input**: None (uses query token)

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "totalClinics": 42,
    "totalPhoneNumbers": 87,
    "statusBreakdown": {
      "trial": 10,
      "active": 28,
      "past_due": 2,
      "suspended": 2,
      "canceled": 0
    },
    "planBreakdown": {
      "trial": 10,
      "Starter": 15,
      "Growth": 12,
      "Enterprise": 5
    },
    "recentClinics": [
      {
        "id": "uuid",
        "name": "Apollo Clinic",
        "email": "apollo@example.com",
        "phone": "9876543210",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. John Smith",
        "created_at": "2026-03-28T01:07:41Z"
      }
    ]
  }
}
```

---

### 9. GET /clinics/admin/all
**Get all clinics with pagination, search, and filters**

**Authentication**: Required ✅

**Input:**
- Query Parameters (all optional):
  - `page` (integer, default: 1) - Page number
  - `limit` (integer, default: 20) - Clinics per page
  - `search` (string) - Search by name, email, or phone
  - `status` (string) - Filter by subscription_status (trial/active/past_due/suspended/canceled)
  - `plan` (string) - Filter by subscription_plan (Starter/Growth/Enterprise/trial)

**Example Request:**
```
GET /api/clinics/admin/all?page=1&limit=20&search=apollo&status=active
```

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "uuid",
        "name": "Apollo Clinic",
        "email": "clinic@example.com",
        "phone": "9876543210",
        "clinic_type": "General Practice",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. John Smith",
        "created_at": "2026-03-28T01:07:41Z",
        "updated_at": "2026-03-28T01:07:41Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

---

## 👥 User Management (5 Total) (Owners, Receptionists, Doctors)

### 8. GET /users?clinic_id=<id>
**List all users for a clinic**

**Authentication**: Required ✅

**Input:**
- Query Parameter: `clinic_id` (required)

**Output (Success 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "role": "clinic_admin | receptionist | doctor | super_admin",
      "govt_id": "string (for owners)",
      "shift_hours": "string (for receptionists, e.g., '9AM-6PM weekdays')",
      "is_active": "boolean",
      "created_at": "ISO timestamp"
    }
  ]
}
```

---

### 9. GET /users/:id
**Get single user details**

**Authentication**: Required ✅

**Input:**
- Path Parameter: `id` (user_id)

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "govt_id": "string",
    "shift_hours": "string",
    "is_active": "boolean",
    "created_at": "ISO timestamp"
  }
}
```

---

### 10. POST /users
**Create new user (owner, receptionist, or doctor)**

**Authentication**: Required ✅

**Input:**
```json
{
  "clinic_id": "uuid (required)",
  "name": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (optional, 10 digits)",
  "role": "string (required: clinic_admin, receptionist, doctor)",
  "govt_id": "string (optional, for owners)",
  "shift_hours": "string (optional, for receptionists)"
}
```

**Output (Success 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "is_active": true,
    "created_at": "ISO timestamp"
  }
}
```

---

### 11. PATCH /users/:id
**Update user details**

**Authentication**: Required ✅

**Input:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "role": "string (optional)",
  "govt_id": "string (optional)",
  "shift_hours": "string (optional)",
  "is_active": "boolean (optional)"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "is_active": "boolean",
    "created_at": "ISO timestamp"
  }
}
```

---

### 12. DELETE /users/:id
**Delete user (soft delete)**

**Authentication**: Required ✅

**Input:**
- Path Parameter: `id` (user_id)

**Output (Success 200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 💳 Billing Management (3 Total)

### 13. GET /billing/:clinic_id
**Get clinic billing information**

**Authentication**: Required ✅

**Input:**
- Path Parameter: `clinic_id` (required)

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "plan": "Starter | Growth | Enterprise | trial",
    "billing_cycle": "Monthly | Quarterly | Annually",
    "payment_method": "Card | UPI | Bank Transfer",
    "card_last4": "string (last 4 digits, e.g., '4242')",
    "card_name": "string",
    "card_expiry": "string (MM/YY format)",
    "gst_number": "string",
    "monthly_amount": "decimal",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

---

### 14. POST /billing
**Create or update billing information**

**Authentication**: Required ✅

**Input:**
```json
{
  "clinic_id": "uuid (required)",
  "plan": "string (required: Starter, Growth, Enterprise, trial)",
  "billing_cycle": "string (optional, Monthly/Quarterly/Annually)",
  "payment_method": "string (optional, Card/UPI/Bank Transfer)",
  "card_last4": "string (optional, 4 digits only)",
  "card_name": "string (optional)",
  "card_expiry": "string (optional, MM/YY format)",
  "gst_number": "string (optional, 15 chars GST format)",
  "monthly_amount": "decimal (optional)"
}
```

**Output (Success 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "plan": "string",
    "billing_cycle": "string",
    "payment_method": "string",
    "card_last4": "string",
    "card_name": "string",
    "card_expiry": "string",
    "gst_number": "string",
    "monthly_amount": "decimal"
  }
}
```

**Note**: Never send raw card numbers. Only send last 4 digits.

---

### 15. PATCH /billing/:clinic_id
**Update billing information**

**Authentication**: Required ✅

**Input:**
```json
{
  "plan": "string (optional)",
  "billing_cycle": "string (optional)",
  "payment_method": "string (optional)",
  "card_last4": "string (optional)",
  "card_name": "string (optional)",
  "card_expiry": "string (optional)",
  "gst_number": "string (optional)",
  "monthly_amount": "decimal (optional)"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "plan": "string",
    "billing_cycle": "string",
    "payment_method": "string",
    "card_last4": "string",
    "card_name": "string",
    "card_expiry": "string",
    "gst_number": "string",
    "monthly_amount": "decimal"
  }
}
```

---

## 📄 Documents Management (3 Total)

### 16. GET /documents?clinic_id=<id>
**List all documents for a clinic**

**Authentication**: Required ✅

**Input:**
- Query Parameter: `clinic_id` (required)

**Output (Success 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "file_name": "string",
      "file_url": "string (cloud storage URL)",
      "file_type": "string (MIME type)",
      "file_size": "integer (bytes)",
      "doc_type": "string (clinic_license, tax_id, etc.)",
      "created_at": "ISO timestamp"
    }
  ]
}
```

---

### 17. POST /documents
**Save document metadata (upload files to cloud storage first)**

**Authentication**: Required ✅

**Input:**
```json
{
  "clinic_id": "uuid (required)",
  "file_name": "string (required, e.g., 'clinic_license.pdf')",
  "file_url": "string (required, full cloud storage URL)",
  "file_type": "string (required, MIME type, e.g., 'application/pdf')",
  "file_size": "integer (optional, bytes)",
  "doc_type": "string (optional, clinic_license, tax_id, approval)"
}
```

**Output (Success 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "file_name": "string",
    "file_url": "string",
    "file_type": "string",
    "file_size": "integer",
    "doc_type": "string",
    "created_at": "ISO timestamp"
  }
}
```

---

### 18. DELETE /documents/:id
**Delete document record**

**Authentication**: Required ✅

**Input:**
- Path Parameter: `id` (document_id)

**Output (Success 200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Note**: This only deletes the record. You need to delete the actual file from cloud storage separately.

---

## 📋 Contracts Management (3 Total)

### 19. GET /contracts/:clinic_id
**Get clinic contract**

**Authentication**: Required ✅

**Input:**
- Path Parameter: `clinic_id` (required)

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "contract_start": "date (YYYY-MM-DD)",
    "contract_end": "date (YYYY-MM-DD)",
    "agreement": "boolean",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

---

### 20. POST /contracts
**Create contract**

**Authentication**: Required ✅

**Input:**
```json
{
  "clinic_id": "uuid (required)",
  "contract_start": "date string (required, YYYY-MM-DD)",
  "contract_end": "date string (required, YYYY-MM-DD)",
  "agreement": "boolean (optional, default false)"
}
```

**Output (Success 201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "contract_start": "date",
    "contract_end": "date",
    "agreement": "boolean",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

---

### 21. PATCH /contracts/:clinic_id
**Update contract**

**Authentication**: Required ✅

**Input:**
```json
{
  "contract_start": "date string (optional, YYYY-MM-DD)",
  "contract_end": "date string (optional, YYYY-MM-DD)",
  "agreement": "boolean (optional)"
}
```

**Output (Success 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "contract_start": "date",
    "contract_end": "date",
    "agreement": "boolean",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

---

## Error Handling

### Common Error Responses

**400 - Bad Request:**
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

**401 - Unauthorized (missing/invalid token):**
```json
{
  "success": false,
  "error": "Access token required" OR "Invalid token" OR "Token expired — please log in again"
}
```

**403 - Forbidden (clinic_id mismatch):**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**500 - Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Implementation Guide for Frontend

### Step 1: Store JWT Token
After login, store the token in localStorage:
```javascript
const token = response.data.token;
localStorage.setItem('authToken', token);
```

### Step 2: Add Token to All Requests
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
};

fetch('/api/users?clinic_id=...', { headers })
```

### Step 3: Register Clinic (NewClinicDialog)
Send complete form to `/clinics/register` endpoint. This handles all 7 steps in one call.

### Step 4: Handle File Uploads
1. Upload files to cloud storage (AWS S3, Google Cloud Storage, etc.)
2. Get file URLs from storage service
3. Send URLs to `POST /documents` endpoint

### Step 5: Token Expiry
If you get a 401 error with "Token expired", redirect user to login page.

---

## API Testing Examples

### Login
```bash
curl -X POST http://localhost:4002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"clinic_admin","password":"password123"}'
```

### Register Clinic
```bash
curl -X POST http://localhost:4002/api/clinics/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"clinic_admin",
    "password":"secure_password_123",
    "clinicName":"My Clinic",
    "email":"clinic@example.com",
    "phone":"9876543210",
    "ownerName":"John Doe",
    "ownerEmail":"john@example.com",
    "plan":"Starter",
    "billingCycle":"Monthly",
    "latitude":19.0760,
    "longitude":72.8777
  }'
```

### Get Clinic (Authenticated)
```bash
curl -X GET http://localhost:4002/api/clinics/uuid-here \
  -H "Authorization: Bearer your-jwt-token-here"
```
