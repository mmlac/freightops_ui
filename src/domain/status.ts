export type ShipmentCategory = 'active' | 'exception' | 'completed'

export const COMPLETED_STATUSES = new Set([
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
])

export const EXCEPTION_STATUSES = new Set([
  'DELAYED',
  'DELIVERY_ATTEMPTED',
  'DELIVERY_FAILED',
  'APPOINTMENT_MISSED',
  'EXCEPTION',
  // vendor-specific mappings can be added here
  'AT7_XB', // example: mapped code from AT7 delay
])

export function categorizeStatus(statusCode: string): ShipmentCategory {
  const s = (statusCode ?? '').toUpperCase()
  if (COMPLETED_STATUSES.has(s)) return 'completed'
  if (EXCEPTION_STATUSES.has(s)) return 'exception'
  return 'active'
}
