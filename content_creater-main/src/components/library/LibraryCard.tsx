'use client'

import React, { useState } from 'react';
import { Post, Platform, MediaAsset } from '@/types';
import { PLATFORMS } from '@/constants';
import { Download, Trash2, Eye, X } from 'lucide-react';
import { PlatformTemplateRenderer } from '@/components/templates/PlatformTemplateRenderer';

interface LibraryCardProps {
    post: Post;
    onDelete: (postId: string) => void;
    onDownload: (post: Post) => void;
}

const LibraryCard: React.FC<LibraryCardProps> = ({ post, onDelete, onDownload }) => {
    const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Build media array from post properties
    const media: MediaAsset[] = [];
    if (post.generatedImage) {
        media.push({
            id: `image-${Date.now()}`,
            name: 'Generated Image',
            type: 'image' as const,
            url: post.generatedImage,
            size: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            source: 'ai-generated' as const,
            usedInPosts: [post.id]
        });
    }
    if (post.generatedVideoUrl) {
        media.push({
            id: `video-${Date.now()}`,
            name: 'Generated Video',
            type: 'video' as const,
            url: post.generatedVideoUrl,
            size: 0,
            tags: [],
            createdAt: new Date().toISOString(),
            source: 'ai-generated' as const,
            usedInPosts: [post.id]
        });
    }

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this post from the library? This action cannot be undone.')) {
            setIsDeleting(true);
            try {
                onDelete(post.id);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const platformInfo = PLATFORMS.find(p => p.id === activePlatform);

    return (
        <>
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 transition-all overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 break-words">{post.topic}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Published: {new Date(post.publishedAt || post.createdAt).toLocaleDateString()} at {new Date(post.publishedAt || post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            {post.platforms.map(platform => {
                                const info = PLATFORMS.find(p => p.id === platform);
                                if (!info) return null;
                                const { icon: Icon } = info;
                                return (
                                    <button
                                        key={platform}
                                        onClick={() => setActivePlatform(platform)}
                                        className={`p-2 rounded-lg transition-all ${
                                            activePlatform === platform
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                        title={info.name}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 p-4 flex items-center justify-center min-h-[200px] bg-gray-50">
                    <button
                        onClick={() => setIsPreviewOpen(true)}
                        className="w-full h-full flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                        <div className="text-center">
                            <Eye className="w-8 h-8 text-indigo-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-medium text-gray-700">Click to preview on {platformInfo?.name}</p>
                        </div>
                    </button>
                </div>

                {/* Post Details */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                            <p className="text-gray-600">Post Type</p>
                            <p className="font-semibold text-gray-900 capitalize">{post.postType || 'post'}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Platforms</p>
                            <p className="font-semibold text-gray-900">{post.platforms.length} platform{post.platforms.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Content Preview */}
                    <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Content Preview</p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                            {typeof post.content?.[activePlatform] === 'string'
                                ? post.content[activePlatform]
                                : typeof post.content?.[activePlatform] === 'object'
                                ? (post.content[activePlatform] as any)?.description || 'No content'
                                : 'No content'}
                        </p>
                    </div>

                    {/* Media Indicators */}
                    {(post.generatedImage || post.generatedVideoUrl) && (
                        <div className="flex gap-2 text-xs mb-3">
                            {post.generatedImage && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">📸 Image</span>
                            )}
                            {post.generatedVideoUrl && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">🎥 Video</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
                    <button
                        onClick={() => onDownload(post)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm shadow-md transform hover:scale-105 active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center justify-center py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-md transform hover:scale-105 active:scale-95"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsPreviewOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200" onClick={e => e.stopPropagation()}>
                        <header className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">Post Preview</h2>
                            <button onClick={() => setIsPreviewOpen(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="p-6 overflow-y-auto flex justify-center">
                            <PlatformTemplateRenderer
                                post={post}
                                platform={activePlatform}
                                postType={post.postType || 'post'}
                                media={media}
                                mode="published"
                            />
                        </div>
                    </div>
                    <style>{`
                        @keyframes fade-in {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                        .animate-fade-in {
                            animation: fade-in 0.2s ease-out forwards;
                        }
                    `}</style>
                </div>
            )}
        </>
    );
};

export default LibraryCard;
