# FreightOps UI (React)

A simple React (Vite + TypeScript) UI that calls the FastAPI endpoints from the `freightops_214` backend.

## Quickstart

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to your backend (default: `http://localhost:8000`).

## What the UI shows

- **Shipments list** fetched from `GET /shipments?status=...&q=...` with server-side filtering.
- Filters:
  - **Active** (default): not completed, not in exception state
  - **Exception**
  - **Completed**
- **Shipment detail view**:
  - shipment header (latest status, last event time, last location, carrier SCAC, references)
  - exceptions panel from `GET /shipments/{shipment_ref}/exceptions`
  - full timeline of canonical events from `GET /shipments/{shipment_ref}/events`
  - action creation form via `POST /shipments/{shipment_ref}/actions`

---

## Expected API endpoints

### Implemented in current backend

#### `GET /health`
**Returns**
```json
{ "status": "ok" }
```

#### `GET /events/canonical?limit=N`
**Returns** list of canonical shipment events (normalized):
```json
[
  {
    "id": 1,
    "created_at": "2026-02-20T00:00:00Z",
    "shipment_ref": "PRO123",
    "event_type": "STATUS_UPDATE",
    "status_code": "IN_TRANSIT",
    "event_time": "2026-02-20T00:00:00Z",
    "location_city": "Los Angeles",
    "location_state": "CA",
    "evidence_raw_event_id": 42,
    "details": { "carrier_scac": "ABCD", "references": [] }
  }
]
```

#### `GET /events/raw?limit=N`
**Returns** list of raw inbound events (immutable log metadata):
```json
[
  {
    "id": 42,
    "received_at": "2026-02-20T00:00:00Z",
    "source": "edi214_raw",
    "shipment_ref": "PRO123",
    "content_hash": "...",
    "idempotency_key": null,
    "parse_status": "ok",
    "schema_version": "214-lite-v1"
  }
]
```

#### `POST /events/edi214/raw`
**Body**
```json
{ "source": "edi214_raw", "edi_text": "ISA*...~GS*...~ST*214*..." }
```
**Returns**
```json
{ "raw_event_id": 1, "shipment_ref": "PRO123", "canonical_event_id": 2, "status_code": "IN_TRANSIT" }
```

#### `POST /events/edi214/parsed`
**Body**
```json
{ "source": "edi214_parsed", "idempotency_key": "optional", "message": { /* EDI214Message */ } }
```
**Returns**
```json
{ "raw_event_id": 1, "shipment_ref": "PRO123", "canonical_event_id": 2, "status_code": "IN_TRANSIT" }
```

---

## Shipment endpoints

### `GET /shipments?status=active|exception|completed&q=...`
**Returns** list of shipments with latest state precomputed.
```json
[
  {
    "shipment_ref": "PRO123",
    "latest_status_code": "IN_TRANSIT",
    "latest_event_time": "2026-02-20T00:00:00Z",
    "latest_location": { "city": "Los Angeles", "state": "CA" },
    "category": "active",
    "exception_reason": null
  }
]
```

### `GET /shipments/{shipment_ref}`
**Returns** shipment summary.
```json
{
  "shipment_ref": "PRO123",
  "latest_status_code": "IN_TRANSIT",
  "latest_event_time": "2026-02-20T00:00:00Z",
  "latest_location": { "city": "Los Angeles", "state": "CA" },
  "references": [{ "qualifier": "BM", "value": "BOL123" }],
  "carrier_scac": "ABCD"
}
```

### `GET /shipments/{shipment_ref}/events`
**Returns** canonical events for shipment (sorted by event_time asc).
```json
[ { "id": 1, "shipment_ref": "PRO123", "status_code": "PICKED_UP", "event_time": "..." } ]
```

### `GET /shipments/{shipment_ref}/exceptions`
**Returns** exception records (rules-engine outputs), current + history.
```json
[
  {
    "id": "ex_001",
    "type": "LATE_PICKUP",
    "severity": "high",
    "opened_at": "2026-02-20T00:00:00Z",
    "closed_at": null,
    "evidence": [ { "canonical_event_id": 12 } ]
  }
]
```

### `POST /shipments/{shipment_ref}/actions`
**Creates** an action or workflow item (call carrier, email, create ticket).
```json
{ "type": "CALL_CARRIER", "priority": "P1", "notes": "Confirm pickup ETA." }
```

---

## Classification logic (current)
The UI assigns shipment categories based on `latest_status_code`:

- **Completed**: `DELIVERED`, `CANCELLED`, `RETURNED`
- **Exception**: `DELAYED`, `DELIVERY_ATTEMPTED`, `DELIVERY_FAILED`, `APPOINTMENT_MISSED`, `EXCEPTION`
- **Active**: everything else

Update this mapping in `src/domain/status.ts` as your backend evolves.
