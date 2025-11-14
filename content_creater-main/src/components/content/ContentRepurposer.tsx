'use client'

import React, { useState } from 'react';
import { Post, Platform, PostType } from '@/types';
import { PLATFORMS } from '@/constants';
import { Sparkles, Loader2, FileText, Link as LinkIcon, Upload, Save, Video, Image as ImageIcon, CheckCircle, Eye, Edit2, Trash2, ArrowUpDown, AlertTriangle } from 'lucide-react';

interface ContentRepurposerProps {
  onPostsCreated: (posts: Post[]) => void;
}

const ContentRepurposer: React.FC<ContentRepurposerProps> = ({ onPostsCreated }) => {
  const [inputType, setInputType] = useState<'text' | 'url' | 'file'>('text');
  const [longFormContent, setLongFormContent] = useState('');
  const [url, setUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['twitter', 'linkedin']);
  const [numberOfPosts, setNumberOfPosts] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>([]);
  
  // Enhanced UI states
  const [isDragging, setIsDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'order' | 'length'>('order');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setLongFormContent(text);
      setFileLoading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setFileLoading(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.md'))) {
      setInputType('file');
      handleFileUpload({ target: { files: [file] } } as any);
    } else {
      setError('Please drop a .txt or .md file');
    }
  };

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleDeletePost = (postId: string) => {
    setGeneratedPosts(prev => prev.filter(p => p.id !== postId));
  };

  const fetchContentFromURL = async () => {
    // In a real app, you'd use a backend service to fetch and parse the URL
    // For now, we'll just show a placeholder
    setError('URL fetching requires a backend service. Please paste the content directly.');
  };

  const handleRepurpose = async () => {
    if (!longFormContent.trim()) {
      setError('Please provide content to repurpose.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setGeneratedPosts([]);

    try {
      // Call the new API route instead of direct service
      const response = await fetch('/api/ai/content/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          longFormContent,
          platforms: selectedPlatforms,
          numberOfPosts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to repurpose content');
      }

      const { data: repurposedPosts } = await response.json();

      const posts: Post[] = repurposedPosts.map((post: any) => {
        // Determine optimal post type for each platform
        const postTypeMap: Record<Platform, PostType> = {
          twitter: 'post',
          linkedin: post.content?.imageSuggestion ? 'carousel' : 'post',
          facebook: post.content?.videoSuggestion ? 'reel' : (post.content?.imageSuggestion ? 'carousel' : 'post'),
          instagram: post.content?.videoSuggestion ? 'reel' : (post.content?.imageSuggestion ? 'carousel' : 'feed'),
          tiktok: post.content?.videoSuggestion ? 'video' : (post.content?.imageSuggestion ? 'slideshow' : 'video'),
          youtube: post.content?.videoSuggestion ? 'video' : 'short',
        };

        // Infer postType from available content
        const inferredPostType = selectedPlatforms.length > 0
          ? postTypeMap[selectedPlatforms[0]]
          : 'post';

        // Enhance image suggestion for Gemini API
        let enhancedImageSuggestion = undefined;
        if (post.content?.imageSuggestion) {
          const hasQualityKeywords = /high.?resolution|4k|professional|cinematic|studio|detailed|composition/i.test(post.content.imageSuggestion);
          if (!hasQualityKeywords) {
            enhancedImageSuggestion = `${post.content.imageSuggestion}. Style: professional, high-resolution, cinematic quality. Composition: well-balanced, eye-catching. Colors: vibrant and engaging. Perfect for social media.`;
          } else {
            enhancedImageSuggestion = post.content.imageSuggestion;
          }
        }

        // Enhance video suggestion for Gemini API
        let enhancedVideoSuggestion = undefined;
        if (post.content?.videoSuggestion) {
          const hasTechKeywords = /9:16|vertical|duration|pacing|cinematic|seconds|fps|editing/i.test(post.content.videoSuggestion);
          if (!hasTechKeywords) {
            enhancedVideoSuggestion = `${post.content.videoSuggestion}. Format: 9:16 vertical video, 30-45 seconds. Style: cinematic quality, professional editing, engaging pacing, smooth transitions. Include text overlays, energetic transitions, modern visual effects. Perfect for TikTok, Instagram Reels, YouTube Shorts.`;
          } else {
            enhancedVideoSuggestion = post.content.videoSuggestion;
          }
        }

        return {
          id: crypto.randomUUID(),
          topic: post.topic,
          platforms: selectedPlatforms,
          postType: inferredPostType,
          content: {
            ...post.content,
            imageSuggestion: enhancedImageSuggestion,
            videoSuggestion: enhancedVideoSuggestion,
          },
          status: 'draft' as const,
          createdAt: new Date().toISOString(),
          isGeneratingImage: false,
          isGeneratingVideo: false,
          videoGenerationStatus: '',
        };
      });

      setGeneratedPosts(posts);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAll = () => {
    onPostsCreated(generatedPosts);
    setGeneratedPosts([]);
    setLongFormContent('');
    setUrl('');
  };

  // Calculate steps progress
  const steps = [
    { id: 1, name: 'Input Content', completed: longFormContent.length > 0 },
    { id: 2, name: 'Select Platforms', completed: selectedPlatforms.length > 0 },
    { id: 3, name: 'Generate Posts', completed: generatedPosts.length > 0 }
  ];

  const sortedPosts = [...generatedPosts].sort((a, b) => {
    if (sortBy === 'length') {
      const aLength = typeof a.content?.[selectedPlatforms[0]] === 'string' 
        ? (a.content[selectedPlatforms[0]] as string).length 
        : 0;
      const bLength = typeof b.content?.[selectedPlatforms[0]] === 'string' 
        ? (b.content[selectedPlatforms[0]] as string).length 
        : 0;
      return bLength - aLength;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          Content Repurposer
        </h2>
        <p className="text-gray-600 mt-2 text-sm">
          Transform long-form content into multiple engaging social media posts
        </p>
        
        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all ${
                  step.completed 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? '✓' : step.id}
                </div>
                <span className={`text-sm font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-12 transition-all ${
                  step.completed ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        {/* Input Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">Input Source</label>
          <div className="flex gap-3">
            <button
              onClick={() => setInputType('text')}
              className={`relative overflow-hidden group flex items-center px-4 py-2.5 rounded-lg transition-all font-medium transform hover:scale-105 active:scale-95 ${
                inputType === 'text' ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <FileText className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">Paste Text</span>
              {inputType === 'text' && <CheckCircle className="w-4 h-4 ml-2 relative z-10" />}
            </button>
            <button
              onClick={() => setInputType('url')}
              className={`relative overflow-hidden group flex items-center px-4 py-2.5 rounded-lg transition-all font-medium transform hover:scale-105 active:scale-95 ${
                inputType === 'url' ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <LinkIcon className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">From URL</span>
              {inputType === 'url' && <CheckCircle className="w-4 h-4 ml-2 relative z-10" />}
            </button>
            <label
              className={`relative overflow-hidden group flex items-center px-4 py-2.5 rounded-lg transition-all cursor-pointer font-medium transform hover:scale-105 active:scale-95 ${
                inputType === 'file' ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Upload className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">Upload File</span>
              {inputType === 'file' && <CheckCircle className="w-4 h-4 ml-2 relative z-10" />}
              <input
                type="file"
                accept=".txt,.md"
                onChange={(e) => {
                  setInputType('file');
                  handleFileUpload(e);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Content Input */}
        {inputType === 'text' && (
          <div 
            className="mb-4"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <label className="block text-sm font-medium text-gray-900 mb-2">Long-Form Content</label>
            <div className={`relative transition-all ${isDragging ? 'scale-[1.02]' : ''}`}>
              <textarea
                value={longFormContent}
                onChange={(e) => setLongFormContent(e.target.value)}
                placeholder="Paste your blog post, article, video transcript, or any long-form content here..."
                className={`w-full h-64 px-4 py-3 bg-white border-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                }`}
              />
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-50 bg-opacity-90 border-2 border-dashed border-indigo-500 rounded-lg pointer-events-none">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-indigo-600" />
                    <p className="text-indigo-900 font-semibold">Drop your file here</p>
                    <p className="text-indigo-700 text-sm">.txt or .md files accepted</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm mt-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all ${
                  longFormContent.length >= 500 ? 'bg-green-500' : longFormContent.length > 0 ? 'bg-amber-500' : 'bg-gray-300'
                }`} />
                <span className="text-gray-700 font-medium">{longFormContent.length} characters</span>
              </div>
              {longFormContent.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">~{Math.ceil(longFormContent.split(' ').length / 200)} min read</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{longFormContent.split(/\n\n+/).filter(p => p.trim()).length} paragraphs</span>
                </>
              )}
              {longFormContent.length < 500 && longFormContent.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-amber-600 font-medium">{500 - longFormContent.length} more recommended</span>
                </>
              )}
            </div>
          </div>
        )}

        {inputType === 'url' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">Content URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/blog-post"
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={fetchContentFromURL}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                Fetch
              </button>
            </div>
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              URL fetching requires backend integration (not yet implemented)
            </p>
          </div>
        )}

        {inputType === 'file' && (
          <div className="mb-4">
            {fileLoading ? (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-gray-600 font-medium">Loading file...</p>
              </div>
            ) : longFormContent ? (
              <>
                <label className="block text-sm font-medium text-gray-900 mb-2">File Content Preview</label>
                <textarea
                  value={longFormContent}
                  onChange={(e) => setLongFormContent(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {longFormContent.length} characters · File loaded successfully
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium mb-1">No file selected</p>
                <p className="text-gray-500 text-sm">Use the button above to upload a file</p>
              </div>
            )}
          </div>
        )}

        {/* Platform Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">Target Platforms</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(({ id, name, icon: Icon }) => (
              <label
                key={id}
                className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer transition-all border-2 transform hover:scale-105 active:scale-95 ${
                  selectedPlatforms.includes(id)
                    ? 'bg-indigo-50 border-indigo-500 shadow-md hover:shadow-lg'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(id)}
                  onChange={() => handlePlatformChange(id)}
                  className="hidden"
                />
                <Icon className={`w-6 h-6 ${selectedPlatforms.includes(id) ? 'text-indigo-600' : 'text-gray-600'}`} />
                <span className={`font-medium ${selectedPlatforms.includes(id) ? 'text-indigo-900' : 'text-gray-700'}`}>{name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Number of Posts */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Number of Posts to Generate: <span className="text-indigo-600 font-bold">{numberOfPosts}</span>
          </label>
          <input
            type="range"
            min="3"
            max="10"
            value={numberOfPosts}
            onChange={(e) => setNumberOfPosts(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3 posts</span>
            <span>10 posts</span>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

        {/* Action Button */}
        <button
          onClick={handleRepurpose}
          disabled={isProcessing || !longFormContent.trim()}
          className="w-full flex items-center justify-center py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-bold text-base shadow-md transform hover:scale-105 active:scale-95 hover:shadow-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin w-4 h-4 mr-1.5" />
              <span className="whitespace-nowrap">Generating {numberOfPosts} Posts...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span className="whitespace-nowrap">Repurpose Content</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Posts Preview */}
      {generatedPosts.length > 0 && (
        <div className={showSuccessAnimation ? 'animate-fade-in-up' : ''}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                Generated Posts
                {showSuccessAnimation && <span className="text-2xl">🎉</span>}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{generatedPosts.length} posts ready to save</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort Control */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'order' | 'length')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="order">Original Order</option>
                  <option value="length">By Length</option>
                </select>
              </div>
              {/* Save All Button */}
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-bold text-sm shadow-md transform hover:scale-105 active:scale-95 hover:shadow-lg"
              >
                <Save className="w-4 h-4" />
                Save All ({generatedPosts.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedPosts.map((post, index) => {
              const isExpanded = expandedPosts.has(post.id);
              const contentText = typeof post?.content?.[selectedPlatforms?.[0]] === 'string'
                ? post.content[selectedPlatforms[0]]
                : typeof post?.content?.[selectedPlatforms?.[0]] === 'object'
                ? (post.content[selectedPlatforms[0]] as any)?.description || 'No content'
                : 'No content';
              const shouldShowExpand = contentText.length > 150;
              
              return (
              <div key={post.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all transform hover:scale-[1.02] hover:-translate-y-1">
                {/* Card Header */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Post {index + 1}</h4>
                        <p className="text-xs text-gray-600">Draft</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {selectedPlatforms.map(platform => {
                        const platformInfo = PLATFORMS.find(p => p.id === platform);
                        if (!platformInfo) return null;
                        const { icon: Icon } = platformInfo;
                        return <Icon key={platform} className="w-4 h-4 text-gray-600" />;
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Topic */}
                  <div className="pb-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">{post.topic}</p>
                  </div>
                  
                  {/* Content Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Content</p>
                      </div>
                      <span className="text-xs text-gray-500">{contentText.length} chars</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg min-h-[100px]">
                      <p className={`text-gray-900 text-base leading-relaxed ${!isExpanded && shouldShowExpand ? 'line-clamp-4' : ''}`}>
                        {contentText}
                      </p>
                      {shouldShowExpand && (
                        <button
                          onClick={() => togglePostExpansion(post.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2 flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Show less
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              Show more
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image Script Preview */}
                  {post.content?.imageSuggestion && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Picture Script</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                        <p className="text-gray-700 text-xs italic leading-relaxed line-clamp-3">
                          "{post.content.imageSuggestion}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Video Script Preview */}
                  {post.content?.videoSuggestion && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-600" />
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Video Script</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                        <p className="text-gray-700 text-xs italic leading-relaxed line-clamp-3">
                          "{post.content.videoSuggestion}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Individual Post Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                    <button className="px-4 flex items-center justify-center gap-1.5 text-xs py-2.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentRepurposer;
