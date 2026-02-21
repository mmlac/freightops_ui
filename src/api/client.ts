export type ApiConfig = {
  baseUrl: string
}

export function getApiConfig(): ApiConfig {
  const baseUrl =
    (import.meta as any).env?.VITE_API_BASE_URL?.toString() ?? 'http://localhost:8000'
  return { baseUrl: baseUrl.replace(/\/$/, '') }
}

// ── Auth token store ──────────────────────────────────────────────────────────

let _authToken: string | null = null

export function setAuthToken(token: string): void {
  _authToken = token
}

export function clearAuthToken(): void {
  _authToken = null
}

// ── Login ─────────────────────────────────────────────────────────────────────

export type LoginResponse = {
  token: string
  sender: string
}

export async function login(sender: string): Promise<LoginResponse> {
  const { baseUrl } = getApiConfig()
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Login failed ${res.status}: ${text}`)
  }
  return (await res.json()) as LoginResponse
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getApiConfig()
  const authHeaders: Record<string, string> = _authToken
    ? { Authorization: `Bearer ${_authToken}` }
    : {}
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`)
  }
  return (await res.json()) as T
}

// ── Event endpoints ──────────────────────────────────────────────────────────

export type CanonicalEvent = {
  id: number
  created_at: string
  shipment_ref: string
  event_type: string
  status_code: string
  event_time: string | null
  location_city: string | null
  location_state: string | null
  evidence_raw_event_id: number
  details: Record<string, any>
}

export async function listCanonicalEvents(limit = 500): Promise<CanonicalEvent[]> {
  return apiFetch(`/events/canonical?limit=${encodeURIComponent(limit)}`)
}

export type RawEventMeta = {
  id: number
  received_at: string
  source: string
  shipment_ref: string | null
  content_hash: string
  idempotency_key: string | null
  parse_status: string
  schema_version: string
}

export async function listRawEvents(limit = 50): Promise<RawEventMeta[]> {
  return apiFetch(`/events/raw?limit=${encodeURIComponent(limit)}`)
}

export type SanitizedEvent = {
  id: number
  created_at: string
  canonical_event_id: number
  shipment_ref: string
  event_type: string
  status_code: string
  status_reason: string | null
  event_time: string | null
  location_city: string | null
  location_state: string | null
  location_postal_code: string | null
  location_country: string | null
  carrier_scac: string | null
  references: { qualifier: string; value: string }[]
  is_duplicate: boolean
  is_valid: boolean
  validation_errors: string[]
}

export async function listSanitizedEvents(limit = 50): Promise<SanitizedEvent[]> {
  return apiFetch(`/events/sanitized?limit=${encodeURIComponent(limit)}`)
}

// ── Shipment endpoints ────────────────────────────────────────────────────────

export type Shipment = {
  id: number
  shipment_ref: string
  carrier_scac: string | null
  status_code: string
  status_reason: string | null
  status_event_time: string | null
  location_city: string | null
  location_state: string | null
  location_postal_code: string | null
  location_country: string | null
  first_seen_at: string
  updated_at: string
  event_count: number
}

// /shipments/{ref} returns the same shape as the list
export type ShipmentDetail = Shipment

export type ShipmentEvent = {
  id: number
  shipment_ref: string
  event_type: string
  status_code: string
  status_reason: string | null
  event_time: string | null
  location_city: string | null
  location_state: string | null
  location_postal_code: string | null
  location_country: string | null
  carrier_scac: string | null
  interchange_control_number: string | null
  group_control_number: string | null
  transaction_set_control_number: string | null
  references: { qualifier: string; value: string }[]
  evidence_raw_event_id: number
}

export type ShipmentPlan = {
  id: number
  shipment_ref: string
  pickup_earliest: string
  pickup_latest: string
  delivery_appointment: string
  initial_eta: string
  required_documents: string[]
}

export type CreateShipmentPlanRequest = {
  pickup_earliest: string
  pickup_latest: string
  delivery_appointment: string
  initial_eta: string
  required_documents: string[]
}

export type EtaUpdate = {
  id: number
  shipment_ref: string
  eta: string
  source: string
  created_at: string
}

export type CreateEtaRequest = {
  eta: string
  source: string
}

export type ShipmentDocument = {
  id: number
  shipment_ref: string
  type: string
  status: 'required' | 'received'
  received_at: string | null
}

export type MarkDocumentRequest = {
  type: string
  received_at?: string
}

export type ShipmentException = {
  id: string
  type: string
  severity: string
  opened_at: string
  closed_at: string | null
  evidence: Record<string, any>[]
}

export type ShipmentAction = {
  id: number
  shipment_ref: string
  type: string
  priority: string
  notes: string
  created_at: string
}

export type CreateActionRequest = {
  type: string
  priority: string
  notes: string
}

export async function listShipments(): Promise<Shipment[]> {
  return apiFetch('/shipments')
}

export async function getShipment(shipmentRef: string): Promise<ShipmentDetail> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}`)
}

export async function listShipmentEvents(shipmentRef: string): Promise<ShipmentEvent[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/events`)
}

export async function getShipmentPlan(shipmentRef: string): Promise<ShipmentPlan | null> {
  try {
    return await apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/plan`)
  } catch {
    return null
  }
}

export async function createShipmentPlan(
  shipmentRef: string,
  plan: CreateShipmentPlanRequest,
): Promise<ShipmentPlan> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/plan`, {
    method: 'POST',
    body: JSON.stringify(plan),
  })
}

export async function listShipmentEtas(shipmentRef: string): Promise<EtaUpdate[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/eta`)
}

export async function createShipmentEta(
  shipmentRef: string,
  eta: CreateEtaRequest,
): Promise<EtaUpdate> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/eta`, {
    method: 'POST',
    body: JSON.stringify(eta),
  })
}

export async function listShipmentDocuments(shipmentRef: string): Promise<ShipmentDocument[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/documents`)
}

export async function markDocumentReceived(
  shipmentRef: string,
  doc: MarkDocumentRequest,
): Promise<ShipmentDocument> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/documents`, {
    method: 'POST',
    body: JSON.stringify(doc),
  })
}

export async function listShipmentExceptions(shipmentRef: string): Promise<ShipmentException[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/exceptions`)
}

export async function listShipmentActions(shipmentRef: string): Promise<ShipmentAction[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/actions`)
}

export async function createShipmentAction(
  shipmentRef: string,
  action: CreateActionRequest,
): Promise<ShipmentAction> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/actions`, {
    method: 'POST',
    body: JSON.stringify(action),
  })
}

// ── Action log endpoints ──────────────────────────────────────────────────────

export type ActionLogEntry = {
  id: number
  shipment_ref: string
  actor: string
  action: string
  taken_at: string
  comments: string | null
  created_at: string
}

export type CreateActionLogRequest = {
  action: string
  comments?: string
}

export async function listActionLog(shipmentRef: string): Promise<ActionLogEntry[]> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/action-log`)
}

export async function createActionLogEntry(
  shipmentRef: string,
  entry: CreateActionLogRequest,
): Promise<ActionLogEntry> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/action-log`, {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

// ── Copilot endpoint ──────────────────────────────────────────────────────────

export type CopilotSummary = {
  shipment_ref: string
  summary: string
  model: string
  generated_at: string
}

export type CopilotQueryRequest = {
  question: string
}

export type CopilotQueryResponse = {
  answer: string
}

export async function getCopilotSummary(shipmentRef: string): Promise<CopilotSummary> {
  return apiFetch(`/shipments/${encodeURIComponent(shipmentRef)}/copilot`)
}

export async function askCopilot(question: string): Promise<CopilotQueryResponse> {
  return apiFetch('/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question } as CopilotQueryRequest),
  })
}
