'use client'

import React, { useState } from 'react';
import { Post, Platform, MediaAsset } from '@/types';
import { PLATFORMS, STATUS_CONFIG } from '@/constants';
import { Link as LinkIcon, Globe, Send, Clock, X, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PlatformTemplateRenderer } from '@/components/templates/PlatformTemplateRenderer';

interface PublishedCardProps {
    post: Post;
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    onPublishPost?: (post: Post) => Promise<void>;
    connectedAccounts: Record<Platform, boolean>;
}

const PublishedCard: React.FC<PublishedCardProps> = ({ post, onUpdatePost, onDeletePost, onPublishPost, connectedAccounts }) => {
    const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [mediaPreview, setMediaPreview] = useState<{ type: 'image' | 'video'; url: string } | null>(null);

    const handlePublish = async () => {
        if (!onPublishPost) return;

        setIsPublishing(true);
        setPublishError(null);
        setPublishSuccess(false);

        try {
            // Use the callback from App.tsx to publish
            await onPublishPost(post);
            setPublishSuccess(true);

            // Auto-hide success message after 3 seconds
            setTimeout(() => setPublishSuccess(false), 3000);
        } catch (error) {
            console.error('Publishing error:', error);
            setPublishError(error instanceof Error ? error.message : 'An unexpected error occurred while publishing');
        } finally {
            setIsPublishing(false);
        }
    };
    
    const handleSchedule = () => {
        if (!scheduleDate) return;
        const updates: Partial<Post> = { 
            status: 'scheduled', 
            scheduledAt: new Date(scheduleDate).toISOString() 
        };
        onUpdatePost({ ...post, ...updates });
        setIsScheduleModalOpen(false);
        setScheduleDate('');
    };

    const handleUnschedule = () => {
        const updates: Partial<Post> = {
            status: 'ready_to_publish',
            scheduledAt: undefined
        };
        onUpdatePost({ ...post, ...updates });
    };

    const unconnectedPlatforms = post.platforms.filter(p => !connectedAccounts[p]);
    const canPublish = unconnectedPlatforms.length === 0;

    const StatusChip: React.FC<{ status: Post['status'] }> = ({ status }) => {
        const config = STATUS_CONFIG[status];
        const statusColors: Partial<Record<Post['status'], string>> = {
            'draft': 'bg-gray-100 text-gray-800 border-gray-200',
            'approved': 'bg-purple-100 text-purple-800 border-purple-200',
            'ready_to_publish': 'bg-cyan-100 text-cyan-800 border-cyan-200',
            'scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
            'published': 'bg-green-100 text-green-800 border-green-200',
            'failed': 'bg-red-100 text-red-800 border-red-200'
        };
        const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
        return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colorClass}`}>{config.label}</span>;
    };

    const ActionButton: React.FC<{ onClick: () => void, icon: React.ElementType, label: string, className?: string, disabled?: boolean }> = 
    ({ onClick, icon: Icon, label, className, disabled }) => (
        <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center text-xs font-semibold py-1 px-2.5 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
            <Icon className={`w-3.5 h-3.5 ${label ? 'mr-1.5' : ''} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
            {label && <span className="whitespace-nowrap text-xs">{label}</span>}
        </button>
    );

    const MediaPreviewModal = () => {
        if (!mediaPreview) return null;

        return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setMediaPreview(null)}>
                <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setMediaPreview(null)} 
                        className="absolute -top-12 right-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    {mediaPreview.type === 'image' ? (
                        <img 
                            src={mediaPreview.url} 
                            alt="Preview" 
                            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl mx-auto"
                        />
                    ) : (
                        <video 
                            src={mediaPreview.url} 
                            controls 
                            autoPlay
                            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl mx-auto"
                        />
                    )}
                </div>
            </div>
        );
    };

    const ScheduleModal = () => (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsScheduleModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Schedule Post</h2>
                    <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </header>
                <div className="p-6 space-y-4">
                     <p className="text-gray-700">Select a date and time to schedule this post for.</p>
                     <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-3"
                        min={new Date().toISOString().slice(0, 16)}
                    />
                    <button
                        onClick={handleSchedule}
                        disabled={!scheduleDate}
                        className="w-full inline-flex justify-center items-center py-3 px-4 shadow-md text-base font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                    >
                       Confirm Schedule
                    </button>
                </div>
            </div>
        </div>
    );

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

    const PlatformSwitcher = () => (
        <div className="flex items-center gap-1 mb-3 p-0.5 bg-gray-100 rounded-lg">
            {post.platforms.map(p => {
                const platformInfo = PLATFORMS.find(info => info.id === p);
                if (!platformInfo) return null;
                const { icon: Icon } = platformInfo;
                return (
                    <button
                        key={p}
                        onClick={() => setActivePlatform(p)}
                        title={`Preview on ${platformInfo.name}`}
                        className={`flex-1 flex justify-center items-center p-1.5 rounded-md transition-all ${ activePlatform === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200' }`}
                    > <Icon className="w-4 h-4" /> </button>
                );
            })}
        </div>
    );

    const renderActions = () => {
        switch (post.status) {
            case 'ready_to_publish':
                return (
                    <div className="flex flex-col w-full gap-2">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex gap-1.5 flex-wrap">
                                <ActionButton onClick={() => setIsScheduleModalOpen(true)} icon={Clock} label="Schedule" className="text-white bg-purple-600 hover:bg-purple-700 shadow-md" />
                                <ActionButton 
                                    onClick={handlePublish} 
                                    disabled={!canPublish || isPublishing} 
                                    icon={isPublishing ? Loader2 : Send} 
                                    label={isPublishing ? 'Publishing...' : 'Publish Now'} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" 
                                />
                            </div>
                            <ActionButton onClick={() => onDeletePost(post.id)} icon={Trash2} label="" className="bg-red-600 hover:bg-red-700 text-white w-7 h-7 shadow-md" />
                        </div>
                        {!canPublish && (
                            <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 p-2 rounded-lg flex items-center gap-2">
                                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Connect {unconnectedPlatforms.map(p => PLATFORMS.find(info => info.id === p)?.name).join(', ')} account(s) to publish.</span>
                            </div>
                        )}
                        {publishError && (
                            <div className="text-xs text-red-800 bg-red-50 border border-red-200 p-2 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{publishError}</span>
                            </div>
                        )}
                        {publishSuccess && (
                            <div className="text-xs text-green-800 bg-green-50 border border-green-200 p-2 rounded-lg flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Successfully published to all platforms! 🎉</span>
                            </div>
                        )}
                    </div>
                );
            case 'scheduled':
                return (
                     <div className="flex items-center justify-between w-full text-xs">
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                           <Clock className="w-3.5 h-3.5"/>
                           <span className="font-medium">{new Date(post.scheduledAt!).toLocaleString()}</span>
                        </div>
                        <button onClick={handleUnschedule} className="text-xs text-gray-700 hover:text-gray-900 hover:underline">Unschedule</button>
                    </div>
                );
            case 'published':
                return (
                    <div className="flex items-center justify-between w-full text-xs">
                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                           <Globe className="w-3.5 h-3.5"/>
                           <span className="font-medium">{new Date(post.publishedAt!).toLocaleString()}</span>
                        </div>
                        <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline">View Live Post</a>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <>
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg flex flex-col overflow-hidden border border-gray-200 transition-all">
            <div className="flex-grow p-3">
                <PlatformPreview platform={activePlatform} />
            </div>
            <div className="p-2.5 bg-gray-50 flex flex-wrap gap-1.5 justify-between items-center border-t border-gray-200">
                {renderActions()}
            </div>
        </div>
        <MediaPreviewModal />
        {isScheduleModalOpen && <ScheduleModal />}
        </>
    );
};

export default PublishedCard;