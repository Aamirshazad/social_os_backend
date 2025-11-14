'use client'

import React, { useState, useEffect } from 'react';
import { Post, Platform, PostContent } from '@/types';
import { PLATFORMS, STATUS_CONFIG } from '@/constants';
import { autoSaveAIMedia } from '@/services/mediaService';
import { Loader2, Video, Image as ImageIcon, Edit, Save, Trash2, Send, CheckCircle, AlertTriangle, ExternalLink, Sparkles, Eye, X, ArrowRightCircle, Settings } from 'lucide-react';
import PreviewModal from '@/components/ui/PreviewModal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { MediaGenerationProgress } from '@/components/ui/MediaGenerationProgress';
import { calculateVideoProgress, getVideoStatusMessage } from '@/utils/videoProgress';
import type { ImageGenerationOptions } from '@/features/imageGeneration';
import { getPresetForPlatform } from '@/features/imageGeneration';
import { ImagePresetButtons } from '@/components/content/ImagePresetButtons';

interface PostCardProps {
    post: Post;
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    isApiKeyReady: boolean;
    onSelectKey: () => void;
    resetApiKeyStatus: () => void;
    connectedAccounts: Record<Platform, boolean>;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdatePost, onDeletePost, isApiKeyReady, onSelectKey, resetApiKeyStatus }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<PostContent>(post.content ?? ({} as PostContent));
    const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0] ?? 'twitter');
    const [isImproving, setIsImproving] = useState<{ image: boolean; video: boolean }>({ image: false, video: false });
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [improveModalOpen, setImproveModalOpen] = useState<'image' | 'video' | null>(null);
    const [improvePromptInput, setImprovePromptInput] = useState('');
    const [mediaPreview, setMediaPreview] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
    // Initialize with platform-specific preset
    const [imageOptions, setImageOptions] = useState<ImageGenerationOptions>(
        getPresetForPlatform(post.platforms[0] ?? 'twitter')
    );
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [editImagePrompt, setEditImagePrompt] = useState('');

    useEffect(() => {
        if (!isEditing) {
            setEditedContent(post.content ?? ({} as PostContent));
        }
    }, [post.content, isEditing]);

    // Auto-update image options when platform changes
    useEffect(() => {
        const platformPreset = getPresetForPlatform(activePlatform);
        setImageOptions(platformPreset);
        console.log(`🎨 Auto-selected ${activePlatform} image preset:`, platformPreset);
    }, [activePlatform]);

    const handleContentChange = (platform: Platform, value: string) => {
        setEditedContent(prev => ({ ...prev, [platform]: value }));
    };

    const handleSuggestionChange = (type: 'imageSuggestion' | 'videoSuggestion', value: string) => {
        setEditedContent(prev => ({ ...prev, [type]: value }));
    }

    const handleSave = () => {
        onUpdatePost({ ...post, content: editedContent });
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setIsEditing(false);
        setEditedContent(post.content);
    };

    const handleStatusChange = (newStatus: Post['status']) => {
        const updates: Partial<Post> = { status: newStatus };
        onUpdatePost({ ...post, ...updates });
    };

    const handleOpenImproveModal = (type: 'image' | 'video') => {
        setImproveModalOpen(type);
        setImprovePromptInput('');
    };

    const handleImproveSuggestion = async () => {
        if (!improveModalOpen) return;
        const type = improveModalOpen;
        const suggestionKey = type === 'image' ? 'imageSuggestion' : 'videoSuggestion';
        const currentSuggestion = editedContent[suggestionKey];
        if (!currentSuggestion) return;

        setIsImproving(prev => ({...prev, [type]: true}));
        setImproveModalOpen(null);
        try {
            // Call the new API route instead of direct service
            const response = await fetch('/api/ai/prompts/improve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: currentSuggestion,
                    type,
                    userGuidance: improvePromptInput || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to improve prompt');
            }

            const { data } = await response.json();
            setEditedContent(prev => ({ ...prev, [suggestionKey]: data.improvedPrompt }));
        } catch (error) {
            console.error(`Error improving ${type} suggestion:`, error);
        } finally {
            setIsImproving(prev => ({...prev, [type]: false}));
            setImprovePromptInput('');
        }
    };

    const handleGenerateImage = async () => {
        const imageSuggestion = post.content?.imageSuggestion;
        if (!imageSuggestion) {
            console.warn('[PostCard] No image suggestion provided');
            alert('No image description available. Please generate content with image suggestions first.');
            return;
        }
        
        // Start image generation with streaming
        onUpdatePost({ 
            ...post, 
            isGeneratingImage: true, 
            generatedImage: undefined, 
            imageGenerationProgress: 0 
        });
        
        try {
            console.log('[PostCard] Starting streaming image generation:', {
                prompt: imageSuggestion,
                options: imageOptions,
                platform: activePlatform,
                partial_images: 2
            });
            
            // Use streaming endpoint for progressive image generation
            const response = await fetch('/api/ai/media/image/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: imageSuggestion,
                    options: imageOptions,
                    partial_images: 2  // Show 2 partial images during generation
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[PostCard] API error response:', errorData);
                throw new Error(errorData.error || `Failed to generate image (${response.status})`);
            }

            if (!response.body) {
                throw new Error('No response body for streaming');
            }

            // Process Server-Sent Events stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalImageUrl = '';
            let metadata: any = null;
            let generatedAt = Date.now();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;

                    const data = JSON.parse(line.slice(6));

                    if (data.type === 'partial') {
                        // Show partial image as it arrives (progressive generation)
                        const partialImageUrl = `data:image/png;base64,${data.b64_json}`;
                        console.log(`📊 Partial image ${data.partial_image_index + 1}/2: ${Math.round(data.progress)}%`);
                        
                        onUpdatePost({
                            ...post,
                            generatedImage: partialImageUrl,
                            imageGenerationProgress: data.progress,
                            isGeneratingImage: true
                        });

                    } else if (data.type === 'complete') {
                        console.log('✅ Streaming complete - final image and metadata received');
                        
                        // Complete event from API route with final image and metadata
                        // Use imageUrl from complete event (it's the final high-quality image)
                        finalImageUrl = data.imageUrl || `data:image/png;base64,${data.b64_json}`;
                        metadata = data.metadata;
                        generatedAt = data.generatedAt || Date.now();
                        
                    } else if (data.type === 'error') {
                        throw new Error(data.error);
                    }
                }
            }

            console.log('[PostCard] Streaming complete, saving to media library');
            
            // Auto-save final image to media library
            if (finalImageUrl) {
                await autoSaveAIMedia(finalImageUrl, 'image', post.topic);
            }
            
            onUpdatePost({ 
                ...post, 
                generatedImage: finalImageUrl, 
                isGeneratingImage: false,
                imageGenerationProgress: 100,
                imageMetadata: metadata,
                generatedImageTimestamp: generatedAt,
            });

        } catch (error) {
            console.error('[PostCard] Image streaming failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[PostCard] Error details:', {
                message: errorMessage,
                prompt: post.content?.imageSuggestion,
                options: imageOptions
            });
            
            // Show error to user
            alert(`Image generation failed: ${errorMessage}\n\nCheck console for details.`);
            
            onUpdatePost({ 
                ...post, 
                isGeneratingImage: false, 
                imageGenerationProgress: 0,
                generatedImage: undefined
            });
        }
    };

    const handleEditImage = async () => {
        if (!editImagePrompt || !post.generatedImage) return;
        
        onUpdatePost({ ...post, isGeneratingImage: true, imageGenerationProgress: 0 });
        
        try {
            console.log('[PostCard] Editing image with new prompt:', editImagePrompt);
            console.log('[PostCard] Image URL type:', typeof post.generatedImage);
            console.log('[PostCard] Image URL starts with:', post.generatedImage.substring(0, 50));
            
            // Call the edit API endpoint (per OpenAI docs: edit with reference image)
            const response = await fetch('/api/ai/media/image/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: editImagePrompt,
                    imageUrl: post.generatedImage,
                    input_fidelity: 'high', // Per OpenAI docs: preserve details from original
                    options: imageOptions,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to edit image');
            }

            const { data } = await response.json();
            console.log('[PostCard] Image edited successfully');
            
            // Auto-save edited image to media library
            await autoSaveAIMedia(data.imageUrl, 'image', post.topic);
            
            onUpdatePost({ 
                ...post, 
                generatedImage: data.imageUrl, 
                isGeneratingImage: false,
                imageGenerationProgress: 100,
                imageMetadata: data.metadata,
                generatedImageTimestamp: data.generatedAt,
            });
            
            // Reset edit mode
            setIsEditingImage(false);
            setEditImagePrompt('');
        } catch (error) {
            console.error('[PostCard] Image editing failed:', error);
            onUpdatePost({ ...post, isGeneratingImage: false, imageGenerationProgress: 0 });
        }
    };
    
    const handleGenerateVideo = async () => {
        if (!editedContent.videoSuggestion) return;
        try {
            onUpdatePost({ ...post, isGeneratingVideo: true, videoGenerationStatus: 'Starting...', generatedVideoUrl: undefined });
            
            // Call the new API route instead of direct service
            const response = await fetch('/api/ai/media/video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: editedContent.videoSuggestion,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate video');
            }

            const { data } = await response.json();
            const operation = data.operation;
            
            console.log('Video generation started:', operation);
            console.log('Video ID:', operation.id, 'Status:', operation.status);
            
            onUpdatePost({ 
                ...post, 
                isGeneratingVideo: true, 
                videoGenerationStatus: `Queued (${operation.status})`, 
                videoOperation: operation, 
                content: editedContent 
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'API_KEY_INVALID') {
                resetApiKeyStatus();
            }
            onUpdatePost({ ...post, isGeneratingVideo: false, videoGenerationStatus: 'Generation failed.' });
        }
    };

    const StatusChip: React.FC<{ status: Post['status'] }> = ({ status }) => {
        const config = STATUS_CONFIG[status];
        const statusColors: Partial<Record<Post['status'], string>> = {
            'draft': 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm',
            'approved': 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm shadow-purple-100',
            'ready_to_publish': 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm shadow-cyan-100',
            'scheduled': 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100',
            'published': 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100',
            'failed': 'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100'
        };
        const colorClass = statusColors[status] || 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm';
        return <span className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${colorClass}`}>{config.label}</span>;
    };
    
    const PlatformTab: React.FC<{ platform: Platform }> = ({ platform }) => {
        const platformInfo = PLATFORMS.find(p => p.id === platform);
        if (!platformInfo) return null;
        const { icon: Icon } = platformInfo;

        return (
            <button
                onClick={() => setActivePlatform(platform)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-all duration-200 border-b-2 ${
                    activePlatform === platform ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
                <Icon className="w-5 h-5" />
            </button>
        );
    };

    const ActionButton: React.FC<{ onClick: () => void, icon: React.ElementType, label: string, className?: string, disabled?: boolean }> = 
    ({ onClick, icon: Icon, label, className, disabled }) => (
        <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center text-sm font-semibold py-1 px-2.5 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
            <Icon className={`w-3.5 h-3.5 ${label ? 'mr-1.5' : ''} ${disabled && (label.includes('Generating') || label.includes('Improving') || label.includes('Processing')) ? 'animate-spin' : ''}`} />
            {label && <span className="whitespace-nowrap text-sm">{label}</span>}
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

    const ImproveModal = () => {
        if (!improveModalOpen) return null;
        const type = improveModalOpen;
        const typeLabel = type === 'image' ? 'Picture' : 'Video';

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setImproveModalOpen(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center p-6 border-b border-gray-200">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Improve {typeLabel} Script</h2>
                            <p className="text-sm text-gray-600 mt-1">Provide guidance to enhance the script</p>
                        </div>
                        <button onClick={() => setImproveModalOpen(null)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </header>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                What would you like to improve? (Optional)
                            </label>
                            <textarea
                                value={improvePromptInput}
                                onChange={(e) => setImprovePromptInput(e.target.value)}
                                placeholder={`e.g., "Make it more cinematic", "Add more details about lighting", "Focus on emotional impact"...`}
                                className="w-full h-32 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm leading-relaxed"
                                autoFocus
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Leave empty to use AI's default improvement suggestions
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleImproveSuggestion}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-amber-500/30"
                            >
                                <Sparkles className="w-4 h-4" />
                                Improve Script
                            </button>
                            <button
                                onClick={() => setImproveModalOpen(null)}
                                className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-md flex flex-col overflow-hidden border border-gray-200 transition-all duration-300 ease-in-out transform hover:scale-[1.01]">
                <div className="flex-grow p-2.5 space-y-2">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                        <div className="flex gap-1">
                            {post.platforms.map(p => <PlatformTab key={p} platform={p} />)}
                        </div>
                        <StatusChip status={post.status} />
                    </div>
                    {/* Content Section */}
                    <div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                            <textarea
                                readOnly={!isEditing}
                                value={typeof editedContent?.[activePlatform] === 'string'
                                  ? editedContent[activePlatform]
                                  : typeof editedContent?.[activePlatform] === 'object'
                                  ? (editedContent[activePlatform] as any)?.description || ''
                                  : ''}
                                onChange={(e) => handleContentChange(activePlatform, e.target.value)}
                                className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-800 text-sm leading-relaxed font-normal ${
                                    !isEditing ? 'cursor-default' : ''
                                }`}
                                style={{ minHeight: isEditing ? '220px' : '170px' }}
                            />
                        </div>
                    </div>
                    {isEditing ? (
                        <>
                            {/* EDITING VIEW FOR MEDIA - Simplified UI */}
                            {/* Platform settings are auto-applied based on active platform */}
                            {/* Always show in edit mode */}
                            <div>
                                <div className="bg-emerald-50 p-2 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold text-emerald-700">
                                            📸 Image Generation
                                        </label>
                                        {!post.content?.imageSuggestion && (
                                            <span className="text-xs text-emerald-600 italic">Auto from content</span>
                                        )}
                                    </div>
                                        {/* Image Preview */}
                                        {post.isGeneratingImage && post.generatedImage ? (
                                            /* Show partial image while streaming */
                                            <div className="relative">
                                                <img 
                                                    src={post.generatedImage} 
                                                    alt="Generating..." 
                                                    className="rounded-lg w-full border border-emerald-300 opacity-80 blur-[2px] transition-all duration-300"
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/30 to-transparent rounded-lg">
                                                    <Loader2 className="w-10 h-10 text-white animate-spin mb-2 drop-shadow-lg" />
                                                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                                        <p className="text-sm font-bold text-emerald-600">
                                                            {Math.round(post.imageGenerationProgress || 0)}%
                                                        </p>
                                                        <p className="text-xs text-gray-600">Generating...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : post.isGeneratingImage ? (
                                            /* Show progress spinner if no partial image yet */
                                            <MediaGenerationProgress type="image" height="250px" />
                                        ) : post.generatedImage ? (
                                            <div className="space-y-2">
                                                <div className="relative group">
                                                    <img 
                                                        src={post.generatedImage} 
                                                        alt="Generated" 
                                                        className="rounded-lg w-full border border-emerald-300 cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setMediaPreview({ type: 'image', url: post.generatedImage! })}
                                                    />
                                                    {/* Metadata badge */}
                                                    {post.imageMetadata && (
                                                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {post.imageMetadata.size} • {post.imageMetadata.format?.toUpperCase()} • {post.imageMetadata.quality}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Image Edit Interface */}
                                                {isEditingImage ? (
                                                    <div className="border-t border-emerald-200 pt-2 space-y-2">
                                                        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                                            <Edit className="w-3.5 h-3.5" />
                                                            Edit Image with AI
                                                        </div>
                                                        <textarea
                                                            value={editImagePrompt}
                                                            onChange={(e) => setEditImagePrompt(e.target.value)}
                                                            placeholder="Describe what changes you want (e.g., 'make it more colorful', 'add a sunset background', 'make it look realistic')"
                                                            className="w-full h-16 text-xs border border-emerald-300 rounded p-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                                        />
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setIsEditingImage(false);
                                                                    setEditImagePrompt('');
                                                                }}
                                                                className="text-xs px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleEditImage}
                                                                disabled={!editImagePrompt.trim() || post.isGeneratingImage}
                                                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                                            >
                                                                <Sparkles className="w-3 h-3" />
                                                                Apply Edit
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsEditingImage(true)}
                                                        className="text-xs px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1 mx-auto"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                        Edit Image
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            /* Show image suggestion if no image generated yet */
                                            post.content?.imageSuggestion && (
                                                <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-emerald-200">
                                                    📝 {post.content.imageSuggestion}
                                                </p>
                                            )
                                        )}
                                        
                                        {/* Action Buttons - Only Generate */}
                                        <div className="flex justify-end">
                                            <ActionButton onClick={handleGenerateImage} disabled={post.isGeneratingImage} icon={post.isGeneratingImage ? Loader2 : ImageIcon} label={post.isGeneratingImage ? 'Generating...' : 'Generate Image'} className="text-white bg-emerald-600 hover:bg-emerald-700 shadow-md" />
                                        </div>
                                    </div>
                                </div>
                            
                            {/* Video generation UI - Simplified */}
                            {/* Always show in edit mode */}
                            <div>
                                <div className="bg-purple-50 p-1.5 rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-purple-700">
                                            🎬 Video Generation
                                        </label>
                                        {!post.content?.videoSuggestion && (
                                            <span className="text-xs text-purple-600 italic">Auto from content</span>
                                        )}
                                    </div>
                                        {post.isGeneratingVideo ? (
                                            <MediaGenerationProgress 
                                                type="video" 
                                                height="300px" 
                                                status={getVideoStatusMessage(post.videoOperation, post.videoGenerationStatus)}
                                                realProgress={calculateVideoProgress(post.videoOperation)}
                                                videoOperation={post.videoOperation}
                                            />
                                        ) : post.generatedVideoUrl ? (
                                            <div className="relative group">
                                                <video 
                                                    src={post.generatedVideoUrl} 
                                                    controls 
                                                    className="rounded-lg w-full border border-purple-300"
                                                />
                                                <button
                                                    onClick={() => setMediaPreview({ type: 'video', url: post.generatedVideoUrl! })}
                                                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-lg text-white hover:bg-black/80 transition-colors"
                                                    title="View fullscreen"
                                                >
                                                    <ExternalLink className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ) : (
                                            /* Show video suggestion if no video generated yet */
                                            post.content?.videoSuggestion && (
                                                <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-purple-200 mb-1.5">
                                                    📝 {post.content.videoSuggestion}
                                                </p>
                                            )
                                        )}
                                    <div className="flex justify-end mt-1.5">
                                        <ActionButton onClick={handleGenerateVideo} disabled={post.isGeneratingVideo} icon={post.isGeneratingVideo ? Loader2 : Video} label={post.isGeneratingVideo ? post.videoGenerationStatus.split(' ')[0] : 'Generate Video'} className="text-white bg-purple-600 hover:bg-purple-700 shadow-md" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* VIEWING VIEW FOR MEDIA - Simplified */}
                            {/* Always show in viewing mode */}
                            <div>
                                <div className="bg-emerald-50 p-2 rounded-lg space-y-2">
                                    
                                        {post.isGeneratingImage && post.generatedImage ? (
                                            /* Show partial image while streaming */
                                            <div className="relative">
                                                <img 
                                                    src={post.generatedImage} 
                                                    alt="Generating..." 
                                                    className="rounded-lg w-full border border-emerald-300 opacity-80 blur-[2px] transition-all duration-300"
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/30 to-transparent rounded-lg">
                                                    <Loader2 className="w-10 h-10 text-white animate-spin mb-2 drop-shadow-lg" />
                                                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                                        <p className="text-sm font-bold text-emerald-600">
                                                            {Math.round(post.imageGenerationProgress || 0)}%
                                                        </p>
                                                        <p className="text-xs text-gray-600">Generating...</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : post.isGeneratingImage ? (
                                            /* Show progress spinner if no partial image yet */
                                            <MediaGenerationProgress type="image" height="250px" />
                                        ) : post.generatedImage ? (
                                            <div className="space-y-2">
                                                <div className="relative group">
                                                    <img 
                                                        src={post.generatedImage} 
                                                        alt="Generated" 
                                                        className="rounded-lg w-full border border-emerald-300 cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={() => setMediaPreview({ type: 'image', url: post.generatedImage! })}
                                                    />
                                                    {/* Metadata badge on hover */}
                                                    {post.imageMetadata && (
                                                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {post.imageMetadata.size} • {post.imageMetadata.format?.toUpperCase()} • {post.imageMetadata.quality}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Metadata info below image */}
                                                {post.imageMetadata && (
                                                    <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                                                        <span className="flex items-center gap-1">
                                                            <ImageIcon className="w-3 h-3" />
                                                            {post.imageMetadata.size?.replace('x', '×')}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            {post.imageMetadata.quality === 'high' && '💎'}
                                                            {post.imageMetadata.quality === 'medium' && '⭐'}
                                                            {post.imageMetadata.quality === 'low' && '⚡'}
                                                            {post.imageMetadata.quality}
                                                        </span>
                                                        <span>{post.imageMetadata.format?.toUpperCase()}</span>
                                                        {post.imageMetadata.background === 'transparent' && (
                                                            <span className="text-emerald-600 font-medium">✨ Transparent</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Show image suggestion if it exists */}
                                                {post.content?.imageSuggestion && (
                                                    <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-emerald-200">
                                                        📝 {post.content.imageSuggestion}
                                                    </p>
                                                )}
                                                <div className="flex justify-end">
                                                    <ActionButton
                                                        onClick={handleGenerateImage}
                                                        disabled={post.isGeneratingImage}
                                                        icon={post.isGeneratingImage ? Loader2 : ImageIcon}
                                                        label={post.isGeneratingImage ? 'Generating...' : 'Generate Image'}
                                                        className="text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                            
                            {/* Video Section - Always show */}
                            <div>
                                <div className="bg-purple-50 p-1.5 rounded-lg">
                                        {post.isGeneratingVideo ? (
                                            <MediaGenerationProgress 
                                                type="video" 
                                                height="300px" 
                                                status={getVideoStatusMessage(post.videoOperation, post.videoGenerationStatus)}
                                                realProgress={calculateVideoProgress(post.videoOperation)}
                                                videoOperation={post.videoOperation}
                                            />
                                        ) : post.generatedVideoUrl ? (
                                            <div className="relative group">
                                                <video 
                                                    src={post.generatedVideoUrl} 
                                                    controls 
                                                    className="rounded-lg w-full border border-purple-300"
                                                />
                                                <button
                                                    onClick={() => setMediaPreview({ type: 'video', url: post.generatedVideoUrl! })}
                                                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-lg text-white hover:bg-black/80 transition-colors"
                                                    title="View fullscreen"
                                                >
                                                    <ExternalLink className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Show video suggestion if it exists */}
                                                {post.content?.videoSuggestion && (
                                                    <p className="text-xs text-gray-700 italic bg-white p-2 rounded border border-purple-200">
                                                        📝 {post.content.videoSuggestion}
                                                    </p>
                                                )}
                                                <div className="flex justify-end">
                                                    <ActionButton
                                                        onClick={handleGenerateVideo}
                                                        disabled={post.isGeneratingVideo}
                                                        icon={post.isGeneratingVideo ? Loader2 : Video}
                                                        label={post.isGeneratingVideo ? post.videoGenerationStatus.split(' ')[0] : 'Generate Video'}
                                                        className="text-white bg-purple-600 hover:bg-purple-700 shadow-md"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="px-2.5 py-1.5 bg-white flex flex-wrap gap-1.5 justify-between items-center border-t border-gray-100">
                    {isEditing ? (
                         <div className="flex items-center justify-between w-full">
                            <div className="flex gap-1.5 flex-wrap">
                                <ActionButton onClick={handleSave} icon={Save} label="Save" className="bg-green-600 hover:bg-green-700 text-white" />
                                <ActionButton onClick={handleCancel} icon={X} label="Cancel" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700" />
                                <ActionButton onClick={() => setIsPreviewOpen(true)} icon={Eye} label="Preview" className="bg-blue-600 hover:bg-blue-700 text-white" />
                            </div>
                            <ActionButton onClick={() => onDeletePost(post.id)} icon={Trash2} label="" className="bg-red-600 hover:bg-red-700 text-white w-7 h-7 p-0" />
                        </div>
                    ) : (
                         <div className="flex items-center justify-between w-full">
                            <div className="flex gap-1.5 flex-wrap">
                                <ActionButton onClick={() => setIsEditing(true)} icon={Edit} label="Edit" className="bg-indigo-600 hover:bg-indigo-700 text-white" />
                                <ActionButton onClick={() => setIsPreviewOpen(true)} icon={Eye} label="Preview" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700" />
                                {post.status === 'draft' && <ActionButton onClick={() => handleStatusChange('needs_approval')} icon={Send} label="Request Approval" className="bg-orange-500 hover:bg-orange-600 text-white" />}
                                {post.status === 'needs_approval' && <ActionButton onClick={() => handleStatusChange('approved')} icon={CheckCircle} label="Approve" className="bg-purple-600 hover:bg-purple-700 text-white" />}
                                {post.status === 'approved' && (
                                    <ActionButton onClick={() => handleStatusChange('ready_to_publish')} icon={ArrowRightCircle} label="Finalize" className="bg-indigo-600 hover:bg-indigo-700 text-white" />
                                )}
                            </div>
                            <ActionButton onClick={() => onDeletePost(post.id)} icon={Trash2} label="" className="bg-red-600 hover:bg-red-700 text-white w-7 h-7 p-0" />
                        </div>
                    )}
                </div>
            </div>
            
            {isPreviewOpen && (
                <PreviewModal 
                    post={{ ...post, content: editedContent }} 
                    onClose={() => setIsPreviewOpen(false)} 
                />
            )}
            <MediaPreviewModal />
            <ImproveModal />
        </>
    );
};

// OPTIMIZATION: Memoize PostCard to prevent unnecessary re-renders
export default React.memo(PostCard, (prevProps, nextProps) => {
    // Only re-render if critical props change
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.status === nextProps.post.status &&
        prevProps.post.isGeneratingImage === nextProps.post.isGeneratingImage &&
        prevProps.post.isGeneratingVideo === nextProps.post.isGeneratingVideo &&
        prevProps.post.videoGenerationStatus === nextProps.post.videoGenerationStatus &&
        prevProps.isApiKeyReady === nextProps.isApiKeyReady &&
        JSON.stringify(prevProps.post.content) === JSON.stringify(nextProps.post.content)
    );
});
