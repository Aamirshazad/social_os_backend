'use client'

import React, { useState } from 'react'
import { Sparkles, Wand2, Copy, Download, RefreshCw, Image as ImageIcon, Video, FileText, Calendar, CheckCircle } from 'lucide-react'

export default function AIContentGenerator() {
  const [contentType, setContentType] = useState('post')
  const [platform, setPlatform] = useState('instagram')
  const [tone, setTone] = useState('professional')
  const [prompt, setPrompt] = useState('')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const contentTypes = [
    { value: 'post', label: 'Social Post', icon: FileText },
    { value: 'caption', label: 'Caption', icon: FileText },
    { value: 'hashtags', label: 'Hashtags', icon: FileText },
    { value: 'story', label: 'Story Script', icon: Video },
    { value: 'video-script', label: 'Video Script', icon: Video },
    { value: 'ad-copy', label: 'Ad Copy', icon: Sparkles }
  ]

  const platforms = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'youtube', label: 'YouTube' }
  ]

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'humorous', label: 'Humorous' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'educational', label: 'Educational' }
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    // Simulate AI generation
    setTimeout(() => {
      setGeneratedContent({
        text: `🌟 Excited to share something amazing with you!\n\nOur latest innovation is here to transform your experience. Built with passion and designed with you in mind.\n\n✨ Key benefits:\n• Seamless integration\n• Time-saving automation\n• Beautiful design\n\nReady to elevate your game? Link in bio! 🚀\n\n#Innovation #TechLife #ProductLaunch #DigitalTransformation #GrowthMindset`,
        hashtags: ['#Innovation', '#TechLife', '#ProductLaunch', '#DigitalTransformation', '#GrowthMindset'],
        variations: 3,
        characterCount: 285
      })
      setIsGenerating(false)
    }, 2000)
  }

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.text)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl border border-indigo-500 shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Content Generator</h1>
              <p className="text-indigo-100 text-sm mt-1">Create engaging content powered by AI</p>
            </div>
          </div>
          <Sparkles className="w-8 h-8 text-indigo-200" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">500+</div>
            <div className="text-xs text-indigo-100">Posts Generated</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">95%</div>
            <div className="text-xs text-indigo-100">Quality Score</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-2xl font-bold">4</div>
            <div className="text-xs text-indigo-100">Platforms</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Content Settings</h3>

            {/* Content Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {contentTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {platforms.map((plat) => (
                  <option key={plat.value} value={plat.value}>{plat.label}</option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* AI Features */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 text-sm mb-3">AI Features</h4>
              <div className="space-y-2">
                {[
                  'Emoji optimization',
                  'Hashtag suggestions',
                  'Engagement hooks',
                  'Call-to-action',
                  'SEO optimization'
                ].map((feature, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Templates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">Quick Templates</h3>
            <div className="space-y-2">
              {[
                'Product Launch',
                'Event Promotion',
                'User Testimonial',
                'Behind the Scenes',
                'Educational Post'
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(`Create a ${template.toLowerCase()} post`)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generation Panel */}
        <div className="col-span-2 space-y-4">
          {/* Input */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              What do you want to create?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Create a post about our new product launch with exciting features..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={4}
            />
            
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Content
                  </>
                )}
              </button>
              
              <button className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Generated Content */}
          {generatedContent && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Generated Content</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{generatedContent.text}</p>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    {generatedContent.characterCount} characters
                  </span>
                  <span className="text-gray-600">
                    {generatedContent.hashtags.length} hashtags
                  </span>
                  <span className="text-gray-600">
                    {generatedContent.variations} variations
                  </span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Ready to post</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
                  <Calendar className="w-4 h-4" />
                  Schedule Post
                </button>
                <button className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                  Save Draft
                </button>
                <button className="px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">💡 Pro Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Be specific about your target audience and goals</li>
              <li>• Include key details like product features or event dates</li>
              <li>• Try different tones to see what resonates best</li>
              <li>• Use templates as a starting point and customize</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
