'use client'

import React from 'react'
import { Settings, Mail, Shield } from 'lucide-react'

export default function SettingsView() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm mt-1">Manage your social media campaign preferences</p>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Email Templates</h2>
        </div>
        <div className="space-y-2">
          {[
            'Campaign Launch Notification',
            'Post Approval Workflow',
            'Performance Report',
            'Team Collaboration'
          ].map((template, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-900">{template}</span>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Campaign Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Contract Terms (days)
            </label>
            <input
              type="number"
              defaultValue={30}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Currency
            </label>
            <select className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>CAD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Data & Privacy</h2>
        </div>
        <div className="space-y-3">
          <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="font-medium text-gray-900">Export Campaign Data</div>
            <div className="text-xs text-gray-500 mt-0.5">Download all campaign information and analytics</div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="font-medium text-gray-900">Campaign Archive</div>
            <div className="text-xs text-gray-500 mt-0.5">Access archived campaign data</div>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">
          Save Changes
        </button>
      </div>
    </div>
  )
}
