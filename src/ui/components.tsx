import React from 'react'

export function Card(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}

export function Badge(props: { label: string; kind: 'active' | 'exception' | 'completed' }) {
  const bg =
    props.kind === 'completed' ? '#dcfce7' : props.kind === 'exception' ? '#fee2e2' : '#e0f2fe'
  const fg =
    props.kind === 'completed' ? '#166534' : props.kind === 'exception' ? '#991b1b' : '#075985'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: bg,
        color: fg,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {props.label}
    </span>
  )
}

export function Mono(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', ...props.style }}>
      {props.children}
    </span>
  )
}

export function SmallMuted(props: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 12, opacity: 0.7, ...props.style }}>{props.children}</div>
}

export function Button(props: {
  children: React.ReactNode
  onClick?: () => void
  kind?: 'primary' | 'secondary'
  disabled?: boolean
}) {
  const kind = props.kind ?? 'secondary'
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        border: '1px solid #e5e7eb',
        background: kind === 'primary' ? '#111827' : 'white',
        color: kind === 'primary' ? 'white' : '#111827',
        padding: '8px 12px',
        borderRadius: 10,
        fontWeight: 700,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {props.children}
    </button>
  )
}

export function Input(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={props.value}
      placeholder={props.placeholder}
      onChange={e => props.onChange(e.target.value)}
      style={{
        width: '100%',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 14,
        outline: 'none',
      }}
    />
  )
}
