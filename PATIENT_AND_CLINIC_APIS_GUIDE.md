# Patient & Clinic Management APIs - Complete Guide

**Created:** April 18, 2026
**Last Updated:** April 18, 2026
**Status:** Production Ready ✅

---

## Overview

This guide covers all APIs for fetching and managing patient details, their appointment history, clinics they've visited, and clinic information. These APIs enable comprehensive patient and clinic data retrieval for dashboards, reports, and patient management systems.

### Key Features
- ✅ Full patient details with demographics
- ✅ Patient appointment history with filters
- ✅ Clinics visited by patient with statistics
- ✅ Comprehensive clinic information
- ✅ Pagination support for large datasets
- ✅ Advanced filtering capabilities
- ✅ Relationship data (doctors, clinics, appointments)

---

## Table of Contents

1. [Patient Endpoints](#patient-endpoints)
2. [Clinic Endpoints](#clinic-endpoints)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling)
5. [Example Workflows](#example-workflows)

---

## Patient Endpoints

### 1. GET /api/patients - List All Patients

Fetch a paginated list of all patients for a specific clinic.

#### Request

**URL:** `GET /api/patients?clinic_id=<clinic_id>&search=<name_or_phone>&limit=<limit>`

**Method:** GET

**Required Headers:**
```
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clinic_id` | UUID | Yes | Clinic ID to filter patients |
| `search` | String | No | Search by patient name or phone number (partial match, case-insensitive) |
| `limit` | Integer | No | Result limit (default: 10, max: 100) |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/patients?clinic_id=550e8400-e29b-41d4-a716-446655440000&search=John&limit=20"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com",
      "gender": "Male",
      "date_of_birth": "1990-05-15",
      "created_at": "2026-01-10T10:30:00Z",
      "total_appointments": 5,
      "last_visit": "2026-04-10"
    },
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Jane Smith",
      "phone": "9876543211",
      "email": "jane@example.com",
      "gender": "Female",
      "date_of_birth": "1988-03-20",
      "created_at": "2026-01-15T14:20:00Z",
      "total_appointments": 3,
      "last_visit": "2026-04-05"
    }
  ]
}
```

#### Response (Error - 400 Bad Request)

```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

---

### 2. GET /api/patients/:id - Get Patient Details

Fetch complete details of a specific patient including their appointment history with a specific clinic.

#### Request

**URL:** `GET /api/patients/:id?clinic_id=<clinic_id>`

**Method:** GET

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clinic_id` | UUID | Yes | Clinic ID (for clinic-level data segmentation) |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000?clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "gender": "Male",
    "date_of_birth": "1990-05-15",
    "medical_history": "Diabetes, Hypertension",
    "allergies": "Penicillin",
    "emergency_contact": "9876543220",
    "created_at": "2026-01-10T10:30:00Z",
    "updated_at": "2026-04-15T09:45:00Z",
    "total_appointments": 5,
    "last_visit": "2026-04-10",
    "history": [
      {
        "id": "appt-001",
        "appointment_start": "2026-04-10T10:00:00Z",
        "appointment_end": "2026-04-10T10:45:00Z",
        "reason": "Regular Checkup",
        "notes": "Blood pressure checked, all normal",
        "status": "completed",
        "payment_status": "paid",
        "payment_amount": 500,
        "source": "clinic",
        "doctor_name": "Dr. Rajesh Kumar",
        "doctor_speciality": "General Physician"
      },
      {
        "id": "appt-002",
        "appointment_start": "2026-03-20T14:30:00Z",
        "appointment_end": "2026-03-20T15:15:00Z",
        "reason": "Follow-up",
        "notes": "Patient responding well to medication",
        "status": "completed",
        "payment_status": "paid",
        "payment_amount": 500,
        "source": "phone",
        "doctor_name": "Dr. Priya Sharma",
        "doctor_speciality": "Cardiologist"
      }
    ]
  }
}
```

#### Response (Error - 404 Not Found)

```json
{
  "success": false,
  "error": "Patient not found"
}
```

---

### 3. GET /api/patients/:id/appointments - Patient Appointment History

Fetch all appointments for a patient with advanced filtering, pagination, and detailed information.

#### Request

**URL:** `GET /api/patients/:id/appointments?clinic_id=<clinic_id>&status=<status>&start_date=<date>&end_date=<date>&page=<page>&limit=<limit>`

**Method:** GET

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clinic_id` | UUID | Yes | Clinic ID to filter appointments |
| `status` | String | No | Filter by status: `pending`, `confirmed`, `completed`, `cancelled`, `rescheduled`, `no_show` |
| `start_date` | Date | No | Filter appointments from this date (format: YYYY-MM-DD) |
| `end_date` | Date | No | Filter appointments until this date (format: YYYY-MM-DD) |
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Results per page (default: 20, max: 100) |

#### Request Examples

**Basic request with clinic_id:**
```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

**With filters and pagination:**
```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000&status=completed&start_date=2026-01-01&end_date=2026-04-30&page=1&limit=10"
```

**Only get cancelled appointments:**
```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000&status=cancelled"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "appt-001",
      "appointment_start": "2026-04-10T10:00:00Z",
      "appointment_end": "2026-04-10T10:45:00Z",
      "reason": "Regular Checkup",
      "notes": "Blood pressure checked, all normal",
      "status": "completed",
      "payment_status": "paid",
      "payment_amount": 500,
      "source": "clinic",
      "token_number": null,
      "created_at": "2026-04-01T15:20:00Z",
      "doctor_id": "doc-001",
      "doctor_name": "Dr. Rajesh Kumar",
      "doctor_speciality": "General Physician",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_name": "Apollo Clinic",
      "clinic_email": "info@apolloclinic.com",
      "clinic_phone": "9876543200"
    },
    {
      "id": "appt-002",
      "appointment_start": "2026-03-20T14:30:00Z",
      "appointment_end": "2026-03-20T15:15:00Z",
      "reason": "Follow-up",
      "notes": "Patient responding well to medication",
      "status": "completed",
      "payment_status": "paid",
      "payment_amount": 500,
      "source": "phone",
      "token_number": null,
      "created_at": "2026-03-15T10:00:00Z",
      "doctor_id": "doc-002",
      "doctor_name": "Dr. Priya Sharma",
      "doctor_speciality": "Cardiologist",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_name": "Apollo Clinic",
      "clinic_email": "info@apolloclinic.com",
      "clinic_phone": "9876543200"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

#### Response (Error - 400 Bad Request)

```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

#### Response (Error - 404 Not Found)

```json
{
  "success": false,
  "error": "Patient not found"
}
```

---

### 4. GET /api/patients/:id/clinics - Clinics Visited by Patient

Fetch all clinics that a patient has visited, along with statistics about their visits to each clinic.

#### Request

**URL:** `GET /api/patients/:id/clinics?page=<page>&limit=<limit>`

**Method:** GET

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Patient ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Results per page (default: 20, max: 100) |

#### Request Examples

**Basic request:**
```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/clinics"
```

**With pagination:**
```bash
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/clinics?page=1&limit=10"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic - Delhi",
      "email": "delhi@apolloclinic.com",
      "phone": "9876543200",
      "address": "123 Medical Plaza, MG Road",
      "city": "New Delhi",
      "state": "Delhi",
      "postal_code": "110001",
      "clinic_type": "Multi-specialty",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "owner_name": "Dr. Vikas Sharma",
      "total_appointments": 8,
      "first_visit": "2025-06-15",
      "last_visit": "2026-04-10"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Max Healthcare - Gurgaon",
      "email": "gurgaon@maxhealthcare.com",
      "phone": "9876543201",
      "address": "456 Healthcare Hub, DLF Cyber City",
      "city": "Gurgaon",
      "state": "Haryana",
      "postal_code": "122004",
      "clinic_type": "Hospital",
      "subscription_plan": "Enterprise",
      "subscription_status": "active",
      "owner_name": "Dr. Anita Gupta",
      "total_appointments": 3,
      "first_visit": "2026-02-20",
      "last_visit": "2026-03-15"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

#### Response (Error - 404 Not Found)

```json
{
  "success": false,
  "error": "Patient not found"
}
```

---

## Clinic Endpoints

### 1. GET /api/clinics/:id - Get Clinic Details

Fetch complete details of a specific clinic.

#### Request

**URL:** `GET /api/clinics/:id`

**Method:** GET

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Clinic ID |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic - Delhi",
    "email": "delhi@apolloclinic.com",
    "phone": "9876543200",
    "address": "123 Medical Plaza, MG Road",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "apollo_delhi",
    "created_at": "2025-08-10T08:30:00Z",
    "updated_at": "2026-04-15T10:20:00Z"
  }
}
```

#### Response (Error - 404 Not Found)

```json
{
  "success": false,
  "error": "Clinic not found"
}
```

---

### 2. GET /api/clinics/:id/settings - Get Clinic Settings

Fetch clinic settings along with basic clinic info and phone numbers.

#### Request

**URL:** `GET /api/clinics/:id/settings`

**Method:** GET

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Clinic ID |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "clinic": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic - Delhi",
      "email": "delhi@apolloclinic.com",
      "phone": "9876543200",
      "address": "123 Medical Plaza, MG Road",
      "city": "New Delhi",
      "state": "Delhi",
      "postal_code": "110001",
      "clinic_type": "Multi-specialty",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "owner_name": "Dr. Vikas Sharma",
      "username": "apollo_delhi",
      "created_at": "2025-08-10T08:30:00Z",
      "updated_at": "2026-04-15T10:20:00Z"
    },
    "settings": {
      "id": "set-001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "advance_booking_days": 30,
      "min_booking_notice_period": 60,
      "cancellation_window_hours": 12,
      "followup_time": 7,
      "ai_agent_enabled": true,
      "ai_agent_languages": "en,hi",
      "whatsapp_number": "919876543200",
      "logo_url": "https://cdn.example.com/apollo_logo.png",
      "price_per_appointment": 500,
      "is_slots_needed": false,
      "created_at": "2025-08-10T08:30:00Z",
      "updated_at": "2026-04-15T10:20:00Z"
    },
    "phone_numbers": [
      {
        "id": "phone-001",
        "number": "9876543200",
        "service_type": "appointment_booking",
        "status": "active",
        "is_active": true
      },
      {
        "id": "phone-002",
        "number": "9876543201",
        "service_type": "support",
        "status": "active",
        "is_active": true
      }
    ]
  }
}
```

---

### 3. GET /api/clinics/search/by-name/full - Search Clinic by Name

Search for clinics by name with full settings and phone numbers information.

#### Request

**URL:** `GET /api/clinics/search/by-name/full?name=<clinic_name>`

**Method:** GET

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | String | Yes | Clinic name to search for (partial match, case-insensitive) |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/clinics/search/by-name/full?name=Apollo"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "clinic": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic - Delhi",
        "email": "delhi@apolloclinic.com",
        "phone": "9876543200",
        "address": "123 Medical Plaza, MG Road",
        "city": "New Delhi",
        "state": "Delhi",
        "postal_code": "110001",
        "clinic_type": "Multi-specialty",
        "timezone": "Asia/Kolkata",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. Vikas Sharma",
        "username": "apollo_delhi",
        "created_at": "2025-08-10T08:30:00Z",
        "updated_at": "2026-04-15T10:20:00Z"
      },
      "settings": {
        "id": "set-001",
        "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
        "advance_booking_days": 30,
        "min_booking_notice_period": 60,
        "cancellation_window_hours": 12,
        "followup_time": 7,
        "ai_agent_enabled": true,
        "ai_agent_languages": "en,hi",
        "whatsapp_number": "919876543200",
        "logo_url": "https://cdn.example.com/apollo_logo.png",
        "price_per_appointment": 500,
        "is_slots_needed": false,
        "created_at": "2025-08-10T08:30:00Z",
        "updated_at": "2026-04-15T10:20:00Z"
      },
      "phone_numbers": [
        {
          "id": "phone-001",
          "number": "9876543200",
          "service_type": "appointment_booking",
          "status": "active",
          "is_active": true
        }
      ]
    }
  ]
}
```

---

### 4. GET /api/clinics/all-with-coordinates - List All Clinics with Coordinates

Fetch all clinics with their latitude and longitude for mapping purposes.

#### Request

**URL:** `GET /api/clinics/all-with-coordinates`

**Method:** GET

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic - Delhi",
      "email": "delhi@apolloclinic.com",
      "phone": "9876543200",
      "latitude": 28.5465,
      "longitude": 77.2167,
      "city": "New Delhi",
      "state": "Delhi",
      "postal_code": "110001",
      "clinic_type": "Multi-specialty",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "created_at": "2025-08-10T08:30:00Z"
    }
  ]
}
```

---

### 5. GET /api/clinics/nearby - Find Nearby Clinics

Find clinics within a specified radius from given coordinates.

#### Request

**URL:** `GET /api/clinics/nearby?latitude=<lat>&longitude=<long>&radius_km=<km>`

**Method:** GET

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `latitude` | Number | Yes | User's latitude |
| `longitude` | Number | Yes | User's longitude |
| `radius_km` | Number | No | Search radius in kilometers (default: 10) |

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/clinics/nearby?latitude=28.5465&longitude=77.2167&radius_km=15"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "userLocation": {
      "latitude": 28.5465,
      "longitude": 77.2167
    },
    "radiusKm": 15,
    "clinicsFound": 3,
    "clinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic - Delhi",
        "email": "delhi@apolloclinic.com",
        "phone": "9876543200",
        "latitude": 28.5500,
        "longitude": 77.2200,
        "address": "123 Medical Plaza, MG Road",
        "city": "New Delhi",
        "state": "Delhi",
        "clinic_type": "Multi-specialty",
        "subscription_plan": "Growth",
        "distance_km": 0.8
      }
    ]
  }
}
```

---

### 6. GET /api/clinics/admin/stats - Admin Dashboard Statistics

Fetch overall clinic statistics for admin dashboard.

#### Request

**URL:** `GET /api/clinics/admin/stats`

**Method:** GET

#### Request Example

```bash
curl -X GET "http://localhost:4002/api/clinics/admin/stats"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "totalClinics": 45,
    "totalPhoneNumbers": 89,
    "statusBreakdown": {
      "trial": 12,
      "active": 28,
      "past_due": 3,
      "suspended": 2,
      "canceled": 0
    },
    "planBreakdown": {
      "trial": 12,
      "Starter": 15,
      "Growth": 15,
      "Enterprise": 3
    },
    "recentClinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic - Delhi",
        "email": "delhi@apolloclinic.com",
        "phone": "9876543200",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "created_at": "2026-04-15T08:30:00Z"
      }
    ]
  }
}
```

---

### 7. GET /api/clinics/admin/all - List All Clinics with Pagination

Fetch all clinics with pagination, search, and filtering capabilities.

#### Request

**URL:** `GET /api/clinics/admin/all?page=<page>&limit=<limit>&search=<query>&status=<status>&plan=<plan>`

**Method:** GET

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | Integer | No | Page number (default: 1) |
| `limit` | Integer | No | Results per page (default: 20, max: 100) |
| `search` | String | No | Search by clinic name, email, or phone |
| `status` | String | No | Filter by status: `trial`, `active`, `past_due`, `suspended`, `canceled` |
| `plan` | String | No | Filter by plan: `trial`, `Starter`, `Growth`, `Enterprise` |

#### Request Examples

**Basic request:**
```bash
curl -X GET "http://localhost:4002/api/clinics/admin/all?page=1&limit=20"
```

**With search and filters:**
```bash
curl -X GET "http://localhost:4002/api/clinics/admin/all?page=1&limit=10&search=apollo&status=active&plan=Growth"
```

#### Response (Success - 200 OK)

```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic - Delhi",
        "email": "delhi@apolloclinic.com",
        "phone": "9876543200",
        "clinic_type": "Multi-specialty",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. Vikas Sharma",
        "created_at": "2025-08-10T08:30:00Z",
        "updated_at": "2026-04-15T10:20:00Z"
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

---

## Response Formats

### Standard Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "pagination": { /* optional pagination info */ }
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Common HTTP Status Codes

| Status Code | Meaning | Example |
|------------|---------|---------|
| 200 | OK - Request successful | Patient details retrieved |
| 400 | Bad Request - Missing/invalid parameters | Missing clinic_id parameter |
| 404 | Not Found - Resource doesn't exist | Patient not found |
| 500 | Internal Server Error | Database connection error |

---

## Error Handling

### Common Errors and Solutions

#### 1. Missing clinic_id

**Error:**
```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

**Solution:** Always include `clinic_id` as a query parameter for patient endpoints.

#### 2. Patient Not Found

**Error:**
```json
{
  "success": false,
  "error": "Patient not found"
}
```

**Solution:** Verify the patient ID exists and belongs to the specified clinic.

#### 3. Clinic Not Found

**Error:**
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

**Solution:** Check the clinic ID is correct and the clinic hasn't been deleted.

---

## Example Workflows

### Workflow 1: Complete Patient Profile Display

Display a patient's complete profile with all appointments and clinics visited.

```bash
# Step 1: Get basic patient info
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000?clinic_id=550e8400-e29b-41d4-a716-446655440000"

# Step 2: Get all appointments
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000&limit=50"

# Step 3: Get all clinics visited
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/clinics"
```

**Frontend display:**
```
Patient Profile
├─ Name: John Doe
├─ Phone: 9876543210
├─ Email: john@example.com
├─ Gender: Male
├─ DOB: 1990-05-15
├─ Total Appointments: 5
├─ Last Visit: 2026-04-10
│
├─ Appointment History (5 total)
│  ├─ 2026-04-10: Regular Checkup with Dr. Rajesh Kumar
│  ├─ 2026-03-20: Follow-up with Dr. Priya Sharma
│  └─ ... more appointments
│
└─ Clinics Visited (2 total)
   ├─ Apollo Clinic - Delhi (8 appointments, last: 2026-04-10)
   └─ Max Healthcare - Gurgaon (3 appointments, last: 2026-03-15)
```

---

### Workflow 2: Clinic Management Dashboard

Display all clinics with admin statistics and management options.

```bash
# Step 1: Get admin statistics
curl -X GET "http://localhost:4002/api/clinics/admin/stats"

# Step 2: List all clinics (paginated)
curl -X GET "http://localhost:4002/api/clinics/admin/all?page=1&limit=20"

# Step 3: Get details of a specific clinic
curl -X GET "http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings"
```

**Frontend display:**
```
Clinic Management Dashboard

Overview Stats
├─ Total Clinics: 45
├─ Total Phone Numbers: 89
├─ Status Breakdown: Trial (12), Active (28), Past Due (3), Suspended (2)
└─ Plan Breakdown: Trial (12), Starter (15), Growth (15), Enterprise (3)

All Clinics
├─ Apollo Clinic - Delhi (Growth, Active)
├─ Max Healthcare - Gurgaon (Enterprise, Active)
├─ Care Plus - Mumbai (Starter, Active)
└─ ... more clinics (pagination available)
```

---

### Workflow 3: Patient Search and Filter

Search patients by name/phone and filter appointments by status and date.

```bash
# Step 1: Search patients
curl -X GET "http://localhost:4002/api/patients?clinic_id=550e8400-e29b-41d4-a716-446655440000&search=John"

# Step 2: Get completed appointments for specific patient
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000&status=completed&start_date=2026-01-01&end_date=2026-04-30&page=1&limit=10"
```

---

### Workflow 4: Patient Location-Based Clinic Search

Find nearby clinics and show patient's clinic visits.

```bash
# Step 1: Find clinics near patient's location
curl -X GET "http://localhost:4002/api/clinics/nearby?latitude=28.5465&longitude=77.2167&radius_km=10"

# Step 2: Get clinics patient has already visited
curl -X GET "http://localhost:4002/api/patients/123e4567-e89b-12d3-a456-426614174000/clinics"
```

---

## Data Field Reference

### Patient Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique patient identifier |
| `clinic_id` | UUID | Associated clinic identifier |
| `name` | String | Patient's full name |
| `phone` | String | Patient's phone number |
| `email` | String | Patient's email address |
| `gender` | Enum | M/F/Other |
| `date_of_birth` | Date | Patient's DOB (YYYY-MM-DD) |
| `medical_history` | String | Medical background notes |
| `allergies` | String | Known allergies |
| `emergency_contact` | String | Emergency contact phone |
| `created_at` | ISO 8601 | Account creation timestamp |
| `updated_at` | ISO 8601 | Last update timestamp |

### Clinic Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique clinic identifier |
| `name` | String | Clinic name |
| `email` | String | Clinic email |
| `phone` | String | Clinic phone |
| `address` | String | Clinic address |
| `city` | String | City name |
| `state` | String | State/Province |
| `postal_code` | String | Postal code |
| `clinic_type` | String | Type (e.g., Multi-specialty, Hospital) |
| `subscription_plan` | Enum | trial/Starter/Growth/Enterprise |
| `subscription_status` | Enum | trial/active/past_due/suspended/canceled |
| `owner_name` | String | Clinic owner name |
| `created_at` | ISO 8601 | Clinic registration timestamp |

### Appointment Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique appointment identifier |
| `appointment_start` | ISO 8601 | Appointment start time |
| `appointment_end` | ISO 8601 | Appointment end time |
| `reason` | String | Reason for appointment |
| `notes` | String | Doctor's notes |
| `status` | Enum | pending/confirmed/completed/cancelled/rescheduled/no_show |
| `payment_status` | Enum | pending/paid/failed |
| `payment_amount` | Integer | Amount paid (in paise) |
| `token_number` | Integer | Token number (for token-based systems) |
| `doctor_name` | String | Associated doctor name |
| `doctor_speciality` | String | Doctor's specialization |
| `clinic_name` | String | Associated clinic name |
| `created_at` | ISO 8601 | Appointment creation timestamp |

---

## Rate Limiting & Pagination

- **Default page size:** 20 records
- **Maximum page size:** 100 records
- **Pagination:** Offset-based (page/limit parameters)

For large result sets, always use pagination:
```bash
# First page
?page=1&limit=20

# Next page
?page=2&limit=20
```

---

## Best Practices

1. **Always include clinic_id** - Patient data is clinic-scoped
2. **Use pagination** - For lists with many results
3. **Filter by date range** - When querying appointments
4. **Cache clinic data** - Settings and coordinates rarely change
5. **Error handling** - Check `success` field in all responses
6. **Timestamp handling** - All times are in ISO 8601 format with timezone info

---

## Support & Updates

- **Last Updated:** April 18, 2026
- **API Version:** 1.0
- **Status:** Stable ✅

For issues or updates, refer to the main API documentation.
