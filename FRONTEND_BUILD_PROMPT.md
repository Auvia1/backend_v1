# Frontend Integration Prompt for AI Agent

Use this prompt to tell an agent to build your frontend integration:

---

## Task: Implement Frontend Integration with Clinic Registration APIs

I have a React-based frontend with a multi-step clinic registration dialog and a PostgreSQL backend with Express.js APIs. I need you to integrate the frontend with the backend APIs.

### Current Frontend Component
- **Location**: `NewClinicDialog.jsx` (7-step dialog)
  - Step 0: Basic Details (clinic name, type, address, city, state, postal, phone, email, **username, password, latitude, longitude**)
  - Step 1: Owner Details (owner name, email, phone, govt ID)
  - Step 2: Receptionist (receptionist name, email, phone, shift)
  - Step 3: Plan & Payment (plan, billing cycle, payment method, card details, GST)
  - Step 4: Documents (file uploads)
  - Step 5: Contracts (contract dates, agreement checkbox)
  - Step 6: Review (summary)

### Backend APIs Available
Detailed API documentation is in `API_DOCUMENTATION.md`. Key endpoints:

**Main Registration Endpoint:**
- **POST /api/clinics/register** - Single endpoint that creates clinic, owner, receptionist, billing, contracts, and documents in one transaction

**Supporting Endpoints:**
- POST /auth/login - Login clinic
- GET /auth/me - Get logged-in clinic info
- GET/POST/PATCH /clinics/:id - Clinic management
- GET/POST/PATCH/DELETE /users - User management
- GET/POST/PATCH /billing/:clinic_id - Billing management
- GET/POST/DELETE /documents - Document metadata
- GET/POST/PATCH /contracts/:clinic_id - Contract management

### Requirements

#### 1. Authentication Flow
- [ ] Create login page with username/password form
- [ ] Call POST /auth/login on form submit
- [ ] Store returned JWT token in localStorage
- [ ] Add Authorization header `Bearer <token>` to all authenticated requests
- [ ] Redirect to dashboard on successful login
- [ ] Show error message on failed login
- [ ] Handle token expiry (401 error) by redirecting to login

#### 2. NewClinicDialog Integration
- [ ] Add submit handler to "Finish" button on step 6 (Review)
- [ ] Collect all form data from state
- [ ] Handle file uploads (see File Upload section below)
- [ ] Send POST request to /api/clinics/register with form data
- [ ] Show loading state while submitting
- [ ] On success: Show success message and close dialog
- [ ] On error: Show error message and allow user to retry
- [ ] Store returned clinic_id for future API calls

#### 3. File Upload Handling
- [ ] Implement file upload to cloud storage (AWS S3 / Google Cloud Storage / Firebase Storage)
  - Before submitting the form, upload files from `form.documents`
  - Get URLs from cloud storage
  - Include URLs in documents array: `{ name, url, type, docType }`
- [ ] OR: Create a separate endpoint in backend for file uploads (future enhancement)
- [ ] Show upload progress
- [ ] Validate file types (PDF, images, etc.) before upload
- [ ] Handle upload errors gracefully

#### 4. User Management (after registration)
- [ ] Create Users page to list/manage clinic users
- [ ] Call GET /users?clinic_id=<clinic_id>
- [ ] Display table with: name, email, phone, role, is_active
- [ ] Add "Create User" button that opens a modal
- [ ] Form fields: name, email, phone, role dropdown, govt_id (for admins), shift_hours (for receptionists)
- [ ] Call POST /users to create new user
- [ ] Add Edit button to PATCH user details
- [ ] Add Delete button to soft-delete user

#### 5. Billing Management
- [ ] Create Billing/Settings page
- [ ] Call GET /billing/:clinic_id to load current billing info
- [ ] Form with fields: plan dropdown, billing_cycle, payment_method, card_last4, card_name, card_expiry, gst_number, monthly_amount
- [ ] **IMPORTANT**: Never ask for full card number. Only store last 4 digits.
- [ ] Show which payment provider is configured (if any)
- [ ] Call PATCH /billing/:clinic_id to update billing
- [ ] Show success/error messages

#### 6. Documents Management
- [ ] Create Documents page after clinic registration
- [ ] Call GET /documents?clinic_id=<clinic_id> to list documents
- [ ] Show table with: file_name, doc_type, file_size, upload date
- [ ] Add "Upload Document" button
- [ ] Upload files to cloud storage, then POST /documents with metadata
- [ ] Add Delete button to remove documents (calls DELETE /documents/:id)
- [ ] Show upload progress

#### 7. Contracts Management
- [ ] Create Contracts page
- [ ] Call GET /contracts/:clinic_id to load current contract
- [ ] Form with fields: contract_start (date picker), contract_end (date picker), agreement (checkbox)
- [ ] Call POST /contracts to create or PATCH /contracts/:clinic_id to update
- [ ] Show contract dates and agreement status

#### 8. Clinic Settings/Profile
- [ ] Create Clinic Settings page
- [ ] Call GET /clinics/:clinic_id to load clinic info
- [ ] Form with fields: name, email, phone, address, timezone dropdown
- [ ] Call PATCH /clinics/:id to update clinic details
- [ ] Add "Change Password" section with: current_password, new_password, confirm_password
- [ ] Call POST /clinics/:id/change-password to change password
- [ ] Show success/error messages

#### 9. Navigation & Auth State
- [ ] Create persisted auth context/store to manage:
  - Current clinic info
  - JWT token
  - User role
- [ ] Create protected routes that check if token exists and is valid
- [ ] Add logout button that clears token and redirects to login
- [ ] Show clinic name in header/navbar

#### 10. Error Handling
- [ ] Handle all error responses (400, 401, 403, 404, 500)
- [ ] Show user-friendly error messages
- [ ] Log errors to console for debugging
- [ ] Implement retry logic for failed requests (optional)
- [ ] Handle network errors gracefully

#### 11. Loading States
- [ ] Show loading spinners for API calls
- [ ] Disable buttons while loading
- [ ] Show loading state on dialogs/modals

#### 12. Form Validation
- [ ] Validate required fields before submitting
- [ ] Validate email format
- [ ] Validate phone format (10 digits for India)
- [ ] Validate GST number format (15 chars, specific pattern)
- [ ] Validate card expiry format (MM/YY)
- [ ] Show validation errors to user

### API Request/Response Examples

**Register Clinic (Full Example):**
```javascript
// POST /api/clinics/register
const response = await fetch('http://localhost:4002/api/clinics/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Credentials
    username: "apollo_clinic",
    password: "secure_password_123",

    // Step 0: Basic Details
    clinicName: "Apollo Clinic",
    clinicType: "General Practice",
    address: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    postal: "400001",
    phone: "9876543210",
    email: "clinic@example.com",
    latitude: 19.0760,
    longitude: 72.8777,

    // Step 1: Owner Details
    ownerName: "Dr. John Smith",
    ownerEmail: "john@example.com",
    ownerPhone: "9876543211",
    ownerId: "DL12345678",

    // Step 2: Receptionist
    receptionistName: "Jane Doe",
    receptionistEmail: "jane@example.com",
    receptionistPhone: "9876543212",
    receptionistShift: "9AM-6PM weekdays",

    // Step 3: Plan & Billing
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "Card",
    gstNumber: "27ABCDE1234F2Z5",

    // Step 5: Contracts
    contractStart: "2024-01-01",
    contractEnd: "2025-01-01",
    agreement: true,

    // Step 4: Documents (after uploading to cloud storage)
    documents: [
      {
        name: "clinic_license.pdf",
        url: "https://storage.example.com/clinic_license.pdf",
        type: "application/pdf",
        docType: "clinic_license"
      }
    ]
  })
});

// Response
{
  "success": true,
  "message": "Clinic registered successfully",
  "data": {
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Get Users:**
```javascript
// GET /api/users?clinic_id=550e8400-e29b-41d4-a716-446655440000
// Headers: Authorization: Bearer <jwt_token>

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "name": "Dr. John Smith",
      "email": "john@example.com",
      "phone": "9876543211",
      "role": "clinic_admin",
      "govt_id": "DL12345678",
      "shift_hours": null,
      "is_active": true,
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Technology Stack
- React 18+
- TailwindCSS (or your existing UI framework)
- Fetch API or Axios for HTTP requests
- Context API or Zustand for state management
- React Router for navigation

### File Structure to Create
```
frontend/
├── pages/
│   ├── LoginPage.jsx
│   ├── ClinicSettingsPage.jsx
│   ├── UsersPage.jsx
│   ├── BillingPage.jsx
│   ├── DocumentsPage.jsx
│   └── ContractsPage.jsx
├── components/
│   ├── NewClinicDialog.jsx (update existing)
│   ├── ProtectedRoute.jsx
│   └── LoadingSpinner.jsx
├── hooks/
│   ├── useAuth.js (auth context hook)
│   └── useApi.js (fetch wrapper)
├── context/
│   └── AuthContext.js
└── utils/
    └── api.js (API base configuration)
```

### Success Criteria
- [ ] User can register a new clinic through the multi-step form
- [ ] All 7 steps submit correctly to /api/clinics/register
- [ ] Clinic owner is automatically created as clinic_admin user
- [ ] Receptionist user is created if provided
- [ ] Billing and contract info is saved
- [ ] Documents are uploaded to cloud storage and metadata saved
- [ ] User can login with clinic credentials
- [ ] All authenticated pages require valid JWT token
- [ ] User can manage clinic users, billing, documents, and contracts
- [ ] Clinic settings can be updated
- [ ] Forms validate input before submission
- [ ] Error messages are displayed appropriately
- [ ] Loading states are shown during API calls
- [ ] No sensitive data (full card numbers) is displayed or logged

---

**API Documentation reference**: See `API_DOCUMENTATION.md` for complete endpoint details with all input/output schemas.
