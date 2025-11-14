'use client'

import React, { useState } from 'react'
import { Target, Plus, Calendar, TrendingUp, Users, ArrowRight } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  objective: string
  status: 'draft' | 'active' | 'completed' | 'paused'
  startDate: string
  endDate?: string
  postsCount: number
  budget?: number
  color: string
}

interface CampaignSelectorViewProps {
  onSelectCampaign: (campaign: Campaign) => void
  onCreateNew: () => void
}

const CampaignSelectorView: React.FC<CampaignSelectorViewProps> = ({ onSelectCampaign, onCreateNew }) => {
  const [campaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Summer Product Launch',
      objective: 'Brand Awareness',
      status: 'active',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      postsCount: 24,
      budget: 5000,
      color: '#3B82F6'
    },
    {
      id: '2',
      name: 'Holiday Season Sale',
      objective: 'Conversions',
      status: 'draft',
      startDate: '2024-11-15',
      endDate: '2024-12-31',
      postsCount: 0,
      budget: 3000,
      color: '#10B981'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Campaigns</h1>
          <p className="text-gray-600 mt-1">Select a campaign to manage or create a new one</p>
        </div>
        
        <button
          onClick={onCreateNew}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Campaign
        </button>
      </div>

      {/* Create Campaign Card */}
      <div
        onClick={onCreateNew}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl p-8 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all group"
      >
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your First Campaign</h3>
            <p className="text-gray-600">
              Set up a new social media campaign with objectives, target audience, and content strategy
            </p>
          </div>
        </div>
      </div>

      {/* Existing Campaigns */}
      {campaigns.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Campaigns</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => onSelectCampaign(campaign)}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all group"
              >
                {/* Campaign Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: campaign.color + '20' }}
                    >
                      <Target className="w-6 h-6" style={{ color: campaign.color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-gray-600">{campaign.objective}</p>
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(campaign.status)}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                </div>

                {/* Campaign Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    </div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(campaign.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="text-center border-x border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="w-4 h-4 text-gray-400 mr-1" />
                    </div>
                    <p className="text-sm text-gray-600">Posts</p>
                    <p className="text-sm font-bold text-gray-900">{campaign.postsCount}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-400 mr-1" />
                    </div>
                    <p className="text-sm text-gray-600">Budget</p>
                    <p className="text-sm font-bold text-gray-900">
                      ${campaign.budget?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                {/* Enter Campaign Button */}
                <div className="flex items-center justify-end text-indigo-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  <span>Open Campaign</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignSelectorView
