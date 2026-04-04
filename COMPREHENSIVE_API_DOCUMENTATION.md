# Auvia Clinic Backend - Comprehensive API Documentation

**Base URL:** `http://localhost:3000/api` (or your production URL)

**Last Updated:** April 4, 2026

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Clinic APIs](#clinic-apis)
3. [Doctor APIs](#doctor-apis)
4. [Patient APIs](#patient-apis)
5. [Appointment APIs](#appointment-apis)
6. [Payment APIs](#payment-apis)
7. [Call APIs](#call-apis)
8. [User APIs](#user-apis)
9. [Billing APIs](#billing-apis)
10. [Document APIs](#document-apis)
11. [Phone Number APIs](#phone-number-apis)

---

## Authentication APIs

### 1. Login

**Endpoint:** `POST /auth/login`

**Authentication:** ❌ Not required

**Description:** Authenticate a clinic user and receive a JWT token for subsequent requests.

**Request Body:**
```json
{
  "username": "clinic_username",
  "password": "clinic_password"
}
```

**Query Parameters:** None

**Required Fields:**
- `username` (string) - Clinic's username
- `password` (string) - Clinic's password

**Response (200 - Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "clinic": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic",
    "email": "apollo@clinic.com",
    "phone": "9876543210",
    "address": "123 Medical Street",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "clinic_username",
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

**Response (401 - Invalid Credentials):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Response (403 - Suspended Account):**
```json
{
  "success": false,
  "error": "Your clinic account has been suspended. Please contact support."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "apollo_clinic",
    "password": "secure_password"
  }'
```

**Notes:**
- Token expires after 7 days (configurable via JWT_EXPIRES_IN)
- Include token in headers for authenticated endpoints: `Authorization: Bearer <token>`
- Suspended/Canceled accounts cannot login

---

### 2. Get Current User (Me)

**Endpoint:** `GET /auth/me`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Retrieve the current authenticated clinic's information.

**Request Body:** None

**Query Parameters:** None

**Response (200 - Success):**
```json
{
  "success": true,
  "clinic": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic",
    "email": "apollo@clinic.com",
    "phone": "9876543210",
    "address": "123 Medical Street",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "apollo_clinic",
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

**Response (401 - Invalid Token):**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**Response (404 - Clinic Not Found):**
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your_token>"
```

---

### 3. Logout

**Endpoint:** `POST /auth/logout`

**Authentication:** ❌ Not required

**Description:** Logout the current user (client-side token deletion).

**Request Body:** None

**Query Parameters:** None

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <your_token>"
```

**Notes:**
- Token invalidation is client-side; implement token blacklist if needed
- Token becomes invalid after its expiration time anyway

---

## Clinic APIs

### 1. Register New Clinic

**Endpoint:** `POST /clinics/register`

**Authentication:** ❌ Not required

**Description:** Register a new clinic with all details in a single multi-step transaction.

**Request Body:**
```json
{
  "clinicName": "Apollo Clinic",
  "clinicType": "General Practice",
  "address": "123 Medical Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal": "400001",
  "phone": "9876543210",
  "email": "apollo@clinic.com",
  "username": "apollo_clinic",
  "password": "secure_password",
  "latitude": 19.0760,
  "longitude": 72.8777,

  "ownerName": "Dr. Rajesh Kumar",
  "ownerEmail": "rajesh@clinic.com",
  "ownerPhone": "9876543210",
  "ownerId": "GOV_ID_12345",

  "receptionistName": "Priya Sharma",
  "receptionistEmail": "priya@clinic.com",
  "receptionistPhone": "9876543211",
  "receptionistShift": "9AM-5PM",

  "plan": "Growth",
  "billingCycle": "Monthly",
  "paymentMethod": "Card",
  "gstNumber": "27AAPFU0123R1Z0",

  "contractStart": "2026-01-01",
  "contractEnd": "2026-12-31",
  "agreement": true,

  "documents": [
    {
      "name": "Clinic License",
      "url": "https://storage.example.com/license.pdf",
      "type": "application/pdf",
      "docType": "license"
    }
  ]
}
```

**Required Fields:**
- `clinicName` - Clinic name
- `email` - Clinic email
- `phone` - 10-digit phone number
- `username` - Unique username for clinic login
- `password` - Clinic password
- `ownerName` - Owner's full name
- `ownerEmail` - Owner's email
- `latitude`, `longitude` - Clinic location coordinates

**Optional Fields:** All other fields

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "Clinic registered successfully",
  "data": {
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "error": "Clinic name, email, and phone are required"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/clinics/register \
  -H "Content-Type: application/json" \
  -d '{
    "clinicName": "Apollo Clinic",
    "email": "apollo@clinic.com",
    "phone": "9876543210",
    "username": "apollo_clinic",
    "password": "secure_password",
    "ownerName": "Dr. Rajesh",
    "ownerEmail": "rajesh@clinic.com",
    "latitude": 19.0760,
    "longitude": 72.8777
  }'
```

**Notes:**
- All steps execute in a single transaction (all-or-nothing)
- Creates clinic, owner user, receptionist user (if provided), billing, contract, and documents
- Plan is normalized to: Starter, Growth, Enterprise, or trial

---

### 2. Get All Clinics (with coordinates)

**Endpoint:** `GET /clinics/all-with-coordinates`

**Authentication:** ❌ Not required

**Description:** Fetch all clinics with location coordinates for map display.

**Query Parameters:** None

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic",
      "email": "apollo@clinic.com",
      "phone": "9876543210",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "city": "Mumbai",
      "state": "Maharashtra",
      "postal_code": "400001",
      "clinic_type": "General Practice",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clinics/all-with-coordinates
```

---

### 3. Get Clinic Map Data (GeoJSON Format)

**Endpoint:** `GET /clinics/map-data`

**Authentication:** ❌ Not required

**Description:** Get clinic data formatted as GeoJSON for use with map libraries (Leaflet, Mapbox, etc.).

**Query Parameters:** None

**Response (200 - Success):**
```json
{
  "success": true,
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [72.8777, 19.0760]
      },
      "properties": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@clinic.com",
        "phone": "9876543210",
        "address": "123 Medical Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "clinicType": "General Practice",
        "plan": "Growth",
        "status": "active"
      }
    }
  ],
  "metadata": {
    "total": 1,
    "timestamp": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clinics/map-data
```

---

### 4. Get Clinics Nearby

**Endpoint:** `GET /clinics/nearby`

**Authentication:** ❌ Not required

**Description:** Find clinics within a specified radius of given coordinates using Haversine formula.

**Query Parameters:**
- `latitude` (required, number) - User's latitude
- `longitude` (required, number) - User's longitude
- `radius_km` (optional, number, default: 10) - Search radius in kilometers

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "userLocation": {
      "latitude": "19.0760",
      "longitude": "72.8777"
    },
    "radiusKm": 10,
    "clinicsFound": 3,
    "clinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@clinic.com",
        "phone": "9876543210",
        "latitude": 19.0800,
        "longitude": 72.8800,
        "address": "123 Medical Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "clinic_type": "General Practice",
        "subscription_plan": "Growth",
        "distance_km": 0.56
      }
    ]
  }
}
```

**Response (400 - Missing Parameters):**
```json
{
  "success": false,
  "error": "latitude and longitude are required"
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clinics/nearby?latitude=19.0760&longitude=72.8777&radius_km=10"
```

---

### 5. Get Clinics by City

**Endpoint:** `GET /clinics/coordinates-by-city`

**Authentication:** ❌ Not required

**Description:** Get all clinics grouped by city, optionally filtered by city name.

**Query Parameters:**
- `city` (optional, string) - Filter by city name (case-insensitive, partial match)

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "Mumbai": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "phone": "9876543210",
        "email": "apollo@clinic.com",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "address": "123 Medical Street",
        "type": "General Practice"
      }
    ],
    "Pune": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Fortis Clinic",
        "phone": "9876543211",
        "email": "fortis@clinic.com",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "address": "456 Hospital Road",
        "type": "Multi-specialty"
      }
    ]
  },
  "totalCities": 2,
  "totalClinics": 2
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clinics/coordinates-by-city?city=Mumbai"
```

---

### 6. Search Clinic by Name

**Endpoint:** `GET /clinics/search/by-name`

**Authentication:** ❌ Not required

**Description:** Search clinics by name using case-insensitive partial matching.

**Query Parameters:**
- `name` (required, string) - Clinic name to search for

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic",
      "email": "apollo@clinic.com",
      "phone": "9876543210",
      "address": "123 Medical Street",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "username": "apollo_clinic",
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-02-15T10:30:00Z"
    }
  ]
}
```

**Response (404 - Not Found):**
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clinics/search/by-name?name=Apollo"
```

---

### 7. Search Clinic by Name (Full Details)

**Endpoint:** `GET /clinics/search/by-name/full`

**Authentication:** ❌ Not required

**Description:** Search clinics by name with complete details including settings and phone numbers.

**Query Parameters:**
- `name` (required, string) - Clinic name to search for

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "clinic": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@clinic.com",
        "phone": "9876543210",
        "address": "123 Medical Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "clinic_type": "General Practice",
        "timezone": "Asia/Kolkata",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. Rajesh Kumar",
        "username": "apollo_clinic",
        "created_at": "2026-01-15T10:30:00Z"
      },
      "settings": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
        "advance_booking_days": 30,
        "min_booking_notice_period": 60,
        "cancellation_window_hours": 24,
        "followup_time": "09:00:00",
        "ai_agent_enabled": true,
        "ai_agent_languages": ["en-IN"],
        "whatsapp_number": "919876543210",
        "logo_url": "https://cdn.example.com/logo.png",
        "price_per_appointment": 500.00
      },
      "phone_numbers": [
        {
          "id": "880e8400-e29b-41d4-a716-446655440000",
          "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
          "number": "+919876543210",
          "service_type": "Reception Line",
          "status": "Live",
          "is_active": true
        }
      ]
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clinics/search/by-name/full?name=Apollo"
```

---

### 8. Get Clinic by ID

**Endpoint:** `GET /clinics/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get clinic details (only own clinic can be accessed due to ownership check).

**Query Parameters:** None

**URL Parameters:**
- `id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic",
    "email": "apollo@clinic.com",
    "phone": "9876543210",
    "address": "123 Medical Street",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "apollo_clinic",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-02-15T10:30:00Z"
  }
}
```

**Response (403 - Forbidden):**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clinics/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

### 9. Get Clinic Settings

**Endpoint:** `GET /clinics/:id/settings`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get clinic with complete settings and phone numbers.

**URL Parameters:**
- `id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "clinic": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic",
      "email": "apollo@clinic.com",
      "phone": "9876543210",
      "address": "123 Medical Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postal_code": "400001",
      "clinic_type": "General Practice",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "owner_name": "Dr. Rajesh Kumar",
      "username": "apollo_clinic",
      "created_at": "2026-01-15T10:30:00Z"
    },
    "settings": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "advance_booking_days": 30,
      "min_booking_notice_period": 60,
      "cancellation_window_hours": 24,
      "followup_time": "09:00:00",
      "ai_agent_enabled": true,
      "ai_agent_languages": ["en-IN"],
      "whatsapp_number": "919876543210",
      "logo_url": "https://cdn.example.com/logo.png",
      "price_per_appointment": 500.00
    },
    "phone_numbers": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
        "number": "+919876543210",
        "service_type": "Reception Line",
        "status": "Live",
        "is_active": true
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings \
  -H "Authorization: Bearer <your_token>"
```

---

### 10. Update Clinic Settings

**Endpoint:** `PATCH /clinics/:id/settings`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Update clinic operational settings.

**URL Parameters:**
- `id` (required, UUID) - Clinic ID

**Request Body:**
```json
{
  "advance_booking_days": 30,
  "min_booking_notice_period": 60,
  "cancellation_window_hours": 24,
  "followup_time": "09:00:00",
  "ai_agent_enabled": true,
  "ai_agent_languages": ["en-IN", "hi-IN"],
  "whatsapp_number": "919876543210",
  "logo_url": "https://cdn.example.com/logo.png",
  "price_per_appointment": 500.00
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "advance_booking_days": 30,
    "min_booking_notice_period": 60,
    "cancellation_window_hours": 24,
    "followup_time": "09:00:00",
    "ai_agent_enabled": true,
    "ai_agent_languages": ["en-IN", "hi-IN"],
    "whatsapp_number": "919876543210",
    "logo_url": "https://cdn.example.com/logo.png",
    "price_per_appointment": 500.00,
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "advance_booking_days": 30,
    "price_per_appointment": 500
  }'
```

---

### 11. Update Clinic Details

**Endpoint:** `PATCH /clinics/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Update clinic basic information.

**URL Parameters:**
- `id` (required, UUID) - Clinic ID

**Request Body:**
```json
{
  "name": "Apollo Clinic Updated",
  "email": "newemail@clinic.com",
  "phone": "9876543210",
  "address": "456 Hospital Road",
  "timezone": "Asia/Kolkata"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic Updated",
    "email": "newemail@clinic.com",
    "phone": "9876543210",
    "address": "456 Hospital Road",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "apollo_clinic",
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/clinics/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Apollo Clinic Updated",
    "email": "newemail@clinic.com"
  }'
```

---

### 12. Change Clinic Password

**Endpoint:** `POST /clinics/:id/change-password`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Change clinic login password.

**URL Parameters:**
- `id` (required, UUID) - Clinic ID

**Request Body:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

**Required Fields:**
- `current_password` - Current password for verification
- `new_password` - New password to set

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Response (401 - Wrong Current Password):**
```json
{
  "success": false,
  "error": "Current password is incorrect"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/clinics/550e8400-e29b-41d4-a716-446655440000/change-password \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "old_password",
    "new_password": "new_password"
  }'
```

---

### 13. Get Admin Dashboard Stats

**Endpoint:** `GET /clinics/admin/stats`

**Authentication:** ❌ Not required

**Description:** Get system-wide statistics for admin dashboard.

**Query Parameters:** None

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "totalClinics": 25,
    "totalPhoneNumbers": 45,
    "statusBreakdown": {
      "trial": 5,
      "active": 15,
      "past_due": 3,
      "suspended": 1,
      "canceled": 1
    },
    "planBreakdown": {
      "trial": 5,
      "Starter": 8,
      "Growth": 10,
      "Enterprise": 2
    },
    "recentClinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@clinic.com",
        "phone": "9876543210",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "created_at": "2026-04-03T10:30:00Z"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clinics/admin/stats
```

---

### 14. Get All Clinics (Paginated Admin List)

**Endpoint:** `GET /clinics/admin/all`

**Authentication:** ❌ Not required

**Description:** Get paginated list of all clinics with search and filter support.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page
- `search` (optional) - Search by name, email, or phone
- `status` (optional) - Filter by subscription status (trial, active, past_due, suspended, canceled)
- `plan` (optional) - Filter by subscription plan (Starter, Growth, Enterprise, trial)

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@clinic.com",
        "phone": "9876543210",
        "clinic_type": "General Practice",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. Rajesh Kumar",
        "created_at": "2026-01-15T10:30:00Z",
        "updated_at": "2026-02-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clinics/admin/all?page=1&limit=20&search=Apollo&status=active&plan=Growth"
```

---

## Doctor APIs

### 1. List All Doctors for Clinic

**Endpoint:** `GET /api/doctors`

**Authentication:** ❌ Not required

**Description:** Get all active doctors for a clinic.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "consultation_duration_minutes": 30,
      "buffer_time_minutes": 5,
      "max_appointments_per_day": 10,
      "is_active": true,
      "price_charged": 500.00,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-02-15T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/doctors?clinic_id=660e8400-e29b-41d4-a716-446655440001"
```

---

### 2. Create New Doctor

**Endpoint:** `POST /api/doctors`

**Authentication:** ❌ Not required

**Description:** Add a new doctor to the clinic.

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Dr. Rajesh Kumar",
  "speciality": "Cardiology",
  "consultation_duration_minutes": 30,
  "buffer_time_minutes": 5,
  "max_appointments_per_day": 10,
  "price_charged": 500.00
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `name` - Doctor's name

**Optional Fields:**
- `speciality` - Medical speciality
- `consultation_duration_minutes` (default: 30)
- `buffer_time_minutes` (default: 0)
- `max_appointments_per_day`
- `price_charged` (default: 0)

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 30,
    "buffer_time_minutes": 5,
    "max_appointments_per_day": 10,
    "is_active": true,
    "price_charged": 500.00,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 30,
    "price_charged": 500
  }'
```

---

### 3. Get Single Doctor

**Endpoint:** `GET /api/doctors/:id`

**Authentication:** ❌ Not required

**Description:** Get details of a specific doctor.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 30,
    "buffer_time_minutes": 5,
    "max_appointments_per_day": 10,
    "is_active": true,
    "price_charged": 500.00,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-02-15T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. Update Doctor Details

**Endpoint:** `PATCH /api/doctors/:id`

**Authentication:** ❌ Not required

**Description:** Update doctor information.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID

**Request Body:**
```json
{
  "name": "Dr. Rajesh Kumar",
  "speciality": "Cardiology",
  "consultation_duration_minutes": 45,
  "buffer_time_minutes": 10,
  "max_appointments_per_day": 8,
  "is_active": true,
  "price_charged": 600.00
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 45,
    "buffer_time_minutes": 10,
    "max_appointments_per_day": 8,
    "is_active": true,
    "price_charged": 600.00,
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "consultation_duration_minutes": 45,
    "price_charged": 600
  }'
```

---

### 5. Delete Doctor

**Endpoint:** `DELETE /api/doctors/:id`

**Authentication:** ❌ Not required

**Description:** Soft delete a doctor (marks as inactive).

**URL Parameters:**
- `id` (required, UUID) - Doctor ID

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Doctor deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000
```

---

### 6. Get Doctor Schedule

**Endpoint:** `GET /api/doctors/:id/schedule`

**Authentication:** ❌ Not required

**Description:** Get all schedules for a doctor including `slot_duration_minutes`.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-01-01",
      "effective_to": null
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
      "day_of_week": 2,
      "start_time": "10:00:00",
      "end_time": "18:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-01-01",
      "effective_to": null
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000/schedule?clinic_id=660e8400-e29b-41d4-a716-446655440001"
```

---

### 7. Create Doctor Schedule

**Endpoint:** `POST /api/doctors/:id/schedule`

**Authentication:** ❌ Not required

**Description:** Create a new schedule for a doctor.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "slot_duration_minutes": 30,
  "effective_from": "2026-01-01",
  "effective_to": null
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `day_of_week` - Day (0-6, where 0=Sunday, 1=Monday, etc.)
- `start_time` - Start time in HH:MM:SS format
- `end_time` - End time in HH:MM:SS format
- `slot_duration_minutes` - Duration of each appointment slot in minutes

**Optional Fields:**
- `effective_from` - Start date for this schedule (YYYY-MM-DD)
- `effective_to` - End date for this schedule (YYYY-MM-DD)

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "effective_from": "2026-01-01",
    "effective_to": null
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "effective_from": "2026-01-01"
  }'
```

---

### 8. Update Doctor Schedule

**Endpoint:** `PATCH /api/doctors/:id/schedule/:schedule_id`

**Authentication:** ❌ Not required

**Description:** Update an existing schedule.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID
- `schedule_id` (required, UUID) - Schedule ID

**Request Body:**
```json
{
  "day_of_week": 2,
  "start_time": "10:00:00",
  "end_time": "18:00:00",
  "slot_duration_minutes": 45,
  "effective_from": "2026-01-01",
  "effective_to": "2026-12-31"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "day_of_week": 2,
    "start_time": "10:00:00",
    "end_time": "18:00:00",
    "slot_duration_minutes": 45,
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000/schedule/770e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "slot_duration_minutes": 45,
    "effective_to": "2026-12-31"
  }'
```

---

### 9. Delete Doctor Schedule

**Endpoint:** `DELETE /api/doctors/:id/schedule/:schedule_id`

**Authentication:** ❌ Not required

**Description:** Delete a doctor's schedule.

**URL Parameters:**
- `id` (required, UUID) - Doctor ID
- `schedule_id` (required, UUID) - Schedule ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30
  }
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/doctors/550e8400-e29b-41d4-a716-446655440000/schedule/770e8400-e29b-41d4-a716-446655440000
```

---

### 10. Get Doctor Appointments

**Endpoint:** `GET /api/doctors/:doctor_id/appointments`

**Authentication:** ❌ Not required

**Description:** Get all appointments for a specific doctor with pagination and filters.

**URL Parameters:**
- `doctor_id` (required, UUID) - Doctor ID

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID
- `status` (optional) - Filter by status: pending, confirmed, completed, cancelled, no_show, rescheduled
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)
- `patient_id` (optional) - Filter by patient ID
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "patient_id": "770e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "880e8400-e29b-41d4-a716-446655440000",
      "appointment_start": "2026-04-05T10:00:00Z",
      "appointment_end": "2026-04-05T10:30:00Z",
      "reason": "Checkup",
      "notes": "Patient concerned about chest pain",
      "status": "confirmed",
      "payment_status": "paid",
      "payment_amount": 500.00,
      "source": "ai_agent",
      "patient_name": "Raj Kumar",
      "patient_phone": "9876543210",
      "patient_email": "raj@example.com",
      "doctor_name": "Dr. Rajesh Kumar",
      "doctor_speciality": "Cardiology",
      "created_at": "2026-04-04T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/doctors/880e8400-e29b-41d4-a716-446655440000/appointments?clinic_id=660e8400-e29b-41d4-a716-446655440001&status=confirmed&page=1&limit=10"
```

---

## Patient APIs

### 1. List All Patients for Clinic

**Endpoint:** `GET /api/patients`

**Authentication:** ❌ Not required

**Description:** Get all patients for a clinic with search and pagination.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID
- `search` (optional, string) - Search by patient name or phone
- `limit` (optional, default: 10, number) - Results limit

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Raj Kumar",
      "phone": "9876543210",
      "email": "raj@example.com",
      "gender": "Male",
      "date_of_birth": "1990-05-15",
      "created_at": "2026-01-15T10:30:00Z",
      "total_appointments": 5,
      "last_visit": "2026-03-20"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/patients?clinic_id=660e8400-e29b-41d4-a716-446655440001&search=Raj&limit=10"
```

---

### 2. Get Single Patient with History

**Endpoint:** `GET /api/patients/:id`

**Authentication:** ❌ Not required

**Description:** Get detailed patient information with appointment history.

**URL Parameters:**
- `id` (required, UUID) - Patient ID

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Raj Kumar",
    "phone": "9876543210",
    "email": "raj@example.com",
    "gender": "Male",
    "date_of_birth": "1990-05-15",
    "created_at": "2026-01-15T10:30:00Z",
    "total_appointments": 5,
    "last_visit": "2026-03-20",
    "history": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "appointment_start": "2026-03-20T10:00:00Z",
        "appointment_end": "2026-03-20T10:30:00Z",
        "reason": "Checkup",
        "notes": "Patient is doing well",
        "status": "completed",
        "payment_status": "paid",
        "payment_amount": 500.00,
        "doctor_name": "Dr. Rajesh Kumar",
        "doctor_speciality": "Cardiology"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/patients/770e8400-e29b-41d4-a716-446655440000?clinic_id=660e8400-e29b-41d4-a716-446655440001"
```

---

## Payment APIs

### 1. Get All Payments for Clinic

**Endpoint:** `GET /api/payments`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Fetch paginated list of payments with comprehensive filters.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID
- `status` (optional) - Filter: pending, paid, failed, refunded
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "appointment_id": "770e8400-e29b-41d4-a716-446655440000",
      "amount": 500.00,
      "currency": "INR",
      "status": "paid",
      "provider": "Razorpay",
      "provider_payment_id": "pay_123456",
      "created_at": "2026-04-04T10:30:00Z",
      "appointment_start": "2026-04-05T10:00:00Z",
      "appointment_end": "2026-04-05T10:30:00Z",
      "patient_name": "Raj Kumar",
      "patient_phone": "9876543210",
      "doctor_name": "Dr. Rajesh Kumar",
      "doctor_speciality": "Cardiology"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/payments?clinic_id=660e8400-e29b-41d4-a716-446655440001&status=paid&page=1" \
  -H "Authorization: Bearer <your_token>"
```

---

### 2. Get Single Payment

**Endpoint:** `GET /api/payments/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Fetch details of a specific payment.

**URL Parameters:**
- `id` (required, UUID) - Payment ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "appointment_id": "770e8400-e29b-41d4-a716-446655440000",
    "amount": 500.00,
    "currency": "INR",
    "status": "paid",
    "provider": "Razorpay",
    "provider_payment_id": "pay_123456",
    "created_at": "2026-04-04T10:30:00Z",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z",
    "patient_name": "Raj Kumar",
    "patient_phone": "9876543210",
    "doctor_name": "Dr. Rajesh Kumar",
    "doctor_speciality": "Cardiology"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/payments/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

### 3. Create Payment Record

**Endpoint:** `POST /api/payments`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Create a new payment record.

**Request Body:**
```json
{
  "appointment_id": "770e8400-e29b-41d4-a716-446655440000",
  "amount": 500.00,
  "currency": "INR",
  "status": "pending",
  "provider": "Razorpay",
  "provider_payment_id": "pay_123456"
}
```

**Required Fields:**
- `appointment_id` - Appointment ID
- `amount` - Payment amount

**Optional Fields:**
- `currency` (default: INR)
- `status` (default: pending)
- `provider` - Payment provider name
- `provider_payment_id` - Provider's payment reference

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "appointment_id": "770e8400-e29b-41d4-a716-446655440000",
    "amount": 500.00,
    "currency": "INR",
    "status": "pending",
    "provider": "Razorpay",
    "provider_payment_id": "pay_123456",
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "770e8400-e29b-41d4-a716-446655440000",
    "amount": 500,
    "currency": "INR",
    "status": "paid",
    "provider": "Razorpay",
    "provider_payment_id": "pay_123456"
  }'
```

---

## Call APIs

### 1. Get All Calls for Clinic

**Endpoint:** `GET /api/calls`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Fetch paginated list of calls with comprehensive filters.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID
- `type` (optional) - Filter: incoming, outgoing
- `agent_type` (optional) - Filter: ai, human
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "time": "2026-04-04T10:30:00Z",
      "type": "incoming",
      "caller": "Raj Kumar",
      "agent_type": "ai",
      "duration": 120,
      "ai_summary": "Patient called to reschedule appointment",
      "recording": "https://storage.example.com/call_123456.wav",
      "created_at": "2026-04-04T10:30:00Z",
      "updated_at": "2026-04-04T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/calls?clinic_id=660e8400-e29b-41d4-a716-446655440001&type=incoming&agent_type=ai&page=1" \
  -H "Authorization: Bearer <your_token>"
```

---

### 2. Get Single Call

**Endpoint:** `GET /api/calls/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Fetch details of a specific call.

**URL Parameters:**
- `id` (required, UUID) - Call ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "time": "2026-04-04T10:30:00Z",
    "type": "incoming",
    "caller": "Raj Kumar",
    "agent_type": "ai",
    "duration": 120,
    "ai_summary": "Patient called to reschedule appointment",
    "recording": "https://storage.example.com/call_123456.wav",
    "created_at": "2026-04-04T10:30:00Z",
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/calls/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

### 3. Create Call Record

**Endpoint:** `POST /api/calls`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Create a new call record.

**Request Body:**
```json
{
  "type": "incoming",
  "caller": "Raj Kumar",
  "agent_type": "ai",
  "duration": 120,
  "ai_summary": "Patient called to reschedule appointment",
  "recording": "https://storage.example.com/call_123456.wav"
}
```

**Required Fields:**
- `type` - incoming or outgoing
- `caller` - Name or phone of caller

**Optional Fields:**
- `agent_type` (default: ai) - ai or human
- `duration` (default: 0) - Duration in seconds
- `ai_summary` - AI-generated summary of the call
- `recording` - HTTPS URL to recording

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "time": "2026-04-04T10:30:00Z",
    "type": "incoming",
    "caller": "Raj Kumar",
    "agent_type": "ai",
    "duration": 120,
    "ai_summary": "Patient called to reschedule appointment",
    "recording": "https://storage.example.com/call_123456.wav",
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/calls \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "incoming",
    "caller": "Raj Kumar",
    "agent_type": "ai",
    "duration": 120,
    "ai_summary": "Patient called to reschedule appointment",
    "recording": "https://storage.example.com/call_123456.wav"
  }'
```

---

### 4. Create Multiple Calls (Bulk)

**Endpoint:** `POST /api/calls/bulk`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Create up to 100 call records in a single request (transactional).

**Request Body:**
```json
{
  "calls": [
    {
      "type": "incoming",
      "caller": "Raj Kumar",
      "agent_type": "ai",
      "duration": 120,
      "ai_summary": "Patient called to reschedule appointment"
    },
    {
      "type": "outgoing",
      "caller": "Dr. Rajesh Kumar",
      "agent_type": "human",
      "duration": 300,
      "ai_summary": "Follow-up call to patient",
      "recording": "https://storage.example.com/call_123457.wav"
    }
  ]
}
```

**Response (201 - Success):**
```json
{
  "success": true,
  "message": "2 call(s) created successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "time": "2026-04-04T10:30:00Z",
      "type": "incoming",
      "caller": "Raj Kumar",
      "agent_type": "ai",
      "duration": 120,
      "created_at": "2026-04-04T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/calls/bulk \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "calls": [
      {
        "type": "incoming",
        "caller": "Raj Kumar",
        "agent_type": "ai",
        "duration": 120
      }
    ]
  }'
```

---

### 5. Update Call Details

**Endpoint:** `PATCH /api/calls/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Update call information (duration, summary, recording).

**URL Parameters:**
- `id` (required, UUID) - Call ID

**Request Body:**
```json
{
  "duration": 150,
  "ai_summary": "Updated summary",
  "recording": "https://storage.example.com/updated_recording.wav"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "time": "2026-04-04T10:30:00Z",
    "type": "incoming",
    "caller": "Raj Kumar",
    "agent_type": "ai",
    "duration": 150,
    "ai_summary": "Updated summary",
    "recording": "https://storage.example.com/updated_recording.wav",
    "created_at": "2026-04-04T10:30:00Z",
    "updated_at": "2026-04-04T11:00:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/calls/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 150,
    "ai_summary": "Updated summary"
  }'
```

---

### 6. Get Call Statistics

**Endpoint:** `GET /api/calls/stats/summary`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get call statistics for a date range.

**Query Parameters:**
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "total_calls": 150,
    "incoming_calls": 95,
    "outgoing_calls": 55,
    "ai_calls": 110,
    "human_calls": 40,
    "avg_duration": 145.50,
    "total_duration": 21825,
    "last_call_time": "2026-04-04T18:30:00Z",
    "first_call_time": "2026-04-01T08:00:00Z"
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/calls/stats/summary?start_date=2026-04-01&end_date=2026-04-04" \
  -H "Authorization: Bearer <your_token>"
```

---

## User APIs

### 1. Get All Users for Clinic

**Endpoint:** `GET /api/users`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get all users (staff) for a clinic.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. Rajesh Kumar",
      "email": "rajesh@clinic.com",
      "phone": "9876543210",
      "role": "clinic_admin",
      "govt_id": "GOV_ID_12345",
      "shift_hours": "9AM-5PM",
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/users?clinic_id=660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <your_token>"
```

---

### 2. Get Single User

**Endpoint:** `GET /api/users/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get details of a specific user.

**URL Parameters:**
- `id` (required, UUID) - User ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "email": "rajesh@clinic.com",
    "phone": "9876543210",
    "role": "clinic_admin",
    "govt_id": "GOV_ID_12345",
    "shift_hours": "9AM-5PM",
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

### 3. Create User

**Endpoint:** `POST /api/users`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Add a new user (staff member) to the clinic.

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Dr. Rajesh Kumar",
  "email": "rajesh@clinic.com",
  "phone": "9876543210",
  "role": "clinic_admin",
  "govt_id": "GOV_ID_12345",
  "shift_hours": "9AM-5PM"
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `name` - User's name
- `email` - Email address
- `role` - Role: super_admin, clinic_admin, receptionist, doctor

**Optional Fields:**
- `phone` - Phone number
- `govt_id` - Government ID
- `shift_hours` - Work shift timing

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "email": "rajesh@clinic.com",
    "phone": "9876543210",
    "role": "clinic_admin",
    "is_active": true,
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "email": "rajesh@clinic.com",
    "phone": "9876543210",
    "role": "clinic_admin"
  }'
```

---

### 4. Update User

**Endpoint:** `PATCH /api/users/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Update user information.

**URL Parameters:**
- `id` (required, UUID) - User ID

**Request Body:**
```json
{
  "name": "Dr. Rajesh Kumar",
  "email": "rajesh.new@clinic.com",
  "phone": "9876543210",
  "role": "doctor",
  "govt_id": "GOV_ID_12345",
  "shift_hours": "10AM-6PM",
  "is_active": true
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Dr. Rajesh Kumar",
    "email": "rajesh.new@clinic.com",
    "phone": "9876543210",
    "role": "doctor",
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.new@clinic.com",
    "role": "doctor"
  }'
```

---

### 5. Delete User

**Endpoint:** `DELETE /api/users/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Soft delete a user (marks as deleted).

**URL Parameters:**
- `id` (required, UUID) - User ID

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

## Billing APIs

### 1. Get Billing Information

**Endpoint:** `GET /api/billing/:clinic_id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get billing and subscription information for a clinic.

**URL Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "plan": "Growth",
    "billing_cycle": "Monthly",
    "payment_method": "Card",
    "card_last4": "4242",
    "card_name": "Rajesh Kumar",
    "card_expiry": "12/25",
    "gst_number": "27AAPFU0123R1Z0",
    "monthly_amount": 2500.00,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-02-15T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/billing/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <your_token>"
```

---

### 2. Create or Update Billing Information

**Endpoint:** `POST /api/billing`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Create or update billing information (upsert operation).

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "plan": "Growth",
  "billing_cycle": "Monthly",
  "payment_method": "Card",
  "card_last4": "4242",
  "card_name": "Rajesh Kumar",
  "card_expiry": "12/25",
  "gst_number": "27AAPFU0123R1Z0",
  "monthly_amount": 2500.00
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `plan` - Starter, Growth, Enterprise, or trial

**Optional Fields:**
- `billing_cycle` - Monthly, Quarterly, Annually
- `payment_method` - Card, UPI, Bank Transfer
- Other payment/billing details

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "plan": "Growth",
    "billing_cycle": "Monthly",
    "payment_method": "Card",
    "card_last4": "4242",
    "card_name": "Rajesh Kumar",
    "card_expiry": "12/25",
    "gst_number": "27AAPFU0123R1Z0",
    "monthly_amount": 2500.00
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/billing \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "plan": "Growth",
    "billing_cycle": "Monthly",
    "payment_method": "Card",
    "monthly_amount": 2500
  }'
```

---

### 3. Update Billing Information

**Endpoint:** `PATCH /api/billing/:clinic_id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Update existing billing information.

**URL Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Request Body:**
```json
{
  "plan": "Enterprise",
  "monthly_amount": 5000.00,
  "card_last4": "5555"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "plan": "Enterprise",
    "billing_cycle": "Monthly",
    "payment_method": "Card",
    "card_last4": "5555",
    "card_name": "Rajesh Kumar",
    "card_expiry": "12/25",
    "monthly_amount": 5000.00,
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/billing/660e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "Enterprise",
    "monthly_amount": 5000
  }'
```

---

## Document APIs

### 1. Get All Documents for Clinic

**Endpoint:** `GET /api/documents`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Get all documents uploaded by a clinic.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "file_name": "clinic_license.pdf",
      "file_url": "https://storage.example.com/clinic_license.pdf",
      "file_type": "application/pdf",
      "file_size": 256000,
      "doc_type": "license",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/documents?clinic_id=660e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <your_token>"
```

---

### 2. Create Document Record

**Endpoint:** `POST /api/documents`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Save document metadata (document must be uploaded to cloud storage separately).

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "file_name": "clinic_license.pdf",
  "file_url": "https://storage.example.com/clinic_license.pdf",
  "file_type": "application/pdf",
  "file_size": 256000,
  "doc_type": "license"
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `file_name` - Document file name
- `file_url` - HTTPS URL to document

**Optional Fields:**
- `file_type` - MIME type
- `file_size` - File size in bytes
- `doc_type` - Document type (license, contract, etc.)

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "file_name": "clinic_license.pdf",
    "file_url": "https://storage.example.com/clinic_license.pdf",
    "file_type": "application/pdf",
    "file_size": 256000,
    "doc_type": "license",
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "file_name": "clinic_license.pdf",
    "file_url": "https://storage.example.com/clinic_license.pdf",
    "file_type": "application/pdf",
    "doc_type": "license"
  }'
```

---

### 3. Delete Document

**Endpoint:** `DELETE /api/documents/:id`

**Authentication:** ✅ Required (Bearer Token)

**Description:** Delete a document record.

**URL Parameters:**
- `id` (required, UUID) - Document ID

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/documents/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your_token>"
```

---

## Phone Number APIs

### 1. Get All Phone Numbers for Clinic

**Endpoint:** `GET /api/phone-numbers`

**Authentication:** ❌ Not required (but recommended)

**Description:** Get all phone numbers assigned to a clinic.

**Query Parameters:**
- `clinic_id` (required, UUID) - Clinic ID

**Response (200 - Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
      "number": "+919876543210",
      "service_type": "Reception Line",
      "status": "Live",
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-02-15T10:30:00Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/phone-numbers?clinic_id=660e8400-e29b-41d4-a716-446655440001"
```

---

### 2. Create Phone Number

**Endpoint:** `POST /api/phone-numbers`

**Authentication:** ❌ Not required

**Description:** Assign a new phone number to a clinic.

**Request Body:**
```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "number": "+919876543210",
  "service_type": "Reception Line",
  "status": "Live",
  "is_active": true
}
```

**Required Fields:**
- `clinic_id` - Clinic ID
- `number` - Phone number (7-20 characters)

**Optional Fields:**
- `service_type` - Type of service (default: Reception Line)
- `status` - Live, Inactive, Provisioning, Failed (default: Live)
- `is_active` (default: true)

**Response (201 - Success):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "number": "+919876543210",
    "service_type": "Reception Line",
    "status": "Live",
    "is_active": true,
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/phone-numbers \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "number": "+919876543210",
    "service_type": "Reception Line"
  }'
```

---

## Common Response Patterns

### Success Response
All successful responses follow this pattern:
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Authentication Header

For protected endpoints, include JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Token received from `/auth/login` endpoint.

---

## Pagination

For paginated endpoints, use:
- `page` (default: 1)
- `limit` (default: varies by endpoint, usually 20)

Example:
```
GET /api/payments?clinic_id=<id>&page=2&limit=50
```

---

## Date and Time Formats

- **Date**: `YYYY-MM-DD` (e.g., 2026-04-04)
- **Time**: `HH:MM:SS` (e.g., 10:30:00)
- **DateTime**: ISO 8601 (e.g., 2026-04-04T10:30:00Z)

---

## Enum Values

### Clinic Subscription Status
- `trial`
- `active`
- `past_due`
- `suspended`
- `canceled`

### Subscription Plans
- `Starter`
- `Growth`
- `Enterprise`
- `trial`

### Billing Cycles
- `Monthly`
- `Quarterly`
- `Annually`

### Payment Methods
- `Card`
- `UPI`
- `Bank Transfer`

### Appointment Status
- `pending`
- `confirmed`
- `cancelled`
- `completed`
- `no_show`
- `rescheduled`

### Payment Status
- `pending`
- `paid`
- `failed`
- `refunded`

### Call Type
- `incoming`
- `outgoing`

### Agent Type
- `ai`
- `human`

### User Roles
- `super_admin`
- `clinic_admin`
- `receptionist`
- `doctor`

### Gender
- `Male`
- `Female`
- `Other`
- `Prefer not to say`

---

**End of Documentation**

For questions or issues, please contact support or create an issue in the GitHub repository.
