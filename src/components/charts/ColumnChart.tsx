'use client'

// Vertical column chart — rounded tops, one bar highlighted (peak value, or
// hovered), matching the redesign's reference look. BarChart.tsx (horizontal)
// stays as-is for ranked breakdowns (top models, status counts); this is
// specifically for a short time series read left-to-right, e.g. weekly volume.
import { useState } from 'react'

export interface ColumnDatum {
  label: string
  value: number
}

export default function ColumnChart({ data, color = 'var(--accent)' }: { data: ColumnDatum[]; color?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const peakIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)

  return (
    <div className="flex h-40 items-end gap-2.5 sm:gap-3">
      {data.map((d, i) => {
        const active = hovered === null ? i === peakIndex : hovered === i
        const heightPct = Math.max(4, (d.value / max) * 100)
        return (
          <div
            key={d.label}
            className="group relative flex flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {active && (
              <div className="absolute -top-7 rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                {d.value}
              </div>
            )}
            <div className="flex h-32 w-full items-end overflow-hidden rounded-full bg-ink/[0.05]">
              <div
                className="w-full rounded-full transition-[height] duration-300"
                style={{
                  height: `${heightPct}%`,
                  background: active ? color : 'color-mix(in srgb, var(--accent) 35%, transparent)',
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-ink/45">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
