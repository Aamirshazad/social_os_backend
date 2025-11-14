'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Target,
  FileText,
  BarChart3,
  Settings,
  ArrowLeft,
  User,
  LogOut,
  Sparkles,
  Edit3,
  LayoutGrid,
  History
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/ui/NotificationBell'
import { Post, Platform } from '@/types'
import { publishingService } from '@/services/publishingService'

// Import view components
import CampaignPlanningView from './views/CampaignPlanningView'
import ActiveCampaignsView from './views/ActiveCampaignsView'
import ContractsView from './views/ContractsView'
import ReportsAnalyticsView from './views/ReportsAnalyticsView'
import SettingsView from './views/SettingsView'
import AIContentGenerator from './views/AIContentGenerator'
import CampaignSelectorView from './views/CampaignSelectorView'

// Import main app components
import ContentStrategistView from '@/components/content/ContentStrategistView'
import ManagePosts from '@/components/posts/ManagePosts'
import PublishedView from '@/components/history/HistoryView'

type SocialMediaView = 
  | 'selector'
  | 'planning'
  | 'campaigns'
  | 'contracts'
  | 'reports'
  | 'settings'
  | 'ai-content'
  | 'content-strategist'
  | 'manage-posts'
  | 'published'

interface SelectedCampaign {
  id: string
  name: string
  objective: string
  status: string
  startDate: string
  endDate?: string
  postsCount: number
  budget?: number
  color: string
}

export default function SocialMediaCampaignApp() {
  const { user, signOut, userRole, workspaceId } = useAuth()
  const [activeView, setActiveView] = useState<SocialMediaView>('selector')
  const [selectedCampaign, setSelectedCampaign] = useState<SelectedCampaign | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const dataLoadedRef = useRef(false)
  const currentWorkspaceRef = useRef<string | null>(null)

  const [connectedAccounts, setConnectedAccounts] = useState<Record<Platform, boolean>>({
    twitter: false,
    linkedin: false,
    facebook: false,
    instagram: false,
    tiktok: false,
    youtube: false
  })

  const [isApiKeyReady, setIsApiKeyReady] = useState(false)

  // Load posts and credentials from API
  useEffect(() => {
    if (!user || !workspaceId) {
      setLoading(false)
      return
    }

    if (dataLoadedRef.current && currentWorkspaceRef.current === workspaceId) {
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)

        const [postsRes, credStatusRes] = await Promise.all([
          fetch(`/api/posts?workspace_id=${workspaceId}`),
          fetch('/api/credentials/status')
        ])

        if (!postsRes.ok) throw new Error('Failed to load posts')
        if (!credStatusRes.ok) throw new Error('Failed to load credentials status')

        const [dbPosts, accountsStatus] = await Promise.all([
          postsRes.json(),
          credStatusRes.json()
        ])

        setPosts(dbPosts)
        setConnectedAccounts(accountsStatus)
        dataLoadedRef.current = true
        currentWorkspaceRef.current = workspaceId
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, workspaceId])

  // Add post handler
  const addPost = useCallback(
    async (post: Post) => {
      setPosts((prevPosts) => [post, ...prevPosts])
      setActiveView('manage-posts')

      if (user && workspaceId) {
        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post, workspaceId }),
          })

          if (!response.ok) throw new Error('Failed to create post')
        } catch (error) {
          console.error('Error saving post to database:', error)
          setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id))
        }
      }
    },
    [user, workspaceId]
  )

  // Add multiple posts handler
  const addMultiplePosts = useCallback(
    async (newPosts: Post[]) => {
      setPosts((prevPosts) => [...newPosts, ...prevPosts])
      setActiveView('manage-posts')

      if (user && workspaceId) {
        try {
          for (const post of newPosts) {
            await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ post, workspaceId }),
            })
          }
        } catch (error) {
          console.error('Error saving posts to database:', error)
        }
      }
    },
    [user, workspaceId]
  )

  // Update post handler
  const updatePost = useCallback(
    async (updatedPost: Post) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
      )

      if (user && workspaceId) {
        try {
          const response = await fetch(`/api/posts/${updatedPost.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post: updatedPost, workspaceId }),
          })

          if (!response.ok) throw new Error('Failed to update post')
        } catch (error) {
          console.error('Error updating post:', error)
        }
      }
    },
    [user, workspaceId]
  )

  // Delete post handler
  const deletePost = useCallback(
    async (postId: string) => {
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))

      if (user && workspaceId) {
        try {
          const response = await fetch(`/api/posts/${postId}?workspace_id=${workspaceId}`, {
            method: 'DELETE',
          })

          if (!response.ok) throw new Error('Failed to delete post')
        } catch (error) {
          console.error('Error deleting post:', error)
        }
      }
    },
    [user, workspaceId]
  )

  // Publish post handler
  const publishPost = useCallback(
    async (post: Post) => {
      try {
        await publishingService.publishPost(post)
        
        const updatedPost = {
          ...post,
          status: 'published' as const,
          publishedAt: new Date().toISOString(),
        }

        await updatePost(updatedPost)
      } catch (error) {
        console.error('Error publishing post:', error)
        throw error
      }
    },
    [updatePost]
  )

  const resetApiKeyStatus = () => {
    setIsApiKeyReady(false)
  }

  const onSelectKey = () => {
    setIsApiKeyReady(true)
  }

  // Campaign handlers
  const handleSelectCampaign = (campaign: SelectedCampaign) => {
    setSelectedCampaign(campaign)
    setActiveView('content-strategist')
  }

  const handleCreateNewCampaign = () => {
    setActiveView('planning')
  }

  const handleCampaignCreated = (campaign: SelectedCampaign) => {
    // Set as selected campaign
    setSelectedCampaign(campaign)
    // Navigate to content strategist
    setActiveView('content-strategist')
  }

  const handleExitCampaign = () => {
    setSelectedCampaign(null)
    setActiveView('selector')
  }

  // Filter posts by selected campaign
  const campaignPosts = posts.filter(post => 
    selectedCampaign ? post.campaignId === selectedCampaign.id : true
  )

  // Add post with campaign ID
  const addPostToCampaign = useCallback(
    async (post: Post) => {
      const postWithCampaign = {
        ...post,
        campaignId: selectedCampaign?.id
      }
      setPosts((prevPosts) => [postWithCampaign, ...prevPosts])
      setActiveView('manage-posts')

      if (user && workspaceId) {
        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post: postWithCampaign, workspaceId }),
          })

          if (!response.ok) throw new Error('Failed to create post')
        } catch (error) {
          console.error('Error saving post to database:', error)
          setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id))
        }
      }
    },
    [user, workspaceId, selectedCampaign]
  )

  const SidebarItem: React.FC<{ 
    viewName: SocialMediaView
    icon: React.ElementType
    label: string
    badge?: number
  }> = ({ viewName, icon: Icon, label, badge }) => (
    <button
      onClick={() => setActiveView(viewName)}
      className={`flex items-center justify-between w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all transform hover:translate-x-1 ${
        activeView === viewName
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center">
        <Icon className="w-4 h-4 mr-2.5" />
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
          activeView === viewName
            ? 'bg-white text-indigo-600'
            : 'bg-indigo-100 text-indigo-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )

  const renderViewContent = () => {
    // Show campaign selector if no campaign is selected and view is 'selector'
    if (activeView === 'selector' || !selectedCampaign) {
      return (
        <CampaignSelectorView
          onSelectCampaign={handleSelectCampaign}
          onCreateNew={handleCreateNewCampaign}
        />
      )
    }

    // Show campaign planning during creation
    if (activeView === 'planning') {
      return <CampaignPlanningView onCampaignCreated={handleCampaignCreated} />
    }

    // Campaign workspace views (only shown when a campaign is selected)
    switch (activeView) {
      case 'campaigns':
        return <ActiveCampaignsView />
      case 'ai-content':
        return <AIContentGenerator />
      case 'content-strategist':
        return <ContentStrategistView onPostCreated={addPostToCampaign} />
      case 'manage-posts':
        return (
          <ManagePosts
            posts={campaignPosts}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            isApiKeyReady={isApiKeyReady}
            onSelectKey={onSelectKey}
            resetApiKeyStatus={resetApiKeyStatus}
            connectedAccounts={connectedAccounts}
          />
        )
      case 'published':
        return (
          <PublishedView
            posts={campaignPosts}
            onUpdatePost={updatePost}
            onDeletePost={deletePost}
            onPublishPost={publishPost}
            connectedAccounts={connectedAccounts}
          />
        )
      case 'contracts':
        return <ContractsView />
      case 'reports':
        return <ReportsAnalyticsView />
      case 'settings':
        return <SettingsView />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-white p-4 flex flex-col justify-between border-r border-gray-200 shadow-sm">
        <div>
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 text-xs mb-3 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back to Main App
            </Link>
            
            {selectedCampaign ? (
              <div>
                <button
                  onClick={handleExitCampaign}
                  className="flex items-center text-gray-600 hover:text-gray-900 text-xs mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Exit Campaign
                </button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selectedCampaign.color + '20' }}
                    >
                      <Target className="w-5 h-5" style={{ color: selectedCampaign.color }} />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">{selectedCampaign.name}</h1>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedCampaign.objective}</p>
                    </div>
                  </div>
                  <NotificationBell />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    Social Media Campaigns
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">Brand Campaign Manager</p>
                </div>
                <NotificationBell />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {!selectedCampaign ? (
              // Show campaign selector navigation
              <>
                <SidebarItem viewName="selector" icon={Target} label="All Campaigns" />
                <SidebarItem viewName="planning" icon={FileText} label="Create Campaign" />
              </>
            ) : (
              // Show campaign workspace navigation
              <>
                <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Content Creation
                </div>
                <SidebarItem viewName="content-strategist" icon={Edit3} label="Content Strategist" />
                <SidebarItem viewName="ai-content" icon={Sparkles} label="AI Generator" />
                
                <div className="border-t border-gray-200 my-3"></div>
                
                <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Management
                </div>
                <SidebarItem viewName="manage-posts" icon={LayoutGrid} label="Manage Posts" />
                <SidebarItem viewName="published" icon={History} label="Publish" />
                <SidebarItem viewName="contracts" icon={FileText} label="Schedule" />
                
                <div className="border-t border-gray-200 my-3"></div>
                
                <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Analytics
                </div>
                <SidebarItem viewName="reports" icon={BarChart3} label="Reports" />
                <SidebarItem viewName="settings" icon={Settings} label="Settings" />
              </>
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="space-y-2 border-t border-gray-200 pt-4">
          <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
            {userRole && (
              <div className="inline-block px-2 py-0.5 bg-indigo-100 border border-indigo-200 rounded text-xs font-medium text-indigo-800">
                {userRole}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to sign out?')) {
                signOut()
              }
            }}
            className="flex items-center w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all text-red-600 hover:bg-red-50 hover:shadow-sm transform hover:translate-x-1"
          >
            <LogOut className="w-4 h-4 mr-2.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {renderViewContent()}
      </main>
    </div>
  )
}
