'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { Save, AlertCircle } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  max_users: number
  settings?: Record<string, any>
  created_at: string
  updated_at: string
}

export default function WorkspaceSettingsTab() {
  const { workspaceId, userRole } = useAuth()
  const { addNotification } = useNotifications()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    max_users: 10
  })
  const isAdmin = userRole === 'admin'

  // Load workspace data
  useEffect(() => {
    if (!workspaceId) return

    const loadWorkspace = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/workspace')
        if (res.ok) {
          const { data } = await res.json()
          setWorkspace(data as Workspace)
          setFormData({
            name: (data as any).name || '',
            max_users: (data as any).max_users || 10
          })
        }
      } catch (error) {
        console.error('Error loading workspace:', error)
        addNotification('error', 'Failed to load workspace settings', 'Failed to load workspace settings')
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [workspaceId, addNotification])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_users' ? parseInt(value, 10) : value
    }))
  }

  const handleSave = async () => {
    if (!workspaceId) return

    // Validation
    if (!formData.name.trim()) {
      addNotification('error', 'Workspace name cannot be empty', 'Workspace name cannot be empty')
      return
    }

    if (formData.max_users < 1) {
      addNotification('error', 'Maximum users must be at least 1', 'Maximum users must be at least 1')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const { data } = await res.json()
        setWorkspace(data as Workspace)
        addNotification('post_published', 'Workspace settings updated successfully', 'Workspace settings updated successfully')
      } else {
        addNotification('error', 'Failed to update workspace settings', 'Failed to update workspace settings')
      }
    } catch (error) {
      console.error('Error saving workspace:', error)
      addNotification('error', 'Error updating workspace settings', 'Error updating workspace settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading workspace settings...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex items-gap-3">
        <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
        <div>
          <h3 className="font-semibold text-yellow-900">Access Denied</h3>
          <p className="text-sm text-yellow-800">Only workspace admins can modify workspace settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Workspace Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
          Workspace Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="My Workspace"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">The name of your workspace</p>
      </div>

      {/* Max Users */}
      <div>
        <label htmlFor="max_users" className="block text-sm font-medium text-gray-900 mb-2">
          Maximum Members
        </label>
        <input
          id="max_users"
          name="max_users"
          type="number"
          min="1"
          max="1000"
          value={formData.max_users}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum number of members allowed in this workspace
        </p>
      </div>

      {/* Current Stats */}
      {workspace && (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
          <h3 className="font-semibold text-indigo-900 mb-4">Workspace Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-indigo-700 font-medium mb-1">Created</p>
              <p className="text-indigo-900">
                {(workspace as any).created_at}
              </p>
            </div>
            <div>
              <p className="text-indigo-700 font-medium mb-1">Last Updated</p>
              <p className="text-indigo-900">
                {(workspace as any).updated_at}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !isAdmin}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md"
      >
        <Save size={18} />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
