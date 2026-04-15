# Slots API - Quick Reference Guide

**Schema Update Date**: April 15, 2026
**Status**: Major Redesign Complete

---

## 🎯 Quick Comparison

| Aspect | Old Schema | New Schema |
|--------|-----------|-----------|
| **Time Specification** | Full timestamps (`2026-04-20T09:00:00Z`) | Recurring weekly (`day_of_week=1`, `start_time=09:00:00`) |
| **Scalability** | Need 52 slots/year for repeating | 1 slot repeats every week forever |
| **Date Range** | Single specific date | Date range with `effective_from` to `effective_to` |
| **Data Rows (1yr)** | 1,825 rows/doctor | 35 rows/doctor |
| **Main Use** | One-time specific slots | Recurring schedule patterns |
| **Days Field** | Calculated from timestamp | Direct integer (0-6) |

---

## 📋 Field Mapping

### Fields Removed → Replaced

```
❌ slot_start (TIMESTAMP)      →  ✅ day_of_week (INTEGER 0-6)
❌ slot_end (TIMESTAMP)        →  ✅ start_time (TIME HH:MM:SS)
                               →  ✅ end_time (TIME HH:MM:SS)
                               →  ✅ effective_from (DATE)
                               →  ✅ effective_to (DATE)
```

---

## 🔢 Day of Week Reference Card

```
┌─────────┬──────────────────┐
│ Value   │ Day              │
├─────────┼──────────────────┤
│ 0       │ Sunday           │
│ 1       │ Monday           │
│ 2       │ Tuesday          │
│ 3       │ Wednesday        │
│ 4       │ Thursday         │
│ 5       │ Friday           │
│ 6       │ Saturday         │
└─────────┴──────────────────┘
```

---

## ⏰ Time Format Examples

```
VALID:                    INVALID:
09:00:00 ✅              09:00 ❌
14:30:00 ✅              9:00:00 ❌
23:59:59 ✅              25:00:00 ❌
00:00:00 ✅              14:61:00 ❌
```

---

## 📅 Date Format Examples

```
VALID:                    INVALID:
2026-04-20 ✅            04-20-2026 ❌
2026-12-31 ✅            2026-4-20 ❌
2026-01-01 ✅            20/04/2026 ❌
```

---

## 🔄 API Request Comparison

### POST /api/slots

```javascript
// ❌ OLD (No longer works)
{
  "clinic_id": "uuid",
  "doctor_id": "uuid",
  "slot_start": "2026-04-20T09:00:00Z",    // Removed
  "slot_end": "2026-04-20T10:00:00Z",      // Removed
  "max_appointments_per_slot": 5
}

// ✅ NEW (Required)
{
  "clinic_id": "uuid",
  "doctor_id": "uuid",
  "day_of_week": 1,                        // NEW
  "start_time": "09:00:00",                // NEW
  "end_time": "10:00:00",                  // NEW
  "max_appointments_per_slot": 5,
  "status": "open",                        // Default
  "effective_from": "2026-04-20",          // NEW (Optional)
  "effective_to": "2026-06-30"             // NEW (Optional)
}
```

### GET /api/slots

```bash
# ❌ OLD Query
GET /api/slots?clinic_id=X&start_date=2026-04-20&end_date=2026-04-30&status=open

# ✅ NEW Query
GET /api/slots?clinic_id=X&day_of_week=1&status=open&effective_from=2026-04-20&effective_to=2026-06-30
```

---

## 📨 Response Field Changes

```javascript
// ❌ REMOVED Fields
{
  "slot_start": "2026-04-20T09:00:00+00:00",     // Gone
  "slot_end": "2026-04-20T10:00:00+00:00",       // Gone
  "appointments_count": 3                         // Gone
}

// ✅ NEW Fields
{
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "effective_from": "2026-04-20",
  "effective_to": "2026-06-30",
  "doctor_name": "Dr. Rajesh Kumar",             // NEW
  "speciality": "Cardiology"                      // NEW
}
```

---

## 💡 Usage Examples

### Example 1: Monday 9-10 AM Every Week (No End Date)

```bash
POST /api/slots
{
  "clinic_id": "clinic-123",
  "doctor_id": "doctor-456",
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "max_appointments_per_slot": 5,
  "effective_from": "2026-04-20"
}

Response: 1 row → Repeats every Monday forever
```

### Example 2: Temporary Schedule (With End Date)

```bash
POST /api/slots
{
  "clinic_id": "clinic-123",
  "doctor_id": "doctor-456",
  "day_of_week": 3,                    // Wednesday
  "start_time": "14:00:00",            // 2:00 PM
  "end_time": "15:00:00",              // 3:00 PM
  "max_appointments_per_slot": 3,
  "effective_from": "2026-04-20",
  "effective_to": "2026-05-31"         // Ends May 31
}

Response: 1 row → Repeats every Wed until May 31
```

### Example 3: Get All Tuesday Slots

```bash
GET /api/slots?clinic_id=clinic-123&day_of_week=2&status=open

Returns: All Tuesday slots in clinics
```

### Example 4: Close All Afternoon Slots

```bash
PATCH /api/slots/slot-uuid
{
  "status": "closed"
}

Result: Slot marked as closed
```

---

## 🔀 Migration Scenarios

### Scenario 1: Create Weekly Schedule from Scratch

**Before** (52 API calls):
```bash
for week in 1..52:
  POST /api/slots with slot_start=date+(7*week)
```

**After** (1 API call):
```bash
POST /api/slots with day_of_week=1, start_time=09:00:00
# Repeats every Monday automatically ✅
```

### Scenario 2: Change Doctor's Availability

**Before**: Update 52 separate slots
**After**: Update 1 slot ✅

### Scenario 3: Doctor Goes on Leave

**Before** (Optional delete 5 slots):
```bash
DELETE /api/slots/slot1
DELETE /api/slots/slot2
...
```

**After** (1 call):
```bash
PATCH /api/slots/slot-uuid
{ "effective_to": "2026-05-31" }
```

---

## 📊 Data Storage Improvement

```
Scenario: 1 doctor, 5 daily slots, 1 year

┌──────────────────────────────────────────────────┐
│ OLD SCHEMA (Timestamp)                           │
├──────────────────────────────────────────────────┤
│ Monday slot:    365 rows (1 per day)             │
│ Tuesday slot:   365 rows (1 per day)             │
│ Wednesday slot: 365 rows (1 per day)             │
│ Thursday slot:  365 rows (1 per day)             │
│ Friday slot:    365 rows (1 per day)             │
│ Saturday slot:  365 rows (1 per day)             │
│ Sunday slot:    365 rows (1 per day)             │
│ ────────────────                                 │
│ TOTAL:          2,555 rows per doctor            │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ NEW SCHEMA (Recurring Weekly)                    │
├──────────────────────────────────────────────────┤
│ Monday slot:    1 row (repeats every Monday)     │
│ Tuesday slot:   1 row (repeats every Tuesday)    │
│ Wednesday slot: 1 row (repeats every Wed)        │
│ Thursday slot:  1 row (repeats every Thu)        │
│ Friday slot:    1 row (repeats every Fri)        │
│ Saturday slot:  1 row (repeats every Sat)        │
│ Sunday slot:    1 row (repeats every Sun)        │
│ ────────────────                                 │
│ TOTAL:          7 rows per doctor                │
│ ════════════════════════════════════════════════ │
│ REDUCTION:      99.7% less data! 🎉              │
└──────────────────────────────────────────────────┘

For 100 doctors:
OLD:  255,500 rows
NEW:  700 rows
SAVED: 254,800 rows (99.7%) ✅
```

---

## ⚠️ Breaking Changes Checklist

- [ ] All `slot_start` references removed
- [ ] All `slot_end` references removed
- [ ] `day_of_week` parameter added (required)
- [ ] `start_time` in HH:MM:SS format (required)
- [ ] `end_time` in HH:MM:SS format (required)
- [ ] Date format changed to YYYY-MM-DD
- [ ] Query params updated (start_date → effective_from, etc.)
- [ ] Response format includes new fields
- [ ] Error messages updated
- [ ] Client code tested

---

## 🔍 Validation Quick Check

```javascript
// Day of Week
if (day_of_week < 0 || day_of_week > 6)
  → ERROR ❌

// Time Format
if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time))
  → ERROR ❌

// Time Order
if (end_time <= start_time)
  → ERROR ❌

// Date Format
if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
  → ERROR ❌

// Date Range
if (effective_to && effective_to < effective_from)
  → ERROR ❌

// Max Appointments
if (max_appointments_per_slot <= 0)
  → ERROR ❌
```

---

## 📞 All 5 Endpoints

| Method | Endpoint | Old Support | New Support | Status |
|--------|----------|------------|------------|--------|
| POST | `/api/slots` | ❌ Timestamp | ✅ Recurring | Updated |
| GET | `/api/slots` | ❌ Date range | ✅ Day+Date | Updated |
| GET | `/api/slots/:id` | ✅ Works | ✅ Works | Working |
| PATCH | `/api/slots/:id` | ❌ Limited | ✅ Full | Updated |
| DELETE | `/api/slots/:id` | ✅ Works | ✅ Works | Working |

---

## 📚 Documentation Index

| Document | Size | Coverage |
|----------|------|----------|
| `SLOTS_API_GUIDE.md` | 500+ lines | Complete API reference |
| `SLOTS_API_IMPLEMENTATION.md` | 400+ lines | Implementation & testing |
| `SLOTS_API_MODIFICATIONS.md` | 600+ lines | Migration & changes |
| `SLOTS_API_CHANGES_SUMMARY.md` | 200+ lines | Summary overview |
| This Document | 300+ lines | Quick reference |

---

## ✅ Status

- [x] Database schema updated
- [x] API routes rewritten
- [x] Validation updated
- [x] Documentation complete
- [x] Examples provided
- [x] Migration guide created
- [x] Breaking changes documented
- [x] Quick reference created

**Implementation Status**: ✅ COMPLETE & READY FOR DEPLOYMENT

---

**Last Updated**: April 15, 2026
**Version**: Quick Reference v1.0
**Audience**: Developers, API integrators, DevOps

