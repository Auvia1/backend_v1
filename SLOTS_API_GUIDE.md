# Slots for Token System - API Documentation

**Last Updated**: April 15, 2026
**Table**: `slots_for_token_system`

---

## Overview

This API manages appointment slots for clinics using a token-based appointment system. Each slot represents a time window during which a doctor can see patients. Slots are useful for:

- Organizing patient flow in token-based systems
- Limiting appointments per time slot
- Managing doctor availability
- Overseeing clinic operations

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

## Table Schema

```sql
CREATE TABLE public.slots_for_token_system (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    slot_start timestamp with time zone NOT NULL,
    slot_end timestamp with time zone NOT NULL,
    max_appointments_per_slot integer NOT NULL DEFAULT 1,
    status character varying(20) DEFAULT 'open' NOT NULL,
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
| `slot_start` | Timestamp | When the slot starts | Must be before `slot_end` |
| `slot_end` | Timestamp | When the slot ends | Must be after `slot_start` |
| `max_appointments_per_slot` | Integer | Max appointments allowed in this slot | Must be > 0 |
| `status` | String | Current slot status | `open`, `full`, `closed`, or `cancelled` |
| `deleted_at` | Timestamp | Soft delete timestamp | NULL if active |
| `created_at` | Timestamp | When slot was created | Auto-set |
| `updated_at` | Timestamp | When slot was last updated | Auto-updated by trigger |

---

## Endpoints

### 1. CREATE SLOT

**Endpoint**: `POST /api/slots`

**Description**: Create a new appointment slot.

#### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body

```json
{
  "clinic_id": "uuid",
  "doctor_id": "uuid",
  "slot_start": "2026-04-20T09:00:00Z",
  "slot_end": "2026-04-20T10:00:00Z",
  "max_appointments_per_slot": 5,
  "status": "open"
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `clinic_id` | UUID | Your clinic ID (must match JWT token) |
| `doctor_id` | UUID | Doctor ID (must exist in clinic) |
| `slot_start` | ISO 8601 Timestamp | Slot start time |
| `slot_end` | ISO 8601 Timestamp | Slot end time |
| `max_appointments_per_slot` | Integer | Max appointments (must be > 0) |

#### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | String | `open` | Slot status (`open`, `full`, `closed`, `cancelled`) |

#### Response - Success (201)

```json
{
  "success": true,
  "message": "Slot created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "c1d1-4d2c-a1b1-000000000001",
    "doctor_id": "d1d1-4d2c-a1b1-000000000001",
    "slot_start": "2026-04-20T09:00:00+00:00",
    "slot_end": "2026-04-20T10:00:00+00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
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
  "error": "Missing required fields: clinic_id, doctor_id, slot_start, slot_end, max_appointments_per_slot"
}
```

**400 - Invalid Date Format**
```json
{
  "success": false,
  "error": "Invalid date format. Use ISO 8601 format (e.g., 2026-04-15T09:00:00Z)"
}
```

**400 - Invalid Time Range**
```json
{
  "success": false,
  "error": "slot_end must be after slot_start"
}
```

**400 - Invalid max_appointments_per_slot**
```json
{
  "success": false,
  "error": "max_appointments_per_slot must be a positive integer"
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
    "slot_start": "2026-04-20T09:00:00Z",
    "slot_end": "2026-04-20T10:00:00Z",
    "max_appointments_per_slot": 5,
    "status": "open"
  }'
```

---

### 2. GET ALL SLOTS

**Endpoint**: `GET /api/slots`

**Description**: Fetch all slots for a clinic with optional filters.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clinic_id` | UUID | ✓ | - | Your clinic ID |
| `doctor_id` | UUID | | | Filter slots by doctor |
| `status` | String | | | Filter by status: `open`, `full`, `closed`, `cancelled` |
| `start_date` | ISO Date | | | Filter slots created from this date (e.g., `2026-04-15T00:00:00Z`) |
| `end_date` | ISO Date | | | Filter slots created until this date (e.g., `2026-04-30T23:59:59Z`) |
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
      "slot_start": "2026-04-20T09:00:00+00:00",
      "slot_end": "2026-04-20T10:00:00+00:00",
      "max_appointments_per_slot": 5,
      "status": "open",
      "appointments_count": 3,
      "created_at": "2026-04-15T10:30:00+00:00",
      "updated_at": "2026-04-15T10:30:00+00:00"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "c1d1-4d2c-a1b1-000000000001",
      "doctor_id": "d1d1-4d2c-a1b1-000000000001",
      "doctor_name": "Dr. Rajesh Kumar",
      "speciality": "Cardiology",
      "slot_start": "2026-04-20T10:00:00+00:00",
      "slot_end": "2026-04-20T11:00:00+00:00",
      "max_appointments_per_slot": 5,
      "status": "full",
      "appointments_count": 5,
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
| `doctor_name` | String | Doctor's name (from doctors table) |
| `speciality` | String | Doctor's speciality (from doctors table) |
| `slot_start` | Timestamp | Slot start time |
| `slot_end` | Timestamp | Slot end time |
| `max_appointments_per_slot` | Integer | Max appointments allowed |
| `status` | String | Current slot status |
| `appointments_count` | Integer | Actual number of appointments in this slot |
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

**400 - Invalid Status**
```json
{
  "success": false,
  "error": "status must be one of: open, full, closed, cancelled"
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
# Get all open slots for a doctor
curl -X GET "http://localhost:3000/api/slots?clinic_id=c1d1-4d2c-a1b1-000000000001&doctor_id=d1d1-4d2c-a1b1-000000000001&status=open&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get slots for a date range
curl -X GET "http://localhost:3000/api/slots?clinic_id=c1d1-4d2c-a1b1-000000000001&start_date=2026-04-20T00:00:00Z&end_date=2026-04-30T23:59:59Z" \
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
    "slot_start": "2026-04-20T09:00:00+00:00",
    "slot_end": "2026-04-20T10:00:00+00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
    "appointments_count": 3,
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

**Description**: Update an existing slot. Only `slot_start`, `slot_end`, `max_appointments_per_slot`, and `status` can be modified.

#### Path Parameter

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✓ | Slot ID |

#### Request Body

```json
{
  "slot_start": "2026-04-20T09:30:00Z",
  "slot_end": "2026-04-20T10:30:00Z",
  "max_appointments_per_slot": 6,
  "status": "closed"
}
```

#### Updatable Fields

| Field | Type | Constraints |
|-------|------|-----------|
| `slot_start` | ISO 8601 Timestamp | Must be before `slot_end` |
| `slot_end` | ISO 8601 Timestamp | Must be after `slot_start` |
| `max_appointments_per_slot` | Integer | Must be > 0 |
| `status` | String | Must be `open`, `full`, `closed`, or `cancelled` |

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
    "slot_start": "2026-04-20T09:30:00+00:00",
    "slot_end": "2026-04-20T10:30:00+00:00",
    "max_appointments_per_slot": 6,
    "status": "closed",
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
  "error": "slot_end must be after slot_start"
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
curl -X PATCH "http://localhost:3000/api/slots/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed",
    "max_appointments_per_slot": 6
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
    "slot_start": "2026-04-20T09:00:00+00:00",
    "slot_end": "2026-04-20T10:00:00+00:00",
    "max_appointments_per_slot": 5,
    "status": "open",
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

### Example 1: Create Morning Slots for a Doctor

**Scenario**: Create 5 one-hour slots (09:00-14:00) with max 4 appointments each.

```bash
# Slot 1: 09:00 - 10:00
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic-123",
    "doctor_id": "doctor-456",
    "slot_start": "2026-04-20T09:00:00Z",
    "slot_end": "2026-04-20T10:00:00Z",
    "max_appointments_per_slot": 4
  }'

# Slot 2: 10:00 - 11:00
curl -X POST http://localhost:3000/api/slots \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic-123",
    "doctor_id": "doctor-456",
    "slot_start": "2026-04-20T10:00:00Z",
    "slot_end": "2026-04-20T11:00:00Z",
    "max_appointments_per_slot": 4
  }'

# ... repeat for remaining slots
```

### Example 2: Mark Slot as Full When Capacity Reached

When the 4 appointments are booked in a slot, update it to `full`:

```bash
curl -X PATCH http://localhost:3000/api/slots/slot-id-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "full"
  }'
```

### Example 3: Get All Available Slots for a Doctor

```bash
curl -X GET "http://localhost:3000/api/slots?clinic_id=clinic-123&doctor_id=doctor-456&status=open&page=1&limit=50" \
  -H "Authorization: Bearer TOKEN"
```

### Example 4: Close a Slot Due to Doctor Emergency

```bash
curl -X PATCH http://localhost:3000/api/slots/slot-id-123 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
```

---

## Integration Notes

### With Appointments Table

When creating an appointment:
1. Check if a slot exists for the doctor and time range
2. Verify `appointments_count < max_appointments_per_slot`
3. Create the appointment
4. If count reaches max, optionally update slot status to `full`

### Slot Status Auto-Management

You may want to implement logic to automatically:
- Set status to `full` when `appointments_count == max_appointments_per_slot`
- Set status to `open` when an appointment is cancelled and count < max

### Time Zone Handling

- All timestamps are stored in UTC (with time zone)
- Specify times as ISO 8601 format: `2026-04-20T09:00:00Z`
- The API will handle timezone conversion

---

## Error Codes Summary

| Code | Meaning |
|------|---------|
| `200` | Success (GET, PATCH, DELETE) |
| `201` | Created (POST) |
| `400` | Bad Request (missing fields, invalid data) |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (clinic_id mismatch) |
| `404` | Not Found (slot or doctor not found) |
| `500` | Internal Server Error |

---

## Best Practices

1. **Time Zone**: Always use UTC timestamps in ISO 8601 format
2. **Pagination**: Use pagination for large result sets (default limit: 20, max: 100)
3. **Status Management**: Update slot status based on appointment count
4. **Soft Deletes**: Deleted slots are preserved for audit trails
5. **Doctor Verification**: System validates that doctor belongs to clinic
6. **Clinic Isolation**: JWT token ensures clinic data isolation

---

## Appendix: Complete Field Reference

### Request Fields

| Field | Type | Required | Max Length | Pattern |
|-------|------|----------|-----------|---------|
| `clinic_id` | UUID | POST | - | UUID v4 |
| `doctor_id` | UUID | POST | - | UUID v4 |
| `slot_start` | Timestamp | POST, PATCH | - | ISO 8601 |
| `slot_end` | Timestamp | POST, PATCH | - | ISO 8601 |
| `max_appointments_per_slot` | Integer | POST, PATCH | - | > 0 |
| `status` | String | POST, PATCH | 20 | `open\|full\|closed\|cancelled` |

### Response Fields

| Field | Type | Included In | Description |
|-------|------|------------|-------------|
| `success` | Boolean | All | Operation success status |
| `message` | String | POST, PATCH, DELETE | Operation message |
| `error` | String | Error responses | Error description |
| `data` | Object | Success responses | Response data |
| `pagination` | Object | GET (list) | Pagination metadata |

---

**Version**: 1.0
**Last Updated**: April 15, 2026
**Status**: LIVE ✓
