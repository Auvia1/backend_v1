# Doctor Schedule, Time Off, Appointments & Slots API - Complete Guide

Comprehensive documentation for managing doctors, their schedules, time off, appointments, and available appointment slots with token-based and slot-based booking systems.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Models](#data-models)
3. [Doctor Management](#doctor-management)
4. [Doctor Schedule](#doctor-schedule)
5. [Doctor Time Off](#doctor-time-off)
6. [Doctor Appointments](#doctor-appointments)
7. [Available Slots System](#available-slots-system)
8. [Booking Models: Token vs Slots](#booking-models-token-vs-slots)
9. [Complete Workflows](#complete-workflows)
10. [Error Handling](#error-handling)

---

## Overview

The Doctor Management API provides complete control over:

- **Doctors** - Create, update, manage doctor profiles
- **Schedules** - Recurring weekly schedules with time slots
- **Time Off** - Vacation/leave management with date ranges
- **Appointments** - Book appointments using two models:
  - **Slot-based**: Fixed time slots, prevents double-booking
  - **Token-based**: Queue system, multiple appointments at same time
- **Slots** - Real-time available appointment slots based on schedule, time-off, and bookings

**Base URL:** `http://localhost:3000/api/doctors`

---

## Data Models

### Doctors Table

```
id (UUID) - Primary key
clinic_id (UUID) - Clinic reference
name (varchar) - Doctor name
speciality (varchar) - Medical specialty (e.g., "Cardiology")
consultation_duration_minutes (integer) - Default slot duration
buffer_time_minutes (integer) - Time between appointments
max_appointments_per_day (integer) - Daily limit
is_active (boolean) - Active/inactive status
price_charged (decimal) - Consultation fee
created_at (timestamp)
updated_at (timestamp)
deleted_at (timestamp) - Soft delete
```

### Doctor Schedule Table

```
id (UUID) - Primary key
clinic_id (UUID) - Clinic reference
doctor_id (UUID) - Doctor reference
day_of_week (integer) - 0=Sunday, 1=Monday, ..., 6=Saturday
start_time (time) - e.g., "09:00:00"
end_time (time) - e.g., "17:00:00"
slot_duration_minutes (integer) - How long each slot lasts
effective_from (date) - Schedule effective date
effective_to (date) - Schedule end date (optional)
max_appointments_per_slot (integer[]) - Per-slot capacity array
created_at (timestamp)
```

### Doctor Time Off Table

```
id (UUID) - Primary key
clinic_id (UUID) - Clinic reference
doctor_id (UUID) - Doctor reference
start_time (timestamp) - Leave start (ISO 8601)
end_time (timestamp) - Leave end (ISO 8601)
reason (varchar) - Reason for time off
created_at (timestamp)
```

### Appointments Table

```
id (UUID) - Primary key
clinic_id (UUID) - Clinic reference
patient_id (UUID) - Patient reference
doctor_id (UUID) - Doctor reference
appointment_start (timestamp) - Start time (ISO 8601)
appointment_end (timestamp) - End time (ISO 8601)
reason (varchar) - Appointment reason
notes (text) - Additional notes
status (enum) - pending, confirmed, completed, cancelled, no_show, rescheduled
source (varchar) - "manual" or "agent"
payment_status (varchar) - pending, paid, failed, refunded
payment_amount (decimal) - Amount charged
token_number (integer) - For token-based system (null for slot-based)
created_by (UUID) - Creator reference
cancelled_by (UUID) - Who cancelled
created_at (timestamp)
updated_at (timestamp)
deleted_at (timestamp) - Soft delete
```

---

## Doctor Management

### GET /api/doctors?clinic_id=<id> - List Doctors

Retrieve all active doctors for a clinic.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/doctors?clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "consultation_duration_minutes": 30,
      "buffer_time_minutes": 5,
      "max_appointments_per_day": 20,
      "is_active": true,
      "price_charged": 500,
      "created_at": "2026-01-01T10:00:00Z",
      "updated_at": "2026-05-28T10:00:00Z",
      "deleted_at": null
    }
  ]
}
```

---

### POST /api/doctors - Create Doctor

Create a new doctor profile.

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Dr. Priya Sharma",
  "speciality": "Pediatrics",
  "consultation_duration_minutes": 20,
  "buffer_time_minutes": 5,
  "max_appointments_per_day": 30
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |
| name | varchar | ✅ | Doctor name |
| speciality | varchar | ❌ | Medical specialty |
| consultation_duration_minutes | integer | ❌ | Default slot duration (default: 30) |
| buffer_time_minutes | integer | ❌ | Time between appointments (default: 0) |
| max_appointments_per_day | integer | ❌ | Daily appointment limit |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Priya Sharma",
    "speciality": "Pediatrics",
    "consultation_duration_minutes": 20,
    "buffer_time_minutes": 5,
    "max_appointments_per_day": 30,
    "is_active": true,
    "created_at": "2026-05-28T11:00:00Z"
  }
}
```

---

### PATCH /api/doctors/:id - Update Doctor

Update doctor information.

**Request Body:**

```json
{
  "name": "Dr. Priya Sharma - Updated",
  "speciality": "Pediatrics & Neonatology",
  "is_active": true,
  "max_appointments_per_day": 25
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Priya Sharma - Updated",
    "speciality": "Pediatrics & Neonatology",
    "is_active": true,
    "max_appointments_per_day": 25,
    "updated_at": "2026-05-28T12:00:00Z"
  }
}
```

---

## Doctor Schedule

### Understanding the Schedule System

Doctor schedules are **recurring weekly** patterns:

- Each schedule defines **one day of the week** (Monday, Tuesday, etc.)
- Defines **start and end times** (e.g., 9:00 AM - 5:00 PM)
- Specifies **slot duration** (e.g., 30-minute slots)
- Optional **effective date range** (schedule applies from date X to date Y)
- Optional **max_appointments_per_slot** (capacity per slot)

**Example:**
- Monday 9:00-17:00, 30-minute slots = 16 available slots per day
- Each slot can hold 1 or more appointments (if configured)

---

### GET /api/doctors/:id/schedule?clinic_id=<id> - List Schedules

Retrieve all schedules for a doctor.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/schedule?clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-01-01",
      "effective_to": "2026-12-31",
      "max_appointments_per_slot": [1, 1, 1, 1, 1, 1, 1, 1],
      "created_at": "2026-01-01T10:00:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "day_of_week": 2,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-01-01",
      "effective_to": null,
      "max_appointments_per_slot": null,
      "created_at": "2026-01-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/doctors/:id/schedule - Create Schedule

Create a new recurring schedule for a doctor.

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "slot_duration_minutes": 30,
  "effective_from": "2026-01-01",
  "effective_to": "2026-12-31",
  "max_appointments_per_slot": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |
| day_of_week | integer | ✅ | 0=Sunday, 1=Monday, ..., 6=Saturday |
| start_time | time | ✅ | e.g., "09:00:00" (HH:MM:SS format) |
| end_time | time | ✅ | e.g., "17:00:00" (HH:MM:SS format) |
| slot_duration_minutes | integer | ✅ | Duration of each slot (e.g., 30) |
| effective_from | date | ❌ | Schedule starts this date (YYYY-MM-DD) |
| effective_to | date | ❌ | Schedule ends this date (YYYY-MM-DD), null = ongoing |
| max_appointments_per_slot | array | ❌ | Capacity per slot as integer array |

**Key Notes:**

- **day_of_week**: 0 (Sunday) through 6 (Saturday)
- **slot_duration_minutes**: How many minutes each slot lasts
- **max_appointments_per_slot**: Array of integers, one per slot
  - Example: [1,1,1,1,...] = each slot holds max 1 appointment
  - Example: [2,2,2,2,...] = each slot holds max 2 appointments
  - null = unlimited capacity per slot

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31",
    "max_appointments_per_slot": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "created_at": "2026-05-28T12:30:00Z"
  }
}
```

---

### PATCH /api/doctors/:id/schedule/:schedule_id - Update Schedule

Update an existing schedule.

**Request Body:**

```json
{
  "start_time": "10:00:00",
  "end_time": "18:00:00",
  "slot_duration_minutes": 45,
  "max_appointments_per_slot": [1, 1, 1, 1, 1, 1, 1, 1, 1]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "day_of_week": 1,
    "start_time": "10:00:00",
    "end_time": "18:00:00",
    "slot_duration_minutes": 45,
    "max_appointments_per_slot": [1, 1, 1, 1, 1, 1, 1, 1, 1],
    "updated_at": "2026-05-28T13:00:00Z"
  }
}
```

---

## Doctor Time Off

### GET /api/doctors/:id/time-off?clinic_id=<id> - List Time Off

Retrieve all time-off periods for a doctor.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/time-off?clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "start_time": "2026-06-15T00:00:00+05:30",
      "end_time": "2026-06-20T23:59:59+05:30",
      "reason": "Annual leave",
      "created_at": "2026-05-28T14:00:00Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440002",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "start_time": "2026-07-10T12:00:00+05:30",
      "end_time": "2026-07-10T13:30:00+05:30",
      "reason": "Lunch break",
      "created_at": "2026-05-28T14:10:00Z"
    }
  ]
}
```

---

### POST /api/doctors/:id/time-off - Create Time Off

Record a time-off period for a doctor.

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_time": "2026-06-15T00:00:00Z",
  "end_time": "2026-06-20T23:59:59Z",
  "reason": "Annual leave - Vacation"
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |
| start_time | timestamp | ✅ | Start time (ISO 8601 with timezone) |
| end_time | timestamp | ✅ | End time (ISO 8601 with timezone) |
| reason | varchar | ❌ | Reason for time off |

**Important Notes:**

- Times must be in **ISO 8601 format** with timezone
- Example: `2026-06-15T00:00:00+05:30` (IST)
- Example: `2026-06-15T09:00:00Z` (UTC)

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "start_time": "2026-06-15T00:00:00+05:30",
    "end_time": "2026-06-20T23:59:59+05:30",
    "reason": "Annual leave - Vacation",
    "created_at": "2026-05-28T14:15:00Z"
  }
}
```

---

### PATCH /api/doctors/:id/time-off/:timeoff_id - Update Time Off

Update a time-off period.

**Request Body:**

```json
{
  "start_time": "2026-06-16T00:00:00Z",
  "end_time": "2026-06-19T23:59:59Z",
  "reason": "Updated vacation - 4 days"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "start_time": "2026-06-16T00:00:00+05:30",
    "end_time": "2026-06-19T23:59:59+05:30",
    "reason": "Updated vacation - 4 days",
    "created_at": "2026-05-28T14:15:00Z"
  }
}
```

---

### DELETE /api/doctors/:id/time-off/:timeoff_id - Delete Time Off

Remove a time-off period.

**Request:**

```bash
curl -X DELETE "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/time-off/990e8400-e29b-41d4-a716-446655440003"
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Time off deleted successfully",
  "data": { ... }
}
```

---

## Doctor Appointments

### GET /api/doctors/:id/appointments - List Appointments

Retrieve all appointments for a doctor with advanced filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |
| status | enum | ❌ | Filter by status (pending, confirmed, completed, cancelled, no_show, rescheduled) |
| start_date | date | ❌ | Filter from date (YYYY-MM-DD) |
| end_date | date | ❌ | Filter to date (YYYY-MM-DD) |
| patient_id | uuid | ❌ | Filter by specific patient |
| page | integer | ❌ | Page number (default: 1) |
| limit | integer | ❌ | Records per page (default: 20) |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/appointments?clinic_id=550e8400-e29b-41d4-a716-446655440000&status=confirmed&start_date=2026-05-01&end_date=2026-05-31&limit=10&page=1"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "patient_id": "bb0e8400-e29b-41d4-a716-446655440001",
      "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
      "appointment_start": "2026-05-28T10:00:00Z",
      "appointment_end": "2026-05-28T10:30:00Z",
      "reason": "Regular checkup",
      "notes": null,
      "status": "confirmed",
      "source": "manual",
      "payment_status": "paid",
      "payment_amount": 500,
      "patient_name": "John Doe",
      "patient_phone": "+91-9876543210",
      "patient_email": "john@example.com",
      "doctor_name": "Dr. Priya Sharma",
      "doctor_speciality": "Pediatrics",
      "created_at": "2026-05-27T15:00:00Z",
      "updated_at": "2026-05-28T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## Available Slots System

### GET /api/doctors/:id/slots?date=YYYY-MM-DD&clinic_id=<id> - Get Available Slots

Retrieve all available appointment slots for a doctor on a specific date.

**How Slots are Calculated:**

1. **Get doctor's schedule** for that day of week
2. **Generate all slots** based on start/end time and duration
3. **Remove booked slots** (appointments with status ≠ cancelled/rescheduled)
4. **Remove time-off periods** (doctor_time_off that overlap the date)
5. **Return available slots** with availability status

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | date | ✅ | Date to fetch slots for (YYYY-MM-DD) |
| clinic_id | uuid | ✅ | Clinic ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/slots?date=2026-05-29&clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "time": "09:00:00",
      "available": true
    },
    {
      "time": "09:30:00",
      "available": true
    },
    {
      "time": "10:00:00",
      "available": false
    },
    {
      "time": "10:30:00",
      "available": false
    },
    {
      "time": "11:00:00",
      "available": true
    },
    {
      "time": "11:30:00",
      "available": true
    },
    {
      "time": "12:00:00",
      "available": false
    },
    {
      "time": "12:30:00",
      "available": true
    },
    {
      "time": "13:00:00",
      "available": true
    },
    {
      "time": "13:30:00",
      "available": true
    },
    {
      "time": "14:00:00",
      "available": true
    },
    {
      "time": "14:30:00",
      "available": true
    },
    {
      "time": "15:00:00",
      "available": true
    },
    {
      "time": "15:30:00",
      "available": true
    },
    {
      "time": "16:00:00",
      "available": true
    },
    {
      "time": "16:30:00",
      "available": false
    }
  ]
}
```

**Error Response (No Schedule):**

```json
{
  "success": true,
  "data": [],
  "message": "Doctor does not work this day"
}
```

---

## Booking Models: Token vs Slots

### Slot-Based Booking System

**When:** `clinic_settings.is_slots_needed = true`

**Behavior:**
- One appointment per time slot
- Uses `FOR UPDATE` lock to prevent double-booking
- Returns 409 Conflict if slot already booked
- **token_number** remains null

**Use Case:** Surgeries, consultations, time-critical appointments

**Example:**
```
9:00 - Slot available → Book appointment
9:30 - Slot available → Book appointment
10:00 - Slot booked → Cannot book (returns 409 error)
```

---

### Token-Based Booking System

**When:** `clinic_settings.is_slots_needed = false`

**Behavior:**
- Multiple appointments allowed at same time
- Auto-assigns next available **token_number**
- Patients get a queue position
- No double-booking prevention (intentional)
- **token_number** = (max_token_for_day + 1)

**Use Case:** General clinics, walk-ins, queue-based systems

**Example:**
```
Time 10:00
  - Appointment 1: token_number = 1
  - Appointment 2: token_number = 2
  - Appointment 3: token_number = 3
  - Appointment 4: token_number = 4
```

---

## Complete Workflows

### Workflow 1: Set Up Complete Doctor Schedule

**Step 1: Create Doctor**

```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 30,
    "buffer_time_minutes": 5,
    "max_appointments_per_day": 20
  }'
```

**Response:** Returns `doctor_id = 770e8400-e29b-41d4-a716-446655440002`

**Step 2: Create Schedule for Monday-Friday**

```bash
# Create Monday Schedule
curl -X POST http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "effective_from": "2026-01-01",
    "effective_to": null,
    "max_appointments_per_slot": [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  }'

# Create Tuesday Schedule (same as Monday)
curl -X POST http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "day_of_week": 2,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30
  }'

# ... repeat for Wednesday (3), Thursday (4), Friday (5)
# Note: day_of_week 0 = Sunday, 6 = Saturday
```

**Step 3: Check Available Slots**

```bash
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/slots?date=2026-05-29&clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

Returns list of available time slots for that day.

---

### Workflow 2: Add Vacation Time Off

**Step 1: Create Time Off**

```bash
curl -X POST http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/time-off \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "start_time": "2026-06-15T00:00:00Z",
    "end_time": "2026-06-20T23:59:59Z",
    "reason": "Summer vacation"
  }'
```

**Step 2: Check Slots During Vacation**

```bash
# Check slots for June 17 (during vacation)
curl -X GET "http://localhost:3000/api/doctors/770e8400-e29b-41d4-a716-446655440002/slots?date=2026-06-17&clinic_id=550e8400-e29b-41d4-a716-446655440000"
```

Returns empty or all unavailable (doctor is on time-off).

---

### Workflow 3: Book Appointment (Slot-Based)

**Requirements:**
- Clinic has `is_slots_needed = true`
- Doctor has schedule for that day
- Slot is available

**Create Appointment:**

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_name": "John Doe",
    "patient_phone": "+91-9876543210",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "appointment_start": "2026-05-29T10:00:00Z",
    "appointment_end": "2026-05-29T10:30:00Z",
    "reason": "Regular checkup",
    "source": "manual"
  }'
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_id": "bb0e8400-e29b-41d4-a716-446655440001",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "appointment_start": "2026-05-29T10:00:00Z",
    "appointment_end": "2026-05-29T10:30:00Z",
    "reason": "Regular checkup",
    "status": "confirmed",
    "token_number": null,
    "source": "manual",
    "created_at": "2026-05-28T15:00:00Z"
  }
}
```

**Error Response (Slot Already Booked):**

```json
{
  "success": false,
  "error": "This time slot is already booked."
}
```

---

### Workflow 4: Book Multiple Appointments (Token-Based)

**Requirements:**
- Clinic has `is_slots_needed = false`
- Doctor has schedule for that day
- Multiple appointments allowed at same time

**First Appointment:**

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_name": "Patient 1",
    "patient_phone": "+91-1111111111",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "appointment_start": "2026-05-29T14:00:00Z",
    "appointment_end": "2026-05-29T14:30:00Z",
    "reason": "Checkup"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440001",
    "appointment_start": "2026-05-29T14:00:00Z",
    "token_number": 1
  }
}
```

**Second Appointment (Same Time):**

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_name": "Patient 2",
    "patient_phone": "+91-2222222222",
    "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
    "appointment_start": "2026-05-29T14:00:00Z",
    "appointment_end": "2026-05-29T14:30:00Z",
    "reason": "Checkup"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440002",
    "appointment_start": "2026-05-29T14:00:00Z",
    "token_number": 2
  }
}
```

**Note:** Both appointments at same time, different token numbers (1, 2).

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "clinic_id query param required" | Missing clinic_id | Add clinic_id to query string |
| "clinic_id, day_of_week... are required" | Missing required fields | Include all required fields |
| "This time slot is already booked" | Slot-based booking, slot taken | Choose different time or check available slots |
| "Doctor is on leave during this time" | Doctor has time-off | Check time-off schedule and pick different date |
| "Invalid status" | Invalid appointment status | Use: pending, confirmed, completed, cancelled, no_show, rescheduled |
| "Doctor does not work this day" | No schedule for day | Create schedule or pick different day |
| 404 Not Found | Doctor/schedule doesn't exist | Verify IDs and clinic_id |

---

## Best Practices

### ✅ DO

1. **Create schedule for all working days** before accepting appointments
2. **Set time-off in advance** for vacations and leaves
3. **Check available slots** before trying to book
4. **Use correct ISO 8601 format** for timestamps with timezone
5. **Validate clinic's booking model** before booking (is_slots_needed)
6. **Use pagination** when fetching many appointments
7. **Handle both booking models** in frontend

### ❌ DON'T

1. **Don't assume slot is available** without checking /slots endpoint
2. **Don't forget timezone** when setting times (IST = +05:30)
3. **Don't create overlapping schedules** for same day/doctor
4. **Don't book beyond schedule end time**
5. **Don't assume token_number exists** for slot-based bookings
6. **Don't ignore doctor time-off** when checking availability

---

## Related Documentation

- [Clinic Creation & Update APIs](CLINIC_CREATION_UPDATE_API.md)
- [Clinic Documents API](CLINIC_DOCUMENTS_API.md)
- [Appointment Creation & Prevention Guide](APPOINTMENT_CREATION_PREVENTION.md)
- [Activity Log APIs](ACTIVITY_LOG_API_DOCUMENTATION.md)
