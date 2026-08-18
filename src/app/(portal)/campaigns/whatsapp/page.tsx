'use client'

import CampaignListView from '@/components/portal/CampaignListView'

export default function WhatsAppCampaignsPage() {
  return (
    <CampaignListView
      channel="WHATSAPP"
      title="WhatsApp Campaigns"
      subtitle="Compose and track outbound WhatsApp messages to your own lead segments. Sending isn't wired to a live provider — no WhatsApp Business API is connected."
    />
  )
}
