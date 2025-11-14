'use client'

import React, { useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Archive,
  FileText,
  Sparkles
} from 'lucide-react'

// Mock data - will be replaced with API calls
const mockCampaigns = [
  {
    id: '1',
    name: 'Summer Product Launch',
    objective: 'Product Launch',
    status: 'active',
    platforms: ['instagram', 'tiktok'],
    budget: 15000,
    postsScheduled: 24,
    startDate: '2025-01-15',
    endDate: '2025-02-15',
    kpi: 'Lead Generation',
    kpiTarget: '1,000 signups',
    kpiCurrent: 650,
    actualReach: 245000,
    actualEngagement: 18500,
    ctr: 3.2,
    progress: 65
  },
  {
    id: '2',
    name: 'Brand Awareness Campaign',
    objective: 'Brand Awareness',
    status: 'planning',
    platforms: ['instagram', 'youtube'],
    budget: 25000,
    postsScheduled: 18,
    startDate: '2025-02-01',
    endDate: '2025-03-01',
    kpi: 'Reach',
    kpiTarget: '500K impressions',
    kpiCurrent: 0,
    actualReach: 0,
    actualEngagement: 0,
    ctr: 0,
    progress: 25
  },
  {
    id: '3',
    name: 'Holiday Sales Drive',
    objective: 'Sales & Conversions',
    status: 'active',
    platforms: ['facebook', 'instagram'],
    budget: 30000,
    postsScheduled: 32,
    startDate: '2025-01-10',
    endDate: '2025-02-28',
    kpi: 'Conversion Rate',
    kpiTarget: '5% conversion',
    kpiCurrent: 4.2,
    actualReach: 450000,
    actualEngagement: 32000,
    ctr: 4.8,
    progress: 80
  }
]

export default function ActiveCampaignsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPlatformIcon = (platform: string) => {
    const iconClass = 'w-4 h-4'
    switch (platform) {
      case 'instagram':
        return <div className={`${iconClass} bg-gradient-to-br from-purple-500 to-pink-500 rounded`} />
      case 'youtube':
        return <div className={`${iconClass} bg-red-600 rounded`} />
      case 'tiktok':
        return <div className={`${iconClass} bg-black rounded`} />
      case 'facebook':
        return <div className={`${iconClass} bg-blue-600 rounded`} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Social Media Campaigns</h1>
              <p className="text-gray-600 text-sm mt-1">
                Run and manage your brand campaigns across Facebook, YouTube, TikTok & Instagram
              </p>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all">
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md transition-all">
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Total</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{mockCampaigns.length}</div>
              <div className="text-xs text-blue-700">Active Campaigns</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Content</span>
              </div>
              <div className="text-2xl font-bold text-green-900">74</div>
              <div className="text-xs text-green-700">Posts Scheduled</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Reach</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">1.2M</div>
              <div className="text-xs text-purple-700">Total Reach</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Budget</span>
              </div>
              <div className="text-2xl font-bold text-amber-900">$70K</div>
              <div className="text-xs text-amber-700">Total Investment</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCampaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
          >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                  <p className="text-xs text-gray-500">{campaign.objective} • {campaign.kpi}</p>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
                <div className="flex items-center gap-1">
                  {campaign.platforms.map((platform, idx) => (
                    <div key={idx}>{getPlatformIcon(platform)}</div>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span className="font-medium">{campaign.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${campaign.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Posts</div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.postsScheduled}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Budget</div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      ${(campaign.budget / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Reach</div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.actualReach > 0 
                        ? `${(campaign.actualReach / 1000).toFixed(0)}K`
                        : '-'
                      }
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">Engagement</div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {campaign.actualEngagement > 0
                        ? `${(campaign.actualEngagement / 1000).toFixed(1)}K`
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Eye className="w-3 h-3" />
                View Details
              </button>
              <button className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit className="w-3 h-3" />
              </button>
              <button className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Archive className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mockCampaigns.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">Create your first influencer marketing campaign to get started</p>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      )}
    </div>
  )
}
