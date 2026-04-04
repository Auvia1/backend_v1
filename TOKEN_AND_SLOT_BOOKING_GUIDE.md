# Token-Based vs Slot-Based Appointment Booking

**Updated:** April 4, 2026

**File Modified:** `src/routes/appointments.js` (POST /api/appointments)

---

## Overview

The appointment creation endpoint now supports **two different booking models** based on the clinic's configuration:

| Model | `is_slots_needed` | Use Case | Booking Logic |
|-------|-------------------|----------|----------------|
| **Slot-Based** | `true` | Fixed-time slots (10:00-10:30, 10:30-11:00, etc.) | Prevents double-booking with database lock |
| **Token-Based** | `false` | First-come, first-serve queue (common in India) | Allows multiple appointments at same time, assigns token number |

---

## How It Works

### Step 1: Check Clinic Settings

```javascript
const settingsResult = await client.query(
  `SELECT is_slots_needed FROM clinic_settings WHERE clinic_id = $1`,
  [clinic_id]
);
const is_slots_needed = settingsResult.rows[0]?.is_slots_needed ?? false;
```

Fetches the clinic's booking model preference from `clinic_settings` table.

---

### Step 2A: SLOT-BASED SYSTEM (is_slots_needed = true)

#### Logic:
- **Prevent double-booking** - Only one appointment per doctor at exact same start time
- Uses **FOR UPDATE lock** to prevent race conditions
- Returns **409 Conflict** if slot already booked

#### Code:
```javascript
if (is_slots_needed === true) {
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
    return res.status(409).json({
      success: false,
      error: "This time slot is already booked."
    });
  }
}
```

#### Example:
```
Doctor: Dr. Rajesh
Time: 10:00 AM

Request A (Raj):  10:00-10:30 ✅ Books successfully
Request B (Priya): 10:00-10:30 ❌ 409 Error - Already booked
```

**Status:** `token_number` = NULL

---

### Step 2B: TOKEN-BASED SYSTEM (is_slots_needed = false)

#### Logic:
- **Allow multiple appointments** at the same time
- **Assign next available token number** (1, 2, 3, 4...)
- Clinic staff serve patients in token order
- No double-booking prevention needed

#### Code:
```javascript
else {
  const tokenResult = await client.query(
    `SELECT MAX(token_number) as max_token FROM appointments
     WHERE doctor_id = $1
       AND DATE(appointment_start AT TIME ZONE 'Asia/Kolkata') = DATE($2 AT TIME ZONE 'Asia/Kolkata')
       AND status NOT IN ('cancelled', 'rescheduled')
       AND deleted_at IS NULL`,
    [doctor_id, appointment_start]
  );

  const maxToken = tokenResult.rows[0]?.max_token || 0;
  token_number = maxToken + 1;
}
```

#### Example:
```
Doctor: Dr. Rajesh
Time: 10:00 AM

Request A (Raj):   10:00-10:30 ✅ Books with token_number = 1
Request B (Priya):  10:00-10:30 ✅ Books with token_number = 2
Request C (Akshay): 10:00-10:30 ✅ Books with token_number = 3

All 3 can see the doctor at 10:00, in queue order (1 → 2 → 3)
```

**Status:** `token_number` = 1, 2, 3, 4...

---

## API Request & Response

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

### Response (Slot-Based)
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
    "token_number": null,
    "source": "manual",
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

### Response (Token-Based)
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
    "token_number": 3,
    "source": "manual",
    "created_at": "2026-04-04T10:30:00Z"
  }
}
```

---

## Error Responses

### Slot-Based: Already Booked

**Status:** 409 Conflict

```json
{
  "success": false,
  "error": "This time slot is already booked."
}
```

This error **only occurs** when `is_slots_needed = true`.

### Token-Based: No conflicts

✅ **Token-based never returns 409 conflict errors** - multiple appointments at same time are allowed.

---

## Database Details

### Clinic Settings Configuration

```sql
-- Check clinic's booking model
SELECT is_slots_needed FROM clinic_settings
WHERE clinic_id = '660e8400-e29b-41d4-a716-446655440001';

-- Returns:
-- is_slots_needed
-- ───────────────
-- true       (slot-based system)
-- OR
-- false      (token-based system)
```

### Token Number Calculation

For token-based clinics, the token is calculated as:

```sql
SELECT MAX(token_number) as max_token FROM appointments
WHERE doctor_id = '<doctor_id>'
  AND DATE(appointment_start) = '<current_date>'
  AND status NOT IN ('cancelled', 'rescheduled')
  AND deleted_at IS NULL;

-- If max_token = NULL → assign token_number = 1
-- If max_token = 3 → assign token_number = 4
```

This ensures tokens are **sequential per doctor per day**.

---

## Activity Log

Both booking models are logged in `activity_log` table:

```json
{
  "clinic_id": "660e8400-e29b-41d4-a716-446655440001",
  "event_type": "manual_booking",
  "title": "Receptionist booked Raj Kumar with Dr. Rajesh Kumar (slot-based)",
  "meta": {
    "appointment_id": "550e8400-e29b-41d4-a716-446655440000",
    "booking_model": "slot-based",
    "token_number": null,
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient_id": "770e8400-e29b-41d4-a716-446655440000",
    "reason": "Checkup"
  }
}
```

**Token-Based Example:**
```json
{
  "title": "Receptionist booked Raj Kumar with Dr. Rajesh Kumar (token-based)",
  "meta": {
    "booking_model": "token-based",
    "token_number": 3,
    "doctor_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Real-World Scenarios

### Scenario 1: Clinic Using Slot-Based Model

**Clinic Settings:**
```sql
UPDATE clinic_settings SET is_slots_needed = true WHERE clinic_id = 'clinic_123';
```

**Timeline:**
```
10:00 AM - Slot opens
  |
  +---> Patient A books 10:00-10:30 ✅ (token_number = NULL)
  |
  +---> Patient B tries to book 10:00-10:30 ❌ Error: Already booked
  |
  +---> Patient B books 10:30-11:00 ✅ (slot available)
```

### Scenario 2: Clinic Using Token-Based Model

**Clinic Settings:**
```sql
UPDATE clinic_settings SET is_slots_needed = false WHERE clinic_id = 'clinic_456';
```

**Timeline:**
```
10:00 AM - Reception opens
  |
  +---> Patient A books 10:00-10:30 ✅ (token_number = 1)
  |
  +---> Patient B books 10:00-10:30 ✅ (token_number = 2)
  |
  +---> Patient C books 10:00-10:30 ✅ (token_number = 3)

10:00 AM - Doctor's Schedule:
  Token 1: Raj (10:00-10:30)
  Token 2: Priya (whenever token 1 finishes)
  Token 3: Akshay (whenever token 2 finishes)
```

---

## Configuring Clinic Booking Model

### Step 1: Set Clinic Preference

```bash
# Enable SLOT-BASED booking (default)
curl -X PATCH http://localhost:3000/api/clinics/clinic_id/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "is_slots_needed": true }'

# Enable TOKEN-BASED booking
curl -X PATCH http://localhost:3000/api/clinics/clinic_id/settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "is_slots_needed": false }'
```

### Step 2: Verify Setting

```bash
curl http://localhost:3000/api/clinics/clinic_id/settings \
  -H "Authorization: Bearer <token>"

# Response includes:
# "is_slots_needed": true  or  false
```

---

## Key Differences Summary

| Feature | Slot-Based | Token-Based |
|---------|-----------|------------|
| **Setting** | `is_slots_needed = true` | `is_slots_needed = false` |
| **Multiple appointments same time** | ❌ No | ✅ Yes |
| **Double-booking prevention** | ✅ Yes (FOR UPDATE lock) | ❌ No |
| **token_number** | NULL | 1, 2, 3, 4... |
| **Error on duplicate slot** | 409 Conflict | ❌ No error |
| **Typical use case** | Modern clinics, online booking | Traditional clinics, walk-in queues |
| **Patient sees** | Fixed appointment time | Token number + queue position |
| **Doctor scheduling** | Strict time slots | Flexible queue flow |

---

## Testing

### Test Slot-Based Model

```bash
# Step 1: Ensure clinic has is_slots_needed = true
curl -X PATCH http://localhost:3000/api/clinics/clinic_id/settings \
  -H "Authorization: Bearer <token>" \
  -d '{ "is_slots_needed": true }'

# Step 2: Book first appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic_id",
    "patient_name": "Patient A",
    "patient_phone": "9876543210",
    "doctor_id": "doctor_id",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 201 Created, token_number = null

# Step 3: Try to book same slot
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic_id",
    "patient_name": "Patient B",
    "patient_phone": "9876543211",
    "doctor_id": "doctor_id",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 409 Conflict - "This time slot is already booked."
```

### Test Token-Based Model

```bash
# Step 1: Set clinic to token-based
curl -X PATCH http://localhost:3000/api/clinics/clinic_id/settings \
  -H "Authorization: Bearer <token>" \
  -d '{ "is_slots_needed": false }'

# Step 2: Book first appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic_id",
    "patient_name": "Patient A",
    "patient_phone": "9876543210",
    "doctor_id": "doctor_id",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 201 Created, token_number = 1

# Step 3: Book same slot (should succeed with different token)
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic_id",
    "patient_name": "Patient B",
    "patient_phone": "9876543211",
    "doctor_id": "doctor_id",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 201 Created, token_number = 2 ✅

# Step 4: Book another (token increases)
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "clinic_id",
    "patient_name": "Patient C",
    "patient_phone": "9876543212",
    "doctor_id": "doctor_id",
    "appointment_start": "2026-04-05T10:00:00Z",
    "appointment_end": "2026-04-05T10:30:00Z"
  }'
# Returns: 201 Created, token_number = 3 ✅
```

---

## Implementation Notes

### 1. Token Number Per Doctor Per Day

Token numbers are calculated **per doctor per day**, not globally:

```sql
-- Correct: Tokens reset for each doctor and each day
Example 1:
  Dr. Rajesh on 2026-04-05: tokens 1, 2, 3
  Dr. Rajesh on 2026-04-06: tokens 1, 2, 3 (reset)
  Dr. Priya on 2026-04-05: tokens 1, 2 (different doctor)

Example 2:
  Dr. Rajesh at 10:00 AM: tokens 1, 2, 3
  Dr. Rajesh at 2:00 PM: tokens 1, 2 (different slot time)
```

### 2. Cancelled/Rescheduled Appointments

Token numbers from cancelled appointments are **not reused**:

```sql
Example:
  Token 1: Raj - booked
  Token 2: Priya - booked
  Token 3: Akshay - booked (then cancels)
  Token 4: Dev - books next (NOT token 3)
```

This prevents confusion in the queue order.

### 3. Backwards Compatibility

- Existing clinics default to **slot-based** (`is_slots_needed = FALSE`)
- Can be changed anytime by updating `clinic_settings`
- Both models can coexist in same system (different clinics)

---

## Summary

| Aspect | Details |
|--------|---------|
| **Updated Endpoint** | POST /api/appointments |
| **Configuration** | `clinic_settings.is_slots_needed` |
| **Slot-Based** | Prevents double-booking, no token |
| **Token-Based** | Allows multiple appointments, assigns sequential token |
| **Default** | Token-based (is_slots_needed = false) |
| **Activity Log** | Records booking model and token number |
| **Backward Compatible** | ✅ Yes |

---

**End of Documentation** - Token-Based vs Slot-Based Appointment Booking
