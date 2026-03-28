# Clinic Settings APIs - Complete Prompt for Frontend

## Backend APIs Ready

You have **4 complete APIs** to fetch and update clinic settings. All are **PUBLIC** (no auth required).

**Base URL**: `http://localhost:4002/api`

---

## 📋 API #1: Search Clinic by Name (Basic Info)

**Endpoint**: `GET /clinics/search/by-name`

**When to use**: Quick search for clinic

### Input (Query Parameters):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| name | string | YES | "Apollo" or "Apollo Clinic" |

### Request Example:
```javascript
fetch('http://localhost:4002/api/clinics/search/by-name?name=Apollo')
```

### Output (Response):
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

### Output Fields Explained:
```
id                      → Unique clinic identifier (UUID)
name                    → Clinic name
email                   → Clinic email address
phone                   → Clinic phone (10 digits)
address                 → Clinic physical address
timezone                → Timezone (e.g., "Asia/Kolkata", "UTC")
subscription_plan       → Current plan: Starter, Growth, Enterprise, trial
subscription_status     → Status: trial, active, past_due, suspended, canceled
username                → Clinic login username
created_at              → Registration date/time (ISO 8601)
updated_at              → Last update date/time (ISO 8601)
```

---

## 🔧 API #2: Search Clinic by Name with FULL Settings ⭐ (RECOMMENDED)

**Endpoint**: `GET /clinics/search/by-name/full`

**When to use**: Load complete clinic settings page (has everything!)

### Input (Query Parameters):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| name | string | YES | "Apollo Clinic" |

### Request Example:
```javascript
fetch('http://localhost:4002/api/clinics/search/by-name/full?name=Apollo')
```

### Output (Response) - Complete Data Structure:
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
        "id": "uuid-settings-id",
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

### Output Fields - CLINIC OBJECT:
```
id                      → Unique clinic ID (UUID)
name                    → Clinic name
email                   → Clinic email
phone                   → Clinic phone (10 digits)
address                 → Street address
city                    → City name
state                   → State/Province
postal_code             → Postal/ZIP code
clinic_type             → Type: General Practice, Multi-specialty, etc.
timezone                → Timezone string (e.g., "Asia/Kolkata")
subscription_plan       → Plan: Starter, Growth, Enterprise, trial
subscription_status     → Status: trial, active, past_due, suspended, canceled
owner_name              → Clinic owner's name
username                → Login username
created_at              → When clinic was registered
updated_at              → When clinic info was last updated
```

### Output Fields - SETTINGS OBJECT:
```
id                          → Settings record ID (UUID)
clinic_id                   → Reference to clinic ID
advance_booking_days        → Days in advance to allow bookings (10-90, default: 30)
min_booking_notice_period   → Minutes notice before appointment (0-360, default: 60)
cancellation_window_hours   → Hours before appointment to allow cancellation (0-168, default: 24)
followup_time               → Default follow-up time (HH:MM:SS format, e.g., "09:00:00")
ai_agent_enabled            → Boolean: true/false (default: true)
ai_agent_languages          → Array of language codes (e.g., ["en-IN", "hi-IN"])
whatsapp_number             → WhatsApp contact number (10-15 digits)
logo_url                    → URL to clinic logo (must be HTTPS)
price_per_appointment       → Decimal price per appointment (e.g., 500.00)
updated_at                  → When settings were last updated
```

### Output Fields - PHONE_NUMBERS ARRAY:
```
id                  → Phone number record ID (UUID)
number              → Phone number with country code (e.g., "+919876543210")
service_type        → Type of service (e.g., "Reception Line", "Appointments")
status              → Status: Live, Inactive, Provisioning, Failed
is_active           → Boolean: true/false
```

---

## 📲 API #3: Get Clinic Settings by ID

**Endpoint**: `GET /clinics/:id/settings`

**When to use**: If you already have clinic ID (alternative to search by name)

### Input (Path Parameters):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| id | UUID | YES | 550e8400-e29b-41d4-a716-446655440000 |

### Request Example:
```javascript
const clinicId = "550e8400-e29b-41d4-a716-446655440000";
fetch(`http://localhost:4002/api/clinics/${clinicId}/settings`)
```

### Output (Response):
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

**When to use**: Update any clinic settings

### Input (Path Parameter):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| id | UUID | YES | 550e8400-e29b-41d4-a716-446655440000 |

### Input (Request Body - JSON) - All Optional:
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

### Input Fields - All Optional:
| Field | Type | Min-Max | Default | Validation |
|-------|------|---------|---------|-----------|
| advance_booking_days | Integer | 10-90 | 30 | Must be between 10-90 |
| min_booking_notice_period | Integer | 0-360 | 60 | Minutes, 0-360 range |
| cancellation_window_hours | Integer | 0-168 | 24 | Hours, 0-168 range |
| followup_time | TIME | HH:MM:SS | 09:00 | Format: HH:MM:SS (e.g., "14:30:00") |
| ai_agent_enabled | Boolean | - | true | true or false |
| ai_agent_languages | Array | - | ["en-IN"] | Array of language codes (e.g., ["en-IN", "hi-IN"]) |
| whatsapp_number | String | 10-15 digits | null | Only digits, 10-15 chars |
| logo_url | String | URL | null | Must be valid HTTPS URL |
| price_per_appointment | Decimal | >= 0 | 0 | Decimal number (e.g., 750.00) |

### Request Example:
```javascript
const clinicId = "550e8400-e29b-41d4-a716-446655440000";

const response = await fetch(
  `http://localhost:4002/api/clinics/${clinicId}/settings`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advance_booking_days: 45,
      min_booking_notice_period: 120,
      cancellation_window_hours: 48,
      followup_time: "10:30:00",
      ai_agent_enabled: false,
      ai_agent_languages: ["en-IN", "hi-IN"],
      whatsapp_number: "9999999999",
      logo_url: "https://example.com/new-logo.png",
      price_per_appointment: 750.00
    })
  }
);

const result = await response.json();
```

### Output (Response) - Updated Settings:
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

### Output Fields:
```
id                          → Settings record ID (never changes)
clinic_id                   → Associated clinic ID
advance_booking_days        → Updated value (10-90)
min_booking_notice_period   → Updated value in minutes
cancellation_window_hours   → Updated value in hours
followup_time               → Updated time in HH:MM:SS format
ai_agent_enabled            → Updated boolean value
ai_agent_languages          → Updated language array
whatsapp_number             → Updated WhatsApp number
logo_url                    → Updated logo URL
price_per_appointment       → Updated price
```

---

## ❌ Error Responses

### When Clinic Not Found (404):
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

### When Missing Required Parameter (400):
```json
{
  "success": false,
  "error": "Clinic name is required"
}
```

### When Server Error (500):
```json
{
  "success": false,
  "error": "Database connection error"
}
```

---

## 📊 API Comparison Table

| API | Method | Purpose | Input | Output |
|-----|--------|---------|-------|--------|
| #1 | GET /clinics/search/by-name | Quick clinic search | name | Basic clinic info |
| #2 | GET /clinics/search/by-name/full | Full clinic settings | name | Clinic + Settings + Phones ⭐ |
| #3 | GET /clinics/:id/settings | Get by clinic ID | clinic ID | Clinic + Settings + Phones |
| #4 | PATCH /clinics/:id/settings | Update settings | clinic ID + fields | Updated settings |

---

## 🚀 Recommended Frontend Flow

```javascript
// Step 1: User enters clinic name in search box
const clinicName = "Apollo Clinic";

// Step 2: Fetch all clinic settings with one API call
const response = await fetch(
  `http://localhost:4002/api/clinics/search/by-name/full?name=${encodeURIComponent(clinicName)}`
);
const result = await response.json();

if (result.success && result.data.length > 0) {
  const { clinic, settings, phone_numbers } = result.data[0];

  // Step 3: Display clinic info (read-only)
  console.log(`Clinic: ${clinic.name}`);
  console.log(`Plan: ${clinic.subscription_plan}`);
  console.log(`Status: ${clinic.subscription_status}`);

  // Step 4: Populate editable settings form
  formData = {
    advance_booking_days: settings.advance_booking_days,
    min_booking_notice_period: settings.min_booking_notice_period,
    cancellation_window_hours: settings.cancellation_window_hours,
    followup_time: settings.followup_time,
    ai_agent_enabled: settings.ai_agent_enabled,
    ai_agent_languages: settings.ai_agent_languages,
    whatsapp_number: settings.whatsapp_number,
    logo_url: settings.logo_url,
    price_per_appointment: settings.price_per_appointment
  };

  // Step 5: When user clicks "Save", update with PATCH
  const updateResponse = await fetch(
    `http://localhost:4002/api/clinics/${clinic.id}/settings`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFormData)
    }
  );

  const updateResult = await updateResponse.json();
  if (updateResult.success) {
    console.log('Settings updated!');
  }
}
```

---

## 📝 Key Points for Frontend

1. **Use API #2** (`/clinics/search/by-name/full`) - Gets everything in one call
2. **Search is case-insensitive** - "apollo", "Apollo", "APOLLO" all work
3. **Partial matching** - "Apollo" returns all clinics with "Apollo" in name
4. **All settings are optional** - Send only the fields you want to update
5. **Phone numbers are auto-fetched** - Multiple phone numbers per clinic
6. **Time format** - Use HH:MM:SS (e.g., "14:30:00" for 2:30 PM)
7. **Language array** - Use language codes like "en-IN", "hi-IN", "ta-IN"
8. **URLs must be HTTPS** - logo_url must start with "https://"

---

## 🔗 API Endpoints Summary

```
GET  /clinics/search/by-name?name=Apollo
     └─ Returns: Basic clinic info only

GET  /clinics/search/by-name/full?name=Apollo
     └─ Returns: Clinic + Settings + Phone Numbers (USE THIS!)

GET  /clinics/:id/settings
     └─ Returns: Clinic + Settings + Phone Numbers (by ID)

PATCH /clinics/:id/settings
     └─ Updates: Clinic settings only
     └─ Takes: Optional settings fields
     └─ Returns: Updated settings
```

---

**Ready to implement!** Use API #2 for best results. 🎉
