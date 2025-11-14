'use client'

import React, { useMemo } from 'react';
import { Post, Platform, PostStatus } from '@/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PLATFORMS, STATUS_CONFIG } from '@/constants';

interface AnalyticsDashboardProps {
    posts: Post[];
}

// Light, modern color palette for charts
const COLORS = [
    '#60A5FA', // Light Blue
    '#34D399', // Light Green
    '#FBBF24', // Light Amber
    '#F87171', // Light Red
    '#A78BFA', // Light Purple
    '#76a37f77'  // Light Orange
];

// Custom Tooltip Component with light background
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
                {label && <p className="font-semibold text-gray-900 mb-1">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm text-gray-700">
                        <span className="font-medium">{entry.name}:</span> 
                        <span className="ml-1 font-semibold" style={{ color: entry.color }}>
                            {entry.value}
                        </span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ posts }) => {

    const stats = useMemo(() => {
        const statusCounts = posts.reduce((acc, post) => {
            acc[post.status] = (acc[post.status] || 0) + 1;
            return acc;
        }, {} as { [key in PostStatus]: number });

        const platformCounts = posts.reduce((acc, post) => {
            post.platforms.forEach(platform => {
                acc[platform] = (acc[platform] || 0) + 1;
            });
            return acc;
        }, {} as { [key in Platform]: number });

        const platformData = Object.entries(platformCounts)
            // Fix: Explicitly convert value to a number to resolve type inference issues.
            .map(([name, value]) => ({ name: PLATFORMS.find(p => p.id === name)?.name || name, value: Number(value) }))
            .filter(item => item.value > 0);

        const statusData = (Object.keys(STATUS_CONFIG) as PostStatus[])
            .map(status => ({
                name: STATUS_CONFIG[status].label,
                value: statusCounts[status] || 0,
                color: STATUS_CONFIG[status].color.replace('bg-', '#').replace('-500', '') // basic color conversion
            }))
            .filter(item => item.value > 0);


        return { totalPosts: posts.length, platformData, statusData, statusCounts };
    }, [posts]);

    const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
        <div className={`bg-gradient-to-br ${color} rounded-lg p-6 border`}>
            <div className="text-2xl font-bold">{value || 0}</div>
            <div className="text-sm font-medium mt-1">{title}</div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                <p className="text-gray-600 mt-1 text-sm">Track your content performance and metrics</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Posts" value={stats.totalPosts} color="from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900" />
                <StatCard title="Published" value={stats.statusCounts.published} color="from-green-50 to-green-100 border-green-200 text-green-900" />
                <StatCard title="Scheduled" value={stats.statusCounts.scheduled} color="from-blue-50 to-blue-100 border-blue-200 text-blue-900" />
                <StatCard title="Needs Approval" value={stats.statusCounts['needs_approval']} color="from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-900" />
                <StatCard title="Drafts" value={stats.statusCounts.draft} color="from-gray-50 to-gray-100 border-gray-200 text-gray-900" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
                    {stats.platformData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={stats.platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                    {stats.platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center py-10">No data to display.</p>}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Post Status Overview</h3>
                     {stats.statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.statusData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }} />
                                <Bar dataKey="value" barSize={25}>
                                    {stats.statusData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={STATUS_CONFIG[entry.name.toLowerCase().replace(' ', '-') as PostStatus]?.color.replace('bg-', '#').replace('-500', '') || '#8884d8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-500 text-center py-10">No data to display.</p>}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;