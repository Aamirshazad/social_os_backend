'use client'

import React from 'react'
import { BarChart3, TrendingUp, Users, DollarSign, Download, Calendar, Target, Eye } from 'lucide-react'

export default function ReportsAnalyticsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
            <p className="text-gray-600 text-sm mt-1">Track your brand's social media campaign performance and ROI</p>
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 rounded-lg border border-gray-300 text-sm">
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>This Year</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-green-600 font-medium">+12%</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">12</div>
            <div className="text-xs text-blue-700">Active Campaigns</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-xs text-green-600 font-medium">+24%</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">2.8M</div>
            <div className="text-xs text-purple-700">Total Reach</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-green-600" />
              <span className="text-xs text-green-600 font-medium">+18%</span>
            </div>
            <div className="text-2xl font-bold text-green-900">185K</div>
            <div className="text-xs text-green-700">Total Engagement</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <span className="text-xs text-green-600 font-medium">3.2x</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">$125K</div>
            <div className="text-xs text-amber-700">Total Investment</div>
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign Performance</h2>
        <div className="space-y-4">
          {[
            { name: 'Summer Launch', reach: 850000, engagement: 62000, roi: 3.5, budget: 35000 },
            { name: 'Tech Review Series', reach: 1200000, engagement: 85000, roi: 4.2, budget: 45000 },
            { name: 'Beauty Campaign', reach: 620000, engagement: 38000, roi: 2.8, budget: 28000 }
          ].map((campaign, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                <span className="text-sm text-gray-600">${(campaign.budget / 1000).toFixed(0)}K Budget</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Reach</div>
                  <div className="font-semibold text-gray-900">
                    {(campaign.reach / 1000).toFixed(0)}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Engagement</div>
                  <div className="font-semibold text-gray-900">
                    {(campaign.engagement / 1000).toFixed(0)}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Eng. Rate</div>
                  <div className="font-semibold text-gray-900">
                    {((campaign.engagement / campaign.reach) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">ROI</div>
                  <div className="font-semibold text-green-600">{campaign.roi}x</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Platform Performance</h2>
          <div className="space-y-3">
            {[
              { platform: 'Instagram', reach: 1200000, engagement: 85000, cost: 48000, color: 'from-purple-500 to-pink-500' },
              { platform: 'YouTube', reach: 950000, engagement: 62000, cost: 55000, color: 'from-red-600 to-red-700' },
              { platform: 'TikTok', reach: 480000, engagement: 28000, cost: 22000, color: 'from-gray-900 to-gray-800' },
              { platform: 'Facebook', reach: 350000, engagement: 18000, cost: 15000, color: 'from-blue-600 to-blue-700' }
            ].map((platform, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {platform.platform[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{platform.platform}</span>
                    <span className="text-xs text-gray-600">${(platform.cost / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{(platform.reach / 1000).toFixed(0)}K reach</span>
                    <span>{(platform.engagement / 1000).toFixed(0)}K engagement</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h2>
          <div className="space-y-3">
            {[
              { name: 'Sarah Johnson', reach: 450000, engagement: 32000, roi: 4.2 },
              { name: 'Mike Chen', reach: 1200000, engagement: 65000, roi: 3.8 },
              { name: 'Emma Martinez', reach: 620000, engagement: 42000, roi: 4.5 }
            ].map((influencer, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {influencer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{influencer.name}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{(influencer.reach / 1000).toFixed(0)}K reach</span>
                    <span className="text-green-600 font-medium">{influencer.roi}x ROI</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
