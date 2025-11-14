'use client'

import React, { useState, useMemo } from 'react';
import { Post, PostStatus, Platform } from '@/types';
import PostCard from '@/components/content/PostCard';
import FilterBar from '@/components/ui/FilterBar';
import CalendarView from '@/components/calendar/CalendarView';
import { LayoutGrid, Calendar } from 'lucide-react';

interface ManagePostsProps {
    posts: Post[];
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    isApiKeyReady: boolean;
    onSelectKey: () => void;
    resetApiKeyStatus: () => void;
    connectedAccounts: Record<Platform, boolean>;
}

type ViewMode = 'grid' | 'calendar';

const ManagePosts: React.FC<ManagePostsProps> = ({ posts, onUpdatePost, onDeletePost, isApiKeyReady, onSelectKey, resetApiKeyStatus, connectedAccounts }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

    const nonFinalizedPosts = useMemo(() => posts.filter(post => !['ready_to_publish', 'scheduled', 'published'].includes(post.status)), [posts]);

    const filteredPosts = useMemo(() => {
        return nonFinalizedPosts.filter(post => {
            const matchesSearch = post.topic.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
            const matchesPlatform = platformFilter === 'all' || post.platforms.includes(platformFilter);
            return matchesSearch && matchesStatus && matchesPlatform;
        });
    }, [nonFinalizedPosts, searchTerm, statusFilter, platformFilter]);

    const ViewToggleButton: React.FC<{ mode: ViewMode, icon: React.ElementType, label: string }> = ({ mode, icon: Icon, label }) => (
        <button
            onClick={() => setViewMode(mode)}
            className={`flex items-center px-4 py-2 text-base font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95 min-w-[100px] ${
                viewMode === mode 
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' 
                    : 'bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 hover:border-indigo-400 shadow-sm'
            }`}
        >
            <Icon className="w-4 h-4 mr-1.5" />
            {label}
        </button>
    );

    const renderGridContent = () => {
        if (nonFinalizedPosts.length === 0) {
             return (
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                    <h2 className="text-2xl font-semibold text-gray-900">Your content queue is empty!</h2>
                    <p className="text-gray-600 mt-2">Go to "Create Content" to generate a new post, or check "Published" for finalized items.</p>
                </div>
            );
        }
        if (filteredPosts.length === 0) {
            return (
                <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                    <h2 className="text-xl font-semibold text-gray-900">No Posts Match Your Filters</h2>
                    <p className="text-gray-600 mt-2">Try adjusting your search or selected filters.</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPosts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onUpdatePost={onUpdatePost}
                        onDeletePost={onDeletePost}
                        isApiKeyReady={isApiKeyReady}
                        onSelectKey={onSelectKey}
                        resetApiKeyStatus={resetApiKeyStatus}
                        connectedAccounts={connectedAccounts}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manage & Finalize Posts</h2>
                    <p className="text-gray-600 mt-1 text-sm">Review, edit, and approve your content</p>
                </div>
                <div className="flex items-center gap-2">
                    <ViewToggleButton mode="grid" icon={LayoutGrid} label="Grid" />
                    <ViewToggleButton mode="calendar" icon={Calendar} label="Calendar" />
                </div>
            </div>

            <FilterBar
                onSearchChange={setSearchTerm}
                onStatusChange={setStatusFilter}
                onPlatformChange={setPlatformFilter}
                excludeStatuses={['published', 'scheduled', 'ready_to_publish']}
            />

            {viewMode === 'grid' ? renderGridContent() : <CalendarView posts={filteredPosts} />}
        </div>
    );
};

export default ManagePosts;