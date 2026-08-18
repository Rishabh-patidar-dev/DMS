'use client'

// Hand-rolled SVG donut — no charting library, matching the same mark spec
// used across the CRM: thin ring, 2px gaps, fixed categorical hue order
// (--viz-1..6), legend always shown for 2+ series, hover highlight.
import { useState } from 'react'

export interface DonutDatum {
  label: string
  value: number
}

const VIZ_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)']

export default function DonutChart({
  data,
  size = 160,
  thickness = 20,
  centerLabel,
}: {
  data: DonutDatum[]
  size?: number
  thickness?: number
  centerLabel?: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const nonZero = data.filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const gap = 2

  let offset = 0
  const arcs = nonZero.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0
    const length = Math.max(0, fraction * circumference - gap)
    const arc = { ...d, color: VIZ_COLORS[i % VIZ_COLORS.length], length, offset }
    offset += fraction * circumference
    return arc
  })

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total === 0 ? (
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ink)" strokeOpacity={0.08} strokeWidth={thickness} />
            ) : (
              arcs.map((a, i) => (
                <circle
                  key={a.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${a.length} ${circumference}`}
                  strokeDashoffset={-a.offset}
                  strokeLinecap="butt"
                  opacity={hovered === null || hovered === i ? 1 : 0.35}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ transition: 'opacity 150ms' }}
                />
              ))
            )}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-ink">{total}</span>
          {centerLabel && <span className="text-[10px] text-ink/40">{centerLabel}</span>}
        </div>
      </div>
      {nonZero.length > 0 && (
        <ul className="min-w-0 space-y-1.5">
          {arcs.map((a, i) => (
            <li
              key={a.label}
              className="flex items-center gap-1.5 text-xs"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ opacity: hovered === null || hovered === i ? 1 : 0.5 }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
              <span className="truncate text-ink/70">{a.label}</span>
              <span className="ml-auto shrink-0 font-medium tabular-nums text-ink">{a.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
