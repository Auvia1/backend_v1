# Call Cost Breakdown API Documentation

This document describes the API endpoints and database schema for the Call Cost Breakdown system in the Auvia Backend. This system tracks detailed resource costs (STT, TTS, LLM inputs/outputs, telephony, and WhatsApp) and handles billing/credit deductions for completed calls.

---

## 1. Database Schema (`call_cost_breakdown` Table)

The `call_cost_breakdown` table stores cost metrics for each call. It features a denormalized `phone_number` column for fast lookups.

### Table Schema

```sql
CREATE TABLE public.call_cost_breakdown (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id            UUID UNIQUE NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    clinic_id          UUID REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number       VARCHAR(20), -- Caller phone number denormalized from calls.caller
    duration_seconds   NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    duration_minutes   NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    stt_cost           NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    stt_provider       VARCHAR(50),
    tts_cost           NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    tts_provider       VARCHAR(50),
    tts_chars          INTEGER DEFAULT 0 NOT NULL,
    llm_in_cost        NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    llm_in_tokens      INTEGER DEFAULT 0 NOT NULL,
    llm_out_cost       NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    llm_out_tokens     INTEGER DEFAULT 0 NOT NULL,
    telephony_cost     NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    telephony_provider VARCHAR(50) DEFAULT 'Exotel' NOT NULL,
    whatsapp_cost      NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    whatsapp_msg_type  VARCHAR(50),
    other_cost         NUMERIC(10,4) DEFAULT 0.0000 NOT NULL,
    total_cost         NUMERIC(10,4) GENERATED ALWAYS AS (
                           stt_cost + tts_cost + llm_in_cost + llm_out_cost + telephony_cost + whatsapp_cost + other_cost
                       ) STORED,
    cost_per_minute    NUMERIC(10,4),
    credits_billed     NUMERIC(10,2),
    balance_after      NUMERIC(12,2),
    extra_costs        JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN public.call_cost_breakdown.phone_number IS
    'Caller phone number for this call, denormalized from calls.caller for quick lookup.';
```

---

## 2. API Scope & Authentication

The endpoints are mounted at `/api/call-cost-breakdown` and are grouped into three categories:

1. **Clinic-Level APIs**
   - Requires a **Clinic JWT Token** in the `Authorization: Bearer <token>` header.
   - Authenticated using the `authenticateToken` middleware.
   - Restricts data visibility to the authenticated `clinic_id`.
   
2. **Internal / Agent APIs**
   - Typically used by backend call agents / automation processes.
   - Do not enforce clinic ownership checks but are typically called internally.
   
3. **Platform Admin APIs**
   - Requires a **Super Admin JWT Token** in the `Authorization: Bearer <token>` header.
   - Authenticated using the `authenticateAdminToken` middleware.

---

## 3. What Changed (API Update Summary)

The `phone_number` column was added to the database table and integrated across the API layer:

* **Select Queries:**
  - Added `phone_number` to all standard selects.
  - Added `cb.phone_number` to join-based selections (`SELECT_WITH_CALLER_COLS`).
* **Auto-Resolution on Creation (`POST /`):**
  - If `phone_number` is provided in the request body, it is stored.
  - If `phone_number` is omitted, the API automatically queries `calls.caller` for the matching `call_id` and saves it.
* **Partial Updates (`PATCH /:id`):**
  - Added `phone_number` to `allowedFields` to allow manual edits.
* **Auto-Resolution on Upsert (`PATCH /by-call/:call_id`):**
  - Omitted `phone_number` payloads automatically resolve the phone number from the `calls` table and store/update it.
  - Conflicts are resolved using: `phone_number = COALESCE(EXCLUDED.phone_number, call_cost_breakdown.phone_number)`.

---

## 4. Endpoint Reference

### 1. Create Call Cost Breakdown
Creates a cost breakdown record.

* **URL:** `/api/call-cost-breakdown`
* **Method:** `POST`
* **Request Body:**
  ```json
  {
    "call_id": "442dc3c5-2a86-49a8-b82f-d558b784e26d", // Required
    "clinic_id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
    "phone_number": "+1999999999", // Optional (auto-resolved from calls table if omitted)
    "duration_seconds": 120,
    "duration_minutes": 2,
    "stt_cost": 0.05,
    "stt_provider": "Deepgram",
    "tts_cost": 0.04,
    "tts_provider": "Cartesia",
    "tts_chars": 1500,
    "llm_in_cost": 0.002,
    "llm_in_tokens": 1500,
    "llm_out_cost": 0.005,
    "llm_out_tokens": 500,
    "telephony_cost": 0.15,
    "telephony_provider": "Exotel",
    "whatsapp_cost": 0.00,
    "other_cost": 0.00,
    "cost_per_minute": 0.1235,
    "credits_billed": 2.00,
    "balance_after": 48.00,
    "extra_costs": {}
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "de0011ae-3c93-4582-b523-60585d54c144",
      "call_id": "442dc3c5-2a86-49a8-b82f-d558b784e26d",
      "clinic_id": "16c585e0-76b4-4d72-91d2-9a47fb83daad",
      "phone_number": "+1999999999",
      "duration_seconds": "120.00",
      "duration_minutes": "2.00",
      "stt_cost": "0.0500",
      "stt_provider": "Deepgram",
      "tts_cost": "0.0400",
      "tts_provider": "Cartesia",
      "tts_chars": 1500,
      "llm_in_cost": "0.0020",
      "llm_in_tokens": 1500,
      "llm_out_cost": "0.0050",
      "llm_out_tokens": 500,
      "telephony_cost": "0.1500",
      "telephony_provider": "Exotel",
      "whatsapp_cost": "0.0000",
      "whatsapp_msg_type": null,
      "other_cost": "0.0000",
      "total_cost": "0.2470",
      "cost_per_minute": "0.1235",
      "credits_billed": "2.00",
      "balance_after": "48.00",
      "extra_costs": {},
      "created_at": "2026-06-21T14:08:49.128Z",
      "updated_at": "2026-06-21T14:08:49.128Z"
    }
  }
  ```

---

### 2. Upsert Call Cost Breakdown by `call_id`
Inserts or updates the breakdown by `call_id`. Useful for background tasks where the primary key `id` is not known.

* **URL:** `/api/call-cost-breakdown/by-call/:call_id`
* **Method:** `PATCH`
* **Request Body:** (Same fields as POST request, all optional)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

---

### 3. Fetch Call Cost Breakdown by `call_id`
Retrieves cost details for a single call (scoped to the authenticated clinic).

* **URL:** `/api/call-cost-breakdown/by-call/:call_id`
* **Method:** `GET`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

---

### 4. Fetch Clinic Summary (Aggregated Costs)
Retrieves sum totals and averages of STT, TTS, LLM, and telephony costs for the clinic.

* **URL:** `/api/call-cost-cost-breakdown/clinic-summary`
* **Method:** `GET`
* **Query Parameters:**
  - `start_date` (Optional, `YYYY-MM-DD`): Start filter.
  - `end_date` (Optional, `YYYY-MM-DD`): End filter.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "total_calls": 50,
      "total_cost": 12.35,
      "total_stt_cost": 2.50,
      "total_tts_cost": 2.00,
      "total_llm_in_cost": 0.85,
      "total_llm_out_cost": 1.50,
      "total_telephony_cost": 5.50,
      "total_whatsapp_cost": 0.00,
      "total_other_cost": 0.00,
      "total_credits_billed": 100.00,
      "avg_cost_per_call": 0.247,
      "avg_duration_minutes": 2.4,
      ...
    }
  }
  ```

---

### 5. List Cost Breakdowns (Paginated)
Retrieves the list of cost breakdowns for the clinic.

* **URL:** `/api/call-cost-breakdown`
* **Method:** `GET`
* **Query Parameters:**
  - `start_date` (Optional, `YYYY-MM-DD`)
  - `end_date` (Optional, `YYYY-MM-DD`)
  - `page` (Optional, default `1`)
  - `limit` (Optional, default `20`)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "de0011ae-3c93-4582-b523-60585d54c144",
        "call_id": "...",
        "phone_number": "+1999999999",
        "caller_phone": "+1999999999",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```
