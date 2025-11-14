'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { UserPlus, UserMinus, Shield, Settings, LogOut, Trash2, RefreshCw } from 'lucide-react'

interface ActivityLog {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, any>
  created_at: string
  user: {
    email: string
    full_name: string | null
  }
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  member_invited: <UserPlus size={16} className="text-blue-600" />,
  member_joined: <UserPlus size={16} className="text-green-600" />,
  member_removed: <UserMinus size={16} className="text-red-600" />,
  member_role_changed: <Shield size={16} className="text-orange-600" />,
  workspace_updated: <Settings size={16} className="text-purple-600" />,
  invite_revoked: <Trash2 size={16} className="text-red-600" />,
}

const ACTION_LABELS: Record<string, string> = {
  member_invited: 'Member Invited',
  member_joined: 'Member Joined',
  member_removed: 'Member Removed',
  member_role_changed: 'Role Changed',
  workspace_updated: 'Workspace Updated',
  invite_revoked: 'Invite Revoked',
}

export default function ActivityLogTab() {
  const { workspaceId, userRole } = useAuth()
  const { addNotification } = useNotifications()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const isAdmin = userRole === 'admin'

  const LIMIT = 20

  // Load activity logs
  useEffect(() => {
    if (!workspaceId || !isAdmin) return

    const loadActivities = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspace/activity?limit=${LIMIT}&offset=${page * LIMIT}`)
        if (res.ok) {
          const result = await res.json()
          setActivities(result.data as ActivityLog[])
          setHasMore(result.hasMore)
        }
      } catch (error) {
        console.error('Error loading activity log:', error)
        addNotification('error', 'Load Failed', 'Failed to load activity log')
      } finally {
        setLoading(false)
      }
    }

    loadActivities()
  }, [workspaceId, isAdmin, page, addNotification])

  const handleRefresh = () => {
    setPage(0)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionDescription = (activity: ActivityLog): string => {
    const { action, details, user } = activity
    const userName = user?.full_name || user?.email || 'Unknown'

    switch (action) {
      case 'member_invited':
        return `${userName} invited ${details.invite_email || 'someone'} as ${details.invite_role}`
      case 'member_joined':
        return `${userName} joined as ${details.role}`
      case 'member_removed':
        return `${userName} removed ${details.removed_user_email}`
      case 'member_role_changed':
        return `${userName} changed ${details.target_user_email}'s role from ${details.old_role} to ${details.new_role}`
      case 'workspace_updated':
        return `${userName} updated workspace settings`
      case 'invite_revoked':
        return `${userName} revoked an invitation for ${details.invite_email || 'shareable link'}`
      default:
        return `${userName} performed action: ${action}`
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900">Access Restricted</h3>
        <p className="text-sm text-yellow-800">Activity logs are only available to workspace admins.</p>
      </div>
    )
  }

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate">Loading activity log...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-slate hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-slate">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {/* Icon */}
              <div className="pt-1">
                {ACTION_ICONS[activity.action] || <RefreshCw size={16} className="text-slate" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-charcoal">
                    {ACTION_LABELS[activity.action] || activity.action}
                  </p>
                </div>
                <p className="text-sm text-slate">
                  {getActionDescription(activity)}
                </p>
                {Object.keys(activity.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-slate cursor-pointer hover:text-charcoal">
                      Details
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {/* Date */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate whitespace-nowrap">
                  {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasMore || page > 0 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-slate hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Previous
          </button>

          <span className="text-sm text-slate">
            Page {page + 1}
          </span>

          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 text-slate hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
