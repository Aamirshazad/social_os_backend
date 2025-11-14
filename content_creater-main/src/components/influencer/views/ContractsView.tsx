'use client'

import React from 'react'
import { FileText, CheckCircle, Clock, Send, Download, Eye, Calendar } from 'lucide-react'

const mockContent = [
  {
    id: '1',
    campaignName: 'Summer Launch',
    scheduledPosts: [
      { type: 'Instagram Post', status: 'published', scheduledDate: '2025-02-10', platform: 'instagram' },
      { type: 'Instagram Story', status: 'scheduled', scheduledDate: '2025-02-12', platform: 'instagram' },
      { type: 'TikTok Video', status: 'draft', scheduledDate: '2025-02-14', platform: 'tiktok' }
    ]
  },
  {
    id: '2',
    campaignName: 'Tech Review',
    scheduledPosts: [
      { type: 'YouTube Video', status: 'scheduled', scheduledDate: '2025-02-20', platform: 'youtube' },
      { type: 'Facebook Post', status: 'draft', scheduledDate: '2025-02-22', platform: 'facebook' }
    ]
  }
]

export default function ContractsView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content & Schedule</h1>
            <p className="text-gray-600 text-sm mt-1">Manage scheduled posts and track content delivery</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Calendar className="w-4 h-4" />
            Schedule Post
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-900">12</div>
            <div className="text-xs text-green-700">Published</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <Calendar className="w-5 h-5 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-900">8</div>
            <div className="text-xs text-blue-700">Scheduled</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <FileText className="w-5 h-5 text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-purple-900">5</div>
            <div className="text-xs text-purple-700">Drafts</div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <Clock className="w-5 h-5 text-amber-600 mb-2" />
            <div className="text-2xl font-bold text-amber-900">25</div>
            <div className="text-xs text-amber-700">Total Posts</div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {mockContent.map((content) => (
          <div key={content.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{content.campaignName}</h3>
                  <p className="text-sm text-gray-600">{content.scheduledPosts.length} posts scheduled</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Scheduled Content</h4>
              <div className="space-y-2">
                {content.scheduledPosts.map((post, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        post.status === 'published' ? 'bg-green-500' : post.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{post.type}</div>
                        <div className="text-xs text-gray-500">
                          {post.status === 'published' ? 'Published' : 'Scheduled for'}: {new Date(post.scheduledDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                      post.status === 'published'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : post.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
