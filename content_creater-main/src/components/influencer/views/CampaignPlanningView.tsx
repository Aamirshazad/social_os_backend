'use client'

import React, { useState } from 'react'
import {
  Plus,
  Target,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  TrendingUp,
  Instagram,
  Youtube,
  Facebook,
  MessageSquare,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface CampaignPlanningViewProps {
  onCampaignCreated?: (campaign: any) => void
}

export default function CampaignPlanningView({ onCampaignCreated }: CampaignPlanningViewProps) {
  const [step, setStep] = useState(1)
  const [campaignData, setCampaignData] = useState({
    name: '',
    objective: '',
    platforms: [] as string[],
    budget: '',
    startDate: '',
    endDate: '',
    kpi: '',
    kpiTarget: '',
    targetAudience: {
      ageMin: 18,
      ageMax: 65,
      gender: 'all',
      locations: [] as string[],
      interests: [] as string[]
    },
    contentTypes: [] as string[],
    theme: ''
  })

  const objectives = [
    { value: 'awareness', label: 'Brand Awareness', icon: Sparkles, description: 'Increase visibility and reach' },
    { value: 'lead-generation', label: 'Lead Generation', icon: Users, description: 'Capture leads and signups' },
    { value: 'sales', label: 'Sales & Conversions', icon: DollarSign, description: 'Drive purchases and revenue' },
    { value: 'engagement', label: 'Engagement & Community', icon: TrendingUp, description: 'Build active community' },
    { value: 'product-launch', label: 'Product Launch', icon: Target, description: 'Launch new product/service' },
    { value: 'growth', label: 'Community Growth', icon: Users, description: 'Grow followers and audience' }
  ]

  const platforms = [
    { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
    { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'from-red-600 to-red-700' },
    { value: 'tiktok', label: 'TikTok', icon: MessageSquare, color: 'from-gray-900 to-gray-800' },
    { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-700' }
  ]

  const togglePlatform = (platform: string) => {
    setCampaignData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
            <p className="text-gray-600 text-sm mt-1">
              Plan and launch data-driven social media campaigns for your brand
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Step {step} of 5</div>
            <div className="text-2xl font-bold text-indigo-600">{step * 20}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${step * 20}%` }}
          />
        </div>
      </div>

      {/* Campaign Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign Basics</h2>
              <p className="text-gray-600 text-sm">Let's start with the fundamentals</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                placeholder="e.g., Summer Product Launch 2025"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Objective *
              </label>
              <div className="grid grid-cols-2 gap-4">
                {objectives.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => setCampaignData({...campaignData, objective: obj.value})}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      campaignData.objective === obj.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <obj.icon className={`w-6 h-6 mb-2 ${
                      campaignData.objective === obj.value ? 'text-indigo-600' : 'text-gray-400'
                    }`} />
                    <div className="font-semibold text-gray-900">{obj.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{obj.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Theme / Message *
              </label>
              <input
                type="text"
                value={campaignData.theme}
                onChange={(e) => setCampaignData({...campaignData, theme: e.target.value})}
                placeholder="e.g., Summer Vibes, New Year New You, Product Innovation"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={campaignData.startDate}
                  onChange={(e) => setCampaignData({...campaignData, startDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={campaignData.endDate}
                  onChange={(e) => setCampaignData({...campaignData, endDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Performance Indicator (KPI) *
                </label>
                <select
                  value={campaignData.kpi}
                  onChange={(e) => setCampaignData({...campaignData, kpi: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select KPI</option>
                  <option value="reach">Reach/Impressions</option>
                  <option value="engagement">Engagement Rate</option>
                  <option value="ctr">Click-Through Rate (CTR)</option>
                  <option value="conversions">Conversion Rate</option>
                  <option value="followers">Follower Growth</option>
                  <option value="leads">Lead Generation</option>
                  <option value="sales">Sales Revenue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Goal *
                </label>
                <input
                  type="text"
                  value={campaignData.kpiTarget}
                  onChange={(e) => setCampaignData({...campaignData, kpiTarget: e.target.value})}
                  placeholder="e.g., 10,000 impressions, 500 signups"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Platform Selection</h2>
              <p className="text-gray-600 text-sm">Choose where you want to run this campaign</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <button
                  key={platform.value}
                  onClick={() => togglePlatform(platform.value)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    campaignData.platforms.includes(platform.value)
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center mb-4`}>
                    <platform.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900 text-lg">{platform.label}</div>
                  {campaignData.platforms.includes(platform.value) && (
                    <div className="mt-2 text-xs text-indigo-600 font-medium">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Target Audience</h2>
              <p className="text-gray-600 text-sm">Define your ideal audience demographics</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="number"
                    value={campaignData.targetAudience.ageMin}
                    onChange={(e) => setCampaignData({
                      ...campaignData,
                      targetAudience: {...campaignData.targetAudience, ageMin: parseInt(e.target.value)}
                    })}
                    placeholder="Min age"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={campaignData.targetAudience.ageMax}
                    onChange={(e) => setCampaignData({
                      ...campaignData,
                      targetAudience: {...campaignData.targetAudience, ageMax: parseInt(e.target.value)}
                    })}
                    placeholder="Max age"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geographic Targeting
              </label>
              <input
                type="text"
                placeholder="Enter locations (e.g., United States, Canada, UK)"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-2">Separate multiple locations with commas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests & Behavior
              </label>
              <input
                type="text"
                placeholder="e.g., Fashion enthusiasts, Tech buyers, Fitness lovers, Small business owners"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-2">Define interests, behaviors, and demographics of your ideal customer</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender Targeting
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['All', 'Male', 'Female'].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setCampaignData({
                      ...campaignData,
                      targetAudience: {...campaignData.targetAudience, gender: gender.toLowerCase()}
                    })}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      campaignData.targetAudience.gender === gender.toLowerCase()
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Budget & Investment</h2>
              <p className="text-gray-600 text-sm">Set your campaign budget and expectations</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={campaignData.budget}
                  onChange={(e) => setCampaignData({...campaignData, budget: e.target.value})}
                  placeholder="10000"
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Types *
              </label>
              <p className="text-xs text-gray-500 mb-3">Select the types of content you'll create for this campaign</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'posts', label: 'Posts' },
                  { value: 'stories', label: 'Stories' },
                  { value: 'reels', label: 'Reels/Shorts' },
                  { value: 'videos', label: 'Videos' },
                  { value: 'carousel', label: 'Carousels' },
                  { value: 'live', label: 'Live Streams' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      const types = campaignData.contentTypes.includes(type.value)
                        ? campaignData.contentTypes.filter(t => t !== type.value)
                        : [...campaignData.contentTypes, type.value]
                      setCampaignData({...campaignData, contentTypes: types})
                    }}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      campaignData.contentTypes.includes(type.value)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Estimated Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-blue-900">2.5M</div>
                  <div className="text-xs text-blue-700">Estimated Reach</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">180K</div>
                  <div className="text-xs text-blue-700">Est. Engagement</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-900">3.2x</div>
                  <div className="text-xs text-blue-700">Expected ROI</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Review & Launch</h2>
              <p className="text-gray-600 text-sm">Review your campaign details before launching</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Campaign Name</div>
                <div className="font-semibold text-gray-900">{campaignData.name || 'Not set'}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Objective</div>
                <div className="font-semibold text-gray-900">
                  {campaignData.objective ? objectives.find(o => o.value === campaignData.objective)?.label : 'Not set'}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Platforms</div>
                <div className="flex gap-2 mt-2">
                  {campaignData.platforms.map(p => (
                    <span key={p} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Budget</div>
                <div className="font-semibold text-gray-900">${campaignData.budget || '0'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(Math.min(5, step + 1))}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => {
                const newCampaign = {
                  id: `campaign-${Date.now()}`,
                  name: campaignData.name,
                  objective: campaignData.objective,
                  status: 'active',
                  startDate: campaignData.startDate,
                  endDate: campaignData.endDate,
                  postsCount: 0,
                  budget: parseFloat(campaignData.budget) || 0,
                  color: '#3B82F6',
                  kpi: campaignData.kpi,
                  kpiTarget: campaignData.kpiTarget,
                  platforms: campaignData.platforms,
                  targetAudience: campaignData.targetAudience,
                  contentTypes: campaignData.contentTypes,
                  theme: campaignData.theme
                }
                onCampaignCreated?.(newCampaign)
              }}
              className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 inline-flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Launch Campaign
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
