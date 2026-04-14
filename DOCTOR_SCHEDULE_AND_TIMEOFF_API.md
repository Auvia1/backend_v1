# Doctor Schedule & Time Off API Documentation

Complete guide for managing doctor schedules, time slots, and time off periods.

**Last Updated:** April 14, 2026

---

## Table of Contents

1. [Doctor Schedule Management](#doctor-schedule-management)
2. [Doctor Time Off Management](#doctor-time-off-management)
3. [Related APIs](#related-apis)
4. [Error Handling](#error-handling)
5. [Complete Examples](#complete-examples)

---

## Doctor Schedule Management

Doctor schedules define when doctors are available and how appointment slots are divided.

### GET /api/doctors/:id/schedule

Fetch all schedules for a specific doctor.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Query Parameters:**
- `clinic_id` (required) - Clinic UUID to scope the query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-uuid",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2],
      "effective_from": "2026-04-14",
      "effective_to": "2026-12-31"
    },
    {
      "id": "schedule-uuid-2",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "day_of_week": 2,
      "start_time": "10:00:00",
      "end_time": "18:00:00",
      "slot_duration_minutes": 30,
      "max_appointments_per_slot": null,
      "effective_from": "2026-04-14",
      "effective_to": null
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/doctors/doctor-uuid/schedule?clinic_id=clinic-uuid" \
  -H "Authorization: Bearer your_jwt_token"
```

**Status Codes:**
- `200` - Success
- `400` - Missing clinic_id
- `500` - Server error

---

### POST /api/doctors/:id/schedule

Create a new schedule for a doctor on a specific day of week.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Request Body:**
```json
{
  "clinic_id": "clinic-uuid",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "slot_duration_minutes": 30,
  "effective_from": "2026-04-14",
  "effective_to": "2026-12-31",
  "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2]
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | string | Yes | UUID of the clinic |
| day_of_week | integer | Yes | Day of week (0=Sunday, 1=Monday, ..., 6=Saturday) |
| start_time | string | Yes | Schedule start time in HH:MM:SS format (24-hour) |
| end_time | string | Yes | Schedule end time in HH:MM:SS format (24-hour) |
| slot_duration_minutes | integer | Yes | Duration of each appointment slot in minutes (must be > 0) |
| effective_from | string | No | Start date for schedule validity (YYYY-MM-DD format) |
| effective_to | string | No | End date for schedule validity (YYYY-MM-DD format) |
| max_appointments_per_slot | integer[] | No | Array of max appointments per slot. Length should match number of slots |

**response:**
```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2],
    "effective_from": "2026-04-14",
    "effective_to": "2026-12-31"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/doctors/doctor-uuid/schedule" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "clinic_id": "clinic-uuid",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "effective_from": "2026-04-14",
    "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1]
  }'
```

**Status Codes:**
- `201` - Schedule created successfully
- `400` - Missing required fields
- `500` - Server error

**Notes:**
- `max_appointments_per_slot` is optional. If not provided, defaults to null
- Can be used to limit concurrent appointments per slot
- Array length should ideally match the number of generated slots for the schedule

---

### PATCH /api/doctors/:id/schedule/:schedule_id

Update an existing schedule.

**URL Parameters:**
- `id` (required) - Doctor UUID
- `schedule_id` (required) - Schedule UUID to update

**Request Body (all fields optional):**
```json
{
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "slot_duration_minutes": 30,
  "effective_from": "2026-04-14",
  "effective_to": "2026-12-31",
  "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2],
    "effective_from": "2026-04-14",
    "effective_to": "2026-12-31"
  }
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:5000/api/doctors/doctor-uuid/schedule/schedule-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "end_time": "18:00:00",
    "max_appointments_per_slot": [2, 2, 2, 2, 2, 2, 2, 2]
  }'
```

**Status Codes:**
- `200` - Schedule updated successfully
- `400` - No fields to update or validation error
- `404` - Schedule not found
- `500` - Server error

**Notes:**
- Only provided fields will be updated
- Can update `max_appointments_per_slot` independently from other fields

---

### DELETE /api/doctors/:id/schedule/:schedule_id

Delete a doctor's schedule.

**URL Parameters:**
- `id` (required) - Doctor UUID
- `schedule_id` (required) - Schedule UUID to delete

**Response:**
```json
{
  "success": true,
  "message": "Schedule deleted successfully",
  "data": {
    "id": "schedule-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "max_appointments_per_slot": [1, 2, 1, 3, 2, 1, 2],
    "effective_from": "2026-04-14",
    "effective_to": "2026-12-31"
  }
}
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:5000/api/doctors/doctor-uuid/schedule/schedule-uuid" \
  -H "Authorization: Bearer your_jwt_token"
```

**Status Codes:**
- `200` - Schedule deleted successfully
- `404` - Schedule not found
- `500` - Server error

---

## Doctor Time Off Management

Manage periods when doctors are unavailable (leave, vacation, personal time, etc.).

### GET /api/doctors/:id/time-off

Fetch all time off periods for a specific doctor.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Query Parameters:**
- `clinic_id` (required) - Clinic UUID to scope the query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "timeoff-uuid",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "start_time": "2026-04-20T00:00:00+05:30",
      "end_time": "2026-04-25T23:59:59+05:30",
      "reason": "Annual Leave",
      "created_at": "2026-04-14T10:30:00+05:30"
    },
    {
      "id": "timeoff-uuid-2",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "start_time": "2026-05-01T14:00:00+05:30",
      "end_time": "2026-05-01T16:00:00+05:30",
      "reason": "Personal meeting",
      "created_at": "2026-04-14T11:00:00+05:30"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/doctors/doctor-uuid/time-off?clinic_id=clinic-uuid" \
  -H "Authorization: Bearer your_jwt_token"
```

**Status Codes:**
- `200` - Success
- `400` - Missing clinic_id
- `500` - Server error

---

### POST /api/doctors/:id/time-off

Create a new time off period for a doctor.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Request Body:**
```json
{
  "clinic_id": "clinic-uuid",
  "start_time": "2026-04-20T00:00:00+05:30",
  "end_time": "2026-04-25T23:59:59+05:30",
  "reason": "Annual Leave"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | string | Yes | UUID of the clinic |
| start_time | string | Yes | Start of time off (ISO 8601 format with timezone) |
| end_time | string | Yes | End of time off (ISO 8601 format with timezone) |
| reason | string | No | Reason for time off (e.g., "Annual Leave", "Medical", "Conference") |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "timeoff-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "start_time": "2026-04-20T00:00:00+05:30",
    "end_time": "2026-04-25T23:59:59+05:30",
    "reason": "Annual Leave",
    "created_at": "2026-04-14T10:30:00+05:30"
  }
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/doctors/doctor-uuid/time-off" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "clinic_id": "clinic-uuid",
    "start_time": "2026-04-20T00:00:00+05:30",
    "end_time": "2026-04-25T23:59:59+05:30",
    "reason": "Annual Leave"
  }'
```

**Status Codes:**
- `201` - Time off created successfully
- `400` - Missing required fields
- `500` - Server error

**Notes:**
- Use ISO 8601 format with timezone for timestamps
- Example: `2026-04-20T00:00:00+05:30` (IST timezone)
- `end_time` must be after `start_time`

---

### PATCH /api/doctors/:id/time-off/:timeoff_id

Update an existing time off period.

**URL Parameters:**
- `id` (required) - Doctor UUID
- `timeoff_id` (required) - Time off UUID to update

**Request Body (all fields optional):**
```json
{
  "start_time": "2026-04-20T00:00:00+05:30",
  "end_time": "2026-04-25T23:59:59+05:30",
  "reason": "Medical Leave"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "timeoff-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "start_time": "2026-04-20T00:00:00+05:30",
    "end_time": "2026-04-25T23:59:59+05:30",
    "reason": "Medical Leave",
    "created_at": "2026-04-14T10:30:00+05:30"
  }
}
```

**Example Request:**
```bash
curl -X PATCH "http://localhost:5000/api/doctors/doctor-uuid/time-off/timeoff-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "reason": "Extended Medical Leave"
  }'
```

**Status Codes:**
- `200` - Time off updated successfully
- `400` - No fields to update
- `404` - Time off not found
- `500` - Server error

---

### DELETE /api/doctors/:id/time-off/:timeoff_id

Delete a time off period.

**URL Parameters:**
- `id` (required) - Doctor UUID
- `timeoff_id` (required) - Time off UUID to delete

**Response:**
```json
{
  "success": true,
  "message": "Time off deleted successfully",
  "data": {
    "id": "timeoff-uuid",
    "clinic_id": "clinic-uuid",
    "doctor_id": "doctor-uuid",
    "start_time": "2026-04-20T00:00:00+05:30",
    "end_time": "2026-04-25T23:59:59+05:30",
    "reason": "Annual Leave",
    "created_at": "2026-04-14T10:30:00+05:30"
  }
}
```

**Example Request:**
```bash
curl -X DELETE "http://localhost:5000/api/doctors/doctor-uuid/time-off/timeoff-uuid" \
  -H "Authorization: Bearer your_jwt_token"
```

**Status Codes:**
- `200` - Time off deleted successfully
- `404` - Time off not found
- `500` - Server error

---

## Related APIs

### GET /api/doctors/:id/slots

Get available appointment slots for a doctor on a specific date.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Query Parameters:**
- `date` (required) - Target date in YYYY-MM-DD format
- `clinic_id` (required) - Clinic UUID

**Response:**
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
      "available": true
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/doctors/doctor-uuid/slots?date=2026-04-20&clinic_id=clinic-uuid" \
  -H "Authorization: Bearer your_jwt_token"
```

**Notes:**
- Returns slots based on doctor's schedule for that day
- Excludes booked appointments
- Excludes time off periods
- Empty array if doctor doesn't work that day

---

### GET /api/doctors/:id/appointments

Fetch all appointments for a specific doctor.

**URL Parameters:**
- `id` (required) - Doctor UUID

**Query Parameters:**
- `clinic_id` (required) - Clinic UUID
- `status` (optional) - Filter by appointment status (pending, confirmed, completed, cancelled, no_show, rescheduled)
- `start_date` (optional) - Filter from date (YYYY-MM-DD)
- `end_date` (optional) - Filter until date (YYYY-MM-DD)
- `patient_id` (optional) - Filter by specific patient
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "appointment-uuid",
      "clinic_id": "clinic-uuid",
      "patient_id": "patient-uuid",
      "doctor_id": "doctor-uuid",
      "appointment_start": "2026-04-20T09:00:00+05:30",
      "appointment_end": "2026-04-20T09:30:00+05:30",
      "reason": "Regular checkup",
      "notes": "Patient requested morning slot",
      "status": "confirmed",
      "source": "ai_agent",
      "payment_status": "unpaid",
      "payment_amount": "500.00",
      "created_at": "2026-04-14T10:30:00+05:30",
      "updated_at": "2026-04-14T10:30:00+05:30",
      "patient_name": "John Doe",
      "patient_phone": "9876543210",
      "patient_email": "john@example.com",
      "doctor_name": "Dr. Smith",
      "doctor_speciality": "General Physician"
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

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/doctors/doctor-uuid/appointments?clinic_id=clinic-uuid&status=confirmed&start_date=2026-04-01&end_date=2026-04-30&page=1&limit=20" \
  -H "Authorization: Bearer your_jwt_token"
```

---

## Error Handling

### Common Error Responses

**400 - Missing Required Fields:**
```json
{
  "success": false,
  "error": "clinic_id, day_of_week, start_time, end_time, and slot_duration_minutes are required"
}
```

**404 - Resource Not Found:**
```json
{
  "success": false,
  "error": "Schedule not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "error": "Database connection error"
}
```

---

## Complete Examples

### Scenario 1: Set up a doctor's weekly schedule

**Step 1: Create Monday schedule (9 AM - 5 PM, 30-min slots)**

```bash
curl -X POST "http://localhost:5000/api/doctors/dr-123/schedule" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "clinic_id": "clinic-456",
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30,
    "max_appointments_per_slot": [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  }'
```

**Step 2: Create Tuesday schedule**

```bash
curl -X POST "http://localhost:5000/api/doctors/dr-123/schedule" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "clinic_id": "clinic-456",
    "day_of_week": 2,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "slot_duration_minutes": 30
  }'
```

**Step 3: Get all schedules**

```bash
curl -X GET "http://localhost:5000/api/doctors/dr-123/schedule?clinic_id=clinic-456" \
  -H "Authorization: Bearer token"
```

---

### Scenario 2: Add and manage doctor time off

**Step 1: Add a week-long leave**

```bash
curl -X POST "http://localhost:5000/api/doctors/dr-123/time-off" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "clinic_id": "clinic-456",
    "start_time": "2026-04-20T00:00:00+05:30",
    "end_time": "2026-04-26T23:59:59+05:30",
    "reason": "Annual Leave"
  }'
```

**Step 2: Add a 2-hour conference break**

```bash
curl -X POST "http://localhost:5000/api/doctors/dr-123/time-off" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "clinic_id": "clinic-456",
    "start_time": "2026-04-22T14:00:00+05:30",
    "end_time": "2026-04-22T16:00:00+05:30",
    "reason": "Medical Conference"
  }'
```

**Step 3: View all time off periods**

```bash
curl -X GET "http://localhost:5000/api/doctors/dr-123/time-off?clinic_id=clinic-456" \
  -H "Authorization: Bearer token"
```

**Step 4: Update the annual leave reason**

```bash
curl -X PATCH "http://localhost:5000/api/doctors/dr-123/time-off/timeoff-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "reason": "Extended Annual Leave"
  }'
```

---

### Scenario 3: Check available slots and create appointments

**Step 1: Get available slots for April 20, 2026**

```bash
curl -X GET "http://localhost:5000/api/doctors/dr-123/slots?date=2026-04-20&clinic_id=clinic-456" \
  -H "Authorization: Bearer token"
```

Response shows available slots considering:
- Doctor's schedule for that day
- Booked appointments
- Time off periods

**Step 2: View all appointments for the doctor in April**

```bash
curl -X GET "http://localhost:5000/api/doctors/dr-123/appointments?clinic_id=clinic-456&start_date=2026-04-01&end_date=2026-04-30&status=confirmed" \
  -H "Authorization: Bearer token"
```

---

### Scenario 4: Update schedule with new max_appointments_per_slot

**Update Monday schedule to allow variable concurrent appointments:**

```bash
curl -X PATCH "http://localhost:5000/api/doctors/dr-123/schedule/schedule-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{
    "max_appointments_per_slot": [1, 1, 2, 2, 2, 3, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1]
  }'
```

This allows:
- Slots 1-2: 1 patient max
- Slots 3-7: 2-3 patients max (higher capacity during lunch hours)
- Slots 8-16: 1-2 patients max

---

## Frontend Integration Tips

### 1. **Loading Doctor's Availability**
```javascript
// Get doctor details
const doctor = await fetch(`/api/doctors/${doctorId}?clinic_id=${clinicId}`)

// Get doctor's schedule for the week
const schedules = await fetch(`/api/doctors/${doctorId}/schedule?clinic_id=${clinicId}`)

// Check time off
const timeOff = await fetch(`/api/doctors/${doctorId}/time-off?clinic_id=${clinicId}`)
```

### 2. **Displaying Available Slots**
```javascript
// Get slots for a specific date
const slots = await fetch(`/api/doctors/${doctorId}/slots?date=2026-04-20&clinic_id=${clinicId}`)

// Filter available slots
const available = slots.filter(s => s.available)
```

### 3. **Admin Schedule Management**
```javascript
// Create new schedule
const newSchedule = await fetch(`/api/doctors/${doctorId}/schedule`, {
  method: 'POST',
  body: JSON.stringify({
    clinic_id: clinicId,
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '17:00:00',
    slot_duration_minutes: 30
  })
})

// Update existing schedule
const updated = await fetch(`/api/doctors/${doctorId}/schedule/${scheduleId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    max_appointments_per_slot: [1, 2, 3, 2, 1]
  })
})
```

### 4. **Managing Doctor Leave**
```javascript
// Add time off
const timeOff = await fetch(`/api/doctors/${doctorId}/time-off`, {
  method: 'POST',
  body: JSON.stringify({
    clinic_id: clinicId,
    start_time: '2026-04-20T00:00:00+05:30',
    end_time: '2026-04-26T23:59:59+05:30',
    reason: 'Annual Leave'
  })
})

// Cancel time off
await fetch(`/api/doctors/${doctorId}/time-off/${timeOffId}`, {
  method: 'DELETE'
})
```

---

## Key Concepts

### Day of Week Numbering
- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

### Time Formats
- **Schedule times**: `HH:MM:SS` (24-hour format, e.g., `09:00:00`, `17:30:00`)
- **Date**: `YYYY-MM-DD` (e.g., `2026-04-20`)
- **DateTime (Time off)**: ISO 8601 with timezone (e.g., `2026-04-20T00:00:00+05:30`)

### max_appointments_per_slot

Optional array that limits concurrent appointments per slot:
- If not provided: No limit (defaults to null)
- If array provided: Must correspond to slots generated from schedule
- Example: 16 slots (8 AM - 5 PM, 30-min intervals) = 16 max limit values

**Calculation:**
```
Number of slots = (end_time - start_time) / slot_duration_minutes
Example: (17:00 - 09:00) / 30 = 8 hours = 480 min / 30 = 16 slots
```

---

## Best Practices

1. **Always provide `clinic_id`** - Required for scope and multi-tenant safety
2. **Use timezone in time off** - Always use ISO 8601 with IST timezone (+05:30)
3. **Validate date ranges** - Ensure effective_from ≤ effective_to
4. **Update schedules carefully** - Changes affect future slot availability
5. **Plan max_appointments_per_slot** - Align with clinic capacity and doctor preference
6. **Check time off before creating appointments** - Avoid overbooking unavailable periods
7. **Use pagination** - For large appointment lists, use page/limit parameters

---

## Troubleshooting

**Schedule not showing:**
- Check if doctor `is_active = true`
- Verify `clinic_id` matches clinic context
- Confirm schedule `effective_from` ≤ current date

**No slots available:**
- Check doctor's time off periods
- Verify all appointments are within schedule times
- Check if doctor works on that day of week

**Time off not blocking slots:**
- Ensure time off includes the entire slot time
- Verify time off is for the same clinic_id
- Check timezone in ISO 8601 format

---

**Need help?** Check the complete API documentation at `/COMPREHENSIVE_API_DOCUMENTATION.md`
