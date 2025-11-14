'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Notification, NotificationType } from '@/types'

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (type: NotificationType, title: string, message: string, postId?: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAllNotifications: () => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notifications')
      if (saved) {
        setNotifications(JSON.parse(saved))
      }
    } catch {
      // ignore
    }
    setIsHydrated(true)
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem('notifications', JSON.stringify(notifications))
      } catch {
        // ignore
      }
    }
  }, [notifications, isHydrated])

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    postId?: string
  ) => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      postId,
      read: false,
      createdAt: new Date().toISOString(),
    }

    setNotifications(prev => [notification, ...prev])

    // Toast UI
    const emoji = getEmojiForType(type)
    toast.success(`${emoji} ${title}`, {
      duration: 4000,
      position: 'top-right',
    })
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        unreadCount,
      }}
    >
      {children}
      <Toaster />
    </NotificationContext.Provider>
  )
}

function getEmojiForType(type: NotificationType): string {
  const emojiMap: Record<NotificationType, string> = {
    video_complete: '🎬',
    image_complete: '🖼️',
    post_scheduled: '⏰',
    post_published: '✅',
    approval_needed: '📝',
    comment_added: '💬',
    insight_available: '💡',
    queue_published: '📤',
    error: '⚠️',
  }
  return emojiMap[type] || '🔔'
}

