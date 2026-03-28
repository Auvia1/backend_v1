# Phone Numbers APIs - Complete Guide

## Overview
- **Base URL**: `http://localhost:4002/api`
- **Endpoint**: `/phone-numbers`
- **All endpoints are PUBLIC** (no auth required)
- **All responses follow**: `{ success: true/false, data: {...}, error: "..." }`

---

## 📱 Database Table Schema

```sql
CREATE TABLE phone_numbers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  number       VARCHAR(20) NOT NULL CHECK (number ~ '^\+?[0-9 \-]{7,20}$'),
  service_type VARCHAR(100) NOT NULL DEFAULT 'Reception Line',
  status       VARCHAR(20) NOT NULL DEFAULT 'Live'
                CHECK (status IN ('Live', 'Inactive', 'Provisioning', 'Failed')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (number)
);
```

---

## 📋 API #1: Get All Phone Numbers for a Clinic

**Endpoint**: `GET /phone-numbers`

**Purpose**: Fetch all phone numbers for a specific clinic

### Input (Query Parameters):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| clinic_id | UUID | YES | 550e8400-e29b-41d4-a716-446655440000 |

### Request Example:
```javascript
const clinicId = "550e8400-e29b-41d4-a716-446655440000";
fetch(`http://localhost:4002/api/phone-numbers?clinic_id=${clinicId}`)
```

### Response (Success 200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "number": "+919876543210",
      "service_type": "Reception Line",
      "status": "Live",
      "is_active": true,
      "created_at": "2026-03-25T10:00:00Z",
      "updated_at": "2026-03-25T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "number": "+919999999999",
      "service_type": "Appointments",
      "status": "Live",
      "is_active": true,
      "created_at": "2026-03-26T14:30:00Z",
      "updated_at": "2026-03-26T14:30:00Z"
    }
  ]
}
```

### Output Fields:
```
id              → Unique phone number ID (UUID)
clinic_id       → Associated clinic ID
number          → Phone number with country code
service_type    → Type of service (Reception Line, Appointments, Emergency, etc.)
status          → Status: Live, Inactive, Provisioning, Failed
is_active       → Boolean: true/false
created_at      → When phone number was added
updated_at      → When phone number was last updated
```

---

## ➕ API #2: Create New Phone Number

**Endpoint**: `POST /phone-numbers`

**Purpose**: Add a new phone number for a clinic

### Input (Request Body - JSON):
```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "number": "+919876543210",
  "service_type": "Reception Line",
  "status": "Live",
  "is_active": true
}
```

### Input Fields - Required & Optional:
| Field | Type | Required | Default | Example | Validation |
|-------|------|----------|---------|---------|-----------|
| clinic_id | UUID | YES | - | 550e8400-e29b-41d4-a716-446655440000 | Must exist in clinics table |
| number | String | YES | - | +919876543210 | 7-20 chars, digits/spaces/hyphens/+ sign |
| service_type | String | NO | "Reception Line" | "Appointments" | Any string |
| status | String | NO | "Live" | "Inactive" | Must be: Live, Inactive, Provisioning, Failed |
| is_active | Boolean | NO | true | false | true or false |

### Request Example:
```javascript
const response = await fetch('http://localhost:4002/api/phone-numbers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clinic_id: "550e8400-e29b-41d4-a716-446655440000",
    number: "+919876543210",
    service_type: "Reception Line",
    status: "Live",
    is_active: true
  })
});
const result = await response.json();
```

### Response (Success 201):
```json
{
  "success": true,
  "data": {
    "id": "uuid-new",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "number": "+919876543210",
    "service_type": "Reception Line",
    "status": "Live",
    "is_active": true,
    "created_at": "2026-03-28T16:45:00Z",
    "updated_at": "2026-03-28T16:45:00Z"
  }
}
```

### Error Responses:

**Missing Required Fields (400)**:
```json
{
  "success": false,
  "error": "clinic_id and number are required"
}
```

**Clinic Not Found (404)**:
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

**Duplicate Phone Number (400)**:
```json
{
  "success": false,
  "error": "This phone number already exists in the system"
}
```

**Invalid Phone Format (400)**:
```json
{
  "success": false,
  "error": "Invalid phone number format. Use digits, spaces, hyphens, and optional + sign."
}
```

---

## 🔍 API #3: Get Single Phone Number

**Endpoint**: `GET /phone-numbers/:id`

**Purpose**: Get details of a specific phone number

### Input (Path Parameter):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| id | UUID | YES | uuid-1 |

### Request Example:
```javascript
fetch('http://localhost:4002/api/phone-numbers/uuid-1')
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "number": "+919876543210",
    "service_type": "Reception Line",
    "status": "Live",
    "is_active": true,
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": "2026-03-25T10:00:00Z"
  }
}
```

### Error Response (404):
```json
{
  "success": false,
  "error": "Phone number not found"
}
```

---

## ✏️ API #4: Update Phone Number

**Endpoint**: `PATCH /phone-numbers/:id`

**Purpose**: Update phone number details (service type, status, active status)

### Input (Path Parameter):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| id | UUID | YES | uuid-1 |

### Input (Request Body - JSON) - All Optional:
```json
{
  "service_type": "Emergency Line",
  "status": "Inactive",
  "is_active": false
}
```

### Input Fields:
| Field | Type | Required | Default | Example | Validation |
|-------|------|----------|---------|---------|-----------|
| service_type | String | NO | - | "Appointments" | Any string |
| status | String | NO | - | "Inactive" | Must be: Live, Inactive, Provisioning, Failed |
| is_active | Boolean | NO | - | false | true or false |

### Request Example:
```javascript
const response = await fetch('http://localhost:4002/api/phone-numbers/uuid-1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service_type: "Emergency Line",
    status: "Inactive",
    is_active: false
  })
});
const result = await response.json();
```

### Response (Success 200):
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "number": "+919876543210",
    "service_type": "Emergency Line",
    "status": "Inactive",
    "is_active": false,
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": "2026-03-28T17:30:00Z"
  }
}
```

### Error Response (404):
```json
{
  "success": false,
  "error": "Phone number not found"
}
```

---

## 🗑️ API #5: Delete Phone Number

**Endpoint**: `DELETE /phone-numbers/:id`

**Purpose**: Delete a phone number from the database

### Input (Path Parameter):
| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| id | UUID | YES | uuid-1 |

### Request Example:
```javascript
const response = await fetch('http://localhost:4002/api/phone-numbers/uuid-1', {
  method: 'DELETE'
});
const result = await response.json();
```

### Response (Success 200):
```json
{
  "success": true,
  "message": "Phone number deleted successfully"
}
```

### Error Response (404):
```json
{
  "success": false,
  "error": "Phone number not found"
}
```

---

## 💻 Frontend Implementation Example

### Add New Phone Number
```javascript
async function addPhoneNumber(clinicId, phoneData) {
  const response = await fetch('http://localhost:4002/api/phone-numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clinic_id: clinicId,
      number: phoneData.number,
      service_type: phoneData.serviceType || "Reception Line",
      status: phoneData.status || "Live",
      is_active: phoneData.isActive !== undefined ? phoneData.isActive : true
    })
  });

  const result = await response.json();
  if (result.success) {
    console.log('Phone number added:', result.data);
    return result.data;
  } else {
    console.error('Error:', result.error);
  }
}

// Usage
addPhoneNumber(
  "550e8400-e29b-41d4-a716-446655440000",
  {
    number: "+919876543210",
    serviceType: "Reception Line",
    status: "Live",
    isActive: true
  }
);
```

### Load All Phone Numbers for a Clinic
```javascript
async function loadClinicPhoneNumbers(clinicId) {
  const response = await fetch(
    `http://localhost:4002/api/phone-numbers?clinic_id=${clinicId}`
  );

  const result = await response.json();
  if (result.success) {
    result.data.forEach(phone => {
      console.log(`${phone.number} - ${phone.service_type} (${phone.status})`);
    });
    return result.data;
  } else {
    console.error('Error:', result.error);
  }
}
```

### Update Phone Number Status
```javascript
async function updatePhoneStatus(phoneId, newStatus) {
  const response = await fetch(
    `http://localhost:4002/api/phone-numbers/${phoneId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
    }
  );

  const result = await response.json();
  if (result.success) {
    console.log('Phone number updated:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}

// Usage
updatePhoneStatus('uuid-1', 'Inactive');
```

### Delete Phone Number
```javascript
async function deletePhoneNumber(phoneId) {
  const response = await fetch(
    `http://localhost:4002/api/phone-numbers/${phoneId}`,
    { method: 'DELETE' }
  );

  const result = await response.json();
  if (result.success) {
    console.log('Phone number deleted');
  } else {
    console.error('Error:', result.error);
  }
}

// Usage
deletePhoneNumber('uuid-1');
```

---

## 📊 API Endpoints Summary

| # | Method | Endpoint | Purpose | Input |
|---|--------|----------|---------|-------|
| 1 | GET | /phone-numbers | Get all for clinic | clinic_id |
| 2 | POST | /phone-numbers | Create new | clinic_id, number |
| 3 | GET | /phone-numbers/:id | Get single | phone ID |
| 4 | PATCH | /phone-numbers/:id | Update | phone ID + fields |
| 5 | DELETE | /phone-numbers/:id | Delete | phone ID |

---

## 📞 Valid Phone Number Formats

```
✅ +919876543210
✅ 9876543210
✅ +91 98765 43210
✅ 98765-43210
✅ +1-234-567-8901
✅ 7+ digits up to 20 characters
   (digits, spaces, hyphens, + sign allowed)

❌ abc123 (letters not allowed)
❌ 123 (too short, minimum 7 digits)
```

---

## 🎯 Common Status Values

| Status | Meaning |
|--------|---------|
| Live | Phone number is active and receiving calls |
| Inactive | Phone number is inactive/not in use |
| Provisioning | Phone number is being provisioned (pending) |
| Failed | Phone number provisioning failed |

---

## 🎯 Common Service Types

```
"Reception Line"
"Appointments"
"Emergency"
"Billing"
"Support"
"FAX"
"WhatsApp"
"Other"
```

---

## ⚠️ Important Notes

1. **Unique Phone Numbers**: Each phone number can only be added once (UNIQUE constraint)
2. **Clinic Required**: Phone number must belong to an existing clinic
3. **Soft Delete**: If you need to delete, use DELETE endpoint
4. **Phone Format Flexible**: Accepts various formats (with country code or without)
5. **Status Enum**: Only 4 allowed values (Live, Inactive, Provisioning, Failed)
6. **Active Flag**: `is_active` controls whether number is currently in use

---

## 🔗 Quick Copy-Paste URLs

```
Get all phone numbers for clinic:
http://localhost:4002/api/phone-numbers?clinic_id=550e8400-e29b-41d4-a716-446655440000

Create new phone number (use POST method):
http://localhost:4002/api/phone-numbers

Get single phone number:
http://localhost:4002/api/phone-numbers/uuid-1

Update phone number (use PATCH method):
http://localhost:4002/api/phone-numbers/uuid-1

Delete phone number (use DELETE method):
http://localhost:4002/api/phone-numbers/uuid-1
```

---

**Phone Numbers APIs are ready to use!** 🚀
