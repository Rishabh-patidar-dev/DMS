'use client'

import CampaignListView from '@/components/portal/CampaignListView'

export default function EmailCampaignsPage() {
  return (
    <CampaignListView
      channel="EMAIL"
      title="Email Campaigns"
      subtitle="Compose and track outbound email to your own lead segments. Sending isn't wired to a live provider — no SMTP is connected."
    />
  )
}
