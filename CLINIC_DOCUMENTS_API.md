# Clinic Documents API - Complete Reference

Comprehensive documentation for managing clinic documents with full CRUD operations, bulk uploads, and filtering.

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Data Schema](#data-schema)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## API Overview

The Clinic Documents API manages document metadata and references for clinic records stored in cloud storage (S3, Google Cloud, etc.). The API handles:

- ✅ Create single/bulk documents
- ✅ Read documents (list, filter, get single)
- ✅ Update document metadata
- ✅ Delete single/multiple documents
- ✅ Track who uploaded each document
- ✅ Pagination and filtering

**Base URL:** `http://localhost:3000/api/documents`

**Database Table:** `clinic_documents`

---

## Authentication

### Required Headers

All endpoints (except bulk operations) require JWT authentication:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a JWT Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "clinic_username",
    "password": "clinic_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Data Schema

### clinic_documents Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Unique document identifier |
| clinic_id | uuid | NO | - | Clinic that owns the document |
| file_name | varchar | NO | - | Name of the file |
| file_url | text | NO | - | URL to file in cloud storage |
| file_type | varchar | YES | null | MIME type (e.g., "application/pdf") |
| file_size | integer | YES | null | File size in bytes |
| doc_type | varchar | YES | null | Document category (e.g., "registration", "tax") |
| uploaded_by | uuid | YES | null | User ID who uploaded the document |
| created_at | timestamp | YES | now() | Creation timestamp (UTC) |

### Document Types (doc_type)

Suggested categories:
- `registration` - Clinic registration certificate
- `tax` - GST/Tax certificate
- `license` - Medical license
- `insurance` - Insurance documents
- `agreement` - Service agreements
- `compliance` - Compliance documents
- `report` - Reports or analytics
- `misc` - Other documents

---

## Endpoints

### 1. GET /api/documents - List Documents

Retrieve all documents for a clinic with optional filtering and pagination.

**Method:** GET

**Endpoint:** `/api/documents`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| clinic_id | uuid | ✅ | - | Clinic ID to list documents for |
| doc_type | varchar | ❌ | - | Filter by document type |
| limit | integer | ❌ | 50 | Number of documents per page |
| offset | integer | ❌ | 0 | Pagination offset |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/documents?clinic_id=550e8400-e29b-41d4-a716-446655440000&doc_type=registration&limit=20&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "clinic_registration.pdf",
      "file_url": "https://s3.bucket.com/clinics/clinic_registration.pdf",
      "file_type": "application/pdf",
      "file_size": 2048576,
      "doc_type": "registration",
      "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-05-28T10:30:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "gst_certificate.pdf",
      "file_url": "https://s3.bucket.com/clinics/gst_certificate.pdf",
      "file_type": "application/pdf",
      "file_size": 1024000,
      "doc_type": "tax",
      "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-05-28T10:32:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "clinic_id is required"
}
```

---

### 2. GET /api/documents/:id - Get Single Document

Retrieve a single document by ID with full details.

**Method:** GET

**Endpoint:** `/api/documents/:id`

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Document ID |

**Request:**

```bash
curl -X GET "http://localhost:3000/api/documents/770e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "clinic_registration.pdf",
    "file_url": "https://s3.bucket.com/clinics/clinic_registration.pdf",
    "file_type": "application/pdf",
    "file_size": 2048576,
    "doc_type": "registration",
    "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-05-28T10:30:00Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Document not found"
}
```

---

### 3. POST /api/documents - Create Single Document

Create a single document record with metadata.

**Method:** POST

**Endpoint:** `/api/documents`

**Authentication:** Required

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_name": "clinic_license.pdf",
  "file_url": "https://s3.bucket.com/clinics/clinic_license.pdf",
  "file_type": "application/pdf",
  "file_size": 1536000,
  "doc_type": "license"
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID (must match authenticated clinic) |
| file_name | varchar | ✅ | File name (e.g., "clinic_license.pdf") |
| file_url | text | ✅ | Cloud storage URL |
| file_type | varchar | ❌ | MIME type (e.g., "application/pdf") |
| file_size | integer | ❌ | File size in bytes |
| doc_type | varchar | ❌ | Document type (registration, tax, license, etc.) |

**Request:**

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "clinic_license.pdf",
    "file_url": "https://s3.bucket.com/clinics/clinic_license.pdf",
    "file_type": "application/pdf",
    "file_size": 1536000,
    "doc_type": "license"
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "clinic_license.pdf",
    "file_url": "https://s3.bucket.com/clinics/clinic_license.pdf",
    "file_type": "application/pdf",
    "file_size": 1536000,
    "doc_type": "license",
    "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-05-28T11:00:00Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "clinic_id, file_name, and file_url are required"
}
```

---

### 4. POST /api/documents/bulk - Bulk Create Documents

Create multiple documents in a single transaction (all succeed or all fail).

**Method:** POST

**Endpoint:** `/api/documents/bulk`

**Authentication:** Required

**Request Body:**

```json
{
  "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
  "documents": [
    {
      "file_name": "registration.pdf",
      "file_url": "https://s3.bucket.com/clinics/registration.pdf",
      "file_type": "application/pdf",
      "file_size": 2048576,
      "doc_type": "registration"
    },
    {
      "file_name": "gst_certificate.pdf",
      "file_url": "https://s3.bucket.com/clinics/gst_certificate.pdf",
      "file_type": "application/pdf",
      "file_size": 1024000,
      "doc_type": "tax"
    },
    {
      "file_name": "clinic_license.pdf",
      "file_url": "https://s3.bucket.com/clinics/clinic_license.pdf",
      "file_type": "application/pdf",
      "file_size": 1536000,
      "doc_type": "license"
    }
  ]
}
```

**Input Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_id | uuid | ✅ | Clinic ID |
| documents | array | ✅ | Array of document objects (minimum 1) |
| documents[].file_name | varchar | ✅ | File name |
| documents[].file_url | text | ✅ | Cloud storage URL |
| documents[].file_type | varchar | ❌ | MIME type |
| documents[].file_size | integer | ❌ | File size in bytes |
| documents[].doc_type | varchar | ❌ | Document type |

**Request:**

```bash
curl -X POST http://localhost:3000/api/documents/bulk \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "documents": [
      {
        "file_name": "registration.pdf",
        "file_url": "https://s3.bucket.com/clinics/registration.pdf",
        "file_type": "application/pdf",
        "file_size": 2048576,
        "doc_type": "registration"
      },
      {
        "file_name": "gst_certificate.pdf",
        "file_url": "https://s3.bucket.com/clinics/gst_certificate.pdf",
        "file_type": "application/pdf",
        "file_size": 1024000,
        "doc_type": "tax"
      }
    ]
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "message": "2 documents created successfully",
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440004",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "registration.pdf",
      "file_url": "https://s3.bucket.com/clinics/registration.pdf",
      "file_type": "application/pdf",
      "file_size": 2048576,
      "doc_type": "registration",
      "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-05-28T11:05:00Z"
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440005",
      "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
      "file_name": "gst_certificate.pdf",
      "file_url": "https://s3.bucket.com/clinics/gst_certificate.pdf",
      "file_type": "application/pdf",
      "file_size": 1024000,
      "doc_type": "tax",
      "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
      "created_at": "2026-05-28T11:05:00Z"
    }
  ]
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Each document must have file_name and file_url"
}
```

---

### 5. PATCH /api/documents/:id - Update Document Metadata

Update document metadata (name, type, size, category). File URL cannot be changed.

**Method:** PATCH

**Endpoint:** `/api/documents/:id`

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Document ID |

**Request Body:**

```json
{
  "file_name": "clinic_license_updated.pdf",
  "file_type": "application/pdf",
  "file_size": 1536000,
  "doc_type": "license"
}
```

**Input Parameters (all optional):**

| Field | Type | Description |
|-------|------|-------------|
| file_name | varchar | Updated file name |
| file_type | varchar | Updated MIME type |
| file_size | integer | Updated file size |
| doc_type | varchar | Updated document type |

**Request:**

```bash
curl -X PATCH http://localhost:3000/api/documents/770e8400-e29b-41d4-a716-446655440003 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "clinic_license_v2.pdf",
    "doc_type": "license"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "clinic_license_v2.pdf",
    "file_url": "https://s3.bucket.com/clinics/clinic_license.pdf",
    "file_type": "application/pdf",
    "file_size": 1536000,
    "doc_type": "license",
    "uploaded_by": "660e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-05-28T11:00:00Z"
  }
}
```

---

### 6. DELETE /api/documents/:id - Delete Single Document

Delete a document record (does NOT delete file from cloud storage).

**Method:** DELETE

**Endpoint:** `/api/documents/:id`

**Authentication:** Required

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Document ID |

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/documents/770e8400-e29b-41d4-a716-446655440003 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Document not found"
}
```

**Important Note:** ⚠️ This only deletes the database record. The file remains in cloud storage — you must delete it separately from S3/cloud storage.

---

### 7. DELETE /api/documents/clinic/:clinic_id - Delete All Clinic Documents

Delete all documents for a clinic (use with caution).

**Method:** DELETE

**Endpoint:** `/api/documents/clinic/:clinic_id`

**Authentication:** Required

**Authorization:** Only clinic owner/admin

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| clinic_id | uuid | Clinic ID |

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/documents/clinic/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "5 documents deleted successfully"
}
```

**⚠️ Warning:** This deletes ALL document records for the clinic. Files remain in cloud storage.

---

## Code Examples

### JavaScript/Node.js

#### Create Single Document

```javascript
const axios = require('axios');

async function createDocument(clinicId, fileInfo, jwtToken) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/documents',
      {
        clinic_id: clinicId,
        file_name: fileInfo.name,
        file_url: fileInfo.url,
        file_type: fileInfo.type,
        file_size: fileInfo.size,
        doc_type: fileInfo.docType
      },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Document created:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}
```

#### Bulk Upload Documents

```javascript
async function bulkUploadDocuments(clinicId, documents, jwtToken) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/documents/bulk',
      {
        clinic_id: clinicId,
        documents: documents
      },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );
    
    console.log(`${response.data.data.length} documents created`);
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

// Usage
const docs = [
  {
    file_name: "registration.pdf",
    file_url: "https://s3.bucket.com/registration.pdf",
    file_type: "application/pdf",
    doc_type: "registration"
  },
  {
    file_name: "tax_cert.pdf",
    file_url: "https://s3.bucket.com/tax_cert.pdf",
    file_type: "application/pdf",
    doc_type: "tax"
  }
];

await bulkUploadDocuments(clinicId, docs, token);
```

#### List Documents with Filtering

```javascript
async function listDocuments(clinicId, jwtToken, filters = {}) {
  try {
    const params = new URLSearchParams({
      clinic_id: clinicId,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });

    if (filters.doc_type) {
      params.append('doc_type', filters.doc_type);
    }

    const response = await axios.get(
      `http://localhost:3000/api/documents?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    );

    console.log('Total documents:', response.data.pagination.total);
    console.log('Documents:', response.data.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error || error.message);
  }
}

// Usage
await listDocuments(clinicId, token, { doc_type: 'registration', limit: 20 });
```

### Python

#### Create Document

```python
import requests

def create_document(clinic_id, file_info, jwt_token):
    headers = {
        'Authorization': f'Bearer {jwt_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'clinic_id': clinic_id,
        'file_name': file_info['name'],
        'file_url': file_info['url'],
        'file_type': file_info.get('type'),
        'file_size': file_info.get('size'),
        'doc_type': file_info.get('doc_type')
    }
    
    response = requests.post(
        'http://localhost:3000/api/documents',
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        print("Document created:", response.json()['data'])
        return response.json()['data']
    else:
        print("Error:", response.json()['error'])
        return None
```

#### Bulk Upload

```python
def bulk_upload_documents(clinic_id, documents, jwt_token):
    headers = {
        'Authorization': f'Bearer {jwt_token}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'clinic_id': clinic_id,
        'documents': documents
    }
    
    response = requests.post(
        'http://localhost:3000/api/documents/bulk',
        json=data,
        headers=headers
    )
    
    if response.status_code == 201:
        result = response.json()
        print(f"{len(result['data'])} documents created")
        return result['data']
    else:
        print("Error:", response.json()['error'])
        return None

# Usage
docs = [
    {
        'file_name': 'registration.pdf',
        'file_url': 'https://s3.bucket.com/registration.pdf',
        'file_type': 'application/pdf',
        'doc_type': 'registration'
    },
    {
        'file_name': 'gst.pdf',
        'file_url': 'https://s3.bucket.com/gst.pdf',
        'file_type': 'application/pdf',
        'doc_type': 'tax'
    }
]

bulk_upload_documents(clinic_id, docs, token)
```

---

## Error Handling

### Common Error Responses

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | "clinic_id is required" | Missing clinic_id query param | Add clinic_id to query string |
| 400 | "clinic_id, file_name, and file_url are required" | Missing required fields | Include all required fields |
| 400 | "Each document must have file_name and file_url" | Bulk upload missing fields | Validate each document |
| 403 | "Forbidden" | Unauthorized clinic access | Use correct JWT token for clinic |
| 404 | "Document not found" | Invalid document ID | Verify document exists |
| 500 | Database/Server error | Internal error | Check server logs |

### Example Error Response

```json
{
  "success": false,
  "error": "clinic_id, file_name, and file_url are required"
}
```

---

## Best Practices

### ✅ DO

1. **Upload files to cloud storage first** before creating document records
2. **Use meaningful file names** that describe the document
3. **Include MIME types** for proper file handling
4. **Set file_size** for UI display and quota management
5. **Use doc_type** to organize documents by category
6. **Handle bulk operations** for large uploads (more efficient)
7. **Validate file URLs** before creating records
8. **Delete files from cloud storage** when deleting records
9. **Use pagination** when listing many documents
10. **Store JWT tokens securely** (httpOnly cookies)

### ❌ DON'T

1. **Don't upload binary files directly** to the API
2. **Don't use invalid or expired URLs**
3. **Don't create duplicate records** for the same file
4. **Don't store sensitive data in logs**
5. **Don't share JWT tokens** between clinics
6. **Don't assume all requests succeed** — always check response
7. **Don't make synchronous blocking calls** from UI
8. **Don't hardcode URLs or IDs** in code
9. **Don't forget to handle errors** in production code
10. **Don't assume deleted records delete cloud files** — they don't

### Security Considerations

- ✅ Always validate `clinic_id` matches authenticated user
- ✅ Use HTTPS in production
- ✅ Implement file size limits
- ✅ Validate MIME types
- ✅ Scan files for malware before storing
- ✅ Use signed/pre-signed URLs from cloud storage
- ✅ Implement access logging for sensitive documents
- ✅ Use proper S3 bucket policies and IAM roles
- ✅ Encrypt sensitive files in transit and at rest

---

## Complete Workflow Example

### Step 1: Upload File to S3

```bash
aws s3 cp clinic_license.pdf s3://my-bucket/clinics/clinic_license.pdf
# Get URL: https://my-bucket.s3.amazonaws.com/clinics/clinic_license.pdf
```

### Step 2: Get JWT Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "clinic_user",
    "password": "password123"
  }'
```

### Step 3: Create Document Record

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "clinic_license.pdf",
    "file_url": "https://my-bucket.s3.amazonaws.com/clinics/clinic_license.pdf",
    "file_type": "application/pdf",
    "file_size": 1536000,
    "doc_type": "license"
  }'
```

### Step 4: Verify Document Created

```bash
curl -X GET "http://localhost:3000/api/documents?clinic_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Related Documentation

- [Clinic Creation & Update APIs](CLINIC_CREATION_UPDATE_API.md)
- [Clinic Management Complete Guide](CLINIC_MANAGEMENT_COMPLETE_GUIDE.md)
