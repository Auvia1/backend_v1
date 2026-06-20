# Calls API Documentation

This document describes the API endpoints and database schema for the Calls management system in the Auvia Backend. The system tracks incoming and outgoing phone calls (AI agent or human), records audio logs, registers metadata like duration and AI-generated summaries, and tracks the credits consumed per call.

---

## 1. Database Schema (`calls` Table)

The `calls` table stores the record of each call. It is configured with multi-tenant row-level security (RLS) and links to the `clinics` table.

### Table Schema

```sql
CREATE TABLE public.calls (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    time          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    type          public.call_type_enum NOT NULL, -- Enum: 'incoming', 'outgoing'
    caller        VARCHAR(255) NOT NULL, -- Phone number or customer ID
    agent_type    public.call_agent_type_enum DEFAULT 'ai'::public.call_agent_type_enum NOT NULL, -- Enum: 'ai', 'human'
    duration      INTEGER DEFAULT 0 NOT NULL, -- Duration in seconds
    ai_summary    TEXT, -- AI-generated synthesis of call logs
    recording     TEXT, -- Audio recording URL
    credits_used  NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- Credits consumed by the call
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Constraints & Indexes
* **Check Constraints:**
  * `calls_duration_check`: `CHECK (duration >= 0)`
  * `calls_recording_check`: `CHECK (recording IS NULL OR recording ~* '^https?://.+'::text)`
* **Indexes:**
  * `idx_calls_clinic_id`: B-Tree index on `clinic_id` (improves multi-tenant isolation queries).
  * `idx_calls_time`: B-Tree index on `time DESC` (optimizes retrieval of chronological call history).
* **Triggers:**
  * `trg_calls_updated_at`: Fires `BEFORE UPDATE` to automatically execute `public.touch_updated_at()` and update the `updated_at` column.

---

## 2. Authentication & Authorization

All call endpoints require authentication. The user role dictates which set of APIs can be accessed:

1. **Clinic Admin / Receptionist APIs (`/api/calls`)**
   * Requires a **Clinic JWT Token** passed in the `Authorization: Bearer <token>` header.
   * Authentication is verified by the [authenticateToken](file:///c:/Users/Nikhi/Documents/Auvia/app/Backend/src/routes/calls.js#L9-L25) middleware, which extracts `req.clinic_id` and `req.username`.
   * Multi-tenancy is enforced: users can only fetch, create, or update calls belonging to their authenticated `clinic_id`.
   
2. **Super Admin APIs (`/api/admin/calls`)**
   * Requires a **Super Admin JWT Token** passed in the `Authorization: Bearer <token>` header.
   * Authentication is verified by the `authenticateAdminToken` middleware.
   * Provides platform-wide view across all clinics.

---

## 3. Clinic-Level APIs (`/api/calls`)

These endpoints are implemented in [src/routes/calls.js](file:///c:/Users/Nikhi/Documents/Auvia/app/Backend/src/routes/calls.js) and mounted at `/api/calls`.

### 1. Fetch Calls (Paginated & Filterable)
Retrieves the list of calls belonging to the authenticated clinic.

* **URL:** `/api/calls`
* **Method:** `GET`
* **Query Parameters:**
  * `clinic_id` (Required, `string`): Must match the authenticated clinic ID in the JWT.
  * `type` (Optional, `string`): Filter by call direction. Options: `incoming`, `outgoing`.
  * `agent_type` (Optional, `string`): Filter by agent type. Options: `ai`, `human`.
  * `start_date` (Optional, `string`): ISO Date format `YYYY-MM-DD` (inclusive start date).
  * `end_date` (Optional, `string`): ISO Date format `YYYY-MM-DD` (inclusive end date).
  * `search` (Optional, `string`): Performs fuzzy search on the `caller` field (`ILIKE %search%`).
  * `page` (Optional, `number`): Page number (defaults to `1`).
  * `limit` (Optional, `number`): Results per page (defaults to `20`).

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
        "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
        "time": "2026-06-20T08:30:00.000Z",
        "type": "incoming",
        "caller": "9876543210",
        "agent_type": "ai",
        "duration": 124,
        "ai_summary": "Patient queried about appointment scheduling.",
        "recording": "https://recordings.auvia.ai/calls/c1a89b70.mp3",
        "credits_used": "1.50",
        "created_at": "2026-06-20T08:30:05.000Z",
        "updated_at": "2026-06-20T08:32:10.000Z"
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

* **Error Responses:**
  * `400 Bad Request`: Missing `clinic_id`, or invalid `type`/`agent_type`.
  * `403 Forbidden`: Authenticated `clinic_id` in token does not match the requested `clinic_id` query param.

---

### 2. Fetch Single Call
Retrieves full details of a specific call.

* **URL:** `/api/calls/:id`
* **Method:** `GET`

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
      "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
      "time": "2026-06-20T08:30:00.000Z",
      "type": "incoming",
      "caller": "9876543210",
      "agent_type": "ai",
      "duration": 124,
      "ai_summary": "Patient queried about appointment scheduling.",
      "recording": "https://recordings.auvia.ai/calls/c1a89b70.mp3",
      "credits_used": "1.50",
      "created_at": "2026-06-20T08:30:05.000Z",
      "updated_at": "2026-06-20T08:32:10.000Z"
    }
  }
  ```

* **Error Responses:**
  * `404 Not Found`: Call does not exist, or does not belong to the authenticated clinic.

---

### 3. Create Call Record
Creates a single new call record under the authenticated clinic.

* **URL:** `/api/calls`
* **Method:** `POST`
* **Request Body:**
  ```json
  {
    "type": "incoming", // Required ('incoming' or 'outgoing')
    "caller": "9876543210", // Required
    "agent_type": "ai", // Optional (default: 'ai')
    "duration": 45, // Optional (default: 0)
    "ai_summary": "AI summary of the call", // Optional
    "recording": "https://recordings.auvia.ai/calls/rec_123.mp3" // Optional
  }
  ```

* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "f8821034-315f-4629-8739-163f820ac28c",
      "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
      "time": "2026-06-20T09:47:00.000Z",
      "type": "incoming",
      "caller": "9876543210",
      "agent_type": "ai",
      "duration": 45,
      "ai_summary": "AI summary of the call",
      "recording": "https://recordings.auvia.ai/calls/rec_123.mp3",
      "created_at": "2026-06-20T09:47:00.000Z"
    }
  }
  ```

* **Error Responses:**
  * `400 Bad Request`: Missing `type` or `caller`, or invalid `type`/`agent_type` values.

---

### 4. Create Call Records in Bulk
Inserts multiple call records at once for the authenticated clinic in a database transaction. If any call record fails validation or insertion, the entire operation is rolled back.

* **URL:** `/api/calls/bulk`
* **Method:** `POST`
* **Request Body:**
  ```json
  {
    "calls": [
      {
        "type": "incoming",
        "caller": "9876543210",
        "agent_type": "ai",
        "duration": 60,
        "ai_summary": "Query resolved"
      },
      {
        "type": "outgoing",
        "caller": "9876543211",
        "agent_type": "human",
        "duration": 180,
        "recording": "https://recordings.auvia.ai/calls/rec_out_124.mp3"
      }
    ]
  }
  ```

* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "2 call(s) created successfully",
    "data": [
      { "id": "...", "clinic_id": "...", "type": "incoming", "caller": "9876543210", ... },
      { "id": "...", "clinic_id": "...", "type": "outgoing", "caller": "9876543211", ... }
    ]
  }
  ```

* **Error Responses:**
  * `400 Bad Request`: 
    * `calls` is missing or not an array.
    * Attempting to write more than 100 calls in a single payload.
    * Missing `type` or `caller` in any item, or invalid `type`/`agent_type` values.

---

### 5. Update Call Details
Allows partial updates to a call's duration, summary, or recording after completion.

* **URL:** `/api/calls/:id`
* **Method:** `PATCH`
* **Request Body:** (at least one field must be provided)
  ```json
  {
    "duration": 150, // Optional
    "ai_summary": "Updated AI summary after post-processing.", // Optional
    "recording": "https://recordings.auvia.ai/calls/rec_final_123.mp3" // Optional
  }
  ```

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
      "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
      "time": "2026-06-20T08:30:00.000Z",
      "type": "incoming",
      "caller": "9876543210",
      "agent_type": "ai",
      "duration": 150,
      "ai_summary": "Updated AI summary after post-processing.",
      "recording": "https://recordings.auvia.ai/calls/rec_final_123.mp3",
      "created_at": "2026-06-20T08:30:05.000Z",
      "updated_at": "2026-06-20T09:50:00.000Z"
    }
  }
  ```

* **Error Responses:**
  * `400 Bad Request`: No fields provided for updates.
  * `404 Not Found`: Call does not exist, or does not belong to the authenticated clinic.

---

### 6. Get Clinic Call Statistics Summary
Aggregates call metrics for the authenticated clinic.

* **URL:** `/api/calls/stats/summary`
* **Method:** `GET`
* **Query Parameters:**
  * `start_date` (Optional): ISO Date format `YYYY-MM-DD`.
  * `end_date` (Optional): ISO Date format `YYYY-MM-DD`.

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "total_calls": "150",
      "incoming_calls": "90",
      "outgoing_calls": "60",
      "ai_calls": "130",
      "human_calls": "20",
      "avg_duration": "104.25",
      "total_duration": "15638",
      "last_call_time": "2026-06-20T09:12:00.000Z",
      "first_call_time": "2026-06-01T10:00:00.000Z"
    }
  }
  ```

> [!WARNING]
> **Routing Collision Alert (Developer Note):**
> In the current implementation of [src/routes/calls.js](file:///c:/Users/Nikhi/Documents/Auvia/app/Backend/src/routes/calls.js), the route `GET /:id` is registered *before* `GET /stats/summary`. 
> Consequently, requests to `/api/calls/stats/summary` are incorrectly intercepted by the `GET /:id` handler where `id` is parsed as the string `"stats"`. Because `"stats"` is not a valid UUID format, the PostgreSQL query throws an exception, resulting in a `500 Internal Server Error`.
> To resolve this, `router.get("/stats/summary", ...)` must be re-ordered above `router.get("/:id", ...)` in the router definitions.

---

## 4. Super Admin APIs (`/api/admin/calls`)

These endpoints are implemented in [src/routes/admin.js](file:///c:/Users/Nikhi/Documents/Auvia/app/Backend/src/routes/admin.js) under the prefix `/api/admin`. They provide platform-wide administrative functions.

### 1. Global Call Statistics Breakdown
Retrieves global platform statistics for all calls and gives a detailed credit/call volume breakdown grouped by clinic.

* **URL:** `/api/admin/calls/stats`
* **Method:** `GET`
* **Query Parameters:**
  * `start_date` (Optional): ISO Date format `YYYY-MM-DD`.
  * `end_date` (Optional): ISO Date format `YYYY-MM-DD`.

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "total_calls": 5000,
        "total_credits_consumed": 7500.5,
        "avg_credits_per_call": 1.5,
        "avg_duration": 120.4,
        "total_duration": 602000
      },
      "breakdown_by_clinic": [
        {
          "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
          "clinic_name": "Apollo Clinic",
          "total_calls": 1200,
          "total_credits_consumed": 1800,
          "total_duration": 144000
        }
      ]
    }
  }
  ```

---

### 2. Fetch All Calls (Cross-Clinic)
List calls from all clinics in the system, with administrative filters.

* **URL:** `/api/admin/calls`
* **Method:** `GET`
* **Query Parameters:**
  * `clinic_id` (Optional): Filter by a specific clinic's UUID.
  * `agent_type` (Optional): Filter by agent: `ai`, `human`.
  * `start_date` (Optional): ISO Date format `YYYY-MM-DD`.
  * `end_date` (Optional): ISO Date format `YYYY-MM-DD`.
  * `page` (Optional): Page number (defaults to `1`).
  * `limit` (Optional): Items per page (defaults to `20`).

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
        "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
        "clinic_name": "Apollo Clinic",
        "time": "2026-06-20T08:30:00.000Z",
        "type": "incoming",
        "caller": "9876543210",
        "agent_type": "ai",
        "duration": 124,
        "credits_used": "1.50",
        "ai_summary": "Summary...",
        "recording": "...",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "pagination": { ... }
  }
  ```

---

### 3. Fetch Single Call Detail (Cross-Clinic)
Gets the full profile of any call record including its associated clinic name and credit transactions.

* **URL:** `/api/admin/calls/:call_id`
* **Method:** `GET`

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
      "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
      "clinic_name": "Apollo Clinic",
      "time": "2026-06-20T08:30:00.000Z",
      "type": "incoming",
      "caller": "9876543210",
      "agent_type": "ai",
      "duration": 124,
      "credits_used": "1.50",
      "ai_summary": "Query resolved",
      "recording": "https://recordings.auvia.ai/calls/c1a89b70.mp3",
      "created_at": "2026-06-20T08:30:05.000Z",
      "updated_at": "2026-06-20T08:32:10.000Z"
    }
  }
  ```

---

### 4. Fetch All Recordings
Lists only the calls that have audio recordings available.

* **URL:** `/api/admin/recordings`
* **Method:** `GET`
* **Query Parameters:**
  * `clinic_id` (Optional): Filter by clinic UUID.
  * `start_date` (Optional): ISO Date.
  * `end_date` (Optional): ISO Date.
  * `page`/`limit`: Pagination control.

---

### 5. Fetch Recording Detail
Gets the audio recording URL and metadata of a specific call.

* **URL:** `/api/admin/recordings/:call_id`
* **Method:** `GET`

* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1a89b70-1793-4de7-91f1-28564b19a1db",
      "clinic_id": "8b512c14-5d9c-45fb-a5d6-0cb7f240ef41",
      "clinic_name": "Apollo Clinic",
      "recording": "https://recordings.auvia.ai/calls/c1a89b70.mp3",
      "duration": 124,
      "caller": "9876543210",
      "agent_type": "ai",
      "time": "2026-06-20T08:30:00.000Z"
    }
  }
  ```
