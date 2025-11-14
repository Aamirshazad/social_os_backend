'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Post, Platform } from '@/types';
import ContentStrategistView from '@/components/content/ContentStrategistView';
import ManagePosts from '@/components/posts/ManagePosts';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import PublishedView from '@/components/history/HistoryView';
import MediaLibrary from '@/components/media/MediaLibrary';
import ContentRepurposer from '@/components/content/ContentRepurposer';
import NotificationBell from '@/components/ui/NotificationBell';
import MigrationBanner from '@/components/migration/MigrationBanner';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { autoSaveAIMedia } from '@/services/mediaService';
// Import services
import { publishingService } from '@/services/publishingService';
import { Edit3, LayoutGrid, BarChart3, History, Image, Sparkles, LogOut, User, Cog, Library, Users } from 'lucide-react';
import LibraryView from '@/components/library/LibraryView';

type View = 'create' | 'manage' | 'history' | 'analytics' | 'media' | 'repurpose' | 'library';

const AppContent: React.FC = () => {
    const { addNotification } = useNotifications();
    const { user, signOut, userRole, workspaceId } = useAuth();
    const [activeView, setActiveView] = useState<View>('create');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const dataLoadedRef = useRef(false);
    const currentWorkspaceRef = useRef<string | null>(null);

    const [connectedAccounts, setConnectedAccounts] = useState<Record<Platform, boolean>>({
        twitter: false,
        linkedin: false,
        facebook: false,
        instagram: false,
        tiktok: false,
        youtube: false
    });

    // Load posts from API on mount - prevent duplicate loads
    useEffect(() => {
        if (!user || !workspaceId) {
            setLoading(false);
            return;
        }

        // Only load data once per workspace or if workspace changes
        if (dataLoadedRef.current && currentWorkspaceRef.current === workspaceId) {
            console.log('[App] Data already loaded for workspace:', workspaceId);
            return;
        }

        const loadData = async () => {
            try {
                console.log('[App] Loading data for workspace:', workspaceId);
                setLoading(true);

                // OPTIMIZATION: Fetch both resources in parallel
                const [postsRes, credStatusRes] = await Promise.all([
                    fetch(`/api/posts?workspace_id=${workspaceId}`),
                    fetch('/api/credentials/status')
                ]);

                // Check responses
                if (!postsRes.ok) throw new Error('Failed to load posts');
                if (!credStatusRes.ok) throw new Error('Failed to load credentials status');

                // Parse JSON in parallel
                const [dbPosts, accountsStatus] = await Promise.all([
                    postsRes.json(),
                    credStatusRes.json()
                ]);

                // Format connected accounts
                const accountsSummary: Record<Platform, boolean> = {
                    twitter: accountsStatus.twitter?.isConnected ?? false,
                    linkedin: accountsStatus.linkedin?.isConnected ?? false,
                    facebook: accountsStatus.facebook?.isConnected ?? false,
                    instagram: accountsStatus.instagram?.isConnected ?? false,
                    tiktok: accountsStatus.tiktok?.isConnected ?? false,
                    youtube: accountsStatus.youtube?.isConnected ?? false,
                };

                // Update state in batch
                setPosts(dbPosts);
                setConnectedAccounts(accountsSummary);
                
                // Mark as loaded
                dataLoadedRef.current = true;
                currentWorkspaceRef.current = workspaceId;
                console.log('[App] Data loaded successfully');
            } catch (error) {
                console.error('Error loading data from database:', error);
                addNotification('error', 'Load Error', 'Failed to load posts from database');
            } finally {
                setLoading(false);
            }
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, workspaceId]);

    const [isApiKeyReady, setIsApiKeyReady] = useState(false);

    const checkAndSetApiKey = useCallback(async () => {
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setIsApiKeyReady(true);
        } else {
            setIsApiKeyReady(false);
        }
    }, []);

    useEffect(() => {
        checkAndSetApiKey();
    }, [checkAndSetApiKey]);

    const handleSelectKey = useCallback(async () => {
        if(window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success and optimistically update UI
            setIsApiKeyReady(true);
        }
    }, []);

    // Update post via API
    const updatePost = useCallback(
        async (updatedPost: Post) => {
            // Update local state immediately for responsiveness
            setPosts((prevPosts) =>
                prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
            );

            // Save to database via API
            if (user && workspaceId) {
                try {
                    const response = await fetch(`/api/posts/${updatedPost.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post: updatedPost, workspaceId }),
                    });

                    if (!response.ok) throw new Error('Failed to update post');

                    addNotification('post_scheduled', 'Post Updated', `"${updatedPost.topic}" has been updated.`);
                } catch (error) {
                    console.error('Error updating post in database:', error);
                    addNotification('error', 'Update Error', 'Failed to save changes to database');
                }
            }
        },
        [user, workspaceId, addNotification]
    );

    // Use ref to access latest posts without causing re-renders
    const postsRef = useRef(posts);
    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    const pollVideoStatuses = useCallback(() => {
        // OPTIMIZATION: Filter to only actively generating videos
        const videoPosts = postsRef.current.filter(
            p => p.isGeneratingVideo && 
            p.videoOperation?.id && 
            p.videoOperation?.status !== 'completed' && 
            p.videoOperation?.status !== 'failed'
        );
        
        // Early exit if no videos to check
        if (videoPosts.length === 0) return;
        
        console.log(`[Polling] Checking ${videoPosts.length} active video generations`);
        
        // OPTIMIZATION: Batch all status checks in parallel
        Promise.allSettled(
            videoPosts.map(post => 
                fetch('/api/ai/media/video/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId: post.videoOperation.id }),
                }).then(response => {
                    if (!response.ok) throw new Error('Failed to check video status');
                    return response.json().then(data => ({ post, data }));
                })
            )
        ).then(results => {
            // Process all results
            results.forEach(async (result) => {
                if (result.status === 'rejected') {
                    console.error('[Polling] Video status check failed:', result.reason);
                    return;
                }
                
                const { post, data } = result.value;
                const updatedVideo = data.data.video;
                
                console.log(`[Polling] Video "${post.topic}" status:`, updatedVideo.status);

                if (updatedVideo.status === 'completed') {
                    // Download the completed video
                    try {
                        const fetchResponse = await fetch('/api/ai/media/video/fetch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoId: updatedVideo.id }),
                        });

                        if (!fetchResponse.ok) throw new Error('Failed to download video');

                        const { data: videoData } = await fetchResponse.json();
                        const videoUrl = videoData.videoData;

                        // Auto-save to media library
                        await autoSaveAIMedia(videoUrl, 'video', post.topic);
                        
                        // Update post and notify - use refs to avoid stale closures
                        const updatePostFn = (prev: Post) => ({
                            ...prev,
                            generatedVideoUrl: videoUrl,
                            isGeneratingVideo: false,
                            videoGenerationStatus: 'Completed!',
                            videoOperation: updatedVideo
                        });
                        setPosts(prevPosts => prevPosts.map(p => p.id === post.id ? updatePostFn(p) : p));
                        addNotification('video_complete', 'Video Generation Complete', `Video for "${post.topic}" is ready!`, post.id);
                    } catch (error) {
                        console.error('[Polling] Failed to fetch completed video:', error);
                        setPosts(prevPosts => prevPosts.map(p => 
                            p.id === post.id ? { ...p, isGeneratingVideo: false, videoGenerationStatus: 'Failed.' } : p
                        ));
                    }
                } else if (updatedVideo.status === 'failed') {
                    const errorMsg = updatedVideo.error?.message || 'Video generation failed';
                    setPosts(prevPosts => prevPosts.map(p => 
                        p.id === post.id ? { 
                            ...p, 
                            isGeneratingVideo: false, 
                            videoGenerationStatus: `Failed: ${errorMsg}`, 
                            videoOperation: updatedVideo 
                        } : p
                    ));
                } else {
                    // Still processing - update progress
                    const progress = updatedVideo.progress || 0;
                    setPosts(prevPosts => prevPosts.map(p => 
                        p.id === post.id ? { 
                            ...p, 
                            videoGenerationStatus: `Processing... ${progress}%`, 
                            videoOperation: updatedVideo 
                        } : p
                    ));
                }
            });
        }).catch(error => {
            console.error('[Polling] Batch video status check error:', error);
        });
    }, []); // OPTIMIZATION: No dependencies - all state updates use functional form

    // UPDATED: Check for scheduled posts and auto-publish them
    const checkScheduledPosts = useCallback(async () => {
        const now = new Date();
        // Use ref to get latest posts without dependency
        const readyToPublish = postsRef.current.filter(
            (post) => post.status === 'scheduled' && post.scheduledAt && new Date(post.scheduledAt) <= now
        );

        for (const post of readyToPublish) {
            try {
                // Auto-publish the post
                await publishPost(post);
            } catch (error) {
                console.error(`Failed to auto-publish post ${post.id}:`, error);
                addNotification('error', 'Publishing Error', `Failed to publish "${post.topic}"`);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Removed posts and addNotification - using ref and closure

    // Add post via API
    const addPost = useCallback(
        async (post: Post) => {
            // Add to local state immediately for responsiveness
            setPosts((prevPosts) => [post, ...prevPosts]);
            setActiveView('manage');

            // Save to database via API
            if (user && workspaceId) {
                try {
                    const response = await fetch('/api/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post, workspaceId }),
                    });

                    if (!response.ok) throw new Error('Failed to create post');

                    addNotification(
                        'post_scheduled',
                        'New Post Created',
                        `Post "${post.topic}" has been added to drafts.`,
                        post.id
                    );
                } catch (error) {
                    console.error('Error saving post to database:', error);
                    addNotification('error', 'Save Error', 'Failed to save post to database');
                    // Remove from state if save fails
                    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
                }
            }
        },
        [user, workspaceId, addNotification]
    );

    // Add multiple posts via API
    const addMultiplePosts = useCallback(
        async (newPosts: Post[]) => {
            // Add to local state immediately
            setPosts((prevPosts) => [...newPosts, ...prevPosts]);
            setActiveView('manage');

            // Save all to database via API
            if (user && workspaceId) {
                try {
                    for (const post of newPosts) {
                        await fetch('/api/posts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ post, workspaceId }),
                        });
                    }
                    addNotification(
                        'post_scheduled',
                        'Posts Created',
                        `${newPosts.length} posts have been added to your drafts.`
                    );
                } catch (error) {
                    console.error('Error saving posts to database:', error);
                    addNotification('error', 'Save Error', 'Failed to save some posts to database');
                }
            }
        },
        [user, workspaceId, addNotification]
    );

    // Delete post via API
    const deletePost = useCallback(
        async (postId: string) => {
            // Delete from local state immediately
            setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));

            // Delete from database via API
            if (user && workspaceId) {
                try {
                    const response = await fetch(`/api/posts/${postId}?workspace_id=${workspaceId}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) throw new Error('Failed to delete post');

                    addNotification('post_scheduled', 'Post Deleted', 'Post has been removed.');
                } catch (error) {
                    console.error('Error deleting post from database:', error);
                    addNotification('error', 'Delete Error', 'Failed to delete post from database');
                }
            }
        },
        [user, workspaceId, addNotification]
    );

    // Publish post to all platforms and archive to library
    const publishPost = useCallback(
        async (post: Post) => {
            try {
                // Validate post
                const validation = publishingService.validatePostForPublishing(post);
                if (!validation.valid) {
                    addNotification('error', 'Validation Error', validation.errors?.join(', ') || 'Post validation failed');
                    return;
                }

                // Publish to platforms
                const results = await publishingService.publishPost(post);

                // Archive to library via API
                if (user && workspaceId) {
                    await fetch('/api/library', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post, platformResults: results, workspaceId }),
                    });
                }

                // Remove from posts table
                await deletePost(post.id);

                // Notify user
                const successCount = results.filter((r) => r.success).length;
                addNotification(
                    'post_published',
                    'Post Published',
                    `Posted to ${successCount}/${results.length} platforms`,
                    post.id
                );
            } catch (error) {
                console.error('Error publishing post:', error);
                addNotification('error', 'Publishing Error', 'Failed to publish post to platforms');
            }
        },
        [user, workspaceId, deletePost, addNotification]
    );

    useEffect(() => {
        // Only start intervals if user is authenticated and workspace is loaded
        if (!user || !workspaceId || !dataLoadedRef.current) {
            console.log('[App] Skipping interval setup - data not ready');
            return;
        }

        console.log('[App] Starting polling intervals');
        const scheduleInterval = setInterval(checkScheduledPosts, 60000);
        const videoPollInterval = setInterval(pollVideoStatuses, 15000); // Poll every 15s

        return () => {
            console.log('[App] Cleaning up polling intervals');
            clearInterval(scheduleInterval);
            clearInterval(videoPollInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, workspaceId]); // Restart intervals only when user or workspace changes
    
    const SidebarItem: React.FC<{ viewName: View; icon: React.ElementType; label: string }> = ({ viewName, icon: Icon, label }) => (
        <button
            onClick={() => setActiveView(viewName)}
            className={`flex items-center w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all transform hover:translate-x-1 ${
                activeView === viewName
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
            }`}
        >
            <Icon className="w-4 h-4 mr-2.5" />
            <span>{label}</span>
        </button>
    );

    const renderViewContent = () => {
        const viewProps = {
            posts,
            onUpdatePost: updatePost,
            onDeletePost: deletePost,
            isApiKeyReady,
            onSelectKey: handleSelectKey,
            resetApiKeyStatus: () => setIsApiKeyReady(false),
            connectedAccounts,
        };
        switch (activeView) {
            case 'create':
                return <ContentStrategistView onPostCreated={addPost} />;
            case 'manage':
                return <ManagePosts {...viewProps} />;
            case 'history':
                return <PublishedView posts={posts} onUpdatePost={updatePost} onDeletePost={deletePost} onPublishPost={publishPost} connectedAccounts={connectedAccounts} />;
            case 'analytics':
                return <AnalyticsDashboard posts={posts} />;
            case 'media':
                return <MediaLibrary />;
            case 'repurpose':
                return <ContentRepurposer onPostsCreated={addMultiplePosts} />;
            case 'library':
                return <LibraryView posts={posts} onDeletePost={deletePost} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <aside className="w-56 bg-white p-4 flex flex-col justify-between border-r border-gray-200 shadow-sm">
                <div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                               AI Content OS
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Content Platform</p>
                        </div>
                        <NotificationBell />
                    </div>
                    <nav className="space-y-1">
                        <SidebarItem viewName="create" icon={Edit3} label="Create Content" />
                        <SidebarItem viewName="repurpose" icon={Sparkles} label="Repurpose" />
                        <SidebarItem viewName="manage" icon={LayoutGrid} label="Manage Posts" />
                        <SidebarItem viewName="history" icon={History} label="Published" />
                        <div className="border-t border-gray-200 my-3"></div>
                        <Link
                            href="/influencer-campaigns"
                            className="flex items-center w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all transform hover:translate-x-1 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                        >
                            <Users className="w-4 h-4 mr-2.5" />
                            <span>Social Media Campaigns</span>
                        </Link>
                        <SidebarItem viewName="media" icon={Image} label="Media Library" />
                        <SidebarItem viewName="library" icon={Library} label="Archive" />
                        <SidebarItem viewName="analytics" icon={BarChart3} label="Analytics" />
                    </nav>
                </div>
                 <div className="space-y-2 border-t border-gray-200 pt-4">
                    {/* User Profile */}
                    <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                                </p>
                                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                            </div>
                        </div>
                        {userRole && (
                            <div className="inline-block px-2 py-0.5 bg-indigo-100 border border-indigo-200 rounded text-xs font-medium text-indigo-800">
                                {userRole}
                            </div>
                        )}
                    </div>

                    <Link
                        href="/settings?tab=members"
                        className="flex items-center w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all text-gray-700 hover:bg-gray-100 hover:shadow-sm transform hover:translate-x-1"
                    >
                        <Cog className="w-4 h-4 mr-2.5" />
                        <span>Settings</span>
                    </Link>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to sign out?')) {
                                signOut();
                            }
                        }}
                        className="flex items-center w-full px-3 py-2.5 text-[11px] font-medium rounded-lg transition-all text-red-600 hover:bg-red-50 hover:shadow-sm transform hover:translate-x-1"
                    >
                        <LogOut className="w-4 h-4 mr-2.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <MigrationBanner />
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading your content...</p>
                        </div>
                    </div>
                ) : (
                    renderViewContent()
                )}
            </main>
        </div>
    );
};

// NotificationProvider is already mounted in ProtectedApp.tsx - no need to duplicate
const App: React.FC = () => {
    return <AppContent />;
};

export default App;
