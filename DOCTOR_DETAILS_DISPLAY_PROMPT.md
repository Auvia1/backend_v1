# 🏥 Doctor Details - Display & Update Guide for Frontend

Complete prompt for displaying doctor information with their schedule and time off in the clinic management page.

---

## 📋 APIs Used for Display & Update

### Doctor Detail APIs
1. **GET /doctors/:id** - Get single doctor info
2. **GET /doctors/:id/schedule?clinic_id=** - Get doctor's weekly schedule
3. **GET /doctors/:id/time-off?clinic_id=** - Get doctor's time off periods

### Update APIs
4. **PATCH /doctors/:id** - Update doctor info
5. **PATCH /doctors/:id/schedule/:schedule_id** - Update schedule
6. **PATCH /doctors/:id/time-off/:timeoff_id** - Update time off

---

## 🎯 Frontend Implementation Flow

### Step 1: Load Doctor Details

```javascript
async function loadDoctorDetails(clinicId, doctorId) {
  try {
    // Fetch doctor basic info
    const doctorRes = await fetch(`http://localhost:4002/api/doctors/${doctorId}`);
    const doctorData = await doctorRes.json();

    // Fetch doctor schedules
    const scheduleRes = await fetch(
      `http://localhost:4002/api/doctors/${doctorId}/schedule?clinic_id=${clinicId}`
    );
    const scheduleData = await scheduleRes.json();

    // Fetch doctor time-off
    const timeOffRes = await fetch(
      `http://localhost:4002/api/doctors/${doctorId}/time-off?clinic_id=${clinicId}`
    );
    const timeOffData = await timeOffRes.json();

    return {
      doctor: doctorData.data,
      schedules: scheduleData.data,
      timeOffs: timeOffData.data
    };
  } catch (error) {
    console.error("Error loading doctor details:", error);
  }
}

// Usage:
const doctorDetails = await loadDoctorDetails(clinicId, doctorId);
console.log(doctorDetails);
```

---

## 📊 Complete Data Structure

### Doctor Object Structure:
```json
{
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
```

### Schedule Object Structure:
```json
{
  "id": "schedule-uuid",
  "clinic_id": "clinic-uuid",
  "doctor_id": "doctor-uuid",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "slot_duration_minutes": 30,
  "effective_from": "2026-03-01",
  "effective_to": null
}
```

### Time Off Object Structure:
```json
{
  "id": "timeoff-uuid",
  "clinic_id": "clinic-uuid",
  "doctor_id": "doctor-uuid",
  "start_time": "2026-04-01T00:00:00+05:30",
  "end_time": "2026-04-05T23:59:59+05:30",
  "reason": "Annual Leave",
  "created_at": "2026-03-28T10:00:00Z"
}
```

---

## 🎨 UI Component Structure (Recommended)

```
┌────────────────────────────────────────────────────────────┐
│                   Doctor Details Page                      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👨‍⚕️ Doctor Information Card                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Name: Dr. Rajesh Kumar                               │  │
│  │ Speciality: Cardiology                              │  │
│  │ Consultation Duration: 30 minutes                    │  │
│  │ Buffer Time: 5 minutes                               │  │
│  │ Max Appointments/Day: 10                             │  │
│  │ Status: Active ✓                                     │  │
│  │                        [Edit Button]                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📅 Weekly Schedule                                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Monday:    09:00 AM - 05:00 PM (30 min slots)       │  │
│  │ Tuesday:   09:00 AM - 05:00 PM (30 min slots)       │  │
│  │ Wednesday: 09:00 AM - 05:00 PM (30 min slots)       │  │
│  │ Thursday:  09:00 AM - 05:00 PM (30 min slots)       │  │
│  │ Friday:    09:00 AM - 05:00 PM (30 min slots)       │  │
│  │ Saturday:  --                                         │  │
│  │ Sunday:    --                                         │  │
│  │                        [Edit Schedule Button]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🕐 Time Off Periods                                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ Apr 1-5, 2026: Annual Leave                         │  │
│  │   [Edit] [Delete]                                    │  │
│  │                                                        │  │
│  │ Apr 20, 2026: Training Session (2:00 PM - 4:00 PM) │  │
│  │   [Edit] [Delete]                                    │  │
│  │                         [+ Add Time Off]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## 💻 Complete Frontend Examples

### 1. Display Doctor Information

```javascript
function displayDoctorInfo(doctor) {
  return `
    <div class="doctor-info-card">
      <h2>${doctor.name}</h2>
      <p><strong>Speciality:</strong> ${doctor.speciality}</p>
      <p><strong>Consultation Duration:</strong> ${doctor.consultation_duration_minutes} minutes</p>
      <p><strong>Buffer Time:</strong> ${doctor.buffer_time_minutes} minutes</p>
      <p><strong>Max Appointments/Day:</strong> ${doctor.max_appointments_per_day || 'Unlimited'}</p>
      <p><strong>Status:</strong> ${doctor.is_active ? '✓ Active' : '✗ Inactive'}</p>
      <button onclick="editDoctor('${doctor.id}')">Edit Doctor</button>
    </div>
  `;
}
```

### 2. Display Weekly Schedule

```javascript
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function displaySchedule(schedules) {
  const scheduleMap = {};

  // Create a map of day -> schedule
  schedules.forEach(schedule => {
    const day = DAYS_OF_WEEK[schedule.day_of_week];
    scheduleMap[day] = schedule;
  });

  let html = '<div class="schedule-card"><h3>📅 Weekly Schedule</h3><ul>';

  DAYS_OF_WEEK.forEach((day, index) => {
    const schedule = scheduleMap[day];
    if (schedule) {
      html += `
        <li>
          <strong>${day}:</strong> ${schedule.start_time} - ${schedule.end_time}
          (${schedule.slot_duration_minutes} min slots)
          <button onclick="editSchedule('${schedule.id}')">Edit</button>
          <button onclick="deleteSchedule('${schedule.id}')">Delete</button>
        </li>
      `;
    } else {
      html += `<li><strong>${day}:</strong> --</li>`;
    }
  });

  html += '</ul><button onclick="addSchedule()">+ Add Schedule</button></div>';
  return html;
}
```

### 3. Display Time Off Periods

```javascript
function displayTimeOffs(timeOffs) {
  if (timeOffs.length === 0) {
    return '<p>No time off scheduled</p>';
  }

  let html = '<div class="timeoff-card"><h3>🕐 Time Off Periods</h3><ul>';

  timeOffs.forEach(timeOff => {
    const startDate = new Date(timeOff.start_time).toLocaleDateString();
    const endDate = new Date(timeOff.end_time).toLocaleDateString();

    html += `
      <li>
        <strong>${startDate} - ${endDate}:</strong> ${timeOff.reason || 'No reason'}
        <button onclick="editTimeOff('${timeOff.id}')">Edit</button>
        <button onclick="deleteTimeOff('${timeOff.id}')">Delete</button>
      </li>
    `;
  });

  html += '</ul><button onclick="addTimeOff()">+ Add Time Off</button></div>';
  return html;
}
```

---

## 🔄 Update Operations

### Update Doctor Information

```javascript
async function updateDoctorInfo(doctorId, updates) {
  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: updates.name,
        speciality: updates.speciality,
        consultation_duration_minutes: updates.consultationDuration,
        buffer_time_minutes: updates.bufferTime,
        max_appointments_per_day: updates.maxAppointments,
        is_active: updates.isActive
      })
    }
  );
  return response.json();
}

// Usage:
await updateDoctorInfo('doctor-id', {
  name: 'Dr. Rajesh Kumar',
  consultationDuration: 45,
  isActive: true
});
```

### Update Schedule

```javascript
async function updateSchedule(doctorId, scheduleId, updates) {
  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}/schedule/${scheduleId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day_of_week: updates.dayOfWeek,
        start_time: updates.startTime,    // "09:00:00"
        end_time: updates.endTime,        // "18:00:00"
        slot_duration_minutes: updates.slotDuration,
        effective_from: updates.effectiveFrom,
        effective_to: updates.effectiveTo
      })
    }
  );
  return response.json();
}

// Usage:
await updateSchedule('doctor-uuid', 'schedule-uuid', {
  startTime: '10:00:00',
  endTime: '18:00:00'
});
```

### Update Time Off

```javascript
async function updateTimeOff(doctorId, timeOffId, updates) {
  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}/time-off/${timeOffId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: updates.startTime,  // "2026-04-01T00:00:00+05:30"
        end_time: updates.endTime,      // "2026-04-05T23:59:59+05:30"
        reason: updates.reason
      })
    }
  );
  return response.json();
}

// Usage:
await updateTimeOff('doctor-uuid', 'timeoff-uuid', {
  reason: 'Medical Leave',
  startTime: '2026-04-15T00:00:00+05:30',
  endTime: '2026-04-20T23:59:59+05:30'
});
```

---

## 📝 Modal Forms

### Edit Doctor Modal

```html
<div id="editDoctorModal" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>Edit Doctor</h2>

    <label>Name:</label>
    <input type="text" id="doctorName" placeholder="Doctor Name" />

    <label>Speciality:</label>
    <input type="text" id="speciality" placeholder="e.g., Cardiology" />

    <label>Consultation Duration (minutes):</label>
    <input type="number" id="consultationDuration" min="5" value="30" />

    <label>Buffer Time (minutes):</label>
    <input type="number" id="bufferTime" min="0" value="0" />

    <label>Max Appointments/Day:</label>
    <input type="number" id="maxAppointments" min="1" />

    <label>
      <input type="checkbox" id="isActive" checked />
      Active
    </label>

    <button onclick="saveDoctor()">Save Changes</button>
    <button onclick="closeModal('editDoctorModal')">Cancel</button>
  </div>
</div>
```

### Edit Schedule Modal

```html
<div id="editScheduleModal" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>Edit Schedule</h2>

    <label>Day of Week:</label>
    <select id="dayOfWeek">
      <option value="0">Sunday</option>
      <option value="1">Monday</option>
      <option value="2">Tuesday</option>
      <option value="3">Wednesday</option>
      <option value="4">Thursday</option>
      <option value="5">Friday</option>
      <option value="6">Saturday</option>
    </select>

    <label>Start Time:</label>
    <input type="time" id="startTime" />

    <label>End Time:</label>
    <input type="time" id="endTime" />

    <label>Slot Duration (minutes):</label>
    <input type="number" id="slotDuration" min="5" value="30" />

    <label>Effective From:</label>
    <input type="date" id="effectiveFrom" />

    <label>Effective To (optional):</label>
    <input type="date" id="effectiveTo" />

    <button onclick="saveSchedule()">Save Changes</button>
    <button onclick="closeModal('editScheduleModal')">Cancel</button>
  </div>
</div>
```

### Edit Time Off Modal

```html
<div id="editTimeOffModal" class="modal">
  <div class="modal-content">
    <span class="close">&times;</span>
    <h2>Edit Time Off</h2>

    <label>Start Date & Time:</label>
    <input type="datetime-local" id="timeOffStart" />
    <small>Will be converted to IST (+05:30)</small>

    <label>End Date & Time:</label>
    <input type="datetime-local" id="timeOffEnd" />
    <small>Will be converted to IST (+05:30)</small>

    <label>Reason:</label>
    <select id="timeOffReason">
      <option value="">-- Select Reason --</option>
      <option value="Annual Leave">Annual Leave</option>
      <option value="Sick Leave">Sick Leave</option>
      <option value="Training">Training</option>
      <option value="Conference">Conference</option>
      <option value="Medical">Medical</option>
      <option value="Other">Other</option>
    </select>
    <input type="text" id="customReason" placeholder="Custom reason" />

    <button onclick="saveTimeOff()">Save Changes</button>
    <button onclick="closeModal('editTimeOffModal')">Cancel</button>
  </div>
</div>
```

---

## ⏰ Helper Functions for DateTime Conversion

```javascript
// Convert HTML datetime-local to ISO 8601 with IST timezone
function localToIST(dateTimeString) {
  const date = new Date(dateTimeString);
  // Add +05:30 timezone offset for IST
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toISOString().replace('Z', '+05:30');
}

// Convert ISO 8601 to display format
function formatDisplayTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Example:
const localValue = document.getElementById('timeOffStart').value; // "2026-04-01T00:00"
const isoValue = localToIST(localValue); // "2026-04-01T00:00:00+05:30"
```

---

## 🔄 Complete Workflow Example

```javascript
// Load and display doctor details
async function showDoctorDetailsPage(clinicId, doctorId) {
  try {
    // Load all data
    const doctorRes = await fetch(`http://localhost:4002/api/doctors/${doctorId}`);
    const scheduleRes = await fetch(
      `http://localhost:4002/api/doctors/${doctorId}/schedule?clinic_id=${clinicId}`
    );
    const timeOffRes = await fetch(
      `http://localhost:4002/api/doctors/${doctorId}/time-off?clinic_id=${clinicId}`
    );

    const doctor = (await doctorRes.json()).data;
    const schedules = (await scheduleRes.json()).data;
    const timeOffs = (await timeOffRes.json()).data;

    // Display on page
    document.getElementById('doctorInfo').innerHTML = displayDoctorInfo(doctor);
    document.getElementById('scheduleCard').innerHTML = displaySchedule(schedules);
    document.getElementById('timeOffCard').innerHTML = displayTimeOffs(timeOffs);

    // Store in global for edit access
    window.currentDoctor = doctor;
    window.currentSchedules = schedules;
    window.currentTimeOffs = timeOffs;

  } catch (error) {
    console.error("Error loading doctor details:", error);
    alert("Failed to load doctor details");
  }
}

// Edit doctor handler
async function saveDoctor() {
  const updates = {
    name: document.getElementById('doctorName').value,
    speciality: document.getElementById('speciality').value,
    consultationDuration: parseInt(document.getElementById('consultationDuration').value),
    bufferTime: parseInt(document.getElementById('bufferTime').value),
    maxAppointments: parseInt(document.getElementById('maxAppointments').value),
    isActive: document.getElementById('isActive').checked
  };

  try {
    const result = await updateDoctorInfo(window.currentDoctor.id, updates);
    if (result.success) {
      alert("Doctor updated successfully!");
      location.reload(); // Reload page
    }
  } catch (error) {
    alert("Error updating doctor: " + error.message);
  }
}
```

---

## 🔗 Related APIs

- **GET /doctors?clinic_id=** - List all doctors
- **POST /doctors** - Create new doctor
- **DELETE /doctors/:id** - Delete doctor
- **GET /doctors/:id/slots?date=YYYY-MM-DD** - Get available appointment slots

---

## ✅ API Endpoints Summary

| Operation | Method | Endpoint | Input |
|-----------|--------|----------|-------|
| Get doctor info | GET | /doctors/:id | doctor_id |
| Get schedules | GET | /doctors/:id/schedule?clinic_id= | doctor_id, clinic_id |
| Get time-off | GET | /doctors/:id/time-off?clinic_id= | doctor_id, clinic_id |
| Update doctor | PATCH | /doctors/:id | doctor_id + updates |
| Update schedule | PATCH | /doctors/:id/schedule/:schedule_id | doctor_id, schedule_id + updates |
| Update time-off | PATCH | /doctors/:id/time-off/:timeoff_id | doctor_id, timeoff_id + updates |
| Delete schedule | DELETE | /doctors/:id/schedule/:schedule_id | doctor_id, schedule_id |
| Delete time-off | DELETE | /doctors/:id/time-off/:timeoff_id | doctor_id, timeoff_id |

---

## 📱 Mobile Responsive Tips

- Use responsive grid for schedule (stack vertically on mobile)
- Use native datetime pickers for better UX
- Collapse time-off list if > 5 items
- Make edit buttons larger for touch targets
- Use tabs or accordion for different sections

---

**All APIs are ready to use! Start building the doctor details display page!** 🚀
