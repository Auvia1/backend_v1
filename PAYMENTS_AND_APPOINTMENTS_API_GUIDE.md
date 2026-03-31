# Frontend API Integration Guide - Payments & Doctor Appointments

## Quick Start

All requests require **JWT authentication** in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Payments API

### Overview
Fetch all payment records for a clinic with filtering, sorting, and pagination capabilities.

---

### 1.1 Get All Payments

**Endpoint:** `GET /api/payments`

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clinic_id` | UUID | ✅ Yes | - | The clinic ID to fetch payments for |
| `status` | string | ❌ No | - | Filter by status: `pending`, `paid`, `failed`, `refunded` |
| `start_date` | YYYY-MM-DD | ❌ No | - | Filter payments from this date onwards |
| `end_date` | YYYY-MM-DD | ❌ No | - | Filter payments up to this date |
| `page` | number | ❌ No | 1 | Page number for pagination |
| `limit` | number | ❌ No | 20 | Items per page (max recommended: 50) |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/payments?clinic_id=abc123&status=paid&start_date=2026-03-01&end_date=2026-03-31&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "abc123def456",
      "appointment_id": "appt-001",
      "amount": 500.00,
      "currency": "INR",
      "status": "paid",
      "provider": "razorpay",
      "provider_payment_id": "pay_29QQoUBi66xm2f",
      "created_at": "2026-03-15T10:30:00Z",
      "appointment_start": "2026-03-15T14:00:00Z",
      "appointment_end": "2026-03-15T14:30:00Z",
      "patient_name": "John Doe",
      "patient_phone": "9876543210",
      "doctor_name": "Dr. Sarah Smith",
      "doctor_speciality": "Cardiologist"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "abc123def456",
      "appointment_id": "appt-002",
      "amount": 750.00,
      "currency": "INR",
      "status": "paid",
      "provider": "stripe",
      "provider_payment_id": "ch_1234567890",
      "created_at": "2026-03-16T15:45:00Z",
      "appointment_start": "2026-03-16T09:00:00Z",
      "appointment_end": "2026-03-16T09:30:00Z",
      "patient_name": "Jane Smith",
      "patient_phone": "9123456789",
      "doctor_name": "Dr. Rajesh Kumar",
      "doctor_speciality": "Dermatologist"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data` | array | Array of payment objects |
| `pagination` | object | Pagination metadata |
| `pagination.page` | number | Current page |
| `pagination.limit` | number | Items per page |
| `pagination.total` | number | Total payment count |
| `pagination.totalPages` | number | Total number of pages |

**Payment Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Payment record ID |
| `clinic_id` | UUID | Clinic ID |
| `appointment_id` | UUID | Associated appointment ID |
| `amount` | number | Payment amount |
| `currency` | string | Currency code (e.g., "INR") |
| `status` | string | Payment status: pending, paid, failed, refunded |
| `provider` | string | Payment provider (e.g., razorpay, stripe) |
| `provider_payment_id` | string | Payment ID from provider |
| `created_at` | ISO 8601 | Payment creation timestamp |
| `appointment_start` | ISO 8601 | Appointment start time |
| `appointment_end` | ISO 8601 | Appointment end time |
| `patient_name` | string | Patient's full name |
| `patient_phone` | string | Patient's phone number |
| `doctor_name` | string | Doctor's full name |
| `doctor_speciality` | string | Doctor's specialization |

**Error Responses:**

```json
// 400 - Missing required parameter
{
  "success": false,
  "error": "clinic_id query param required"
}

// 403 - Clinic ID mismatch (user trying to access another clinic's data)
{
  "success": false,
  "error": "Forbidden"
}

// 401 - Invalid or missing token
{
  "success": false,
  "error": "Invalid token"
}

// 500 - Server error
{
  "success": false,
  "error": "Database connection error"
}
```

---

### 1.2 Get Single Payment Details

**Endpoint:** `GET /api/payments/:id`

**Authentication:** Required (JWT Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✅ Yes | The payment ID |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/payments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "abc123def456",
    "appointment_id": "appt-001",
    "amount": 500.00,
    "currency": "INR",
    "status": "paid",
    "provider": "razorpay",
    "provider_payment_id": "pay_29QQoUBi66xm2f",
    "created_at": "2026-03-15T10:30:00Z",
    "appointment_start": "2026-03-15T14:00:00Z",
    "appointment_end": "2026-03-15T14:30:00Z",
    "patient_name": "John Doe",
    "patient_phone": "9876543210",
    "doctor_name": "Dr. Sarah Smith",
    "doctor_speciality": "Cardiologist"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Payment not found"
}
```

---

### 1.3 Create Payment Record

**Endpoint:** `POST /api/payments`

**Authentication:** Required (JWT Bearer token)

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `appointment_id` | UUID | ✅ Yes | - | ID of the appointment |
| `amount` | number | ✅ Yes | - | Payment amount |
| `currency` | string | ❌ No | INR | Currency code |
| `status` | string | ❌ No | pending | Status: pending, paid, failed, refunded |
| `provider` | string | ❌ No | null | Payment provider name |
| `provider_payment_id` | string | ❌ No | null | Payment ID from provider |

**Example Request:**
```bash
curl -X POST "http://localhost:4002/api/payments" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "appt-001",
    "amount": 500.00,
    "currency": "INR",
    "status": "paid",
    "provider": "razorpay",
    "provider_payment_id": "pay_29QQoUBi66xm2f"
  }'
```

**Example Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "abc123def456",
    "appointment_id": "appt-001",
    "amount": 500.00,
    "currency": "INR",
    "status": "paid",
    "provider": "razorpay",
    "provider_payment_id": "pay_29QQoUBi66xm2f",
    "created_at": "2026-03-15T10:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 - Missing required fields
{
  "success": false,
  "error": "appointment_id and amount are required"
}

// 404 - Appointment not found
{
  "success": false,
  "error": "Appointment not found"
}

// 403 - User accessing different clinic
{
  "success": false,
  "error": "Forbidden"
}
```

---

## 2. Doctor Appointments API

### Overview
Fetch all appointments for a specific doctor with filtering, sorting, and pagination.

---

### 2.1 Get Doctor's Appointments

**Endpoint:** `GET /api/doctors/:doctor_id/appointments`

**Authentication:** Required (JWT Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctor_id` | UUID | ✅ Yes | The doctor ID |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clinic_id` | UUID | ✅ Yes | - | The clinic ID (context) |
| `status` | string | ❌ No | - | Filter by status: `pending`, `confirmed`, `completed`, `cancelled`, `no_show`, `rescheduled` |
| `start_date` | YYYY-MM-DD | ❌ No | - | Filter appointments from this date onwards |
| `end_date` | YYYY-MM-DD | ❌ No | - | Filter appointments up to this date |
| `patient_id` | UUID | ❌ No | - | Filter by specific patient |
| `page` | number | ❌ No | 1 | Page number for pagination |
| `limit` | number | ❌ No | 20 | Items per page (max recommended: 50) |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/doctors/doc-001/appointments?clinic_id=abc123&status=completed&start_date=2026-03-01&end_date=2026-03-31&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "appt-001",
      "clinic_id": "abc123def456",
      "patient_id": "pat-001",
      "doctor_id": "doc-001",
      "appointment_start": "2026-03-15T14:00:00Z",
      "appointment_end": "2026-03-15T14:30:00Z",
      "reason": "Routine checkup",
      "notes": "Patient complained of mild headaches",
      "status": "completed",
      "source": "manual",
      "payment_status": "unpaid",
      "payment_amount": 500.00,
      "created_at": "2026-03-10T09:15:00Z",
      "updated_at": "2026-03-15T14:45:00Z",
      "patient_name": "John Doe",
      "patient_phone": "9876543210",
      "patient_email": "john.doe@example.com",
      "doctor_name": "Dr. Sarah Smith",
      "doctor_speciality": "Cardiologist"
    },
    {
      "id": "appt-002",
      "clinic_id": "abc123def456",
      "patient_id": "pat-002",
      "doctor_id": "doc-001",
      "appointment_start": "2026-03-14T10:30:00Z",
      "appointment_end": "2026-03-14T11:00:00Z",
      "reason": "Follow-up consultation",
      "notes": null,
      "status": "completed",
      "source": "agent",
      "payment_status": "paid",
      "payment_amount": 750.00,
      "created_at": "2026-03-12T14:20:00Z",
      "updated_at": "2026-03-14T11:15:00Z",
      "patient_name": "Jane Smith",
      "patient_phone": "9123456789",
      "patient_email": "jane.smith@example.com",
      "doctor_name": "Dr. Sarah Smith",
      "doctor_speciality": "Cardiologist"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data` | array | Array of appointment objects |
| `pagination` | object | Pagination metadata |
| `pagination.page` | number | Current page |
| `pagination.limit` | number | Items per page |
| `pagination.total` | number | Total appointment count |
| `pagination.totalPages` | number | Total number of pages |

**Appointment Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Appointment ID |
| `clinic_id` | UUID | Clinic ID |
| `patient_id` | UUID | Patient ID |
| `doctor_id` | UUID | Doctor ID |
| `appointment_start` | ISO 8601 | Appointment start time (UTC) |
| `appointment_end` | ISO 8601 | Appointment end time (UTC) |
| `reason` | string | Reason for appointment |
| `notes` | string | Clinical notes (nullable) |
| `status` | string | Status: pending, confirmed, completed, cancelled, no_show, rescheduled |
| `source` | string | Booking source: manual, agent |
| `payment_status` | string | Payment status: unpaid, paid |
| `payment_amount` | number | Amount charged for appointment |
| `created_at` | ISO 8601 | Appointment creation timestamp |
| `updated_at` | ISO 8601 | Last update timestamp |
| `patient_name` | string | Patient's full name |
| `patient_phone` | string | Patient's phone number |
| `patient_email` | string | Patient's email address |
| `doctor_name` | string | Doctor's full name |
| `doctor_speciality` | string | Doctor's specialization |

**Error Responses:**

```json
// 400 - Missing required parameter
{
  "success": false,
  "error": "clinic_id query param required"
}

// 400 - Invalid status filter
{
  "success": false,
  "error": "Invalid status. Allowed: pending, confirmed, completed, cancelled, no_show, rescheduled"
}

// 401 - Invalid or missing token
{
  "success": false,
  "error": "Invalid token"
}

// 500 - Server error
{
  "success": false,
  "error": "Doctor appointments fetch error: ..."
}
```

---

## 3. Frontend Integration Examples

### 3.1 React Example - Fetch Payments

```javascript
// Fetch payments for a clinic
async function fetchPayments(clinicId, filters = {}) {
  const params = new URLSearchParams({
    clinic_id: clinicId,
    ...filters,
  });

  const response = await fetch(
    `http://localhost:4002/api/payments?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  return response.json();
}

// Usage
const payments = await fetchPayments('abc123', {
  status: 'paid',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
  page: 1,
  limit: 20,
});

console.log(`Total payments: ${payments.pagination.total}`);
console.log(`Pages: ${payments.pagination.totalPages}`);
payments.data.forEach(payment => {
  console.log(`${payment.patient_name} - ${payment.amount} ${payment.currency}`);
});
```

### 3.2 React Example - Fetch Doctor Appointments

```javascript
// Fetch appointments for a doctor
async function fetchDoctorAppointments(doctorId, clinicId, filters = {}) {
  const params = new URLSearchParams({
    clinic_id: clinicId,
    ...filters,
  });

  const response = await fetch(
    `http://localhost:4002/api/doctors/${doctorId}/appointments?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch doctor appointments');
  }

  return response.json();
}

// Usage
const appointments = await fetchDoctorAppointments('doc-001', 'abc123', {
  status: 'completed',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
});

console.log(`Completed appointments: ${appointments.pagination.total}`);
appointments.data.forEach(appt => {
  console.log(
    `${appt.patient_name} - ${new Date(appt.appointment_start).toLocaleString()}`
  );
});
```

### 3.3 React Hook - Fetch Payments with Loading State

```javascript
import { useState, useEffect } from 'react';

function usePayments(clinicId, filters = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          clinic_id: clinicId,
          ...filters,
        });

        const response = await fetch(
          `http://localhost:4002/api/payments?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();
        setData(result.data);
        setPagination(result.pagination);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [clinicId, filters]);

  return { data, pagination, loading, error };
}

// Usage
function PaymentsList() {
  const { data, pagination, loading, error } = usePayments('abc123', {
    status: 'paid',
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Payments ({pagination?.total})</h2>
      <ul>
        {data.map(payment => (
          <li key={payment.id}>
            {payment.patient_name} - {payment.amount} {payment.currency}
          </li>
        ))}
      </ul>
      <p>Page {pagination?.page} of {pagination?.totalPages}</p>
    </div>
  );
}
```

---

## 4. Common Use Cases

### 4.1 Display Payments Dashboard
```javascript
// Get all paid payments for the current month
const allPaidPayments = await fetchPayments(clinicId, {
  status: 'paid',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
});

// Calculate total revenue
const totalRevenue = allPaidPayments.data.reduce(
  (sum, payment) => sum + payment.amount,
  0
);

console.log(`Total Revenue: ₹${totalRevenue}`);
```

### 4.2 Doctor Performance Analytics
```javascript
// Get all completed appointments for a doctor in a date range
const completedAppointments = await fetchDoctorAppointments(
  doctorId,
  clinicId,
  {
    status: 'completed',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
  }
);

// Calculate metrics
const totalAppointments = completedAppointments.pagination.total;
const totalEarnings = completedAppointments.data.reduce(
  (sum, appt) => sum + (appt.payment_amount || 0),
  0
);

console.log(`Doctor ${doctorId}:`);
console.log(`- Completed: ${totalAppointments}`);
console.log(`- Earnings: ₹${totalEarnings}`);
```

### 4.3 Paginate Through Large Result Sets
```javascript
async function fetchAllPayments(clinicId, pageSize = 50) {
  let allPayments = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchPayments(clinicId, {
      page,
      limit: pageSize,
    });

    allPayments = allPayments.concat(result.data);
    hasMore = page < result.pagination.totalPages;
    page++;
  }

  return allPayments;
}
```

---

## 5. Authentication

### Getting Started with JWT Token

1. Login to get the JWT token:
```bash
curl -X POST "http://localhost:4002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "clinic_username",
    "password": "clinic_password"
  }'
```

2. Use the token in all subsequent requests:
```bash
Authorization: Bearer <your_jwt_token_here>
```

---

## 6. Error Handling Best Practices

```javascript
async function safeApiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - redirect to login
        navigateToLogin();
        return null;
      }

      if (response.status === 403) {
        // Access denied
        showError('You do not have permission to access this resource');
        return null;
      }

      const error = await response.json();
      throw new Error(error.error || 'Unknown error');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showError(error.message);
    return null;
  }
}
```

---

## 7. Rate Limiting & Performance

- Default page limit: 20 items
- Maximum recommended limit: 50 items
- Always use pagination for large datasets
- Cache results when appropriate
- Implement debouncing for filter changes

---

## Need Help?

For issues or questions:
1. Check the error message returned by the API
2. Verify your JWT token is valid and not expired
3. Ensure `clinic_id` matches your authenticated user's clinic
4. Use the provided examples as a reference

Happy coding! 🚀
