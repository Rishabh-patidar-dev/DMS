export default function ChartCard({
  title,
  subtitle,
  className = '',
  children,
}: {
  title: string
  subtitle?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 ${className}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">{title}</div>
      {subtitle && <div className="mb-4 text-[11px] text-ink/35">{subtitle}</div>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  )
}
