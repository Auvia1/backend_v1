# Clinic Documents & Knowledge API Documentation

This document describes the APIs for managing clinic documents and the underlying structure for clinic knowledge.

## Base URL (Documents)
`/api/documents`

---

## 1. Clinic Documents APIs

The `clinic_documents` APIs handle the metadata for files uploaded by a clinic. The actual file uploads must be handled separately (e.g., directly to a cloud storage bucket like S3 or Supabase Storage), and then these APIs are used to save the resulting file URLs and metadata.

### 1.1 Get All Documents for a Clinic
Retrieves a list of documents for a specific clinic. Supports optional pagination and filtering by document type.

- **URL:** `/api/documents`
- **Method:** `GET`
- **Auth Required:** Yes
- **Query Parameters:**
  - `clinic_id` (string, **required**): The ID of the clinic.
  - `doc_type` (string, optional): Filter by a specific document type.
  - `limit` (number, optional): Number of results to return (default: 50).
  - `offset` (number, optional): Pagination offset (default: 0).

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "clinic_id": "uuid",
      "file_name": "policy.pdf",
      "file_url": "https://storage.provider.com/path/to/policy.pdf",
      "file_type": "application/pdf",
      "file_size": 1024500,
      "doc_type": "policy",
      "uploaded_by": "uuid",
      "created_at": "2026-05-31T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### 1.2 Get a Single Document
Retrieves metadata for a specific document by its ID.

- **URL:** `/api/documents/:id`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "file_name": "policy.pdf",
    "file_url": "https://...",
    "file_type": "application/pdf",
    "file_size": 1024500,
    "doc_type": "policy",
    "uploaded_by": "uuid",
    "created_at": "2026-05-31T00:00:00.000Z"
  }
}
```

### 1.3 Create a Document Record
Creates a metadata record for a newly uploaded document.

- **URL:** `/api/documents`
- **Method:** `POST`
- **Auth Required:** Yes

**Request Body:**
```json
{
  "clinic_id": "uuid",
  "file_name": "handbook.pdf",
  "file_url": "https://storage.provider.com/...",
  "file_type": "application/pdf",
  "file_size": 2048000,
  "doc_type": "handbook"
}
```
*(Note: `clinic_id`, `file_name`, and `file_url` are required.)*

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clinic_id": "uuid",
    "file_name": "handbook.pdf",
    "file_url": "https://...",
    "file_type": "application/pdf",
    "file_size": 2048000,
    "doc_type": "handbook",
    "uploaded_by": "uuid",
    "created_at": "2026-05-31T00:00:00.000Z"
  }
}
```

### 1.4 Bulk Create Document Records
Allows uploading metadata for multiple documents in a single transaction.

- **URL:** `/api/documents/bulk`
- **Method:** `POST`
- **Auth Required:** Yes

**Request Body:**
```json
{
  "clinic_id": "uuid",
  "documents": [
    {
      "file_name": "doc1.pdf",
      "file_url": "https://...",
      "file_type": "application/pdf",
      "file_size": 1024,
      "doc_type": "policy"
    },
    {
      "file_name": "doc2.jpg",
      "file_url": "https://...",
      "file_type": "image/jpeg",
      "file_size": 2048,
      "doc_type": "image"
    }
  ]
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "2 documents created successfully",
  "data": [
    { ...document object... },
    { ...document object... }
  ]
}
```

### 1.5 Update Document Metadata
Updates specific metadata fields of a document.

- **URL:** `/api/documents/:id`
- **Method:** `PATCH`
- **Auth Required:** Yes

**Request Body (Any combination of fields):**
```json
{
  "file_name": "updated_handbook.pdf",
  "file_type": "application/pdf",
  "file_size": 2050000,
  "doc_type": "updated_policy"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    ...updated document object...
  }
}
```

### 1.6 Delete a Document
Deletes a document's metadata record from the database. *(Note: This does not delete the physical file from cloud storage.)*

- **URL:** `/api/documents/:id`
- **Method:** `DELETE`
- **Auth Required:** Yes

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

### 1.7 Bulk Delete Documents for a Clinic
Deletes all document records associated with a given clinic.

- **URL:** `/api/documents/clinic/:clinic_id`
- **Method:** `DELETE`
- **Auth Required:** Yes (Restricted to Clinic Owner or Admin)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "X documents deleted successfully"
}
```

---

## 2. Clinic Knowledge

The `clinic_knowledge` component is designed to store embedded chunks of text used for Retrieval-Augmented Generation (RAG) and semantic search operations. 

Currently, there are **no explicit HTTP API endpoints** (e.g., in `src/routes/`) implemented within the Node.js backend to manage `clinic_knowledge`. 

Instead, the `clinic_knowledge` acts as a direct vector storage layer accessed primarily via PostgreSQL extensions (like `pgvector`).

### Database Structure
The table is structured as follows:

- **`id`** (`integer`): Primary key.
- **`chunk_text`** (`text`): The textual content chunk.
- **`embedding`** (`vector(768)`): The vector representation of the text chunk.

*(An index `clinic_knowledge_embedding_idx` uses `hnsw` over the `embedding` column for fast semantic querying.)*

**Note:** Interactions with this table (such as chunking uploaded documents and generating embeddings) are typically handled by an external Python service or worker that listens to document upload events.
