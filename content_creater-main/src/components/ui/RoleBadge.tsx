'use client'

import React from 'react'
import type { UserRole } from '@/types/workspace'
import { Shield, Edit3, Eye } from 'lucide-react'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Role Badge Component
 * Displays user roles with color coding and icons
 * - Admin (Blue): Full workspace control
 * - Editor (Green): Create & edit content
 * - Viewer (Gray): Read-only access
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'md',
  className = '',
}) => {
  // Configuration for each role
  const roleConfig = {
    admin: {
      label: 'Admin',
      color: 'bg-blue-600 text-white',
      icon: Shield,
      description: 'Full workspace control',
    },
    editor: {
      label: 'Editor',
      color: 'bg-green-600 text-white',
      icon: Edit3,
      description: 'Create & edit content',
    },
    viewer: {
      label: 'Viewer',
      color: 'bg-slate text-white',
      icon: Eye,
      description: 'Read-only access',
    },
  }

  const config = roleConfig[role]
  const Icon = config.icon

  // Size-based classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.color} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </span>
  )
}
