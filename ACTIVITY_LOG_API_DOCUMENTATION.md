# Activity Log API Documentation

**Last Updated:** April 26, 2026  
**Version:** 2.0 (REST + WebSocket Real-time Events)  
**Base URL:** `http://localhost:5000/api`

---

## Overview

The Activity Log API provides a complete audit trail and real-time event tracking system for clinics. Every significant action within the system is logged and can be retrieved via REST endpoints. Additionally, WebSocket connections enable real-time push notifications of new activity events.

### Key Features
✅ **Complete Audit Trail** - Track all clinic activities with timestamps  
✅ **Real-time WebSocket Events** - Receive activity updates instantly  
✅ **Flexible Metadata** - Store custom JSON data with each event  
✅ **Clinic-scoped Data** - All logs are isolated per clinic  
✅ **Indexed Queries** - Fast retrieval by clinic, entity, or date  

---

## Table Schema

### `activity_log` Table

```sql
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,              -- Type of event (e.g., "appointment_created")
  title       TEXT NOT NULL,                     -- Human-readable event title
  entity_type VARCHAR(50),                       -- Type of entity affected (e.g., "appointment", "doctor")
  entity_id   UUID,                              -- ID of affected entity
  user_id     UUID,                              -- ID of user who triggered event (nullable)
  meta        JSONB,                             -- Custom metadata (stored as JSON)
  created_at  TIMESTAMPTZ DEFAULT NOW()          -- Event timestamp
);

-- Indexes for performance
CREATE INDEX idx_activity_log_clinic_id  ON activity_log(clinic_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity     ON activity_log(entity_type, entity_id);
```

---

## REST API Endpoints

### 1. GET /api/activity - Fetch Activity Logs

Retrieves the most recent activity events for a clinic, sorted newest-first.

#### Request

```http
GET /api/activity?clinic_id=<UUID>&limit=20
```

**Query Parameters:**

| Parameter | Type | Required | Description | Default | Max |
|-----------|------|----------|-------------|---------|-----|
| `clinic_id` | UUID | ✅ Yes | Clinic identifier | - | - |
| `limit` | Integer | ❌ No | Max events to return | 20 | 100 |

**Headers:**
```
Content-Type: application/json
```

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
      "event_type": "appointment_created",
      "title": "Appointment created for John Doe",
      "entity_type": "appointment",
      "entity_id": "789e1234-f90c-11d3-b567-426614174999",
      "user_id": "abcd5678-e89b-12d3-a456-426614174555",
      "meta": {
        "appointment_date": "2026-04-27",
        "doctor_id": "doctor-uuid-123",
        "doctor_name": "Dr. Smith",
        "patient_phone": "+1-555-0123",
        "status": "confirmed"
      },
      "created_at": "2026-04-26T14:32:45.123Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
      "event_type": "doctor_schedule_updated",
      "title": "Doctor schedule updated",
      "entity_type": "doctor",
      "entity_id": "doctor-uuid-123",
      "user_id": "abcd5678-e89b-12d3-a456-426614174555",
      "meta": {
        "doctor_name": "Dr. Smith",
        "schedule_change": "availability from 9 AM to 6 PM",
        "change_date": "2026-04-26"
      },
      "created_at": "2026-04-26T13:15:22.456Z"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Indicates if request succeeded |
| `data` | Array | Array of activity log entries |
| `data[].id` | UUID | Unique activity event ID |
| `data[].clinic_id` | UUID | Clinic that owns this activity |
| `data[].event_type` | String | Category of event (e.g., "appointment_created", "doctor_schedule_updated") |
| `data[].title` | String | Human-readable event description |
| `data[].entity_type` | String | Type of entity affected (null if not applicable) |
| `data[].entity_id` | UUID | ID of affected entity (null if not applicable) |
| `data[].user_id` | UUID | User who triggered the event (null if system-generated) |
| `data[].meta` | Object | Custom JSON metadata specific to the event |
| `data[].created_at` | ISO 8601 | Event creation timestamp |

#### Response - Error (400 Bad Request)

Missing `clinic_id` parameter:
```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

#### Response - Error (500 Server Error)

```json
{
  "success": false,
  "error": "Database connection failed"
}
```

#### Example cURL Commands

**Fetch last 20 activities for a clinic:**
```bash
curl -X GET "http://localhost:5000/api/activity?clinic_id=123e4567-e89b-12d3-a456-426614174000&limit=20" \
  -H "Content-Type: application/json"
```

**Fetch last 50 activities:**
```bash
curl -X GET "http://localhost:5000/api/activity?clinic_id=123e4567-e89b-12d3-a456-426614174000&limit=50" \
  -H "Content-Type: application/json"
```

---

### 2. POST /api/activity - Create Activity Log Entry

Manually log an activity event. Used for tracking custom events or integrations (e.g., AI agent actions, external system updates).

#### Request

```http
POST /api/activity
Content-Type: application/json
```

**Request Body:**

```json
{
  "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
  "event_type": "appointment_created",
  "title": "New appointment booked by patient",
  "entity_type": "appointment",
  "entity_id": "789e1234-f90c-11d3-b567-426614174999",
  "user_id": "abcd5678-e89b-12d3-a456-426614174555",
  "meta": {
    "appointment_date": "2026-04-27T10:30:00Z",
    "doctor_id": "doctor-uuid-123",
    "doctor_name": "Dr. Sarah Johnson",
    "patient_id": "patient-uuid-456",
    "patient_name": "John Doe",
    "patient_phone": "+1-555-0123",
    "booking_source": "mobile_app",
    "status": "confirmed"
  }
}
```

**Request Fields:**

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `clinic_id` | UUID | ✅ Yes | Clinic identifier | Must reference existing clinic |
| `event_type` | String | ✅ Yes | Event category | 50 chars max, non-empty |
| `title` | String | ✅ Yes | Event description | Text format, non-empty |
| `entity_type` | String | ❌ No | Type of affected entity | 50 chars max (e.g., "appointment", "doctor", "patient") |
| `entity_id` | UUID | ❌ No | ID of affected entity | Must pair with `entity_type` |
| `user_id` | UUID | ❌ No | User who triggered event | Null for system-generated events |
| `meta` | Object | ❌ No | Custom JSON metadata | Any valid JSON object or null |

#### Response - Success (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "appointment_created",
    "title": "New appointment booked by patient",
    "entity_type": "appointment",
    "entity_id": "789e1234-f90c-11d3-b567-426614174999",
    "user_id": "abcd5678-e89b-12d3-a456-426614174555",
    "meta": {
      "appointment_date": "2026-04-27T10:30:00Z",
      "doctor_id": "doctor-uuid-123",
      "doctor_name": "Dr. Sarah Johnson",
      "patient_id": "patient-uuid-456",
      "patient_name": "John Doe",
      "patient_phone": "+1-555-0123",
      "booking_source": "mobile_app",
      "status": "confirmed"
    },
    "created_at": "2026-04-26T15:45:30.789Z"
  }
}
```

#### Response - Error (400 Bad Request)

Missing required fields:
```json
{
  "success": false,
  "error": "clinic_id, event_type, and title are required"
}
```

Invalid event_type (empty string):
```json
{
  "success": false,
  "error": "event_type cannot be empty"
}
```

#### Response - Error (500 Server Error)

```json
{
  "success": false,
  "error": "Database connection error"
}
```

#### Example cURL Commands

**Create appointment event:**
```bash
curl -X POST "http://localhost:5000/api/activity" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "appointment_created",
    "title": "Appointment created for John Doe",
    "entity_type": "appointment",
    "entity_id": "789e1234-f90c-11d3-b567-426614174999",
    "user_id": "abcd5678-e89b-12d3-a456-426614174555",
    "meta": {
      "doctor_name": "Dr. Smith",
      "appointment_date": "2026-04-27"
    }
  }'
```

**Create doctor schedule update event:**
```bash
curl -X POST "http://localhost:5000/api/activity" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "doctor_schedule_updated",
    "title": "Doctor schedule changed",
    "entity_type": "doctor",
    "entity_id": "doctor-uuid-123",
    "user_id": "clinic-admin-uuid",
    "meta": {
      "doctor_name": "Dr. Smith",
      "old_hours": "9AM-5PM",
      "new_hours": "10AM-6PM",
      "effective_date": "2026-04-27"
    }
  }'
```

**Create system event (no user):**
```bash
curl -X POST "http://localhost:5000/api/activity" \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "automated_reminder_sent",
    "title": "Appointment reminder sent to patients",
    "meta": {
      "reminder_type": "sms",
      "patients_count": 5,
      "sent_at": "2026-04-26T14:00:00Z"
    }
  }'
```

---

## WebSocket Real-time Events

Enable real-time activity notifications by connecting to the WebSocket endpoint. New activity events are broadcast to all connected clients immediately.

### Connection

**Endpoint:** `ws://localhost:5000/ws`

**Browser Example:**
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5000/ws');

// Listen for messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'activity') {
    console.log('New activity:', message.data);
    // Update UI with new activity
  }
};

// Handle connection close
ws.onclose = () => {
  console.log('Disconnected from activity stream');
};
```

### Event Format

```json
{
  "type": "activity",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "123e4567-e89b-12d3-a456-426614174000",
    "event_type": "appointment_created",
    "title": "New appointment booked",
    "entity_type": "appointment",
    "entity_id": "789e1234-f90c-11d3-b567-426614174999",
    "user_id": "abcd5678-e89b-12d3-a456-426614174555",
    "meta": {
      "doctor_name": "Dr. Smith",
      "appointment_date": "2026-04-27"
    },
    "created_at": "2026-04-26T15:45:30.789Z"
  }
}
```

### Node.js WebSocket Client Example

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('Connected to activity stream');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'activity') {
    console.log('Activity:', message.data.title);
    console.log('Event type:', message.data.event_type);
    console.log('Time:', message.data.created_at);
  }
});

ws.on('close', () => {
  console.log('Connection closed');
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

---

## Common Event Types

### Appointment Events

```javascript
// Event: Appointment Created
{
  "event_type": "appointment_created",
  "title": "Appointment created for John Doe",
  "entity_type": "appointment",
  "meta": {
    "appointment_date": "2026-04-27T10:30:00Z",
    "doctor_id": "doctor-123",
    "doctor_name": "Dr. Smith",
    "patient_id": "patient-456",
    "patient_name": "John Doe",
    "booking_method": "mobile_app|phone|kiosk"
  }
}

// Event: Appointment Completed
{
  "event_type": "appointment_completed",
  "title": "Appointment marked as completed",
  "entity_type": "appointment",
  "meta": {
    "doctor_name": "Dr. Smith",
    "patient_name": "John Doe",
    "appointment_date": "2026-04-27",
    "duration_minutes": 30
  }
}

// Event: Appointment Cancelled
{
  "event_type": "appointment_cancelled",
  "title": "Appointment cancelled",
  "entity_type": "appointment",
  "meta": {
    "reason": "Patient requested cancellation",
    "doctor_name": "Dr. Smith",
    "patient_name": "John Doe",
    "appointment_date": "2026-04-27"
  }
}
```

### Doctor Events

```javascript
// Event: Doctor Schedule Updated
{
  "event_type": "doctor_schedule_updated",
  "title": "Doctor schedule changed",
  "entity_type": "doctor",
  "meta": {
    "doctor_name": "Dr. Smith",
    "old_hours": "9AM-5PM",
    "new_hours": "10AM-6PM",
    "effective_date": "2026-04-27"
  }
}

// Event: Doctor Time-off Added
{
  "event_type": "doctor_timeoff_added",
  "title": "Dr. Smith is on time-off",
  "entity_type": "doctor",
  "meta": {
    "doctor_name": "Dr. Smith",
    "start_date": "2026-04-27",
    "end_date": "2026-05-03",
    "reason": "Vacation"
  }
}
```

### Payment Events

```javascript
// Event: Payment Received
{
  "event_type": "payment_received",
  "title": "Payment received from patient",
  "entity_type": "payment",
  "meta": {
    "patient_name": "John Doe",
    "amount": 500,
    "currency": "USD",
    "payment_method": "card",
    "appointment_date": "2026-04-27"
  }
}

// Event: Payment Failed
{
  "event_type": "payment_failed",
  "title": "Payment processing failed",
  "entity_type": "payment",
  "meta": {
    "patient_name": "John Doe",
    "amount": 500,
    "error": "Card declined",
    "retry_count": 1
  }
}
```

### System Events

```javascript
// Event: Automated Reminder Sent
{
  "event_type": "automated_reminder_sent",
  "title": "Appointment reminders sent",
  "meta": {
    "reminder_type": "sms",
    "patients_count": 5,
    "sent_at": "2026-04-26T14:00:00Z"
  }
}

// Event: Bulk Appointment Import
{
  "event_type": "bulk_import_completed",
  "title": "Bulk appointment import completed",
  "meta": {
    "total_appointments": 50,
    "successful": 48,
    "failed": 2,
    "duration_seconds": 15
  }
}
```

---

## Usage Examples

### Example 1: Monitor Activity in Real-time

**Frontend Code:**
```javascript
// Connect to activity stream
const activityStream = new WebSocket('ws://localhost:5000/ws');

activityStream.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  if (type === 'activity') {
    // Add to activity feed UI
    addActivityToFeed({
      title: data.title,
      time: new Date(data.created_at),
      eventType: data.event_type
    });
    
    // Show notification
    showNotification(data.title);
  }
};
```

### Example 2: Fetch Activity History

**React Component:**
```javascript
import { useEffect, useState } from 'react';

export function ActivityLog({ clinicId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/activity?clinic_id=${clinicId}&limit=50`)
      .then(res => res.json())
      .then(({ data }) => {
        setActivities(data);
        setLoading(false);
      });
  }, [clinicId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="activity-log">
      {activities.map(activity => (
        <div key={activity.id} className="activity-item">
          <span className="title">{activity.title}</span>
          <span className="time">
            {new Date(activity.created_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Log Custom Event from Backend

**Node.js/Express:**
```javascript
const axios = require('axios');

// After an appointment is created
app.post('/api/appointments', async (req, res) => {
  try {
    const appointment = await createAppointment(req.body);
    
    // Log activity
    await axios.post('http://localhost:5000/api/activity', {
      clinic_id: req.body.clinic_id,
      event_type: 'appointment_created',
      title: `Appointment created for ${appointment.patient_name}`,
      entity_type: 'appointment',
      entity_id: appointment.id,
      user_id: req.user.id,
      meta: {
        doctor_name: appointment.doctor_name,
        appointment_date: appointment.date,
        status: 'confirmed'
      }
    });
    
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Performance & Optimization

### Query Indexes

The following indexes are created for optimal query performance:

```sql
-- Fast clinic-based queries
CREATE INDEX idx_activity_log_clinic_id ON activity_log(clinic_id);

-- Fast date range queries (newest first)
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Fast entity-based queries
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
```

### Pagination Strategy

For large activity volumes, implement offset-based pagination:

```javascript
// Fetch page 2 (items 21-40)
GET /api/activity?clinic_id=<id>&limit=20&offset=20
```

**Alternative: Cursor-based pagination (for scalability):**
```javascript
// Fetch activities created before this timestamp
GET /api/activity?clinic_id=<id>&limit=20&before=2026-04-26T14:00:00Z
```

### Data Retention

For production, implement a retention policy:
```sql
-- Archive activities older than 90 days
DELETE FROM activity_log 
WHERE created_at < NOW() - INTERVAL '90 days'
AND archived = true;
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Activity retrieved or created |
| 400 | Bad Request | Missing `clinic_id` parameter |
| 404 | Not Found | (Reserved for future use) |
| 500 | Server Error | Database connection failure |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Errors

**Missing required field:**
```json
{
  "success": false,
  "error": "clinic_id, event_type, and title are required"
}
```

**Invalid clinic_id:**
```json
{
  "success": false,
  "error": "clinic_id query param required"
}
```

**Database error:**
```json
{
  "success": false,
  "error": "Database connection error"
}
```

---

## Best Practices

### 1. Event Type Naming
Use lowercase with underscores for event types:
```javascript
// ✅ Good
"appointment_created"
"doctor_schedule_updated"

// ❌ Avoid
"AppointmentCreated"
"Doctor Schedule Updated"
```

### 2. Title Format
Use human-readable, action-oriented titles:
```javascript
// ✅ Good
"Appointment created for John Doe"
"Dr. Smith's schedule updated"

// ❌ Poor
"New activity"
"Event occurred"
```

### 3. Metadata Structure
Keep metadata organized and flat (avoid deep nesting):
```javascript
// ✅ Good
{
  "meta": {
    "doctor_name": "Dr. Smith",
    "patient_name": "John Doe",
    "status": "confirmed"
  }
}

// ❌ Poor
{
  "meta": {
    "appointment": {
      "details": {
        "doctor": {
          "name": "Dr. Smith"
        }
      }
    }
  }
}
```

### 4. Timestamps
Always use ISO 8601 format:
```javascript
// ✅ Good
"2026-04-26T15:45:30.789Z"

// ❌ Avoid
"April 26, 2026"
"1461598930"
```

### 5. WebSocket Connection Management
```javascript
// ✅ Handle reconnection
function connectActivityStream() {
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  ws.onclose = () => {
    setTimeout(() => connectActivityStream(), 3000);
  };
}

// ❌ Don't leave connections hanging
ws.onclose = () => { /* do nothing */ };
```

### 6. Limit Activity Fetches
```javascript
// ✅ Good - paginate for performance
GET /api/activity?clinic_id=<id>&limit=50

// ❌ Avoid - fetching all activities
GET /api/activity?clinic_id=<id>&limit=10000
```

---

## Troubleshooting

### Issue: Activities not appearing in real-time

**Solution:** Ensure WebSocket connection is established:
```javascript
if (ws.readyState === 1) {
  console.log('WebSocket connected');
} else {
  console.log('WebSocket not connected');
}
```

### Issue: clinic_id validation fails

**Solution:** Verify the clinic exists and is valid UUID format:
```javascript
// Check clinic_id is valid UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log(uuidRegex.test(clinicId)); // Should be true
```

### Issue: Metadata not stored correctly

**Solution:** Ensure meta is valid JSON and serializable:
```javascript
// ✅ Correct
const meta = { doctor: "Smith", date: "2026-04-27" };
JSON.stringify(meta); // Works

// ❌ Wrong - circular reference
const meta = { self: meta };
JSON.stringify(meta); // Fails
```

---

## Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/activity` | GET | Fetch recent activities for a clinic |
| `/api/activity` | POST | Create new activity log entry |
| `ws://localhost:5000/ws` | WebSocket | Real-time activity stream |

---

## Related Documentation

- [`COMPREHENSIVE_API_DOCUMENTATION.md`](./COMPREHENSIVE_API_DOCUMENTATION.md) - Full API reference
- [`APPOINTMENT_CREATION_PREVENTION.md`](./APPOINTMENT_CREATION_PREVENTION.md) - Appointment logic
- [`DOCTOR_MANAGEMENT_API.md`](./DOCTOR_MANAGEMENT_API.md) - Doctor APIs
