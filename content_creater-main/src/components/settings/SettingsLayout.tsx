'use client'

import React, { useState } from 'react'
import { Users, Settings, Activity, ChevronLeft, Zap } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

type Tab = 'members' | 'workspace' | 'activity' | 'accounts'

interface SettingsLayoutProps {
  children: React.ReactNode
  activeTab: Tab
}

const ADMIN_TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: 'accounts',
    label: 'Connected Accounts',
    icon: <Zap size={20} />,
  },
  {
    id: 'workspace',
    label: 'Workspace Settings',
    icon: <Settings size={20} />,
  },
]

const COMMON_TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  {
    id: 'members',
    label: 'Members',
    icon: <Users size={20} />,
  },
  {
    id: 'activity',
    label: 'Activity Log',
    icon: <Activity size={20} />,
  },
]

export default function SettingsLayout({ children, activeTab }: SettingsLayoutProps) {
  const { userRole } = useAuth()

  // Show admin tabs only to admins
  const visibleTabs = userRole === 'admin' ? [...ADMIN_TABS, ...COMMON_TABS] : COMMON_TABS

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
          </div>
          <p className="text-gray-600">Manage your workspace, members, and activity</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2 sticky top-8">
              {visibleTabs.map(tab => (
                <Link
                  key={tab.id}
                  href={`/settings?tab=${tab.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-md">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
