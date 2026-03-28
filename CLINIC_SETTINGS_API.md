# Clinic Settings APIs - Get & Update

## Overview
- **Base URL**: `http://localhost:4002/api`
- **All endpoints are PUBLIC** (no Authorization required)
- **All responses follow**: `{ success: true/false, data: {...}, error: "..." }`

---

## 🔍 API #1: Search Clinic by Name (Get Settings)

**Endpoint**: `GET /clinics/search/by-name`

**Purpose**: Search clinic by name and fetch all clinic settings

### Query Parameter:
- `name` (string, required) - Clinic name (case-insensitive, partial match supported)

### Example Requests:
```javascript
// Exact match
fetch('http://localhost:4002/api/clinics/search/by-name?name=Apollo%20Clinic');

// Partial match (returns all clinics containing "Apollo")
fetch('http://localhost:4002/api/clinics/search/by-name?name=Apollo');

// Multiple words
fetch('http://localhost:4002/api/clinics/search/by-name?name=Care%20Plus');
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
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Apollo Health Center",
      "email": "apollo.health@example.com",
      "phone": "9876543211",
      "address": "456 Main Ave, Bangalore",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Starter",
      "subscription_status": "trial",
      "username": "apollo_health",
      "created_at": "2026-03-24T08:15:00Z",
      "updated_at": "2026-03-26T09:20:00Z"
    }
  ]
}
```

### Clinic Settings Object Fields:
```
id                    → UUID of clinic
name                  → Clinic name
email                 → Clinic email
phone                 → Clinic phone number (10 digits)
address               → Clinic physical address
timezone              → Timezone (e.g., "Asia/Kolkata")
subscription_plan     → Plan: Starter, Growth, Enterprise, trial
subscription_status   → Status: trial, active, past_due, suspended, canceled
username              → Clinic username (for login)
created_at            → When clinic was registered
updated_at            → When clinic was last updated
```

### Response on Not Found (404):
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

---

## 🔧 API #2: Get Clinic Settings by ID

**Endpoint**: `GET /clinics/:id`

**Purpose**: Get detailed clinic settings using clinic ID

### Path Parameter:
- `id` (UUID, required) - The clinic ID

### Example Request:
```javascript
const clinicId = "550e8400-e29b-41d4-a716-446655440000";
fetch(`http://localhost:4002/api/clinics/${clinicId}`);
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
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
}
```

---

## ✏️ API #3: Update Clinic Settings

**Endpoint**: `PATCH /clinics/:id`

**Purpose**: Update clinic settings/details

### Path Parameter:
- `id` (UUID, required) - The clinic ID

### Request Body (all optional - send only fields you want to update):
```json
{
  "name": "Apollo Clinic Updated",
  "email": "newemail@example.com",
  "phone": "9999999999",
  "address": "New Address, Mumbai",
  "timezone": "Asia/Kolkata"
}
```

### Example Request:
```javascript
const clinicId = "550e8400-e29b-41d4-a716-446655440000";

const response = await fetch(`http://localhost:4002/api/clinics/${clinicId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Apollo Clinic - New Branch",
    email: "newemail@apolloclinic.com",
    phone: "9000000000",
    address: "789 New Street, Mumbai",
    timezone: "Asia/Kolkata"
  })
});
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apollo Clinic - New Branch",
    "email": "newemail@apolloclinic.com",
    "phone": "9000000000",
    "address": "789 New Street, Mumbai",
    "timezone": "Asia/Kolkata",
    "subscription_plan": "Growth",
    "subscription_status": "active",
    "username": "apollo_clinic",
    "updated_at": "2026-03-27T15:45:00Z"
  }
}
```

### Fields That Can Be Updated:
- `name` - Clinic name
- `email` - Clinic email
- `phone` - Clinic phone number
- `address` - Clinic address
- `timezone` - Timezone

### Fields That CANNOT Be Updated (via this endpoint):
- `id` - Clinic ID (primary key)
- `subscription_plan` - Use billing API instead
- `subscription_status` - Use billing API instead
- `username` - Cannot change after registration

---

## 📋 Frontend Implementation Example

### Step 1: Search Clinic by Name
```javascript
async function searchClinicByName(clinicName) {
  const response = await fetch(
    `http://localhost:4002/api/clinics/search/by-name?name=${encodeURIComponent(clinicName)}`
  );
  const result = await response.json();

  if (result.success) {
    console.log(`Found ${result.data.length} clinic(s):`);
    result.data.forEach(clinic => {
      console.log(`- ${clinic.name} (ID: ${clinic.id})`);
      console.log(`  Email: ${clinic.email}`);
      console.log(`  Phone: ${clinic.phone}`);
      console.log(`  Plan: ${clinic.subscription_plan}`);
      console.log(`  Status: ${clinic.subscription_status}`);
    });
    return result.data;
  } else {
    console.error(result.error);
  }
}

// Usage
searchClinicByName('Apollo');
```

### Step 2: Display Clinic Settings in Form
```javascript
async function loadClinicSettings(clinicName) {
  const clinics = await searchClinicByName(clinicName);

  if (clinics && clinics.length > 0) {
    const clinic = clinics[0]; // Use first result

    // Populate form fields
    document.getElementById('clinicName').value = clinic.name;
    document.getElementById('clinicEmail').value = clinic.email;
    document.getElementById('clinicPhone').value = clinic.phone;
    document.getElementById('clinicAddress').value = clinic.address;
    document.getElementById('clinicTimezone').value = clinic.timezone;

    // Store clinic ID for update
    window.currentClinicId = clinic.id;

    // Display read-only info
    document.getElementById('clinicPlan').textContent = clinic.subscription_plan;
    document.getElementById('clinicStatus').textContent = clinic.subscription_status;
  }
}
```

### Step 3: Update Clinic Settings
```javascript
async function updateClinicSettings(clinicId) {
  const updatedData = {
    name: document.getElementById('clinicName').value,
    email: document.getElementById('clinicEmail').value,
    phone: document.getElementById('clinicPhone').value,
    address: document.getElementById('clinicAddress').value,
    timezone: document.getElementById('clinicTimezone').value
  };

  const response = await fetch(`http://localhost:4002/api/clinics/${clinicId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });

  const result = await response.json();

  if (result.success) {
    console.log('Clinic settings updated successfully!');
    console.log(result.data);
  } else {
    console.error('Update failed:', result.error);
  }
}

// Usage - call when user clicks "Save Settings"
document.getElementById('saveBtn').addEventListener('click', () => {
  updateClinicSettings(window.currentClinicId);
});
```

### Complete Form Example
```html
<div class="clinic-settings-form">
  <h2>Clinic Settings</h2>

  <!-- Search Section -->
  <div>
    <label>Search Clinic by Name:</label>
    <input
      type="text"
      id="searchClinicName"
      placeholder="e.g., Apollo Clinic"
    />
    <button onclick="loadClinicSettings(document.getElementById('searchClinicName').value)">
      Load Settings
    </button>
  </div>

  <hr />

  <!-- Settings Form -->
  <form>
    <div>
      <label>Clinic Name:</label>
      <input type="text" id="clinicName" required />
    </div>

    <div>
      <label>Email:</label>
      <input type="email" id="clinicEmail" required />
    </div>

    <div>
      <label>Phone:</label>
      <input type="tel" id="clinicPhone" required />
    </div>

    <div>
      <label>Address:</label>
      <textarea id="clinicAddress" required></textarea>
    </div>

    <div>
      <label>Timezone:</label>
      <select id="clinicTimezone">
        <option value="Asia/Kolkata">Asia/Kolkata</option>
        <option value="Asia/Delhi">Asia/Delhi</option>
        <option value="UTC">UTC</option>
        <!-- Add more timezones as needed -->
      </select>
    </div>

    <!-- Read-only fields -->
    <div>
      <label>Subscription Plan (Read-only):</label>
      <span id="clinicPlan"></span>
    </div>

    <div>
      <label>Status (Read-only):</label>
      <span id="clinicStatus"></span>
    </div>

    <button type="button" id="saveBtn" onclick="updateClinicSettings(window.currentClinicId)">
      Save Settings
    </button>
  </form>
</div>
```

---

## 🔄 Complete Flow (End-to-End)

```
1. User enters clinic name → "Apollo Clinic"
   ↓
2. Frontend calls: GET /clinics/search/by-name?name=Apollo%20Clinic
   ↓
3. Backend returns: Array of matching clinics
   ↓
4. Frontend displays: Clinic details in form (name, email, phone, address, timezone)
   ↓
5. User edits: Fields they want to change
   ↓
6. User clicks: "Save Settings"
   ↓
7. Frontend calls: PATCH /clinics/{clinic_id} with updated data
   ↓
8. Backend returns: Updated clinic details
   ↓
9. Frontend shows: Success message and updated data
```

---

## ⚠️ Important Notes

1. **Search is Case-Insensitive**: Searching for "apollo" or "APOLLO" works the same
2. **Partial Matching**: Searching "Apollo" returns all clinics with "Apollo" in the name
3. **Multiple Results**: Search may return multiple clinics, each with unique ID
4. **Non-Editable Fields**:
   - Subscription plan/status (change via Billing API)
   - Username (cannot change)
   - ID and timestamps (system generated)
5. **Phone Format**: 10 digits recommended (e.g., "9876543210")
6. **Timezone Format**: Use standard timezone strings like "Asia/Kolkata", "UTC", etc.

---

## Error Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Settings fetched or updated |
| 400 | Bad Request | Missing clinic name parameter |
| 404 | Not Found | Clinic with that name doesn't exist |
| 500 | Server Error | Database error |

---

## Quick Copy-Paste URLs

```
Search clinic by name:
http://localhost:4002/api/clinics/search/by-name?name=Apollo

Get clinic by ID:
http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000

Update clinic (use PATCH method):
http://localhost:4002/api/clinics/550e8400-e29b-41d4-a716-446655440000
```

---

**You now have everything to search, view, and update clinic settings!** 🚀
