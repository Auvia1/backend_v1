# Slots for Token System - API Documentation (UPDATED)

**Last Updated**: April 15, 2026 (Revised)
**Table**: `slots_for_token_system`

---

## Overview

This API manages recurring appointment slots for clinics using a token-based appointment system. Unlike time-specific slots, these are **recurring weekly schedules** that define when a doctor is available.

**Key Changes**:
- Slots now represent recurring weekly patterns (e.g., "every Monday 09:00-10:00")
- Uses `day_of_week`, `start_time`, and `end_time` instead of specific timestamps
- Supports effective date ranges for schedule changes
- Similar to `doctor_schedule` table structure

---

## Base URL

```
GET   /api/slots
POST  /api/slots
GET   /api/slots/:id
PATCH /api/slots/:id
DELETE /api/slots/:id
```

---

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The JWT token contains `clinic_id` which is verified against the requested clinic data.

---

## Table Schema (Updated)

```sql
CREATE TABLE public.slots_for_token_system (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    max_appointments_per_slot integer NOT NULL DEFAULT 1,
    status character varying(20) DEFAULT 'open' NOT NULL,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### Field Descriptions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `clinic_id` | UUID | Which clinic owns this slot | FK to `clinics.id`, not updatable |
| `doctor_id` | UUID | Which doctor this slot belongs to | FK to `doctors.id`, not updatable |
| `day_of_week` | Integer | Day of week (0=Sunday, 6=Saturday) | 0-6, NOT NULL |
| `start_time` | Time | When slot starts daily | HH:MM:SS format, NOT NULL |
| `end_time` | Time | When slot ends daily | HH:MM:SS format, must be > start_time |
| `max_appointments_per_slot` | Integer | Max appointments allowed per slot | Must be > 0, NOT NULL |
| `status` | String | Current slot status | `open`, `full`, `closed`, or `cancelled` |
| `effective_from` | Date | Schedule effective start | YYYY-MM-DD format, default: today |
| `effective_to` | Date | Schedule effective end | YYYY-MM-DD format, nullable |
| `deleted_at` | Timestamp | Soft delete timestamp | NULL if active |
| `created_at` | Timestamp | When slot was created | Auto-set |
| `updated_at` | Timestamp | When slot was last updated | Auto-updated by trigger |

---

## Day of Week Reference

| Value | Day |
|-------|-----|
| 0 | Sunday |
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |

---

## Endpoints

### 1. CREATE SLOT

**Endpoint**: `POST /api/slots`

**Description**: Create a new recurring appointment slot.

#### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body

```json
{
  "clinic_id": "c1d1-4d2c-a1b1-000000000001",
  "doctor_id": "d1d1-4d2c-a1b1-000000000001",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "max_appointments_per_slot": 5,
  "status": "open",
  "effective_from": "2026-04-20",
  "effective_to": "2026-06-30"
}
```

#### Required Fields

| Field | Type | Description | Format |
|-------|------|-------------|--------|
| `clinic_id` | UUID | Your clinic ID (must match JWT token) | UUID |
| `doctor_id` | UUID | Doctor ID (must exist in clinic) | UUID |
| `day_of_week` | Integer | Day of week | 0-6 (0=Sunday) |
| `start_time` | String | Slot start time (daily) | HH:MM:SS |
| `end_time` | String | Slot end time (daily) | HH:MM:SS |
| `max_appointments_per_slot` | Integer | Max appointments in slot | Integer > 0 |

#### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | String | `open` | Slot status (`open`, `full`, `closed`, `cancelled`) |
| `effective_from` | Date | Today | Schedule start date (YYYY-MM-DD) |
| `effective_to` | Date | NULL | Schedule end date (YYYY-MM-DD) |

#### Response - Success (201)

```json
{
  "success": true,
  "message": "Slot created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
    "effective_from": "2026-04-20",
    "effective_to": "2026-06-30",
    "deleted_at": null,
    "created_at": "2026-04-15T10:30:00+00:00",
    "updated_at": "2026-04-15T10:30:00+00:00"
  }
}
```

#### Response - Errors

**400 - Missing Required Fields**
```json
{
  "success": false,
  "error": "Missing required fields: clinic_id, doctor_id, day_of_week, start_time, end_time, max_appointments_per_slot"
}
```

**400 - Invalid day_of_week**
```json
{
  "success": false,
  "error": "day_of_week must be an integer between 0 (Sunday) and 6 (Saturday)"
}
```

**400 - Invalid Time Format**
```json
{
  "success": false,
  "error": "start_time must be in HH:MM:SS format (e.g., 09:00:00)"
}
```

**400 - Invalid Time Range**
```json
{
  "success": false,
  "error": "end_time must be after start_time"
}
```

**404 - Doctor Not Found**
```json
{
  "success": false,
  "error": "Doctor not found in this clinic"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

#### Example cURL

```bash
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
    "effective_from": "2026-04-20"
  }'
```

---

### 2. GET ALL SLOTS

**Endpoint**: `GET /api/slots`

**Description**: Fetch all recurring slots for a clinic with optional filters.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clinic_id` | UUID | ✓ | - | Your clinic ID |
| `doctor_id` | UUID | | | Filter slots by doctor |
| `day_of_week` | Integer | | | Filter by day: 0-6 |
| `status` | String | | | Filter by status: `open`, `full`, `closed`, `cancelled` |
| `effective_from` | Date | | | Filter: slots effective from this date (YYYY-MM-DD) |
| `effective_to` | Date | | | Filter: slots effective until this date (YYYY-MM-DD) |
| `page` | Integer | | `1` | Page number for pagination |
| `limit` | Integer | | `20` | Items per page (max: 100) |

#### Response - Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "c1d1-4d2c-a1b1-000000000001",
      "doctor_id": "d1d1-4d2c-a1b1-000000000001",
      "doctor_name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "10:00:00",
      "max_appointments_per_slot": 5,
      "status": "open",
      "effective_from": "2026-04-20",
      "effective_to": "2026-06-30",
      "created_at": "2026-04-15T10:30:00+00:00",
      "updated_at": "2026-04-15T10:30:00+00:00"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "c1d1-4d2c-a1b1-000000000001",
      "doctor_id": "d1d1-4d2c-a1b1-000000000001",
      "doctor_name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "day_of_week": 1,
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "max_appointments_per_slot": 4,
      "status": "open",
      "effective_from": "2026-04-20",
      "effective_to": null,
      "created_at": "2026-04-15T10:30:00+00:00",
      "updated_at": "2026-04-15T10:30:00+00:00"
    }
  ],
  "pagination": {
    "total": 2,
    "totalPages": 1,
    "page": 1,
    "limit": 20
  }
}
```

#### Response Output Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Slot ID |
| `clinic_id` | UUID | Clinic ID |
| `doctor_id` | UUID | Doctor ID |
| `doctor_name` | String | Doctor's name |
| `speciality` | String | Doctor's speciality |
| `day_of_week` | Integer | Day of week (0-6) |
| `start_time` | String | Daily start time (HH:MM:SS) |
| `end_time` | String | Daily end time (HH:MM:SS) |
| `max_appointments_per_slot` | Integer | Max appointments allowed |
| `status` | String | Current slot status |
| `effective_from` | Date | Schedule effective from |
| `effective_to` | Date | Schedule effective until (nullable) |
| `created_at` | Timestamp | Creation timestamp |
| `updated_at` | Timestamp | Last update timestamp |

#### Response - Errors

**400 - Missing clinic_id**
```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

**400 - Invalid day_of_week**
```json
{
  "success": false,
  "error": "day_of_week must be between 0 (Sunday) and 6 (Saturday)"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

#### Example cURL

```bash
# Get all slots for a specific doctor on Monday
curl -X GET "http://localhost:3000/api/slots?clinic_id=c1d1-4d2c-a1b1-000000000001&doctor_id=d1d1-4d2c-a1b1-000000000001&day_of_week=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all open slots for a date range
curl -X GET "http://localhost:3000/api/slots?clinic_id=c1d1-4d2c-a1b1-000000000001&status=open&effective_from=2026-04-20&effective_to=2026-06-30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get all slots with pagination
curl -X GET "http://localhost:3000/api/slots?clinic_id=c1d1-4d2c-a1b1-000000000001&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. GET SINGLE SLOT

**Endpoint**: `GET /api/slots/:id`

**Description**: Fetch details of a specific slot.

#### Path Parameter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✓ | Slot ID |

#### Response - Success (200)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "doctor_name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
    "effective_from": "2026-04-20",
    "effective_to": "2026-06-30",
    "created_at": "2026-04-15T10:30:00+00:00",
    "updated_at": "2026-04-15T10:30:00+00:00",
    "deleted_at": null
  }
}
```

#### Response - Errors

**404 - Slot Not Found**
```json
{
  "success": false,
  "error": "Slot not found"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

#### Example cURL

```bash
curl -X GET "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. UPDATE SLOT

**Endpoint**: `PATCH /api/slots/:id`

**Description**: Update an existing recurring slot. Only certain fields can be modified.

#### Path Parameter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✓ | Slot ID |

#### Request Body

```json
{
  "day_of_week": 2,
  "start_time": "10:00:00",
  "end_time": "11:00:00",
  "max_appointments_per_slot": 6,
  "status": "closed",
  "effective_to": "2026-05-31"
}
```

#### Updatable Fields

| Field | Type | Constraints |
|-------|------|-----------|
| `day_of_week` | Integer | Must be 0-6 |
| `start_time` | String | HH:MM:SS format, must be before end_time |
| `end_time` | String | HH:MM:SS format, must be after start_time |
| `max_appointments_per_slot` | Integer | Must be > 0 |
| `status` | String | Must be `open`, `full`, `closed`, or `cancelled` |
| `effective_from` | Date | YYYY-MM-DD format |
| `effective_to` | Date | YYYY-MM-DD format, must be >= effective_from |

**Note**: `clinic_id` and `doctor_id` cannot be changed once created.

#### Response - Success (200)

```json
{
  "success": true,
  "message": "Slot updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "day_of_week": 2,
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "max_appointments_per_slot": 6,
    "status": "closed",
    "effective_from": "2026-04-20",
    "effective_to": "2026-05-31",
    "deleted_at": null,
    "created_at": "2026-04-15T10:30:00+00:00",
    "updated_at": "2026-04-15T11:00:00+00:00"
  }
}
```

#### Response - Errors

**400 - No Fields to Update**
```json
{
  "success": false,
  "error": "No fields to update"
}
```

**400 - Invalid Time Range**
```json
{
  "success": false,
  "error": "end_time must be after start_time"
}
```

**404 - Slot Not Found**
```json
{
  "success": false,
  "error": "Slot not found"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

#### Example cURL

```bash
# Update status to closed
curl -X PATCH "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'

# Update time and capacity
curl -X PATCH "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "10:30:00",
    "end_time": "11:30:00",
    "max_appointments_per_slot": 6
  }'

# Set schedule end date
curl -X PATCH "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "effective_to": "2026-05-31"
  }'
```

---

### 5. DELETE SLOT

**Endpoint**: `DELETE /api/slots/:id`

**Description**: Soft delete a slot (sets `deleted_at` timestamp). The slot is no longer visible in queries but data is preserved.

#### Path Parameter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✓ | Slot ID |

#### Response - Success (200)

```json
{
  "success": true,
  "message": "Slot deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
    "effective_from": "2026-04-20",
    "effective_to": "2026-06-30",
    "deleted_at": "2026-04-15T11:15:00+00:00",
    "created_at": "2026-04-15T10:30:00+00:00",
    "updated_at": "2026-04-15T11:15:00+00:00"
  }
}
```

#### Response - Errors

**404 - Slot Not Found**
```json
{
  "success": false,
  "error": "Slot not found"
}
```

**403 - Forbidden**
```json
{
  "success": false,
  "error": "Forbidden"
}
```

#### Example cURL

```bash
curl -X DELETE "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `open` | Slot is available for appointments | New slots or slots with capacity |
| `full` | Maximum appointments reached | Don't accept new appointments (optional) |
| `closed` | Slot is closed for new bookings | Doctor unavailable at this time |
| `cancelled` | Slot is cancelled | Doctor emergency cancellation |

---

## Workflow Examples

### Example 1: Create Morning Slots for a Doctor (Monday-Friday)

Create 5 one-hour slots (09:00-14:00) for each weekday with max 4 appointments:

```bash
# Monday 09:00-10:00
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic-123",
    "doctor_id": "doctor-456",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "max_appointments_per_slot": 4,
    "effective_from": "2026-04-20"
  }'

# Monday 10:00-11:00
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic-123",
    "doctor_id": "doctor-456",
    "day_of_week": 1,
    "start_time": "10:00:00",
    "end_time": "11:00:00",
    "max_appointments_per_slot": 4,
    "effective_from": "2026-04-20"
  }'

# ... repeat for remaining slots and days
```

### Example 2: Get All Monday Slots

```bash
curl -X GET "http://localhost:3000/api/slots?clinic_id=clinic-123&doctor_id=doctor-456&day_of_week=1&status=open" \
  -H "Authorization: Bearer TOKEN"
```

### Example 3: Update Slot Schedule End Date

When a doctor goes on leave after May 31:

```bash
curl -X PATCH http://localhost:3000/api/slots/slot-id-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "effective_to": "2026-05-31"
  }'
```

### Example 4: Change Slot Status When Fully Booked

```bash
curl -X PATCH http://localhost:3000/api/slots/slot-id-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "full"
  }'
```

### Example 5: Update Time Due to Schedule Change

```bash
curl -X PATCH http://localhost:3000/api/slots/slot-id-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "09:30:00",
    "end_time": "10:30:00"
  }'
```

---

## Integration Notes

### With Appointments Table

When creating an appointment:
1. Determine target appointment date
2. Calculate day_of_week from the appointment date
3. Find matching slots (clinic → doctor → day_of_week)
4. Check if count of appointments in that slot < max_appointments_per_slot
5. Create appointment
6. Optionally update slot status to `full` if max capacity reached

### With Doctor Schedule

- Slots complement `doctor_schedule` table
- `doctor_schedule`: stores `slot_duration_minutes` and optional `max_appointments_per_slot`
- `slots_for_token_system`: recurring slots with max capacity
- Use whichever fits your booking model better, or combine both

### Date Range Logic

**Example**:
- Doctor available: April 20 - June 30, 2026
- Create slot with `effective_from: "2026-04-20"` and `effective_to: "2026-06-30"`
- Slot appears in queries during this period only
- After June 30, slot is logically "inactive" but data preserved

---

## Time Format Reference

### Start/End Time Format
```
HH:MM:SS
- HH: 00-23 (24-hour format)
- MM: 00-59
- SS: 00-59

Examples:
- 09:00:00 (9:00 AM)
- 14:30:00 (2:30 PM)
- 23:59:59 (11:59:59 PM)
```

### Date Format
```
YYYY-MM-DD

Examples:
- 2026-04-20 (April 20, 2026)
- 2026-12-31 (December 31, 2026)
```

---

## Error Codes Summary

| Code | Meaning | Info |
|------|---------|------|
| `200` | Success | GET, PATCH, DELETE success |
| `201` | Created | POST success |
| `400` | Bad Request | Invalid data, missing fields, format errors |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | clinic_id mismatch |
| `404` | Not Found | Slot or doctor not found |
| `500` | Server Error | Database or unexpected error |

---

## Validation Rules

| Field | Validation |
|-------|-----------|
| `clinic_id` | Valid UUID, must match JWT token |
| `doctor_id` | Valid UUID, must exist in clinic |
| `day_of_week` | Integer 0-6 (inclusive) |
| `start_time` | HH:MM:SS format, valid time |
| `end_time` | HH:MM:SS format, must be > start_time |
| `max_appointments_per_slot` | Positive integer > 0 |
| `status` | One of: open, full, closed, cancelled |
| `effective_from` | YYYY-MM-DD format, valid date |
| `effective_to` | YYYY-MM-DD format, >= effective_from (or null) |
| `page` | Integer >= 1 |
| `limit` | Integer 1-100 |

---

## Best Practices

1. **Time Format**: Always use 24-hour HH:MM:SS format (no AM/PM)
2. **Date Format**: Always use YYYY-MM-DD (ISO 8601)
3. **Day of Week**: Use 0-6 values, not day names
4. **Effective Dates**: Leave `effective_to` null for indefinite schedules
5. **Status Management**: Update status based on appointment booking
6. **Soft Deletes**: Deleted slots preserve audit trail
7. **Doctor Verification**: System validates doctor belongs to clinic
8. **Clinic Isolation**: JWT ensures clinic data isolation

---

## Appendix: Complete Field Reference

### Request Fields

| Field | Type | Required | Format | Validation |
|-------|------|----------|--------|-----------|
| `clinic_id` | UUID | POST | UUID | Must match JWT |
| `doctor_id` | UUID | POST | UUID | Must exist in clinic |
| `day_of_week` | Integer | POST, PATCH | 0-6 | Range check |
| `start_time` | String | POST, PATCH | HH:MM:SS | Format + before end_time |
| `end_time` | String | POST, PATCH | HH:MM:SS | Format + after start_time |
| `max_appointments_per_slot` | Integer | POST, PATCH | Positive int | > 0 |
| `status` | String | POST, PATCH | String | Enum: open/full/closed/cancelled |
| `effective_from` | Date | POST, PATCH | YYYY-MM-DD | Valid date |
| `effective_to` | Date | POST, PATCH | YYYY-MM-DD | >= effective_from or null |
| `page` | Integer | GET | Integer | >= 1 |
| `limit` | Integer | GET | Integer | 1-100 |

### Response Fields

| Field | Type | Included In | Description |
|-------|------|------------|-------------|
| `success` | Boolean | All | Operation success status |
| `message` | String | POST, PATCH, DELETE | Operation message |
| `error` | String | Error responses | Error description |
| `data` | Object | Success responses | Response data (slot or array) |
| `pagination` | Object | GET (list) | Pagination metadata |

---

**Version**: 2.0 (Updated)
**Last Updated**: April 15, 2026
**Status**: LIVE ✓
**Database Schema Version**: slots_for_token_system (recurring weekly slots)
