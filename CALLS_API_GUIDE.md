# Calls API Integration Guide

## Quick Start

All requests require **JWT authentication** in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

All calls are associated with the authenticated clinic via the JWT token.

---

## 1. Calls API Endpoints

### Overview
Fetch, create, and manage call records for your clinic. Tracks incoming/outgoing calls handled by AI agents or humans, including duration and AI-generated summaries.

---

### 1.1 Get All Calls

**Endpoint:** `GET /api/calls`

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clinic_id` | UUID | ✅ Yes | - | The clinic ID (must match authenticated clinic) |
| `type` | string | ❌ No | - | Filter by type: `incoming`, `outgoing` |
| `agent_type` | string | ❌ No | - | Filter by agent: `ai`, `human` |
| `start_date` | YYYY-MM-DD | ❌ No | - | Filter calls from this date onwards |
| `end_date` | YYYY-MM-DD | ❌ No | - | Filter calls up to this date |
| `page` | number | ❌ No | 1 | Page number for pagination |
| `limit` | number | ❌ No | 20 | Items per page (max recommended: 50) |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/calls?clinic_id=abc123&type=incoming&agent_type=ai&start_date=2026-03-01&end_date=2026-03-31&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "call-550e8400-e29b-41d4-a716-446655440000",
      "clinic_id": "abc123def456",
      "time": "2026-03-15T14:30:00Z",
      "type": "incoming",
      "caller": "9876543210",
      "agent_type": "ai",
      "duration": 245,
      "ai_summary": "Patient inquired about appointment availability for next week. Scheduled appointment for March 20.",
      "recording": "https://storage.example.com/calls/call-001-recording.wav",
      "created_at": "2026-03-15T14:30:00Z",
      "updated_at": "2026-03-15T14:35:00Z"
    },
    {
      "id": "call-660e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "abc123def456",
      "time": "2026-03-15T15:10:00Z",
      "type": "outgoing",
      "caller": "9876543210",
      "agent_type": "human",
      "duration": 180,
      "ai_summary": null,
      "recording": "https://storage.example.com/calls/call-002-recording.wav",
      "created_at": "2026-03-15T15:10:00Z",
      "updated_at": "2026-03-15T15:13:00Z"
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
| `data` | array | Array of call objects |
| `pagination` | object | Pagination metadata |

**Call Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Call record ID |
| `clinic_id` | UUID | Clinic ID |
| `time` | ISO 8601 | Call timestamp |
| `type` | string | Call direction: `incoming`, `outgoing` |
| `caller` | string | Phone number or identifier of caller |
| `agent_type` | string | `ai` or `human` |
| `duration` | number | Call duration in seconds |
| `ai_summary` | string | AI-generated summary (nullable) |
| `recording` | string | URL to call recording (nullable) |
| `created_at` | ISO 8601 | Record creation timestamp |
| `updated_at` | ISO 8601 | Last update timestamp |

**Error Responses:**

```json
// 400 - Missing required parameter
{
  "success": false,
  "error": "clinic_id query param required"
}

// 403 - Clinic ID mismatch
{
  "success": false,
  "error": "Forbidden"
}

// 401 - Invalid token
{
  "success": false,
  "error": "Invalid token"
}
```

---

### 1.2 Get Single Call Details

**Endpoint:** `GET /api/calls/:id`

**Authentication:** Required (JWT Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✅ Yes | The call ID |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/calls/call-550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "call-550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "abc123def456",
    "time": "2026-03-15T14:30:00Z",
    "type": "incoming",
    "caller": "9876543210",
    "agent_type": "ai",
    "duration": 245,
    "ai_summary": "Patient inquired about appointment availability for next week. Scheduled appointment for March 20.",
    "recording": "https://storage.example.com/calls/call-001-recording.wav",
    "created_at": "2026-03-15T14:30:00Z",
    "updated_at": "2026-03-15T14:35:00Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Call not found"
}
```

---

### 1.3 Create Call Record

**Endpoint:** `POST /api/calls`

**Authentication:** Required (JWT Bearer token)

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | ✅ Yes | - | `incoming` or `outgoing` |
| `caller` | string | ✅ Yes | - | Phone number or identifier |
| `agent_type` | string | ❌ No | ai | `ai` or `human` |
| `duration` | number | ❌ No | 0 | Duration in seconds |
| `ai_summary` | string | ❌ No | null | AI-generated summary |
| `recording` | string | ❌ No | null | URL to recording (must be HTTPS) |

**Validation Rules:**
- `type` must be: `incoming` or `outgoing`
- `agent_type` must be: `ai` or `human`
- `duration` must be >= 0
- `recording` must be valid HTTPS URL if provided

**Example Request:**
```bash
curl -X POST "http://localhost:4002/api/calls" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "incoming",
    "caller": "9876543210",
    "agent_type": "ai",
    "duration": 245,
    "ai_summary": "Patient inquired about appointment availability for next week. Scheduled appointment for March 20.",
    "recording": "https://storage.example.com/calls/call-001-recording.wav"
  }'
```

**Example Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "call-550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "abc123def456",
    "time": "2026-03-15T14:30:00Z",
    "type": "incoming",
    "caller": "9876543210",
    "agent_type": "ai",
    "duration": 245,
    "ai_summary": "Patient inquired about appointment availability for next week. Scheduled appointment for March 20.",
    "recording": "https://storage.example.com/calls/call-001-recording.wav",
    "created_at": "2026-03-15T14:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 - Missing required fields
{
  "success": false,
  "error": "type and caller are required"
}

// 400 - Invalid type
{
  "success": false,
  "error": "Invalid type. Allowed: incoming, outgoing"
}

// 400 - Invalid agent_type
{
  "success": false,
  "error": "Invalid agent_type. Allowed: ai, human"
}
```

---

### 1.4 Update Call Details

**Endpoint:** `PATCH /api/calls/:id`

**Authentication:** Required (JWT Bearer token)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | ✅ Yes | The call ID |

**Request Body (all optional):**

| Field | Type | Description |
|-------|------|-------------|
| `duration` | number | Updated call duration in seconds |
| `ai_summary` | string | Updated AI summary |
| `recording` | string | Recording URL (must be HTTPS) |

**Example Request:**
```bash
curl -X PATCH "http://localhost:4002/api/calls/call-550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 250,
    "ai_summary": "Updated summary with more details"
  }'
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "call-550e8400-e29b-41d4-a716-446655440000",
    "clinic_id": "abc123def456",
    "time": "2026-03-15T14:30:00Z",
    "type": "incoming",
    "caller": "9876543210",
    "agent_type": "ai",
    "duration": 250,
    "ai_summary": "Updated summary with more details",
    "recording": "https://storage.example.com/calls/call-001-recording.wav",
    "created_at": "2026-03-15T14:30:00Z",
    "updated_at": "2026-03-15T14:40:00Z"
  }
}
```

**Error Responses:**

```json
// 404 - Call not found
{
  "success": false,
  "error": "Call not found"
}

// 400 - No fields to update
{
  "success": false,
  "error": "No fields to update"
}
```

---

### 1.5 Get Call Statistics

**Endpoint:** `GET /api/calls/stats/summary`

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | YYYY-MM-DD | ❌ No | Filter stats from this date |
| `end_date` | YYYY-MM-DD | ❌ No | Filter stats up to this date |

**Example Request:**
```bash
curl -X GET "http://localhost:4002/api/calls/stats/summary?start_date=2026-03-01&end_date=2026-03-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_calls": 156,
    "incoming_calls": 94,
    "outgoing_calls": 62,
    "ai_calls": 120,
    "human_calls": 36,
    "avg_duration": "187.50",
    "total_duration": 29250,
    "last_call_time": "2026-03-31T23:45:00Z",
    "first_call_time": "2026-03-01T08:15:00Z"
  }
}
```

**Stats Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `total_calls` | number | Total number of calls |
| `incoming_calls` | number | Total incoming calls |
| `outgoing_calls` | number | Total outgoing calls |
| `ai_calls` | number | Calls handled by AI agent |
| `human_calls` | number | Calls handled by humans |
| `avg_duration` | string | Average call duration in seconds |
| `total_duration` | number | Total duration of all calls in seconds |
| `last_call_time` | ISO 8601 | Timestamp of most recent call |
| `first_call_time` | ISO 8601 | Timestamp of first call in range |

---

## 2. Frontend Integration Examples

### 2.1 React Example - Fetch All Calls

```javascript
// Fetch calls for a clinic
async function fetchCalls(clinicId, filters = {}) {
  const params = new URLSearchParams({
    clinic_id: clinicId,
    ...filters,
  });

  const response = await fetch(
    `http://localhost:4002/api/calls?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calls');
  }

  return response.json();
}

// Usage
const calls = await fetchCalls('abc123', {
  type: 'incoming',
  agent_type: 'ai',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
  page: 1,
  limit: 20,
});

console.log(`Total calls: ${calls.pagination.total}`);
calls.data.forEach(call => {
  console.log(`${call.type} - ${call.caller} - ${call.duration}s`);
});
```

### 2.2 React Example - Create Call Record

```javascript
// Create a new call record
async function createCall(clinicId, callData) {
  const response = await fetch(
    `http://localhost:4002/api/calls`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Usage
const newCall = await createCall('abc123', {
  type: 'incoming',
  caller: '9876543210',
  agent_type: 'ai',
  duration: 245,
  ai_summary: 'Patient inquiry about appointments',
  recording: 'https://storage.example.com/call-001.wav'
});

console.log('Call created:', newCall.data.id);
```

### 2.3 React Hook - Fetch Calls with Loading State

```javascript
import { useState, useEffect } from 'react';

function useCalls(clinicId, filters = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCalls = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          clinic_id: clinicId,
          ...filters,
        });

        const response = await fetch(
          `http://localhost:4002/api/calls?${params}`,
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

    fetchCalls();
  }, [clinicId, filters]);

  return { data, pagination, loading, error };
}

// Usage in Component
function CallsList() {
  const { data, pagination, loading, error } = useCalls('abc123', {
    sort: 'incoming',
  });

  if (loading) return <div>Loading calls...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Calls ({pagination?.total})</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Caller</th>
            <th>Agent</th>
            <th>Duration</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {data.map(call => (
            <tr key={call.id}>
              <td>{new Date(call.time).toLocaleString()}</td>
              <td>{call.type}</td>
              <td>{call.caller}</td>
              <td>{call.agent_type}</td>
              <td>{call.duration}s</td>
              <td>{call.ai_summary?.substring(0, 50)}...</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Page {pagination?.page} of {pagination?.totalPages}</p>
    </div>
  );
}
```

### 2.4 React Component - Call Statistics Dashboard

```javascript
import { useState, useEffect } from 'react';

function CallStatistics({ clinicId, startDate, endDate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        const response = await fetch(
          `http://localhost:4002/api/calls/stats/summary?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${getToken()}`,
            },
          }
        );

        const result = await response.json();
        setStats(result.data);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [clinicId, startDate, endDate]);

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No data</div>;

  const avgMinutes = Math.floor(stats.avg_duration / 60);

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <h3>Total Calls</h3>
        <p className="big-number">{stats.total_calls}</p>
      </div>

      <div className="stat-card">
        <h3>Incoming vs Outgoing</h3>
        <p>📞 Incoming: {stats.incoming_calls}</p>
        <p>📤 Outgoing: {stats.outgoing_calls}</p>
      </div>

      <div className="stat-card">
        <h3>AI vs Human</h3>
        <p>🤖 AI: {stats.ai_calls}</p>
        <p>👤 Human: {stats.human_calls}</p>
      </div>

      <div className="stat-card">
        <h3>Duration Stats</h3>
        <p>⏱️ Average: {avgMinutes}m {stats.avg_duration % 60}s</p>
        <p>📊 Total: {Math.floor(stats.total_duration / 60)}m</p>
      </div>
    </div>
  );
}
```

---

## 3. Common Use Cases

### 3.1 Display Call Log with Filters

```javascript
function CallLogPage() {
  const [filters, setFilters] = useState({
    type: 'incoming',
    agent_type: 'ai',
  });

  const { data, pagination } = useCalls('abc123', filters);

  return (
    <div>
      <h1>Call Log</h1>

      {/* Filters */}
      <select
        value={filters.type}
        onChange={(e) => setFilters({...filters, type: e.target.value})}
      >
        <option value="">All Types</option>
        <option value="incoming">Incoming</option>
        <option value="outgoing">Outgoing</option>
      </select>

      {/* Call List */}
      <CallsList calls={data} />

      {/* Pagination */}
      <Pagination {...pagination} />
    </div>
  );
}
```

### 3.2 Calculate Call Metrics

```javascript
async function getCallMetrics(clinicId, startDate, endDate) {
  const response = await fetch(
    `http://localhost:4002/api/calls/stats/summary?start_date=${startDate}&end_date=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    }
  );

  const result = await response.json();
  const stats = result.data;

  return {
    totalCalls: stats.total_calls,
    incomingRate: (stats.incoming_calls / stats.total_calls * 100).toFixed(1),
    aiRate: (stats.ai_calls / stats.total_calls * 100).toFixed(1),
    avgDurationMinutes: Math.floor(stats.avg_duration / 60),
  };
}
```

### 3.3 Playback Call Recording

```javascript
function CallRecordingPlayer({ call }) {
  if (!call.recording) {
    return <p>No recording available</p>;
  }

  return (
    <div>
      <h3>Call Recording</h3>
      <audio controls>
        <source src={call.recording} type="audio/wav" />
        Your browser does not support the audio element.
      </audio>
      <p>Duration: {Math.floor(call.duration / 60)}m {call.duration % 60}s</p>
    </div>
  );
}
```

---

## 4. Database Queries Reference

To check data in your database:

```sql
-- Check all calls for a clinic
SELECT * FROM calls WHERE clinic_id = 'your-clinic-id' ORDER BY time DESC LIMIT 20;

-- Get call statistics
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE type = 'incoming') as incoming,
  COUNT(*) FILTER (WHERE type = 'outgoing') as outgoing,
  COUNT(*) FILTER (WHERE agent_type = 'ai') as ai,
  COUNT(*) FILTER (WHERE agent_type = 'human') as human,
  AVG(duration) as avg_duration
FROM calls
WHERE clinic_id = 'your-clinic-id';

-- Get calls for a date range
SELECT * FROM calls
WHERE clinic_id = 'your-clinic-id'
  AND DATE(time) BETWEEN '2026-03-01' AND '2026-03-31'
ORDER BY time DESC;
```

---

## 5. Error Handling Best Practices

```javascript
async function safeCallsEndpoint(endpoint, options = {}) {
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
        // Token expired
        redirectToLogin();
        return null;
      }

      if (response.status === 403) {
        showError('You do not have permission to access these calls');
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

## 6. Performance Optimization

- Use pagination: default 20, max 50 items per page
- Filter by date range to reduce result set
- Cache call statistics (update every 5-10 minutes)
- Implement debouncing for filter changes
- Lazy load call recordings (don't auto-play)

---

## Need Help?

Refer to the error messages returned by the API for specific issues. Common problems:

1. **Empty call list** → Check database has calls for your clinic
2. **Invalid token** → Re-authenticate and get new JWT token
3. **Forbidden error** → Ensure clinic_id matches your authenticated clinic
4. **Invalid filters** → Check allowed values (type: incoming/outgoing, agent_type: ai/human)

Happy integrating! 🚀
