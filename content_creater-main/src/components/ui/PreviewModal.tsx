'use client'

import React, { useState, useEffect } from 'react';
import { Post, Platform, MediaAsset } from '@/types';
import { PLATFORMS } from '@/constants';
import { X } from 'lucide-react';
import { PlatformTemplateRenderer } from '@/components/templates/PlatformTemplateRenderer';

interface PreviewModalProps {
    post: Post;
    onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ post, onClose }) => {
    const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0] ?? 'twitter');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const PlatformPreview: React.FC<{ platform: Platform }> = ({ platform }) => {
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

        // Get content for the platform
        const rawContent = post.content?.[platform] || '';
        const content = typeof rawContent === 'string'
            ? rawContent
            : typeof rawContent === 'object'
            ? (rawContent as any)?.description || ''
            : '';

        return (
            <div className="flex justify-center w-full">
                <PlatformTemplateRenderer
                    post={post}
                    platform={platform}
                    postType={post.postType || 'post'}
                    media={media}
                    mode="preview"
                />
            </div>
        );
    };

    const PlatformTabs: React.FC = () => (
        <div className="flex items-center border-b border-slate/30 mb-4">
            {post.platforms.map(p => {
                const platformInfo = PLATFORMS.find(info => info.id === p);
                if (!platformInfo) return null;
                const { icon: Icon, name } = platformInfo;
                return (
                    <button
                        key={p}
                        onClick={() => setActivePlatform(p)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                            activePlatform === p ? 'border-charcoal text-charcoal-dark' : 'border-transparent text-slate hover:text-charcoal-dark'
                        }`}
                    >
                        <Icon className="w-5 h-5" />
                        <span>{name}</span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate/30" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate/30 flex-shrink-0">
                    <h2 className="text-xl font-bold text-charcoal-dark">Post Preview</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate hover:bg-slate/10 hover:text-charcoal-dark transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-6 overflow-y-auto">
                    <PlatformTabs />
                    <PlatformPreview platform={activePlatform} />
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
    );
};

export default PreviewModal;
