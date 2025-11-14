'use client'

import React from 'react'
import ProtectedApp from '@/components/auth/ProtectedApp'
import SocialMediaCampaignApp from '@/components/influencer/InfluencerCampaignApp'

export default function SocialMediaCampaignsPage() {
  return (
    <ProtectedApp>
      <SocialMediaCampaignApp />
    </ProtectedApp>
  )
}
