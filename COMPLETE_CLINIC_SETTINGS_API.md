# Complete Clinic Settings APIs

## Overview
- **Base URL**: `http://localhost:4002/api`
- **All endpoints are PUBLIC** (no Authorization required)
- **All responses follow**: `{ success: true/false, data: {...}, error: "..." }`

---

## 📋 Database Tables Referenced

From the schema, clinic settings include data from:

### 1. **clinics table** (Basic Info)
```
id, name, email, phone, address, city, state, postal_code,
clinic_type, timezone, subscription_plan, subscription_status,
owner_name, username, created_at, updated_at
```

### 2. **clinic_settings table** (Configuration)
```
advance_booking_days         (10-90 days, default: 30)
min_booking_notice_period    (0-360 minutes, default: 60)
cancellation_window_hours    (0-168 hours, default: 24)
followup_time                (TIME, default: 09:00)
ai_agent_enabled             (true/false, default: true)
ai_agent_languages           (array, default: ['en-IN'])
whatsapp_number              (10-15 digits)
logo_url                     (HTTPS URL)
price_per_appointment        (decimal, default: 0)
```

### 3. **phone_numbers table** (Phone Numbers)
```
id, clinic_id, number, service_type, status, is_active, created_at
```

---

## 🔍 API #1: Search Clinic by Name (Basic Info Only)

**Endpoint**: `GET /clinics/search/by-name`

**Purpose**: Quick search for clinic by name - returns only basic clinic info

### Query Parameter:
- `name` (string, required) - Clinic name (case-insensitive, partial match)

### Example Request:
```javascript
fetch('http://localhost:4002/api/clinics/search/by-name?name=Apollo');
```

### Response (Success 200):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic",
      "email": "apollo@example.com",
      "phone": "9876543210",
      "address": "123 Main St, Mumbai",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "username": "apollo_clinic",
      "created_at": "2026-03-25T10:00:00Z",
      "updated_at": "2026-03-26T14:30:00Z"
    }
  ]
}
```

---

## 🔧 API #2: Search Clinic by Name with ALL Settings (RECOMMENDED)

**Endpoint**: `GET /clinics/search/by-name/full`

**Purpose**: Search clinic by name and fetch COMPLETE settings (clinic info + settings + phone numbers)

### Query Parameter:
- `name` (string, required) - Clinic name

### Example Request:
```javascript
fetch('http://localhost:4002/api/clinics/search/by-name/full?name=Apollo');
```

### Response (Success 200):
```json
{
  "success": true,
  "data": [
    {
      "clinic": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Apollo Clinic",
        "email": "apollo@example.com",
        "phone": "9876543210",
        "address": "123 Main St, Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "postal_code": "400001",
        "clinic_type": "General Practice",
        "timezone": "Asia/Kolkata",
        "subscription_plan": "Growth",
        "subscription_status": "active",
        "owner_name": "Dr. John Smith",
        "username": "apollo_clinic",
        "created_at": "2026-03-25T10:00:00Z",
        "updated_at": "2026-03-26T14:30:00Z"
      },
      "settings": {
        "id": "uuid",
        "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
        "advance_booking_days": 30,
        "min_booking_notice_period": 60,
        "cancellation_window_hours": 24,
        "followup_time": "09:00:00",
        "ai_agent_enabled": true,
        "ai_agent_languages": ["en-IN"],
        "whatsapp_number": "9876543210",
        "logo_url": "https://example.com/logo.png",
        "price_per_appointment": 500.00,
        "updated_at": "2026-03-27T10:00:00Z"
      },
      "phone_numbers": [
        {
          "id": "uuid",
          "number": "+919876543210",
          "service_type": "Reception Line",
          "status": "Live",
          "is_active": true
        },
        {
          "id": "uuid",
          "number": "+919999999999",
          "service_type": "Appointments",
          "status": "Live",
          "is_active": true
        }
      ]
    }
  ]
}
```

---

## 📲 API #3: Get Clinic Settings by ID

**Endpoint**: `GET /clinics/:id/settings`

**Purpose**: Get clinic settings using clinic ID (if you already have the clinic ID)

### Path Parameter:
- `id` (UUID, required) - Clinic ID

### Example Request:
```javascript
fetch('http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings');
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
    "clinic": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Apollo Clinic",
      "email": "apollo@example.com",
      "phone": "9876543210",
      "address": "123 Main St, Mumbai",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postal_code": "400001",
      "clinic_type": "General Practice",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "owner_name": "Dr. John Smith",
      "username": "apollo_clinic",
      "created_at": "2026-03-25T10:00:00Z",
      "updated_at": "2026-03-26T14:30:00Z"
    },
    "settings": {
      "id": "uuid",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "advance_booking_days": 30,
      "min_booking_notice_period": 60,
      "cancellation_window_hours": 24,
      "followup_time": "09:00:00",
      "ai_agent_enabled": true,
      "ai_agent_languages": ["en-IN"],
      "whatsapp_number": "9876543210",
      "logo_url": "https://example.com/logo.png",
      "price_per_appointment": 500.00,
      "updated_at": "2026-03-27T10:00:00Z"
    },
    "phone_numbers": [
      {
        "id": "uuid",
        "number": "+919876543210",
        "service_type": "Reception Line",
        "status": "Live",
        "is_active": true
      }
    ]
  }
}
```

---

## ✏️ API #4: Update Clinic Settings

**Endpoint**: `PATCH /clinics/:id/settings`

**Purpose**: Update clinic configuration/settings

### Path Parameter:
- `id` (UUID, required) - Clinic ID

### Request Body (all optional - send only fields you want to update):
```json
{
  "advance_booking_days": 45,
  "min_booking_notice_period": 120,
  "cancellation_window_hours": 48,
  "followup_time": "10:30:00",
  "ai_agent_enabled": false,
  "ai_agent_languages": ["en-IN", "hi-IN"],
  "whatsapp_number": "9999999999",
  "logo_url": "https://example.com/new-logo.png",
  "price_per_appointment": 750.00
}
```

### Example Request:
```javascript
const response = await fetch(
  'http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings',
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advance_booking_days: 45,
      ai_agent_enabled: false,
      price_per_appointment: 750.00,
      whatsapp_number: "9999999999"
    })
  }
);

const result = await response.json();
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "advance_booking_days": 45,
    "min_booking_notice_period": 120,
    "cancellation_window_hours": 48,
    "followup_time": "10:30:00",
    "ai_agent_enabled": false,
    "ai_agent_languages": ["en-IN", "hi-IN"],
    "whatsapp_number": "9999999999",
    "logo_url": "https://example.com/new-logo.png",
    "price_per_appointment": 750.00,
    "updated_at": "2026-03-28T15:45:00Z"
  }
}
```

---

## 💻 Frontend Implementation Example

### Complete Clinic Settings Page
```javascript
// Step 1: Search clinic by name and load ALL settings
async function loadClinicSettings(clinicName) {
  const response = await fetch(
    `http://localhost:4002/api/clinics/search/by-name/full?name=${encodeURIComponent(clinicName)}`
  );
  const result = await response.json();

  if (result.success && result.data.length > 0) {
    const { clinic, settings, phone_numbers } = result.data[0];

    // Store clinic ID for update
    window.currentClinicId = clinic.id;

    // Populate clinic info
    console.log(`Clinic: ${clinic.name}`);
    console.log(`Email: ${clinic.email}`);
    console.log(`Plan: ${clinic.subscription_plan}`);
    console.log(`Status: ${clinic.subscription_status}`);

    // Populate settings form
    if (settings) {
      document.getElementById('advanceBookingDays').value = settings.advance_booking_days;
      document.getElementById('minBookingNotice').value = settings.min_booking_notice_period;
      document.getElementById('cancellationHours').value = settings.cancellation_window_hours;
      document.getElementById('followupTime').value = settings.followup_time;
      document.getElementById('aiAgentEnabled').checked = settings.ai_agent_enabled;
      document.getElementById('aiLanguages').value = settings.ai_agent_languages.join(',');
      document.getElementById('whatsappNumber').value = settings.whatsapp_number;
      document.getElementById('logoUrl').value = settings.logo_url;
      document.getElementById('pricePerAppointment').value = settings.price_per_appointment;
    }

    // Display phone numbers
    if (phone_numbers && phone_numbers.length > 0) {
      const phoneList = document.getElementById('phoneNumbers');
      phoneList.innerHTML = '';
      phone_numbers.forEach(phone => {
        phoneList.innerHTML += `
          <div>
            <strong>${phone.number}</strong> - ${phone.service_type}
            <span>${phone.status}</span>
          </div>
        `;
      });
    }
  } else {
    console.error(result.error);
  }
}

// Step 2: Update clinic settings
async function updateClinicSettings(clinicId) {
  const updatedData = {
    advance_booking_days: parseInt(document.getElementById('advanceBookingDays').value),
    min_booking_notice_period: parseInt(document.getElementById('minBookingNotice').value),
    cancellation_window_hours: parseInt(document.getElementById('cancellationHours').value),
    followup_time: document.getElementById('followupTime').value,
    ai_agent_enabled: document.getElementById('aiAgentEnabled').checked,
    ai_agent_languages: document.getElementById('aiLanguages').value.split(',').map(l => l.trim()),
    whatsapp_number: document.getElementById('whatsappNumber').value,
    logo_url: document.getElementById('logoUrl').value,
    price_per_appointment: parseFloat(document.getElementById('pricePerAppointment').value)
  };

  const response = await fetch(`http://localhost:4002/api/clinics/${clinicId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });

  const result = await response.json();

  if (result.success) {
    console.log('Settings updated successfully!');
    console.log(result.data);
  } else {
    console.error('Update failed:', result.error);
  }
}

// Usage
document.getElementById('searchBtn').onclick = () => {
  const clinicName = document.getElementById('searchInput').value;
  loadClinicSettings(clinicName);
};

document.getElementById('saveBtn').onclick = () => {
  updateClinicSettings(window.currentClinicId);
};
```

### HTML Form Example
```html
<div class="clinic-settings">
  <!-- Search Section -->
  <div class="search-section">
    <h2>Clinic Settings</h2>
    <input type="text" id="searchInput" placeholder="Enter clinic name..." />
    <button id="searchBtn">Load Settings</button>
  </div>

  <hr />

  <!-- Clinic Info (Read-only) -->
  <div class="clinic-info">
    <h3>Clinic Information</h3>
    <p><strong>Plan:</strong> <span id="clinicPlan"></span></p>
    <p><strong>Status:</strong> <span id="clinicStatus"></span></p>
    <p><strong>Phone Numbers:</strong></p>
    <div id="phoneNumbers"></div>
  </div>

  <hr />

  <!-- Settings Form -->
  <form id="settingsForm">
    <h3>Booking Configuration</h3>

    <div>
      <label>Advance Booking Days (10-90):</label>
      <input type="number" id="advanceBookingDays" min="10" max="90" />
      <small>How many days in advance can patients book?</small>
    </div>

    <div>
      <label>Minimum Booking Notice (minutes):</label>
      <input type="number" id="minBookingNotice" min="0" />
      <small>Minimum notice period before appointment</small>
    </div>

    <div>
      <label>Cancellation Window (hours):</label>
      <input type="number" id="cancellationHours" min="0" />
      <small>Hours before appointment when cancellation is allowed</small>
    </div>

    <div>
      <label>Follow-up Time:</label>
      <input type="time" id="followupTime" />
    </div>

    <hr />

    <h3>AI Agent Configuration</h3>

    <div>
      <label>
        <input type="checkbox" id="aiAgentEnabled" />
        Enable AI Agent
      </label>
    </div>

    <div>
      <label>Languages (comma-separated):</label>
      <input type="text" id="aiLanguages" placeholder="en-IN,hi-IN" />
    </div>

    <hr />

    <h3>Contact & Payments</h3>

    <div>
      <label>WhatsApp Number:</label>
      <input type="tel" id="whatsappNumber" placeholder="9876543210" />
    </div>

    <div>
      <label>Logo URL:</label>
      <input type="url" id="logoUrl" placeholder="https://example.com/logo.png" />
    </div>

    <div>
      <label>Price Per Appointment:</label>
      <input type="number" id="pricePerAppointment" min="0" step="0.01" />
    </div>

    <button type="button" id="saveBtn">Save Settings</button>
  </form>
</div>
```

---

## 🔄 Complete Flow (End-to-End)

```
1. User enters clinic name → "Apollo Clinic"
   ↓
2. Frontend calls: GET /clinics/search/by-name/full?name=Apollo
   ↓
3. Backend returns:
   - Clinic basic info
   - All clinic settings
   - Phone numbers
   ↓
4. Frontend displays: All fields in form pre-populated with current values
   ↓
5. User edits: Any settings they want to change
   ↓
6. User clicks: "Save Settings"
   ↓
7. Frontend calls: PATCH /clinics/{clinic_id}/settings with updated data
   ↓
8. Backend returns: Updated settings
   ↓
9. Frontend shows: Success message
```

---

## 📊 Settings Fields Explained

| Field | Type | Min-Max | Default | Purpose |
|-------|------|---------|---------|---------|
| advance_booking_days | Integer | 10-90 | 30 | How many days ahead can patients book |
| min_booking_notice_period | Integer | 0-360 min | 60 | Notice required before appointment |
| cancellation_window_hours | Integer | 0-168 hrs | 24 | Hours before appointment to cancel |
| followup_time | TIME | HH:MM:SS | 09:00 | Default follow-up time |
| ai_agent_enabled | Boolean | - | true | Enable AI agent for booking |
| ai_agent_languages | Array | - | ['en-IN'] | Languages supported |
| whatsapp_number | String | 10-15 digits | null | WhatsApp contact number |
| logo_url | String | URL | null | Clinic logo URL |
| price_per_appointment | Decimal | >= 0 | 0 | Price per appointment |

---

## ⚠️ Important Notes

1. **Search by Name**: Use `GET /clinics/search/by-name/full` for complete data (recommended)
2. **Partial Matching**: "Apollo" returns all clinics with "Apollo" in name
3. **Case-Insensitive**: Works with any case combination
4. **Phone Numbers**: Automatically fetched with clinic settings
5. **Languages Array**: `["en-IN", "hi-IN"]` for multilingual support
6. **Time Format**: Use HH:MM:SS or HH:MM for time fields
7. **Only Settings**: PATCH endpoint only updates `clinic_settings` table, not basic clinic info

---

## Error Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Settings fetched or updated |
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Clinic not found by name/ID |
| 500 | Server Error | Database error |

---

## Quick Copy-Paste URLs

```
Search with full settings (RECOMMENDED):
http://localhost:4002/api/clinics/search/by-name/full?name=Apollo

Get settings by clinic ID:
http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings

Update settings (use PATCH method):
http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000/settings
```

---

**You now have everything to fetch and update complete clinic settings!** 🚀
