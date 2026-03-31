# 🏥 Doctor Schedule & Time-Off APIs - Quick Reference

## ✅ All APIs Ready for Frontend Integration

### 📋 Fetch APIs (Display Data)

#### 1. Get Doctor Details
```http
GET /api/doctors/:id
```
**Response includes:** Name, speciality, consultation duration, buffer time, max appointments/day, status

#### 2. Get Doctor's Weekly Schedule
```http
GET /api/doctors/:id/schedule?clinic_id=<clinic_id>
```
**Response includes:** List of schedules with day_of_week, start_time, end_time, slot_duration_minutes

#### 3. Get Doctor's Time Off Periods
```http
GET /api/doctors/:id/time-off?clinic_id=<clinic_id>
```
**Response includes:** List of time-off with start_time, end_time, reason

---

### ✏️ Update APIs (Modify Data)

#### 4. Update Doctor Information
```http
PATCH /api/doctors/:id
```
**Can update:** name, speciality, consultation_duration_minutes, buffer_time_minutes, max_appointments_per_day, is_active

#### 5. Update Doctor's Schedule
```http
PATCH /api/doctors/:id/schedule/:schedule_id
```
**Can update:** day_of_week, start_time, end_time, slot_duration_minutes, effective_from, effective_to

#### 6. Update Doctor's Time Off ⭐ (NEWLY ADDED)
```http
PATCH /api/doctors/:id/time-off/:timeoff_id
```
**Can update:** start_time, end_time, reason

---

### 🗑️ Delete APIs

#### 7. Delete Schedule
```http
DELETE /api/doctors/:id/schedule/:schedule_id
```

#### 8. Delete Time Off
```http
DELETE /api/doctors/:id/time-off/:timeoff_id
```

---

## 📊 Complete API Responses

### GET Doctor Details Response
```json
{
  "success": true,
  "data": {
    "id": "doctor-uuid",
    "clinic_id": "clinic-uuid",
    "name": "Dr. Rajesh Kumar",
    "speciality": "Cardiology",
    "consultation_duration_minutes": 30,
    "buffer_time_minutes": 5,
    "max_appointments_per_day": 10,
    "is_active": true,
    "created_at": "2026-03-15T10:00:00Z",
    "updated_at": "2026-03-15T10:00:00Z"
  }
}
```

### GET Schedules Response
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-uuid-1",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "day_of_week": 1,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-03-01",
      "effective_to": null
    },
    {
      "id": "schedule-uuid-2",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "day_of_week": 2,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "slot_duration_minutes": 30,
      "effective_from": "2026-03-01",
      "effective_to": null
    }
  ]
}
```

### GET Time Off Response
```json
{
  "success": true,
  "data": [
    {
      "id": "timeoff-uuid-1",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "start_time": "2026-04-01T00:00:00+05:30",
      "end_time": "2026-04-05T23:59:59+05:30",
      "reason": "Annual Leave",
      "created_at": "2026-03-28T10:00:00Z"
    },
    {
      "id": "timeoff-uuid-2",
      "clinic_id": "clinic-uuid",
      "doctor_id": "doctor-uuid",
      "start_time": "2026-04-20T14:00:00+05:30",
      "end_time": "2026-04-20T16:00:00+05:30",
      "reason": "Training Session",
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

## 💻 Frontend Code Samples

### Load all doctor data in one function
```javascript
async function loadDoctorData(clinicId, doctorId) {
  const [docRes, schedRes, timeOffRes] = await Promise.all([
    fetch(`http://localhost:4002/api/doctors/${doctorId}`),
    fetch(`http://localhost:4002/api/doctors/${doctorId}/schedule?clinic_id=${clinicId}`),
    fetch(`http://localhost:4002/api/doctors/${doctorId}/time-off?clinic_id=${clinicId}`)
  ]);

  const doctor = (await docRes.json()).data;
  const schedules = (await schedRes.json()).data;
  const timeOffs = (await timeOffRes.json()).data;

  return { doctor, schedules, timeOffs };
}

// Usage:
const { doctor, schedules, timeOffs } = await loadDoctorData(clinicId, doctorId);
```

### Update schedule example
```javascript
async function updateSchedule(doctorId, scheduleId, startTime, endTime) {
  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}/schedule/${scheduleId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: startTime,  // "10:00:00"
        end_time: endTime       // "18:00:00"
      })
    }
  );
  return response.json();
}
```

### Update time off example (NEW!)
```javascript
async function updateTimeOff(doctorId, timeOffId, reason, startTime, endTime) {
  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}/time-off/${timeOffId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: reason,           // "Medical Leave"
        start_time: startTime,    // "2026-04-15T00:00:00+05:30"
        end_time: endTime         // "2026-04-20T23:59:59+05:30"
      })
    }
  );
  return response.json();
}
```

---

## 📅 Day of Week Reference
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

## 🕐 Time Format
- Schedule times: **HH:MM:SS** (24-hour format) → `"09:00:00"`, `"17:30:00"`
- Time-off times: **ISO 8601 with +05:30 timezone** → `"2026-04-01T00:00:00+05:30"`

---

## 🎯 What's New
✅ **PATCH /doctors/:id/time-off/:timeoff_id** - Update time-off periods (newly added)

Now you can edit, not just delete time-off!

---

**Ready to integrate with frontend!** 🚀
