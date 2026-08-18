import { PortalShell } from '@/components/portal/PortalShell'

export default function PortalLayout({ children }: LayoutProps<'/'>) {
  return <PortalShell>{children}</PortalShell>
}
