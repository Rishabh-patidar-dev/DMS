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
    <div className={`rounded-xl border border-ink/[0.08] bg-white p-4 ${className}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/40">{title}</div>
      {subtitle && <div className="mb-3 text-[11px] text-ink/40">{subtitle}</div>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  )
}
