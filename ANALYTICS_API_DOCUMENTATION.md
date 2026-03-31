# Analytics API Documentation

## Overview
The Analytics API provides comprehensive endpoints for tracking clinic earnings, doctor performance, and appointment statistics. All endpoints require JWT authentication and are scoped to the clinic making the request.

---

## Authentication
All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The JWT token is automatically obtained from the login response and contains the clinic_id needed for all queries.

---

## Base URL
```
http://your-backend-url/api/analytics
```

---

## Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| GET | `/earnings/week` | Total earnings for current week | ✅ Yes |
| GET | `/earnings/average` | Average earnings (with optional date range) | ✅ Yes |
| GET | `/payments/monthly` | All payments in current month with details | ✅ Yes |
| GET | `/earnings/doctor` | Doctor earnings by name or ID | ✅ Yes |
| GET | `/appointments/total` | Total appointment count with breakdown | ✅ Yes |
| GET | `/dashboard` | Combined summary with all metrics | ✅ Yes |

---

## Quick Start Guide

### 1. Get Your JWT Token
```bash
curl -X POST "http://localhost:4002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_clinic_username",
    "password": "your_clinic_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 2. Use Token in Analytics API
Store this token and include it in all analytics API requests:
```bash
curl -X GET "http://localhost:4002/api/analytics/dashboard" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Endpoints Summary (Detailed)

### 1. Weekly Earnings
**Endpoint:** `GET /earnings/week`

**Description:** Get total earnings for the current week (Sunday to Saturday)

**Required Parameters:**
- Authorization header with JWT token (implicitly provides clinic_id)

**Optional Parameters:**
- None

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/analytics/earnings/week" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "total_earning": 45000.50,
    "total_payments": 5,
    "average_payment": 9000.10,
    "period": {
      "start": "2026-03-29",
      "end": "2026-04-04"
    }
  }
}
```

**Response Fields:**
- `total_earning` (float): Sum of all paid payments for the week
- `total_payments` (integer): Count of paid payments
- `average_payment` (float): Average payment amount
- `period.start` (string): Sunday of the week (YYYY-MM-DD)
- `period.end` (string): Saturday of the week (YYYY-MM-DD)

**Error Response (400):**
```json
{
  "success": false,
  "error": "clinic_id required in auth"
}
```

---

### 2. Average Earnings
**Endpoint:** `GET /earnings/average`

**Description:** Get average earnings across all payments (optionally filtered by date range)

**Required Parameters:**
- Authorization header with JWT token

**Optional Query Parameters:**
- `start_date` (string, YYYY-MM-DD): Filter payments from this date
- `end_date` (string, YYYY-MM-DD): Filter payments until this date

**Example Request (Without Filters):**
```bash
curl -X GET "http://localhost:4002/api/analytics/earnings/average" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request (With Date Range):**
```bash
curl -X GET "http://localhost:4002/api/analytics/earnings/average?start_date=2026-03-01&end_date=2026-03-31" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "average_earning": 8500.75,
    "total_earning": 425037.50,
    "total_payments": 50,
    "min_payment": 100.00,
    "max_payment": 25000.00
  }
}
```

**Response Fields:**
- `average_earning` (float): Average amount per payment
- `total_earning` (float): Total sum of all payments
- `total_payments` (integer): Count of all payments
- `min_payment` (float): Lowest payment amount
- `max_payment` (float): Highest payment amount

---

### 3. Monthly Payments
**Endpoint:** `GET /payments/monthly`

**Description:** Get all payments for the current month with detailed information (patient, doctor, appointment details)

**Required Parameters:**
- Authorization header with JWT token

**Optional Query Parameters:**
- `status` (string): Filter by payment status (pending, paid, failed, refunded)
- `page` (integer): Page number for pagination (default: 1)
- `limit` (integer): Number of records per page (default: 50, max: 500)

**Example Request (All Payments):**
```bash
curl -X GET "http://localhost:4002/api/analytics/payments/monthly" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request (Paid Payments Only):**
```bash
curl -X GET "http://localhost:4002/api/analytics/payments/monthly?status=paid" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request (With Pagination):**
```bash
curl -X GET "http://localhost:4002/api/analytics/payments/monthly?status=paid&page=2&limit=25" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "payment_id": "450e8400-e29b-41d4-a716-446655440000",
        "amount": 500.00,
        "currency": "INR",
        "status": "paid",
        "provider": "razorpay",
        "provider_payment_id": "pay_1234567890",
        "created_at": "2026-03-15T10:30:00Z",
        "appointment": {
          "appointment_id": "550e8400-e29b-41d4-a716-446655440001",
          "appointment_start": "2026-03-15T14:00:00Z",
          "appointment_end": "2026-03-15T14:30:00Z"
        },
        "patient": {
          "patient_id": "660e8400-e29b-41d4-a716-446655440002",
          "patient_name": "Rajesh Kumar"
        },
        "doctor": {
          "doctor_id": "770e8400-e29b-41d4-a716-446655440003",
          "doctor_name": "Dr. Sarah Smith"
        }
      },
      {
        "payment_id": "451e8400-e29b-41d4-a716-446655440000",
        "amount": 750.00,
        "currency": "INR",
        "status": "paid",
        "provider": "razorpay",
        "provider_payment_id": "pay_1234567891",
        "created_at": "2026-03-20T15:45:00Z",
        "appointment": {
          "appointment_id": "551e8400-e29b-41d4-a716-446655440001",
          "appointment_start": "2026-03-20T16:00:00Z",
          "appointment_end": "2026-03-20T16:30:00Z"
        },
        "patient": {
          "patient_id": "661e8400-e29b-41d4-a716-446655440002",
          "patient_name": "Priya Sharma"
        },
        "doctor": {
          "doctor_id": "771e8400-e29b-41d4-a716-446655440003",
          "doctor_name": "Dr. John Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "pages": 1
    },
    "period": {
      "start": "2026-03-01",
      "end": "2026-03-31"
    }
  }
}
```

**Response Fields:**
- `payments` (array): List of payment objects
  - `payment_id` (string): Unique payment identifier
  - `amount` (float): Payment amount
  - `currency` (string): Currency code (e.g., INR)
  - `status` (string): Payment status (pending, paid, failed, refunded)
  - `provider` (string): Payment provider (e.g., razorpay, stripe)
  - `provider_payment_id` (string): Provider's transaction ID
  - `created_at` (string): Payment creation timestamp (ISO 8601)
  - `appointment` (object): Associated appointment details
    - `appointment_id` (string): Appointment UUID
    - `appointment_start` (string): Start time (ISO 8601)
    - `appointment_end` (string): End time (ISO 8601)
  - `patient` (object): Patient information
    - `patient_id` (string): Patient UUID
    - `patient_name` (string): Patient's full name
  - `doctor` (object): Doctor information
    - `doctor_id` (string): Doctor UUID
    - `doctor_name` (string): Doctor's full name

- `pagination` (object): Pagination details
  - `page` (integer): Current page number
  - `limit` (integer): Records per page
  - `total` (integer): Total number of payments
  - `pages` (integer): Total number of pages

- `period` (object): Month boundaries
  - `start` (string): First day of month (YYYY-MM-DD)
  - `end` (string): Last day of month (YYYY-MM-DD)

**Error Response (400):**
```json
{
  "success": false,
  "error": "clinic_id required in auth"
}
```

---

### 4. Doctor Earnings
**Endpoint:** `GET /earnings/doctor`

**Description:** Get earnings for a specific doctor (calculated as: completed_appointments × price_charged)

**Required Query Parameters:**
- `doctor_name` (string): Doctor's name (case-insensitive, supports partial match)
  - OR
- `doctor_id` (string): Doctor's UUID

**Optional Parameters:**
- None

**Example Request (By Name):**
```bash
curl -X GET "http://localhost:4002/api/analytics/earnings/doctor?doctor_name=Dr.%20Smith" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request (By ID):**
```bash
curl -X GET "http://localhost:4002/api/analytics/earnings/doctor?doctor_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
        "doctor_name": "Dr. Sarah Smith",
        "speciality": "Cardiologist",
        "price_charged": 500.00,
        "total_appointments": 8,
        "completed_appointments": 6,
        "pending_appointments": 1,
        "cancelled_appointments": 1,
        "total_payment_amount": 3000.00,
        "calculated_earning": 3000.00
      }
    ],
    "period": {
      "start": "2026-03-29",
      "end": "2026-04-04"
    }
  }
}
```

**Response Fields (per doctor):**
- `doctor_id` (string): Doctor's UUID
- `doctor_name` (string): Doctor's full name
- `speciality` (string): Doctor's medical speciality
- `price_charged` (float): Amount charged per appointment
- `total_appointments` (integer): Total appointments in week
- `completed_appointments` (integer): Completed appointments only
- `pending_appointments` (integer): Pending appointments
- `cancelled_appointments` (integer): Cancelled appointments
- `total_payment_amount` (float): Sum of payment_amount from appointments table
- `calculated_earning` (float): completed_appointments × price_charged

**Error Response (404):**
```json
{
  "success": false,
  "error": "Doctor not found"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Either doctor_name or doctor_id query param is required"
}
```

---

### 5. Total Appointments
**Endpoint:** `GET /appointments/total`

**Description:** Get total appointment count with breakdown by status

**Required Parameters:**
- Authorization header with JWT token

**Optional Query Parameters:**
- `start_date` (string, YYYY-MM-DD): Filter appointments from this date
- `end_date` (string, YYYY-MM-DD): Filter appointments until this date
- `status` (string): Filter by appointment status (pending, confirmed, completed, cancelled, no_show, rescheduled)
- `doctor_id` (string): Filter by doctor UUID

**Example Request (No Filters):**
```bash
curl -X GET "http://localhost:4002/api/analytics/appointments/total" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Request (With Filters):**
```bash
curl -X GET "http://localhost:4002/api/analytics/appointments/total?start_date=2026-03-01&end_date=2026-03-31&status=completed&doctor_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "total_appointments": 45,
    "breakdown": {
      "pending": 5,
      "confirmed": 12,
      "completed": 20,
      "cancelled": 6,
      "no_show": 1,
      "rescheduled": 1
    },
    "total_payment_amount": 22500.00
  }
}
```

**Response Fields:**
- `total_appointments` (integer): Total count of appointments matching filters
- `breakdown` (object): Count of appointments by status
  - `pending` (integer): Awaiting confirmation
  - `confirmed` (integer): Confirmed by patient/clinic
  - `completed` (integer): Completed appointments
  - `cancelled` (integer): Cancelled appointments
  - `no_show` (integer): Patient didn't show up
  - `rescheduled` (integer): Rescheduled appointments
- `total_payment_amount` (float): Sum of payment amounts for matching appointments

---

### 6. Dashboard (Combined Summary)
**Endpoint:** `GET /dashboard`

**Description:** Get complete dashboard with all key metrics at once

**Required Parameters:**
- Authorization header with JWT token

**Optional Parameters:**
- None

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/analytics/dashboard" \
  -H "Authorization: Bearer <jwt_token>"
```

**Example Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "week_earnings": 45000.50,
    "week_period": {
      "start": "2026-03-29",
      "end": "2026-04-04"
    },
    "appointments_this_week": {
      "total": 20,
      "completed": 18,
      "pending": 2
    },
    "average_earning": 8500.75,
    "top_doctors": [
      {
        "doctor_id": "550e8400-e29b-41d4-a716-446655440000",
        "doctor_name": "Dr. Sarah Smith",
        "appointments": 6,
        "earned": 3000.00
      },
      {
        "doctor_id": "660e8400-e29b-41d4-a716-446655440001",
        "doctor_name": "Dr. John Doe",
        "appointments": 5,
        "earned": 2500.00
      },
      {
        "doctor_id": "770e8400-e29b-41d4-a716-446655440002",
        "doctor_name": "Dr. Emily Brown",
        "appointments": 4,
        "earned": 2000.00
      }
    ]
  }
}
```

**Response Fields:**
- `week_earnings` (float): Total earnings for current week
- `week_period.start` (string): Week start date (YYYY-MM-DD)
- `week_period.end` (string): Week end date (YYYY-MM-DD)
- `appointments_this_week.total` (integer): Total appointments this week
- `appointments_this_week.completed` (integer): Completed appointments
- `appointments_this_week.pending` (integer): Pending appointments
- `average_earning` (float): Average earning across all-time
- `top_doctors` (array): Top 5 doctors by earnings this week
  - `doctor_id` (string): Doctor's UUID
  - `doctor_name` (string): Doctor's name
  - `appointments` (integer): Number of appointments
  - `earned` (float): Total earned (completed_appointments × price_charged)

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "clinic_id required in auth"
}
```
**Cause:** JWT token is missing or invalid

### 404 Not Found
```json
{
  "success": false,
  "error": "Doctor not found"
}
```
**Cause:** Doctor with specified name/ID doesn't exist

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database connection error"
}
```
**Cause:** Server-side error

---

## Frontend Integration Examples

### React Example - Fetch Weekly Earnings
```javascript
const fetchWeeklyEarnings = async (token) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/analytics/earnings/week`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    if (data.success) {
      console.log('Weekly Earnings:', data.data.total_earning);
    }
    return data.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### React Example - Fetch Dashboard Data
```javascript
const fetchDashboard = async (token) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/analytics/dashboard`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching dashboard:', error);
  }
};
```

### React Example - Doctor Earnings
```javascript
const fetchDoctorEarnings = async (token, doctorName) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/analytics/earnings/doctor?doctor_name=${encodeURIComponent(doctorName)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    if (data.success) {
      return data.data.doctors;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### React Example - Monthly Payments
```javascript
const fetchMonthlyPayments = async (token, status = null, page = 1, limit = 50) => {
  try {
    let url = `${process.env.REACT_APP_API_URL}/api/analytics/payments/monthly?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
  } catch (error) {
    console.error('Error fetching monthly payments:', error);
  }
};

// Usage:
// const { payments, pagination } = await fetchMonthlyPayments(token, 'paid', 1, 25);
```

### TypeScript Example - Analytics Service
```typescript
interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
}

interface WeeklyEarnings {
  total_earning: number;
  total_payments: number;
  average_payment: number;
  period: { start: string; end: string };
}

class AnalyticsService {
  private apiUrl: string;
  private token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.apiUrl}/api/analytics${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }

  getWeeklyEarnings(): Promise<WeeklyEarnings> {
    return this.fetch('/earnings/week');
  }

  getMonthlyPayments(status?: string, page = 1, limit = 50) {
    return this.fetch('/payments/monthly', { status, page, limit });
  }
}

// Usage
const analytics = new AnalyticsService(
  process.env.REACT_APP_API_URL!,
  sessionStorage.getItem('token')!
);
const earnings = await analytics.getWeeklyEarnings();
```

---

## Best Practices

### 1. Caching Strategy
```javascript
// Cache dashboard data for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedDashboard = null;
let cacheTimestamp = 0;

const getDashboard = async (token) => {
  const now = Date.now();
  if (cachedDashboard && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedDashboard;
  }

  const data = await fetch(`/api/analytics/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  cachedDashboard = await data.json();
  cacheTimestamp = now;
  return cachedDashboard;
};
```

### 2. Error Handling
```javascript
const fetchWithErrorHandling = async (token, endpoint) => {
  try {
    const response = await fetch(`/api/analytics${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - redirect to login
        window.location.href = '/login';
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      console.error('API Error:', data.error);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Fetch error:', error);
    // Show user-friendly error message
    return null;
  }
};
```

### 3. Pagination Helper
```javascript
const getAllPayments = async (token, status) => {
  let allPayments = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetch(
      `/api/analytics/payments/monthly?page=${page}&limit=100&status=${status}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    ).then(r => r.json());

    if (data.success) {
      allPayments = [...allPayments, ...data.data.payments];
      hasMore = page < data.data.pagination.pages;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allPayments;
};
```

### 4. Exporting Data to CSV
```javascript
const exportPaymentsToCSV = async (token, status) => {
  const payments = await getAllPayments(token, status);

  const headers = ['Payment ID', 'Amount', 'Status', 'Patient', 'Doctor', 'Date'];
  const rows = payments.map(p => [
    p.payment_id,
    p.amount,
    p.status,
    p.patient.patient_name,
    p.doctor.doctor_name,
    new Date(p.created_at).toLocaleDateString()
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
```

---

## Troubleshooting Guide

### Problem: "clinic_id required in auth"
**Cause:** JWT token is missing or invalid

**Solution:**
1. Ensure you're passing the token in the Authorization header
2. Check if token has expired - login again to get a new token
3. Verify header format: `Authorization: Bearer <token>` (not `Token <token>`)

### Problem: Empty response or no data
**Cause:** No data for the requested period

**Solution:**
1. Check the `period.start` and `period.end` in response
2. Verify appointments/payments exist in that date range
3. Try a wider date range using `/earnings/average?start_date=2026-01-01&end_date=2026-03-31`

### Problem: Doctor not found (404)
**Cause:** Doctor name doesn't exist or exact spelling mismatch

**Solutions:**
1. Use doctor_id instead of doctor_name for exact matching
2. Try partial name without special characters: `Dr%20Smith` instead of `Dr. Smith`
3. Check doctor is not deleted (deleted_at IS NULL)

### Problem: Slow API responses
**Solution:**
1. Use pagination with smaller `limit` values (default 50)
2. Cache frequently accessed endpoints (dashboard, weekly earnings)
3. Avoid requesting monthly payments with limit > 100 frequently
4. Consider filtering by status to reduce result set

### Problem: Payment status not filtering correctly
**Cause:** Invalid status value

**Valid statuses:**
- `pending` - Payment awaiting processing
- `paid` - Successfully paid
- `failed` - Payment failed
- `refunded` - Payment refunded

Make sure to use lowercase status values.

---

## Data Model Reference

### Payment Object
```json
{
  "payment_id": "uuid",
  "amount": 500.00,
  "currency": "INR",
  "status": "paid | pending | failed | refunded",
  "provider": "razorpay | stripe",
  "provider_payment_id": "transaction_id",
  "created_at": "2026-03-15T10:30:00Z",
  "appointment": {
    "appointment_id": "uuid",
    "appointment_start": "ISO 8601",
    "appointment_end": "ISO 8601"
  },
  "patient": {
    "patient_id": "uuid",
    "patient_name": "string"
  },
  "doctor": {
    "doctor_id": "uuid",
    "doctor_name": "string"
  }
}
```

### Doctor Earnings Object
```json
{
  "doctor_id": "uuid",
  "doctor_name": "string",
  "speciality": "string",
  "price_charged": 500.00,
  "total_appointments": 8,
  "completed_appointments": 6,
  "pending_appointments": 1,
  "cancelled_appointments": 1,
  "total_payment_amount": 3000.00,
  "calculated_earning": 3000.00
}
```

---

## Rate & Performance

### Response Times (Typical)
- `/earnings/week` - **< 100ms**
- `/earnings/average` - **< 100ms**
- `/payments/monthly` (50 records) - **< 200ms**
- `/earnings/doctor` - **< 150ms**
- `/appointments/total` - **< 100ms**
- `/dashboard` - **< 300ms**

### Recommended Refresh Intervals
- Dashboard: Every 5 minutes
- Weekly earnings: Every 1 hour
- Monthly payments: On demand (pagination)
- Doctor earnings: Every 2 hours

---

## Support & Contact

1. **Week Definition:** Weeks run from Sunday 00:00 to Saturday 23:59
2. **Payment Status:** Only payments with `status = 'paid'` are counted in earnings
3. **Doctor Earnings Formula:** `completed_appointments × doctor.price_charged`
4. **Authentication:** All endpoints require valid JWT token from login
5. **Clinic Scoping:** All data is automatically filtered to the authenticated clinic
6. **Date Format:** All dates should be in YYYY-MM-DD format
7. **Timezone:** Server uses Asia/Kolkata timezone for date calculations

---

## Rate Limiting
Currently no rate limiting is implemented, but all requests should complete within 1-2 seconds.

---

## Support & Contact

For issues or questions about the API:
- **Email:** backend-support@auvia.com
- **Slack:** #backend-api channel
- **GitHub Issues:** [Report a bug](https://github.com/auvia/backend/issues)

### Documentation Versions
- **Current Version:** 1.0 (March 2026)
- **Last Updated:** 2026-03-31
- **Maintained By:** Backend Team

### API Changelog
- **v1.0** - Initial release with 6 endpoints (week earnings, average earnings, monthly payments, doctor earnings, appointments, dashboard)
