# Check Booking Model API

Single endpoint to fetch whether a clinic uses slot-based or token-based appointment booking.

**Last Updated:** April 14, 2026

---

## GET /api/clinics/:id/is-slots-needed

Fetch the booking model configuration for a clinic.

**URL Parameters:**
- `id` (required) - Clinic UUID

**Response (Success):**
```json
{
  "success": true,
  "clinic_id": "clinic-uuid",
  "is_slots_needed": true
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Clinic settings not found"
}
```

**Status Codes:**
- `200` - Success, booking model fetched
- `404` - Clinic settings not found
- `500` - Server error

---

## Example Requests

### Using cURL:
```bash
curl -X GET "http://localhost:5000/api/clinics/clinic-uuid/is-slots-needed" \
  -H "Authorization: Bearer your_jwt_token"
```

### Using JavaScript/Fetch:
```javascript
// Check if clinic uses slots-based or token-based booking
const response = await fetch('/api/clinics/clinic-uuid/is-slots-needed', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

if (data.success) {
  const isSlotsBased = data.is_slots_needed;

  if (isSlotsBased) {
    console.log("Clinic uses SLOT-BASED booking");
    // Show time slot selection for appointments
  } else {
    console.log("Clinic uses TOKEN-BASED booking");
    // Show token/queue-based system for appointments
  }
}
```

### Using Axios:
```javascript
try {
  const response = await axios.get(`/api/clinics/${clinicId}/is-slots-needed`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log(`Booking model: ${response.data.is_slots_needed ? 'Slots' : 'Token'}`);
} catch (error) {
  console.error('Error fetching booking model:', error);
}
```

---

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Request success status |
| clinic_id | string | UUID of the clinic |
| is_slots_needed | boolean | `true` = Slot-based booking, `false` = Token-based booking |
| error | string | Error message (only on failure) |

---

## Booking Models Explained

### Slot-Based Booking (`is_slots_needed = true`)
- Appointments are restricted to specific time slots
- Doctor schedule has fixed slot durations
- Maximum appointments per slot can be configured
- Prevents double-booking within the same time slot
- Example: Dr. Smith available 9:00-9:30, 9:30-10:00, 10:00-10:30
- Each slot has a max capacity (typically 1-3 patients per slot)
- **Use Case:** Complex procedures, consultations requiring full doctor attention

### Token-Based Booking (`is_slots_needed = false`)
- Appointments can be booked for the same time
- Patients receive token/queue numbers
- Multiple patients can have appointments at same time
- First-come-first-served queue order
- Example: Dr. Smith available 9:00-17:00, all patients get tokens in sequence
- **Use Case:** Walk-in clinics, high-volume practices, routine check-ups

---

## Frontend Integration

### Step 1: Load Clinic Settings on App Init
```javascript
async function loadClinicConfig(clinicId) {
  try {
    const response = await fetch(`/api/clinics/${clinicId}/is-slots-needed`);
    const config = await response.json();

    // Store in state/context
    localStorage.setItem('bookingModel',
      config.is_slots_needed ? 'slots' : 'tokens'
    );

    return config.is_slots_needed;
  } catch (error) {
    console.error('Failed to load clinic config:', error);
    return false; // Default to token-based
  }
}
```

### Step 2: Render Appointment UI Based on Model
```javascript
function AppointmentBooking({ clinicId, doctorId }) {
  const [isSlotsBased, setIsSlotsBased] = useState(null);

  useEffect(() => {
    loadClinicConfig(clinicId).then(setIsSlotsBased);
  }, [clinicId]);

  if (isSlotsBased === null) return <Loading />;

  if (isSlotsBased) {
    return <SlotBasedBooking doctorId={doctorId} />;
  } else {
    return <TokenBasedBooking doctorId={doctorId} />;
  }
}
```

### Step 3: Conditional API Calls
```javascript
async function createAppointment(doctorId, dateTime, patientId) {
  const isSlotsBased = localStorage.getItem('bookingModel') === 'slots';

  const payload = {
    clinic_id: clinicId,
    doctor_id: doctorId,
    patient_id: patientId,
    appointment_start: dateTime,
    appointment_end: new Date(new Date(dateTime).getTime() + 30 * 60000) // 30 min
  };

  if (isSlotsBased) {
    // For slot-based: fetch available slots first
    const slots = await fetch(`/api/doctors/${doctorId}/slots?date=${date}&clinic_id=${clinicId}`);
    // Validate slot is available
  } else {
    // For token-based: system auto-assigns token_number
    payload.source = 'patient_app';
  }

  return await fetch('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
```

---

## Real-World Scenarios

### Scenario 1: Multi-Clinic App
```javascript
// App.jsx
async function App() {
  const clinics = await fetchClinics();

  return (
    <div>
      {clinics.map(clinic => (
        <ClinicCard
          key={clinic.id}
          clinic={clinic}
          onSelectDoctor={async (doctor) => {
            // Check which booking model to use
            const config = await fetch(`/api/clinics/${clinic.id}/is-slots-needed`);
            const { is_slots_needed } = await config.json();

            if (is_slots_needed) {
              navigateTo(`/slots/${doctor.id}`);
            } else {
              navigateTo(`/queue/${doctor.id}`);
            }
          }}
        />
      ))}
    </div>
  );
}
```

### Scenario 2: Admin Dashboard
```javascript
// AdminDashboard.jsx
async function ClinicSettings({ clinicId }) {
  const [bookingModel, setBookingModel] = useState('slots');

  useEffect(() => {
    // Load current booking model
    fetch(`/api/clinics/${clinicId}/is-slots-needed`)
      .then(r => r.json())
      .then(data => setBookingModel(data.is_slots_needed ? 'slots' : 'tokens'));
  }, [clinicId]);

  return (
    <div className="settings-panel">
      <h3>Appointment Booking Model</h3>
      <p>Current: {bookingModel === 'slots' ? 'Slot-Based' : 'Token-Based'}</p>
      <p>
        {bookingModel === 'slots'
          ? 'Appointments limited to specific time slots'
          : 'Multiple patients can book same time (token queue)'}
      </p>
    </div>
  );
}
```

---

## Common Questions

**Q: When should I call this API?**
A: Call once when loading clinic/dashboard, then cache the result locally. You don't need to call it for every appointment creation.

**Q: Can the booking model change?**
A: Yes, it can be updated via PATCH /api/clinic-settings/:id. You should refresh the cached value periodically or after settings are updated.

**Q: What if is_slots_needed is null?**
A: According to the schema, it has a default value of `false`, so it should never be null. If it is, default to token-based booking.

**Q: Do I need JWT token?**
A: While not explicitly checked in the endpoint, it's best practice to include it for consistency with other APIs.

**Q: Can different doctors have different booking models?**
A: No, the booking model is per-clinic. All doctors in a clinic use the same model.

---

## Related APIs

- **GET /api/doctors/:id/schedule** - Fetch doctor's schedule (includes slot_duration_minutes)
- **GET /api/doctors/:id/slots** - Get available slots for a specific date (slot-based only)
- **POST /api/appointments** - Create appointment (respects is_slots_needed setting)
- **GET /api/clinic-settings/:id** - Full clinic settings including is_slots_needed

---

## Error Handling

```javascript
async function getBookingModel(clinicId) {
  try {
    const response = await fetch(`/api/clinics/${clinicId}/is-slots-needed`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Clinic not found or settings not configured');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.is_slots_needed;
  } catch (error) {
    console.error('Error fetching booking model:', error);
    // Default to token-based if API fails
    return false;
  }
}
```

---

## Performance Tips

1. **Cache the result** - Don't call this API repeatedly
2. **Call once per session** - Store in localStorage or state management
3. **Revalidate after settings update** - If admin changes model, refresh cache
4. **Use with clinic context** - Combine with clinic selection in your app

```javascript
// Context example
export const ClinicContext = createContext();

export function ClinicProvider({ children }) {
  const [bookingModel, setBookingModel] = useState(null);
  const [clinicId, setClinicId] = useState(null);

  const selectClinic = async (id) => {
    setClinicId(id);
    const response = await fetch(`/api/clinics/${id}/is-slots-needed`);
    const data = await response.json();
    setBookingModel(data.is_slots_needed);
  };

  return (
    <ClinicContext.Provider value={{ bookingModel, selectClinic }}>
      {children}
    </ClinicContext.Provider>
  );
}
```

---

## Testing

```bash
# Test slot-based clinic
curl -X GET "http://localhost:5000/api/clinics/clinic-slots-id/is-slots-needed" \
  -H "Authorization: Bearer token"

# Expected: { "success": true, "clinic_id": "...", "is_slots_needed": true }

# Test token-based clinic
curl -X GET "http://localhost:5000/api/clinics/clinic-tokens-id/is-slots-needed" \
  -H "Authorization: Bearer token"

# Expected: { "success": true, "clinic_id": "...", "is_slots_needed": false }
```
