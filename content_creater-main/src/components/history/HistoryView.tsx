'use client'

import React, { useState, useMemo } from 'react';
import { Post, PostStatus, Platform } from '@/types';
import FilterBar from '@/components/ui/FilterBar';
import PublishedCard from '@/components/history/HistoryCard';

interface PublishedViewProps {
    posts: Post[];
    onUpdatePost: (post: Post) => void;
    onDeletePost: (postId: string) => void;
    onPublishPost?: (post: Post) => Promise<void>;
    connectedAccounts: Record<Platform, boolean>;
}

const PublishedView: React.FC<PublishedViewProps> = ({ posts, onUpdatePost, onDeletePost, onPublishPost, connectedAccounts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

    const postsForPublishing = useMemo(() => {
        const relevantPosts = posts.filter(post => ['ready_to_publish', 'scheduled', 'published'].includes(post.status));
        
        return relevantPosts
            .filter(post => {
                const matchesSearch = post.topic.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPlatform = platformFilter === 'all' || post.platforms.includes(platformFilter);
                return matchesSearch && matchesPlatform;
            })
            .sort((a, b) => {
                const statusOrder: Partial<Record<PostStatus, number>> = {
                    'ready_to_publish': 1,
                    'scheduled': 2,
                    'published': 3,
                };
                const weightA = statusOrder[a.status] ?? 99;
                const weightB = statusOrder[b.status] ?? 99;
                if (weightA !== weightB) {
                    return weightA - weightB;
                }
                const dateA = a.publishedAt || a.scheduledAt || a.createdAt;
                const dateB = b.publishedAt || b.scheduledAt || b.createdAt;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
    }, [posts, searchTerm, platformFilter]);

    if (postsForPublishing.length === 0 && searchTerm === '' && platformFilter === 'all') {
        return (
            <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                <h2 className="text-2xl font-semibold text-gray-900">Nothing to Publish</h2>
                <p className="text-gray-600 mt-2">Finalize a post in "Manage Posts" and it will appear here, ready for action.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Publishing Command Center</h2>
                <p className="text-gray-600 mt-1 text-sm">Publish and schedule your finalized content</p>
            </div>

            <FilterBar
                onSearchChange={setSearchTerm}
                onStatusChange={() => {}} 
                onPlatformChange={setPlatformFilter}
                showStatusFilter={false}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {postsForPublishing.map(post => (
                    <PublishedCard
                        key={post.id}
                        post={post}
                        onUpdatePost={onUpdatePost}
                        onDeletePost={onDeletePost}
                        onPublishPost={onPublishPost}
                        connectedAccounts={connectedAccounts}
                    />
                ))}
            </div>
        </div>
    );
};

export default PublishedView;
