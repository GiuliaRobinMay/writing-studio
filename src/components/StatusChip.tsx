import type { Status } from '../types'
import { STATUS_META, STATUS_ORDER } from '../lib/status'

export function StatusChip({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span className="chip" style={{ color: m.color, background: m.bg, borderColor: m.color + '33' }}>
      <span className="dot" />
      {m.label}
    </span>
  )
}

/** Editable status chip rendered as a styled <select>. */
export function StatusSelect({
  status,
  onChange,
  stop = true,
}: {
  status: Status
  onChange: (s: Status) => void
  stop?: boolean
}) {
  const m = STATUS_META[status]
  return (
    <select
      className="chip"
      value={status}
      onClick={stop ? (e) => e.stopPropagation() : undefined}
      onChange={(e) => onChange(e.target.value as Status)}
      style={{ color: m.color, background: m.bg, borderColor: m.color + '33' }}
      title="Change status"
    >
      {STATUS_ORDER.map((s) => (
        <option key={s} value={s} style={{ color: '#2b2520', background: '#fff' }}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  )
}
