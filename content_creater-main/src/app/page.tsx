'use client'

import App from '@/App'
import ProtectedApp from '@/components/auth/ProtectedApp'

export default function Home() {
  return (
    <ProtectedApp>
      <App />
    </ProtectedApp>
  )
}
