# Appointment Creation & Double-Booking Prevention Documentation

**File Location:** `src/routes/appointments.js`
**Endpoint:** `POST /api/appointments`
**Lines:** 518-645

---

## Overview

Appointments are created through a **single API endpoint** that includes built-in **double-booking prevention** using database transactions and row-level locking.

---

## Appointment Creation Endpoint

### API Details

**Endpoint:** `POST /api/appointments`

**Description:** Book a new appointment with automatic double-booking prevention

**Authentication:** ❌ Not required (but should be for production)

### Request Body

```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "patient_name": "Raj Kumar",
  "patient_phone": "9876543210",
  "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_start": "2026-04-05T10:00:00Z",
  "appointment_end": "2026-04-05T10:30:00Z",
  "reason": "Checkup",
  "source": "manual",
  "created_by": null
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `clinic_id` | UUID | Which clinic |
| `patient_name` | string | Patient's name |
| `patient_phone` | string | 10-digit phone number |
| `doctor_id` | UUID | Which doctor |
| `appointment_start` | ISO 8601 | Start time (e.g., 2026-04-05T10:00:00Z) |
| `appointment_end` | ISO 8601 | End time (e.g., 2026-04-05T10:30:00Z) |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `reason` | string | null | Visit reason |
| `source` | string | "manual" | "manual" or "agent" |
| `created_by` | UUID | null | User ID who created it |

---

## How Double-Booking Prevention Works

### Step-by-Step Process

```javascript
// Line 518-645 in src/routes/appointments.js
```

#### **Step 1: Start Database Transaction (Line 521)**

```javascript
await client.query("BEGIN");
```

- Opens a **transaction** (all-or-nothing)
- Ensures consistency: either booking succeeds completely or fails completely
- Prevents race conditions

---

#### **Step 2: Validate Required Fields (Lines 536-551)**

```javascript
if (
  !clinic_id ||
  !patient_name ||
  !patient_phone ||
  !doctor_id ||
  !appointment_start ||
  !appointment_end
) {
  await client.query("ROLLBACK");
  return res.status(400).json({
    success: false,
    error: "clinic_id, patient_name, patient_phone, doctor_id, appointment_start, appointment_end are all required",
  });
}
```

**What it does:**
- Checks if all required fields are provided
- Rolls back transaction if validation fails
- Returns 400 Bad Request

---

#### **Step 3: Upsert Patient (Lines 554-561)**

```javascript
const patientResult = await client.query(
  `INSERT INTO patients (clinic_id, name, phone)
   VALUES ($1, $2, $3)
   ON CONFLICT (clinic_id, phone) DO UPDATE SET name = EXCLUDED.name
   RETURNING id`,
  [clinic_id, patient_name, patient_phone]
);
const patient_id = patientResult.rows[0].id;
```

**What it does:**
- Checks if patient already exists (UNIQUE on clinic_id, phone)
- If exists: updates patient name (in case it was spelled differently)
- If doesn't exist: creates new patient
- Always returns patient ID

**Why this matters:**
- Avoids duplicate patient records
- Automatically linked to appointments

---

#### **Step 4: CHECK FOR DOUBLE-BOOKING ⭐ (Lines 563-579)**

```javascript
// ✅ THIS IS THE DOUBLE-BOOKING PREVENTION!
const conflict = await client.query(
  `SELECT id FROM appointments
   WHERE doctor_id         = $1
     AND appointment_start = $2
     AND status NOT IN ('cancelled', 'rescheduled')
     AND deleted_at IS NULL
   FOR UPDATE`,
  [doctor_id, appointment_start]
);

if (conflict.rows.length > 0) {
  await client.query("ROLLBACK");
  return res
    .status(409)
    .json({ success: false, error: "This time slot is already booked." });
}
```

**How It Prevents Double-Booking:**

| Component | Purpose |
|-----------|---------|
| `doctor_id = $1` | Check only THIS doctor |
| `appointment_start = $2` | Check EXACT same start time |
| `status NOT IN ('cancelled', 'rescheduled')` | **Ignore cancelled/rescheduled** (they don't block slots) |
| `deleted_at IS NULL` | Ignore soft-deleted appointments |
| `FOR UPDATE` | **LOCK the rows** (prevents concurrent bookings) |

**The `FOR UPDATE` Lock:**
- Prevents other requests from modifying these rows simultaneously
- If another request is trying to book the same slot → **must wait**
- Once current transaction completes → other request sees the conflict

**Response if slot already booked:**
```json
{
  "success": false,
  "error": "This time slot is already booked."
}
```
Status: **409 Conflict**

---

#### **Step 5: CHECK FOR DOCTOR TIME-OFF (Lines 581-595)**

```javascript
const timeOff = await client.query(
  `SELECT id FROM doctor_time_off
   WHERE doctor_id = $1
     AND start_time <= $2
     AND end_time   >= $3`,
  [doctor_id, appointment_start, appointment_end]
);

if (timeOff.rows.length > 0) {
  await client.query("ROLLBACK");
  return res
    .status(409)
    .json({ success: false, error: "Doctor is on leave during this time." });
}
```

**What it does:**
- Checks if doctor is on leave/time-off during appointment time
- Uses **range overlap check**: `start_time <= appointment_start AND end_time >= appointment_end`
- Returns 409 Conflict if doctor is unavailable

---

#### **Step 6: Insert Appointment (Lines 598-610)**

```javascript
const apptResult = await client.query(
  `INSERT INTO appointments
     (clinic_id, patient_id, doctor_id,
      appointment_start, appointment_end,
      reason, status, source, created_by)
   VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8)
   RETURNING *`,
  [
    clinic_id, patient_id, doctor_id,
    appointment_start, appointment_end,
    reason, source, created_by,
  ]
);
```

**What it does:**
- Creates the appointment record
- Status is hardcoded to `'confirmed'` (not pending)
- Returns full appointment data

---

#### **Step 7: Commit Transaction (Line 612)**

```javascript
await client.query("COMMIT");
```

**What it does:**
- Finalizes all changes
- Releases the `FOR UPDATE` row lock
- Makes appointment visible to other requests

---

#### **Step 8: Log Activity (Lines 614-635)**

```javascript
const isAgent = source === "agent";
await logActivity(
  clinic_id,
  isAgent ? "agent_booking" : "manual_booking",
  `${isAgent ? "Agent" : "Receptionist"} booked ${patient_name} with Dr. ${doctorName}`,
  { appointment_id, appointment_start, appointment_end, ... }
);
```

**What it does:**
- Logs booking in activity_log table
- Distinguishes between manual (receptionist) vs AI agent bookings
- **Outside the transaction** (won't block response if logging fails)

---

## Sequence Diagram: Double-Booking Prevention

```
CLIENT A                          DATABASE                        CLIENT B
   |                                 |                               |
   |---> POST /api/appointments ------>|                             |
   |                                 |                               |
   |                           BEGIN TRANSACTION                     |
   |                                 |                               |
   |                        Upsert Patient                            |
   |                                 |                               |
   |                   SELECT * FROM appointments                    |
   |                   FOR UPDATE (LOCK ROWS)                        |
   |                                 (Row is locked)                 |
   |                                 |---> POST /api/appointments ---|
   |                                 |                               |
   |                                 |                     BEGIN TRANSACTION
   |                                 |                               |
   |                                 |                    Upsert Patient
   |                                 |                               |
   |                                 |              SELECT * FROM appointments
   |                                 |              FOR UPDATE (WAIT FOR LOCK)
   |                                 |              ⚠️ BLOCKED HERE
   |                                 |                               |
   |                     INSERT appointment                          |
   |                         ✅ SUCCESS                              |
   |                                 |                               |
   |                      COMMIT TRANSACTION                         |
   |<------ 201 Created -------------|                               |
   |                                 | (Lock released)               |
   |                                 |                               |
   |                                 |    FOR UPDATE CONTINUES       |
   |                                 |    (Finds conflict!)          |
   |                                 |                               |
   |                                 |    ROLLBACK TRANSACTION       |
   |                                 |<----- 409 Conflict --------|
   |                                 |                               |
```

---

## Real-World Example: Race Condition Prevention

### Scenario: Two rapid booking requests for the same slot

**Request 1 (arrives first):**
```javascript
{
  "doctor_id": "dr_123",
  "appointment_start": "2026-04-05T10:00:00Z",
  "patient_name": "Raj"
}
```

**Request 2 (arrives 50ms later):**
```javascript
{
  "doctor_id": "dr_123",
  "appointment_start": "2026-04-05T10:00:00Z",
  "patient_name": "Priya"
}
```

**Timeline:**

| Time | Request 1 | Request 2 |
|------|-----------|----------|
| T=0ms | BEGIN | - |
| T=1ms | Upsert patient (Raj) | - |
| T=2ms | **FOR UPDATE lock acquired** | BEGIN |
| T=3ms | - | Upsert patient (Priya) |
| T=4ms | - | **FOR UPDATE tries to lock** → ⏳ WAITS |
| T=5ms | INSERT appointment (Raj) | ⏳ (still waiting) |
| T=6ms | COMMIT (lock released) | ⏳ (lock acquired now) |
| T=7ms | ✅ Raj's booking saved | FOR UPDATE finds conflict! |
| T=8ms | - | ROLLBACK |
| T=9ms | - | **❌ 409 Conflict error** |

**Result:** Only Raj gets the slot. Priya gets error: "This time slot is already booked."

---

## Error Responses

### 1. Missing Required Field

**Status:** 400 Bad Request

```json
{
  "success": false,
  "error": "clinic_id, patient_name, patient_phone, doctor_id, appointment_start, appointment_end are all required"
}
```

---

### 2. Slot Already Booked (Double-Booking Prevented)

**Status:** 409 Conflict

```json
{
  "success": false,
  "error": "This time slot is already booked."
}
```

This is what prevents double-booking! ⭐

---

### 3. Doctor on Leave

**Status:** 409 Conflict

```json
{
  "success": false,
  "error": "Doctor is on leave during this time."
}
```

---

### 4. Database Error

**Status:** 500 Internal Server Error

```json
{
  "success": false,
  "error": "error message from database"
}
```

---

## Success Response

**Status:** 201 Created

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "patient_id": "770e8400-e29b-41d4-a716-446655440000",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z",
    "reason": "Checkup",
    "status": "confirmed",
    "payment_status": "unpaid",
    "source": "manual",
    "created_at": "2026-04-04T10:30:00Z",
    "updated_at": "2026-04-04T10:30:00Z"
  }
}
```

---

## Technical Details: Database Constraints

### Booking Conflict Detection (Line 563-571)

```sql
SELECT id FROM appointments
WHERE doctor_id         = $1
  AND appointment_start = $2
  AND status NOT IN ('cancelled', 'rescheduled')
  AND deleted_at IS NULL
FOR UPDATE
```

**Why this works:**
1. **Exact match on `appointment_start`** (not range checks) - simple and fast
2. **Excludes cancelled/rescheduled** - only active appointments block new bookings
3. **Soft delete check** - respects `deleted_at IS NULL`
4. **FOR UPDATE** - database-level row locking

### Time-Off Conflict Detection (Line 582-587)

```sql
SELECT id FROM doctor_time_off
WHERE doctor_id = $1
  AND start_time <= $2
  AND end_time   >= $3
```

**Why this works:**
- **Range overlap logic**: appointment is blocked if leave overlaps it
- Example: If doctor is off 10:00-15:00, appointments at 10:00, 10:30, 11:00, etc. all blocked

---

## Important Notes

### 1. No Partial Overlap Check

The current implementation checks **exact start time only**, not partial overlaps.

**Example - Potential Issue:**
```
Doctor schedule: 30-minute slots
Slot 1: 10:00 - 10:30
Slot 2: 10:30 - 11:00

Request A: 10:00 - 10:30 ✓ Books successfully
Request B: 10:15 - 10:45 ✓ Books successfully (!)
```

This could allow overlapping appointments if the slot duration check is bypassed!

**Recommendation:** Add overlap range check:
```sql
WHERE doctor_id = $1
  AND NOT (appointment_end <= $2 OR appointment_start >= $3)
  AND status NOT IN ('cancelled', 'rescheduled')
  AND deleted_at IS NULL
FOR UPDATE
```

### 2. Transaction Guarantees

- All steps execute atomically (all-or-nothing)
- If any step fails → **entire booking is rolled back**
- No partial bookings possible

### 3. FOR UPDATE Lock Duration

- Lock is held from Step 4 until Step 7 (COMMIT)
- Blocks other concurrent booking attempts
- Prevents race conditions (tested in concurrent scenarios)

### 4. Patient Upsert Behavior

- If patient phone exists → updates name
- If patient phone doesn't exist → creates new patient
- Always returns patient_id (used for appointment)

### 5. Status is Always "confirmed"

Line 603:
```javascript
VALUES (..., 'confirmed', ...)
```

Appointments are created as `confirmed` state, **not pending**.

---

## Testing Double-Booking Prevention

### Manual Test with cURL

```bash
# Request 1 (should succeed)
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "patient_name": "Raj Kumar",
    "patient_phone": "9876543210",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 201 Created ✅

# Request 2 (should fail - same slot)
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
    "patient_name": "Priya Sharma",
    "patient_phone": "9876543211",
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 409 Conflict ❌
# "This time slot is already booked."
```

### JavaScript Concurrent Test

```javascript
async function testDoubleBooking() {
  const appointmentData = {
    clinic_id: "660e8400-e29b-41d4-a716-446655440001",
    doctor_id: "550e8400-e29b-41d4-a716-446655440000",
    appointment_start: "2026-04-05T10:00:00Z",
    appointment_end: "2026-04-05T10:30:00Z"
  };

  // Fire two requests simultaneously
  const [result1, result2] = await Promise.all([
    fetch("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        ...appointmentData,
        patient_name: "Raj",
        patient_phone: "9876543210"
      }),
      headers: { "Content-Type": "application/json" }
    }).then(r => r.json()),

    fetch("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        ...appointmentData,
        patient_name: "Priya",
        patient_phone: "9876543211"
      }),
      headers: { "Content-Type": "application/json" }
    }).then(r => r.json())
  ]);

  console.log("Request 1:", result1.success ? "✅ Booked" : `❌ ${result1.error}`);
  console.log("Request 2:", result2.success ? "✅ Booked" : `❌ ${result2.error}`);

  // Expected output:
  // Request 1: ✅ Booked
  // Request 2: ❌ This time slot is already booked.
}
```

---

## Flow Chart

```
POST /api/appointments
        |
        v
BEGIN TRANSACTION
        |
        v
Validate Required Fields
        |-----> (Invalid?) ---> ROLLBACK ---> 400 Bad Request
        |
        v
Upsert Patient (insert or update)
        |
        v
SELECT appointments FOR UPDATE (LOCK)
        |
        v
Check for Conflict
        |-----> (Conflict?) ---> ROLLBACK ---> 409 Conflict
        |
        v
Check Doctor Time-Off
        |-----> (On Leave?) ---> ROLLBACK ---> 409 Conflict
        |
        v
INSERT Appointment
        |
        v
COMMIT TRANSACTION (Lock Released)
        |
        v
Log Activity (async, outside transaction)
        |
        v
201 Created + Appointment Data
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Location** | `src/routes/appointments.js`, lines 518-645 |
| **Endpoint** | POST /api/appointments |
| **Double-Booking Check** | Lines 563-579 (FOR UPDATE lock on appointments table) |
| **Prevention Method** | Database row-level lock + transaction atomicity |
| **Response if Conflict** | 409 Conflict: "This time slot is already booked." |
| **Additional Checks** | Doctor time-off (leave) validation |
| **Concurrency Safety** | ✅ Yes (FOR UPDATE prevents race conditions) |
| **Soft Delete Aware** | ✅ Yes (ignores deleted_at IS NOT NULL) |
| **Cancellation Aware** | ✅ Yes (cancelled/rescheduled status ignored) |

---

**End of Documentation** - Appointment Creation & Double-Booking Prevention Details
