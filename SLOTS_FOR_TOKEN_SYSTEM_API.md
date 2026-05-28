# Slots for Token System API - Complete Guide

Comprehensive documentation for managing appointment slots in the token-based booking system. This is a separate, simpler slot system designed specifically for clinics using queue/token-based appointment models.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Schema](#data-schema)
3. [Authentication](#authentication)
4. [Endpoints](#endpoints)
5. [Slot Status Types](#slot-status-types)
6. [Complete Workflows](#complete-workflows)
7. [Code Examples](#code-examples)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

The **Slots for Token System API** manages recurring weekly appointment slots for clinics using token-based booking.

**Key Features:**
- ✅ Recurring weekly slot definitions (Monday-Sunday)
- ✅ Simple time-based slots (HH:MM:SS format)
- ✅ Per-slot capacity management
- ✅ Slot status tracking (open, full, closed, cancelled)
- ✅ Effective date ranges (when slots are valid)
- ✅ Filtering and pagination
- ✅ JWT authentication required

**Difference from Doctor Schedule:**
| Feature | Doctor Schedule | Token System Slots |
|---------|-----------------|-------------------|
| Slot Duration | Array-based per slot | Single duration for all |
| Status | N/A | open, full, closed, cancelled |
| Capacity | integer[] array | Single integer |
| Use Case | Mixed booking models | Token-based only |
| Complexity | More detailed | Simplified |

**Base URL:** `http://localhost:3000/api/slots`

---

## Data Schema

### slots_for_token_system Table

```
id (UUID) - Primary key
clinic_id (UUID) - Clinic reference
doctor_id (UUID) - Doctor reference
day_of_week (integer) - 0=Sunday, 1=Monday, ..., 6=Saturday
start_time (time) - e.g., "09:00:00" (HH:MM:SS)
end_time (time) - e.g., "17:00:00" (HH:MM:SS)
max_appointments_per_slot (integer) - Capacity per slot (e.g., 2)
status (varchar) - open, full, closed, cancelled
effective_from (date) - When slot becomes active (YYYY-MM-DD)
effective_to (date) - When slot expires (nullable = ongoing)
created_at (timestamp)
updated_at (timestamp)
deleted_at (timestamp) - Soft delete
```

**Example Record:**
```sql
id: 880e8400-e29b-41d4-a716-446655440001
clinic_id: 550e8400-e29b-41d4-a716-446655440000
doctor_id: 770e8400-e29b-41d4-a716-446655440002
day_of_week: 1 (Monday)
start_time: 09:00:00
end_time: 17:00:00
max_appointments_per_slot: 3 (allow 3 patients per time slot)
status: open
effective_from: 2026-01-01
effective_to: 2026-12-31
```

---

## Authentication

### Required Headers

All endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting JWT Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "clinic_username",
    "password": "clinic_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Endpoints

### 1. POST /api/slots - Create Slot

Create a new recurring slot for a doctor.

**Method:** POST

**Endpoint:** `/api/slots`

**Request Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "max_appointments_per_slot": 2,
  "status": "open",
  "effective_from": "2026-01-01",
  "effective_to": "2026-12-31"
}
```

**Input Parameters:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| clinic_id | uuid | ✅ | Clinic ID | Must match authenticated user's clinic |
| doctor_id | uuid | ✅ | Doctor ID | Must exist in clinic (not deleted) |
| day_of_week | integer | ✅ | Day (0=Sun, 1=Mon, ..., 6=Sat) | 0-6 |
| start_time | time | ✅ | Slot start (HH:MM:SS) | Valid format, before end_time |
| end_time | time | ✅ | Slot end (HH:MM:SS) | Valid format, after start_time |
| max_appointments_per_slot | integer | ✅ | Capacity per slot | Positive integer > 0 |
| status | varchar | ❌ | Slot status (default: "open") | open, full, closed, cancelled |
| effective_from | date | ❌ | When slot starts (default: today) | YYYY-MM-DD format |
| effective_to | date | ❌ | When slot ends (nullable) | YYYY-MM-DD, after effective_from or null |

**Request Example:**

```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "max_appointments_per_slot": 2,
    "status": "open",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31"
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "Slot created successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "max_appointments_per_slot": 2,
    "status": "open",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31",
    "created_at": "2026-05-28T14:30:00Z",
    "updated_at": "2026-05-28T14:30:00Z",
    "deleted_at": null
  }
}
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Missing required fields: clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot"
}
```

```json
{
  "success": false,
  "error": "day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)"
}
```

```json
{
  "success": false,
  "error": "start_time must be in HH:MM:SS format (e.g., 09:00:00)"
}
```

---

### 2. GET /api/slots - List Slots

Retrieve all slots with advanced filtering and pagination.

**Method:** GET

**Endpoint:** `/api/slots`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| clinic_id | uuid | ✅ | Clinic ID | 550e8400-e29b-41d4-a716-446655440000 |
| doctor_id | uuid | ❌ | Filter by doctor | 770e8400-e29b-41d4-a716-446655440002 |
| day_of_week | integer | ❌ | Filter by day (0-6) | 1 |
| status | varchar | ❌ | Filter by status | open, full, closed, cancelled |
| effective_from | date | ❌ | Slots effective from this date | 2026-01-01 |
| effective_to | date | ❌ | Slots effective to this date | 2026-12-31 |
| page | integer | ❌ | Page number (default: 1) | 1 |
| limit | integer | ❌ | Records per page (default: 20, max: 100) | 20 |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/slots?clinic_id=550e8400-e29b-41d4-a716-446655440000&doctor_id=770e8400-e29b-41d4-a716-446655440002&day_of_week=1&status=open&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "doctor_name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "max_appointments_per_slot": 2,
      "status": "open",
      "effective_from": "2026-01-01",
      "effective_to": "2026-12-31",
      "created_at": "2026-05-28T14:30:00Z",
      "updated_at": "2026-05-28T14:30:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "doctor_name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "day_of_week": 2,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "max_appointments_per_slot": 3,
      "status": "open",
      "effective_from": "2026-01-01",
      "effective_to": null,
      "created_at": "2026-05-28T14:30:00Z",
      "updated_at": "2026-05-28T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "totalPages": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### 3. GET /api/slots/:id - Get Single Slot

Retrieve a single slot by ID.

**Method:** GET

**Endpoint:** `/api/slots/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Slot ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "doctor_name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "max_appointments_per_slot": 2,
    "status": "open",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31",
    "created_at": "2026-05-28T14:30:00Z",
    "updated_at": "2026-05-28T14:30:00Z",
    "deleted_at": null
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Slot not found"
}
```

---

### 4. PATCH /api/slots/:id - Update Slot

Update a slot (cannot change clinic_id or doctor_id).

**Method:** PATCH

**Endpoint:** `/api/slots/:id`

**Request Body:**

```json
{
  "start_time": "10:00:00",
  "end_time": "18:00:00",
  "max_appointments_per_slot": 3,
  "status": "full"
}
```

**Updatable Fields:**

| Field | Type | Validation |
|-------|------|-----------|
| day_of_week | integer | 0-6 |
| start_time | time | HH:MM:SS, before end_time |
| end_time | time | HH:MM:SS, after start_time |
| max_appointments_per_slot | integer | Positive integer > 0 |
| status | varchar | open, full, closed, cancelled |
| effective_from | date | YYYY-MM-DD format |
| effective_to | date | YYYY-MM-DD or null |

**Request:**

```bash
curl -X PATCH http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "10:00:00",
    "end_time": "18:00:00",
    "max_appointments_per_slot": 3,
    "status": "open"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Slot updated successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "10:00:00",
    "end_time": "18:00:00",
    "max_appointments_per_slot": 3,
    "status": "open",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31",
    "updated_at": "2026-05-28T15:00:00Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "end_time must be after start_time"
}
```

---

### 5. DELETE /api/slots/:id - Delete Slot

Soft delete a slot (sets deleted_at timestamp).

**Method:** DELETE

**Endpoint:** `/api/slots/:id`

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Slot deleted successfully",
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "open",
    "deleted_at": "2026-05-28T15:05:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Slot not found"
}
```

---

## Slot Status Types

| Status | Meaning | Use Case |
|--------|---------|----------|
| **open** | Slot is available for bookings | Default for new slots, accepting patients |
| **full** | Slot is at max capacity | All appointment slots are booked |
| **closed** | Slot is temporarily unavailable | Doctor not working due to meetings, etc |
| **cancelled** | Slot is permanently cancelled | Doctor unavailable, slot no longer valid |

---

## Complete Workflows

### Workflow 1: Set Up Weekly Schedule for Token-Based Clinic

**Step 1: Create Monday Slot**

```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "max_appointments_per_slot": 3,
    "status": "open",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31"
  }'
```

**Step 2: Create Tuesday Slot**

```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 2,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "max_appointments_per_slot": 3,
    "status": "open"
  }'
```

**Step 3: Continue for Wednesday-Friday (day_of_week 3-5)**

**Step 4: Verify All Slots Created**

```bash
curl -X GET "http://localhost:3000/api/slots?clinic_id=550e8400-e29b-41d4-a716-446655440000&doctor_id=770e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Returns: 5 slots (Monday-Friday, each with max 3 appointments)

---

### Workflow 2: Temporarily Close a Slot

**Mark Slot as Closed (During Meetings)**

```bash
curl -X PATCH http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
```

**Re-open Slot**

```bash
curl -X PATCH http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "open"
  }'
```

---

### Workflow 3: Increase Capacity for a Slot

**Original: 2 patients per slot → Update to 4**

```bash
curl -X PATCH http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "max_appointments_per_slot": 4
  }'
```

---

### Workflow 4: Set Slot Expiration Date

**Limit Slot to First Quarter of Year**

```bash
curl -X PATCH http://localhost:3000/api/slots/880e8400-e29b-41d4-a716-446655440001 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "effective_to": "2026-03-31"
  }'
```

After March 31, 2026, this slot is no longer active.

---

## Code Examples

### JavaScript/Node.js

#### Create Slots for a Doctor

```javascript
const axios = require('axios');

async function createWeeklySlots(clinicId, doctorId, jwtToken) {
  const daysOfWeek = [
    { day: 1, name: 'Monday' },
    { day: 2, name: 'Tuesday' },
    { day: 3, name: 'Wednesday' },
    { day: 4, name: 'Thursday' },
    { day: 5, name: 'Friday' }
  ];

  for (const dayInfo of daysOfWeek) {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/slots',
        {
          clinic_id: clinicId,
          doctor_id: doctorId,
          day_of_week: dayInfo.day,
          start_time: '09:00:00',
          end_time: '17:00:00',
          max_appointments_per_slot: 3,
          status: 'open',
          effective_from: '2026-01-01',
          effective_to: '2026-12-31'
        },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      );
      console.log(`${dayInfo.name} slot created:`, response.data.data.id);
    } catch (error) {
      console.error(`Error creating ${dayInfo.name} slot:`, error.response?.data?.error);
    }
  }
}
```

#### List All Slots for a Doctor

```javascript
async function listDoctorSlots(clinicId, doctorId, jwtToken) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/slots?clinic_id=${clinicId}&doctor_id=${doctorId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );
    
    console.log(`Total slots: ${response.data.pagination.total}`);
    response.data.data.forEach(slot => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      console.log(
        `${dayNames[slot.day_of_week]}: ${slot.start_time}-${slot.end_time} (${slot.max_appointments_per_slot} per slot) - ${slot.status}`
      );
    });
  } catch (error) {
    console.error('Error fetching slots:', error.response?.data?.error);
  }
}
```

#### Update Slot Status

```javascript
async function updateSlotStatus(slotId, newStatus, jwtToken) {
  try {
    const response = await axios.patch(
      `http://localhost:3000/api/slots/${slotId}`,
      {
        status: newStatus
      },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );
    console.log('Slot updated:', response.data.data);
  } catch (error) {
    console.error('Error updating slot:', error.response?.data?.error);
  }
}
```

### Python

#### Create Weekly Slots

```python
import requests

def create_weekly_slots(clinic_id, doctor_id, jwt_token):
    days = [
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday'),
        (5, 'Friday')
    ]
    
    headers = {
        'Authorization': f'Bearer {jwt_token}',
        'Content-Type': 'application/json'
    }
    
    for day_num, day_name in days:
        payload = {
            'clinic_id': clinic_id,
            'doctor_id': doctor_id,
            'day_of_week': day_num,
            'start_time': '09:00:00',
            'end_time': '17:00:00',
            'max_appointments_per_slot': 3,
            'status': 'open',
            'effective_from': '2026-01-01',
            'effective_to': '2026-12-31'
        }
        
        response = requests.post(
            'http://localhost:3000/api/slots',
            json=payload,
            headers=headers
        )
        
        if response.status_code == 201:
            slot_id = response.json()['data']['id']
            print(f"{day_name} slot created: {slot_id}")
        else:
            print(f"Error creating {day_name} slot: {response.json()['error']}")
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "clinic_id query param required" | Missing clinic_id | Add clinic_id to request |
| "Missing required fields" | Missing required field | Include all required fields |
| "day_of_week must be between 0 and 6" | Invalid day value | Use 0-6 (Sunday=0, Saturday=6) |
| "start_time must be in HH:MM:SS format" | Invalid time format | Use HH:MM:SS format (e.g., 09:00:00) |
| "end_time must be after start_time" | Invalid time range | Ensure end_time > start_time |
| "max_appointments_per_slot must be a positive integer" | Invalid capacity | Use integer > 0 |
| "Doctor not found in this clinic" | Doctor doesn't exist | Verify doctor_id and clinic_id match |
| "Forbidden" | Clinic_id doesn't match auth user | Use correct clinic_id for authenticated user |
| "Slot not found" | Slot doesn't exist | Verify slot_id is correct |
| 401 Unauthorized | Missing/invalid JWT token | Include valid JWT token in Authorization header |

---

## Best Practices

### ✅ DO

1. **Create slots for all working days** before opening clinic for patients
2. **Use appropriate capacity** based on clinic needs (2-5 typically works best)
3. **Set effective dates** to limit slots to valid periods
4. **Use status field** to temporarily manage availability (closed, full)
5. **Handle errors gracefully** in production code
6. **Store JWT tokens securely** (httpOnly cookies recommended)
7. **Validate day_of_week** (0-6) before sending
8. **Use pagination** when listing many slots

### ❌ DON'T

1. **Don't forget clinic_id** parameter (required for all requests)
2. **Don't use invalid time format** (must be HH:MM:SS)
3. **Don't create overlapping slots** for same doctor/day (if not intended)
4. **Don't set max_appointments to 0** (must be > 0)
5. **Don't hardcode JWT tokens** in code
6. **Don't ignore authentication errors** - handle 401 properly
7. **Don't assume slot exists** without verifying
8. **Don't expose error details** to users (log internally)

---

## Comparison: Doctor Schedule vs Token Slots

### Doctor Schedule (`/api/doctors/:id/schedule`)
- ✓ Per-slot capacity array (can vary each slot)
- ✓ More flexible time management
- ✓ No status field
- ✓ Used for mixed booking models
- ✗ More complex to manage

### Token System Slots (`/api/slots`)
- ✓ Simple single capacity number
- ✓ Status tracking (open, full, closed, cancelled)
- ✓ Easy slot management
- ✓ Built for token/queue systems
- ✓ Simpler to implement
- ✗ All slots have same capacity

**When to use Token Slots:**
- Token/queue-based clinics
- Simple capacity management
- Status tracking needed
- Clinic uses token_number system

**When to use Doctor Schedule:**
- Mixed or slot-based clinics
- Variable capacity per slot
- More control needed
- Complex appointment rules

---

## Related Documentation

- [Doctor Schedule, Time Off & Appointments Guide](DOCTOR_SCHEDULE_TIMEOFF_APPOINTMENTS_SLOTS_GUIDE.md)
- [Clinic Management Guide](CLINIC_MANAGEMENT_COMPLETE_GUIDE.md)
- [Appointment Creation APIs](APPOINTMENT_CREATION_PREVENTION.md)
