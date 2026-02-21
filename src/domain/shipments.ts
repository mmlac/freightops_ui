import { CanonicalEvent } from '../api/client'
import { categorizeStatus, ShipmentCategory } from './status'

export type ShipmentSummary = {
  shipmentRef: string
  latestStatusCode: string
  latestEventTime: string | null
  latestLocation: string | null
  category: ShipmentCategory
  lastEvidenceRawEventId: number
}

function eventSortKey(e: CanonicalEvent): number {
  // Prefer event_time (business time) else created_at
  const t = e.event_time ?? e.created_at
  const ms = Date.parse(t)
  return Number.isFinite(ms) ? ms : 0
}

export function deriveShipments(events: CanonicalEvent[]): ShipmentSummary[] {
  const byRef = new Map<string, CanonicalEvent[]>()
  for (const e of events) {
    const r = e.shipment_ref
    if (!r) continue
    if (!byRef.has(r)) byRef.set(r, [])
    byRef.get(r)!.push(e)
  }

  const out: ShipmentSummary[] = []
  for (const [shipmentRef, es] of byRef.entries()) {
    es.sort((a, b) => eventSortKey(a) - eventSortKey(b))
    const latest = es[es.length - 1]
    const loc = [latest.location_city, latest.location_state].filter(Boolean).join(', ')
    const latestStatusCode = latest.status_code
    out.push({
      shipmentRef,
      latestStatusCode,
      latestEventTime: latest.event_time ?? null,
      latestLocation: loc || null,
      category: categorizeStatus(latestStatusCode),
      lastEvidenceRawEventId: latest.evidence_raw_event_id,
    })
  }

  // Sort by latest activity desc
  out.sort((a, b) => {
    const ta = Date.parse(a.latestEventTime ?? '') || 0
    const tb = Date.parse(b.latestEventTime ?? '') || 0
    return tb - ta
  })

  return out
}

export function eventsForShipment(events: CanonicalEvent[], shipmentRef: string): CanonicalEvent[] {
  const filtered = events.filter(e => e.shipment_ref === shipmentRef)
  filtered.sort((a, b) => eventSortKey(a) - eventSortKey(b))
  return filtered
}
