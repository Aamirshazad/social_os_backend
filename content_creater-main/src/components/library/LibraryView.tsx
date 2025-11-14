'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Post, Platform } from '@/types';
import FilterBar from '@/components/ui/FilterBar';
import LibraryCard from '@/components/library/LibraryCard';
import { Download, Trash2, Archive, BarChart3, Loader2, Upload } from 'lucide-react';

interface LibraryViewProps {
    posts: Post[];
    onDeletePost: (postId: string) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ posts, onDeletePost }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Filter published posts only
    const publishedPosts = useMemo(() => {
        return posts.filter(post => post.status === 'published');
    }, [posts]);

    // Apply filters
    const filteredPosts = useMemo(() => {
        return publishedPosts
            .filter(post => {
                const matchesSearch = post.topic.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesPlatform = platformFilter === 'all' || post.platforms.includes(platformFilter);
                return matchesSearch && matchesPlatform;
            })
            .sort((a, b) => {
                const dateA = new Date(a.publishedAt || a.createdAt).getTime();
                const dateB = new Date(b.publishedAt || b.createdAt).getTime();
                return dateB - dateA;
            });
    }, [publishedPosts, searchTerm, platformFilter]);

    // Calculate statistics
    const stats = useMemo(() => {
        const platformCounts: Record<Platform, number> = {
            twitter: 0,
            linkedin: 0,
            facebook: 0,
            instagram: 0,
            tiktok: 0,
            youtube: 0,
        };

        publishedPosts.forEach(post => {
            post.platforms.forEach(platform => {
                platformCounts[platform]++;
            });
        });

        const postsWithImages = publishedPosts.filter(p => p.generatedImage).length;
        const postsWithVideos = publishedPosts.filter(p => p.generatedVideoUrl).length;

        return {
            totalPosts: publishedPosts.length,
            platformCounts,
            postsWithImages,
            postsWithVideos,
        };
    }, [publishedPosts]);

    // Handle export all posts
    const handleExportAll = async () => {
        setIsExporting(true);
        try {
            const dataToExport = {
                exportDate: new Date().toISOString(),
                totalPosts: filteredPosts.length,
                posts: filteredPosts.map(post => ({
                    id: post.id,
                    topic: post.topic,
                    platforms: post.platforms,
                    postType: post.postType,
                    status: post.status,
                    publishedAt: post.publishedAt,
                    content: post.content,
                    hasImage: !!post.generatedImage,
                    hasVideo: !!post.generatedVideoUrl,
                })),
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `posts-archive-${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting posts:', error);
            alert('Failed to export posts');
        } finally {
            setIsExporting(false);
        }
    };

    // Handle export single post
    const handleExportPost = (post: Post) => {
        try {
            const dataToExport = {
                exportDate: new Date().toISOString(),
                post: {
                    id: post.id,
                    topic: post.topic,
                    platforms: post.platforms,
                    postType: post.postType,
                    status: post.status,
                    publishedAt: post.publishedAt,
                    content: post.content,
                    hasImage: !!post.generatedImage,
                    hasVideo: !!post.generatedVideoUrl,
                },
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `post-${post.topic.replace(/\s+/g, '-').toLowerCase()}-${post.id.slice(0, 8)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting post:', error);
            alert('Failed to export post');
        }
    };

    // Handle import posts
    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate imported data
            if (!data.posts && !data.post) {
                throw new Error('Invalid file format. Expected posts or post data.');
            }

            alert(`Successfully imported. This is a preview - import functionality requires backend integration.`);
        } catch (error) {
            console.error('Error importing posts:', error);
            alert(`Failed to import posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    if (publishedPosts.length === 0) {
        return (
            <div className="text-center py-20 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900">No Published Posts Yet</h2>
                <p className="text-gray-600 mt-2">Posts you publish will appear here in your library for future reference.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Archive className="w-6 h-6 text-green-600" />
                        Post Archive
                    </h2>
                    <p className="text-gray-600 mt-1 text-sm">Your library of published content ({stats.totalPosts} total)</p>
                </div>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium text-sm shadow-md cursor-pointer transform hover:scale-105 active:scale-95">
                        <Upload className="w-4 h-4" />
                        Import
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            disabled={isImporting}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={handleExportAll}
                        disabled={isExporting || filteredPosts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium text-sm shadow-md transform hover:scale-105 active:scale-95"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export All
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 uppercase">Total Posts</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalPosts}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">With Images</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.postsWithImages}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-700 uppercase">With Videos</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.postsWithVideos}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 uppercase">Shown Now</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{filteredPosts.length}</p>
                </div>
            </div>

            {/* Filters */}
            <FilterBar
                onSearchChange={setSearchTerm}
                onStatusChange={() => {}}
                onPlatformChange={setPlatformFilter}
                showStatusFilter={false}
            />

            {/* Platform Statistics */}
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Posts by Platform</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {Object.entries(stats.platformCounts).map(([platform, count]) => (
                        <div
                            key={platform}
                            className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 text-center"
                        >
                            <p className="text-xs font-semibold text-gray-700 capitalize">{platform}</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">{count}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Posts Grid */}
            {filteredPosts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredPosts.map(post => (
                        <LibraryCard
                            key={post.id}
                            post={post}
                            onDelete={onDeletePost}
                            onDownload={handleExportPost}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                    <p className="text-gray-600">No posts match your filters</p>
                </div>
            )}
        </div>
    );
};

export default LibraryView;
