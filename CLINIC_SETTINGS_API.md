# Clinic Settings API Documentation

This document describes the API endpoints for reading and updating clinic settings in the Auvia Backend.
Settings cover core booking behaviour, AI persona & voice, Meta/WhatsApp credentials, payment gateway keys, and telephony configuration.

---

## 1. Database Schema (`clinic_settings` Table)

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | UUID | `gen_random_uuid()` | Primary key |
| `clinic_id` | UUID | — | Foreign key → `clinics.id` |
| **Core Booking** | | | |
| `advance_booking_days` | INTEGER | — | How many days ahead patients can book |
| `min_booking_notice_period` | INTEGER | — | Minimum notice (minutes) required before an appointment |
| `cancellation_window_hours` | INTEGER | — | How many hours before the appointment cancellation is allowed |
| `followup_time` | INTEGER | — | Follow-up reminder interval (minutes) |
| `ai_agent_enabled` | BOOLEAN | — | Whether the AI voice/chat agent is active |
| `ai_agent_languages` | TEXT[] | — | Array of language codes the agent supports (e.g. `["en","hi"]`) |
| `whatsapp_number` | VARCHAR | — | Clinic's customer-facing WhatsApp number |
| `logo_url` | TEXT | — | URL to the clinic logo image |
| `price_per_appointment` | NUMERIC | — | Price charged per appointment (INR) |
| `is_slots_needed` | BOOLEAN | — | `true` = slot-based booking, `false` = token-based booking |
| **AI Persona & Voice** | | | |
| `system_prompt` | TEXT | — | System prompt used to configure the AI agent's personality and instructions |
| `agent_name` | VARCHAR(100) | `'Anjali'` | Display name of the AI agent |
| `greeting_text` | TEXT | `'Hello! How can I help you today?'` | Opening message spoken/sent by the agent |
| **Meta / WhatsApp Integration** | | | |
| `meta_access_token` | TEXT | — | Meta (Facebook) permanent access token for the WhatsApp Business API |
| `meta_phone_number_id` | VARCHAR(100) | — | Phone Number ID from Meta Business Manager |
| `whatsapp_verify_token` | VARCHAR(255) | — | Webhook verification token used during Meta webhook setup |
| **Payment Gateway** | | | |
| `payment_provider` | VARCHAR(50) | `'razorpay'` | Active payment provider. Allowed: `razorpay`, `payu`, `none` |
| `razorpay_key_id` | VARCHAR(255) | — | Razorpay API Key ID |
| `razorpay_key_secret` | TEXT | — | Razorpay API Key Secret |
| `razorpay_webhook_secret` | TEXT | — | Razorpay webhook signature secret |
| `payu_merchant_key` | VARCHAR(255) | — | PayU merchant key |
| `payu_merchant_salt` | TEXT | — | PayU merchant salt |
| **Telephony** | | | |
| `telephony_provider` | VARCHAR(50) | `'vobiz'` | Active telephony provider. Allowed: `vobiz`, `exotel` |
| `vobiz_auth_id` | VARCHAR(255) | — | Vobiz Auth ID |
| `vobiz_auth_token` | TEXT | — | Vobiz Auth Token |

---

## 2. Authentication

All clinic-scoped endpoints require a **Clinic JWT Token** in the `Authorization` header:

```
Authorization: Bearer <clinic_jwt_token>
```

Admin-level endpoints (e.g. `GET /admin/all`) require a **Super Admin JWT Token**.

---

## 3. Endpoint Reference

### 1. Get Clinic Settings
Returns the clinic's basic profile together with its settings and assigned phone numbers.

- **URL:** `GET /api/clinics/:id/settings`
- **Auth:** Clinic JWT or Admin JWT
- **URL Params:**
  - `id` *(required)* — UUID of the clinic

**Success Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "clinic": {
      "id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
      "name": "Sunrise Health Clinic",
      "email": "contact@sunrise.in",
      "phone": "+919876543210",
      "address": "12 MG Road",
      "city": "Bengaluru",
      "state": "Karnataka",
      "postal_code": "560001",
      "clinic_type": "general",
      "timezone": "Asia/Kolkata",
      "subscription_plan": "Growth",
      "subscription_status": "active",
      "owner_name": "Dr. Rajesh Kumar",
      "username": "sunrise_admin",
      "created_at": "2026-01-10T09:00:00.000Z",
      "updated_at": "2026-06-25T10:30:00.000Z"
    },
    "settings": {
      "id": "a1b2c3d4-...",
      "clinic_id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
      "advance_booking_days": 30,
      "min_booking_notice_period": 60,
      "cancellation_window_hours": 2,
      "followup_time": 1440,
      "ai_agent_enabled": true,
      "ai_agent_languages": ["en", "hi"],
      "whatsapp_number": "+919876543210",
      "logo_url": "https://cdn.example.com/logos/sunrise.png",
      "price_per_appointment": "500.00",
      "is_slots_needed": true,
      "system_prompt": "You are Anjali, a friendly receptionist at Sunrise Health Clinic...",
      "agent_name": "Anjali",
      "greeting_text": "Hello! Welcome to Sunrise Health Clinic. How can I help you today?",
      "meta_access_token": "EAAxxxxxx...",
      "meta_phone_number_id": "123456789012345",
      "whatsapp_verify_token": "my_secure_verify_token",
      "payment_provider": "razorpay",
      "razorpay_key_id": "rzp_live_xxxxxxxxxxxx",
      "razorpay_key_secret": "xxxxxxxxxxxxxxxxxxxxxxxx",
      "razorpay_webhook_secret": "whsec_xxxxxxxx",
      "payu_merchant_key": null,
      "payu_merchant_salt": null,
      "telephony_provider": "vobiz",
      "vobiz_auth_id": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "vobiz_auth_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    "phone_numbers": [
      {
        "id": "pn-uuid-...",
        "number": "+918012345678",
        "service_type": "inbound",
        "status": "active",
        "is_active": true
      }
    ]
  }
}
```

**Error Responses:**
| Status | Condition |
|---|---|
| `404` | Clinic not found or soft-deleted |
| `500` | Internal server error |

---

### 2. Update Clinic Settings
Partially updates any combination of clinic settings fields. Only the fields included in the request body are updated; all others retain their current values.

- **URL:** `PATCH /api/clinics/:id/settings`
- **Auth:** Clinic JWT or Admin JWT
- **URL Params:**
  - `id` *(required)* — UUID of the clinic
- **Content-Type:** `application/json`

**Request Body** *(all fields optional — send only what you want to change)*:

```json
{
  "advance_booking_days": 30,
  "min_booking_notice_period": 60,
  "cancellation_window_hours": 2,
  "followup_time": 1440,
  "ai_agent_enabled": true,
  "ai_agent_languages": ["en", "hi", "kn"],
  "whatsapp_number": "+919876543210",
  "logo_url": "https://cdn.example.com/logos/sunrise.png",
  "price_per_appointment": 500,
  "is_slots_needed": true,

  "system_prompt": "You are Anjali, a friendly and professional receptionist at Sunrise Health Clinic. Always greet the patient warmly and help them book appointments.",
  "agent_name": "Anjali",
  "greeting_text": "Hello! Welcome to Sunrise Health Clinic. How can I help you today?",

  "meta_access_token": "EAAxxxxxx...",
  "meta_phone_number_id": "123456789012345",
  "whatsapp_verify_token": "my_secure_verify_token",

  "payment_provider": "razorpay",
  "razorpay_key_id": "rzp_live_xxxxxxxxxxxx",
  "razorpay_key_secret": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "razorpay_webhook_secret": "whsec_xxxxxxxx",
  "payu_merchant_key": null,
  "payu_merchant_salt": null,

  "telephony_provider": "vobiz",
  "vobiz_auth_id": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "vobiz_auth_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Field Constraints:**

| Field | Allowed Values |
|---|---|
| `payment_provider` | `"razorpay"`, `"payu"`, `"none"` |
| `telephony_provider` | `"vobiz"`, `"exotel"` |

**Success Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "clinic_id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
    "advance_booking_days": 30,
    "min_booking_notice_period": 60,
    "cancellation_window_hours": 2,
    "followup_time": 1440,
    "ai_agent_enabled": true,
    "ai_agent_languages": ["en", "hi", "kn"],
    "whatsapp_number": "+919876543210",
    "logo_url": "https://cdn.example.com/logos/sunrise.png",
    "price_per_appointment": "500.00",
    "is_slots_needed": true,
    "system_prompt": "You are Anjali, a friendly and professional receptionist...",
    "agent_name": "Anjali",
    "greeting_text": "Hello! Welcome to Sunrise Health Clinic. How can I help you today?",
    "meta_access_token": "EAAxxxxxx...",
    "meta_phone_number_id": "123456789012345",
    "whatsapp_verify_token": "my_secure_verify_token",
    "payment_provider": "razorpay",
    "razorpay_key_id": "rzp_live_xxxxxxxxxxxx",
    "razorpay_key_secret": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "razorpay_webhook_secret": "whsec_xxxxxxxx",
    "payu_merchant_key": null,
    "payu_merchant_salt": null,
    "telephony_provider": "vobiz",
    "vobiz_auth_id": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "vobiz_auth_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Error Responses:**
| Status | Condition |
|---|---|
| `400` | Invalid enum value for `payment_provider` or `telephony_provider` |
| `404` | Clinic not found, or no settings row exists for this clinic |
| `400` | Any other validation / query error |

---

### 3. Check Slot Mode
Lightweight endpoint that returns only whether the clinic uses slot-based or token-based booking.

- **URL:** `GET /api/clinics/:id/is-slots-needed`
- **Auth:** Not required (internal/agent use)
- **URL Params:**
  - `id` *(required)* — UUID of the clinic

**Success Response `200 OK`:**
```json
{
  "success": true,
  "clinic_id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
  "is_slots_needed": true
}
```

**Error Responses:**
| Status | Condition |
|---|---|
| `404` | No settings row found for the clinic |
| `500` | Internal server error |

---

## 4. Partial Update Examples

### Update only the AI persona

```json
PATCH /api/clinics/16c585e0-.../settings

{
  "agent_name": "Priya",
  "system_prompt": "You are Priya, a calm and professional receptionist...",
  "greeting_text": "Namaste! How may I assist you today?"
}
```

### Switch payment provider to PayU

```json
PATCH /api/clinics/16c585e0-.../settings

{
  "payment_provider": "payu",
  "payu_merchant_key": "aBcDeFgH",
  "payu_merchant_salt": "supersecretSalt123"
}
```

### Configure Meta webhook credentials

```json
PATCH /api/clinics/16c585e0-.../settings

{
  "meta_access_token": "EAAxxxxxx...",
  "meta_phone_number_id": "123456789012345",
  "whatsapp_verify_token": "clinic_webhook_secret_2026"
}
```

### Switch telephony provider to Exotel

```json
PATCH /api/clinics/16c585e0-.../settings

{
  "telephony_provider": "exotel"
}
```

---

## 5. Notes

- **Partial updates:** The `PATCH` endpoint uses `COALESCE` in SQL, so fields not included in the body are **not overwritten**. You can safely send only the keys you want to change.
- **Sensitive fields:** Secrets (`razorpay_key_secret`, `razorpay_webhook_secret`, `payu_merchant_salt`, `meta_access_token`, `vobiz_auth_token`) are stored in plaintext in the database. Ensure the database and API are accessed over TLS and access is restricted.
- **Settings row creation:** A `clinic_settings` row is created automatically when a clinic is registered. You do not need to `POST` to create settings — only `PATCH` to update them.
- **`GET /:id/settings`** returns the full row via `SELECT *`, so any future columns added to the table will automatically appear in the response without code changes.
