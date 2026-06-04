# Credit Management & Admin Dashboard API Documentation

This document describes the API endpoints for the new Credit Management system (including Razorpay integration), Agent call logic, Admin Dashboard reporting, and Frontend clinic credit summaries.

---

## 1. Credit Management APIs

**Base URL:** `/api/credits`

### 1.1. Get Credit Balance
Fetch the current credit balance and low-credit status for a specific clinic.

- **URL:** `/api/credits/balance/:clinic_id`
- **Method:** `GET`
- **Auth Required:** Yes (Clinic JWT)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "balance": 150.50,
    "low_credit_threshold": 50,
    "is_low": false
  }
}
```

---

### 1.2. Adjust Credits (Manual Override)
Manually add or subtract credits. Restricted to superadmins.

- **URL:** `/api/credits/adjust`
- **Method:** `POST`
- **Auth Required:** Yes (Admin JWT with `superadmin` role)

#### Request Body
```json
{
  "clinic_id": "uuid-of-clinic",
  "amount": 100, // Positive to add, negative to subtract
  "description": "Refund for failed call" // Optional
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Credits adjusted successfully",
  "data": {
    "clinic_id": "uuid-of-clinic",
    "adjustment": 100,
    "new_balance": 250.50
  }
}
```

---

### 1.3. Create Razorpay Order
Initiates a credit purchase. Returns a Razorpay order ID to be used by the frontend checkout.

- **URL:** `/api/credits/create-order`
- **Method:** `POST`
- **Auth Required:** Yes (Clinic JWT)

#### Request Body
```json
{
  "clinic_id": "uuid-of-clinic",
  "package_id": "uuid-of-credit-package"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_Kw...",
    "amount": 9900, // In paise (e.g., 9900 = ₹99.00)
    "currency": "INR",
    "package_name": "Starter",
    "credits": 100,
    "key_id": "rzp_test_..." // Razorpay Key ID for frontend
  }
}
```

---

### 1.4. Verify Payment
Called by the frontend after a successful Razorpay checkout to verify the signature and add credits to the clinic's balance.

- **URL:** `/api/credits/verify-payment`
- **Method:** `POST`
- **Auth Required:** Yes (Clinic JWT)

#### Request Body
```json
{
  "razorpay_order_id": "order_Kw...",
  "razorpay_payment_id": "pay_Kw...",
  "razorpay_signature": "a1b2c3d4..."
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Payment verified and credits added",
  "data": {
    "credits_added": 100,
    "new_balance": 250.50
  }
}
```

---

### 1.5. Razorpay Webhook
Fallback mechanism for Razorpay to notify the server of successful payments (e.g., if the user closes the browser before frontend verification).

- **URL:** `/api/credits/webhook`
- **Method:** `POST`
- **Auth Required:** No (Verified via `x-razorpay-signature` header)

#### Expected Event
`payment.captured`

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Payment processed via webhook"
}
```

---

### 1.6. Get Credit Transactions
Paginated list of all credit movements (recharges, deductions, adjustments) for a clinic.

- **URL:** `/api/credits/transactions/:clinic_id`
- **Method:** `GET`
- **Auth Required:** Yes (Clinic JWT)
- **Query Params:**
  - `type` (optional): `recharge`, `deduction`, `adjustment`
  - `start_date` (optional): `YYYY-MM-DD`
  - `end_date` (optional): `YYYY-MM-DD`
  - `page` (optional): Default 1
  - `limit` (optional): Default 20

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "type": "recharge",
      "amount": "100.00",
      "balance_after": "250.50",
      "reference_id": "payment-uuid",
      "description": "Credit recharge via Razorpay",
      "created_at": "2026-06-03T10:00:00.000Z"
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

---

### 1.7. Get Payment History
Paginated list of all Razorpay payment attempts for a clinic.

- **URL:** `/api/credits/payments/:clinic_id`
- **Method:** `GET`
- **Auth Required:** Yes (Clinic JWT)
- **Query Params:**
  - `status` (optional): `pending`, `success`, `failed`
  - `start_date`, `end_date`, `page`, `limit`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "razorpay_order_id": "order_Kw...",
      "razorpay_payment_id": "pay_Kw...",
      "amount": "99.00",
      "currency": "INR",
      "credits_purchased": "100.00",
      "status": "success",
      "created_at": "2026-06-03T10:00:00.000Z",
      "updated_at": "2026-06-03T10:05:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 2. Agent APIs

**Base URL:** `/api/agent`

### 2.1. Check Credits
Called by the agent before starting a call to ensure the clinic has sufficient balance.

- **URL:** `/api/agent/check-credits`
- **Method:** `POST`
- **Auth Required:** Yes (Clinic JWT)

#### Request Body
```json
{
  "clinic_id": "uuid-of-clinic",
  "required_credits": 1 // Minimum credits needed to start the call
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "current_balance": 150.50,
    "required": 1
  }
}
```

---

### 2.2. Deduct Credits
Called by the agent after a call ends to deduct credits based on the call duration. Uses `Math.ceil()` to round up minutes (e.g., 1.2 mins = 2 credits).

- **URL:** `/api/agent/deduct-credits`
- **Method:** `POST`
- **Auth Required:** Yes (Clinic JWT)

#### Request Body
```json
{
  "clinic_id": "uuid-of-clinic",
  "call_id": "uuid-of-call",
  "duration_minutes": 2.5
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Credits deducted successfully",
  "data": {
    "credits_deducted": 3,
    "duration_minutes": 2.5,
    "new_balance": 147.50,
    "is_low": false
  }
}
```

---

## 3. Admin Dashboard APIs

**Base URL:** `/api/admin`
*All routes require Admin JWT (`Authorization: Bearer <token>`)*

### 3.1. Get Calls Statistics
Aggregated stats for calls, with optional date filtering.

- **URL:** `/api/admin/calls/stats`
- **Method:** `GET`
- **Query Params:** `start_date`, `end_date`

#### Success Response (200 OK)
Returns overall `summary` and `breakdown_by_clinic`.

---

### 3.2. Get All Calls
Paginated list of all calls across all clinics.

- **URL:** `/api/admin/calls`
- **Method:** `GET`
- **Query Params:** `clinic_id`, `agent_type`, `start_date`, `end_date`, `page`, `limit`

---

### 3.3. Get Call Detail
Single call details including recording URL.

- **URL:** `/api/admin/calls/:call_id`
- **Method:** `GET`

---

### 3.4. Get Payments Statistics
Aggregated stats for payments (revenue, credits sold).

- **URL:** `/api/admin/payments/stats`
- **Method:** `GET`
- **Query Params:** `start_date`, `end_date`

---

### 3.5. Get All Payments
Paginated list of all credit_payments records.

- **URL:** `/api/admin/payments`
- **Method:** `GET`
- **Query Params:** `clinic_id`, `status`, `start_date`, `end_date`, `page`, `limit`

---

### 3.6. Get Payment Detail
Single payment record details.

- **URL:** `/api/admin/payments/:payment_id`
- **Method:** `GET`

---

### 3.7. Get Recordings
Paginated list of calls that have a `recording` URL.

- **URL:** `/api/admin/recordings`
- **Method:** `GET`
- **Query Params:** `clinic_id`, `start_date`, `end_date`, `page`, `limit`

---

### 3.8. Get Recording Detail
Fetches recording information for a specific call.

- **URL:** `/api/admin/recordings/:call_id`
- **Method:** `GET`

---

### 3.9. Get Credit Overview
Overview of all clinics with their current balance, total purchased, and total consumed.

- **URL:** `/api/admin/credits/overview`
- **Method:** `GET`

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "clinic_id": "uuid",
      "clinic_name": "Demo Clinic",
      "current_balance": 150.50,
      "low_credit_threshold": 50,
      "is_low": false,
      "total_credits_purchased": 500.00,
      "total_credits_consumed": 349.50,
      "last_recharged_at": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

---

## 4. Frontend Clinic APIs

**Base URL:** `/api/clinic/credits`

### 4.1. Get Credit Summary
High-level summary for the clinic's frontend dashboard.

- **URL:** `/api/clinic/credits/summary/:clinic_id`
- **Method:** `GET`
- **Auth Required:** Yes (Clinic JWT)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "balance": 150.50,
    "last_recharged_at": "2026-06-01T10:00:00.000Z",
    "total_consumed_this_month": 45.00
  }
}
```

---

### 4.2. Get Credit Packages
Returns available credit packages to display on the pricing page.

- **URL:** `/api/clinic/credits/packages`
- **Method:** `GET`
- **Auth Required:** No (Public endpoint)

#### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Starter",
      "credits": 100,
      "price_inr": 99,
      "price_per_credit": 0.99
    }
  ]
}
```
