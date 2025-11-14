import React, { Suspense } from 'react'
import ProtectedApp from '@/components/auth/ProtectedApp'
import SettingsPageContent from '@/components/settings/SettingsPageContent'

export default function SettingsPage() {
  return (
    <ProtectedApp>
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-slate">Loading settings...</div></div>}>
        <SettingsPageContent />
      </Suspense>
    </ProtectedApp>
  )
}
