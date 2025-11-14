
// Fix: Import React to resolve namespace errors for React types.
import React from 'react';
import { Platform, PostStatus } from '@/types';
import { TwitterIcon, LinkedinIcon, FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '@/components/icons/PlatformIcons';

export const PLATFORMS: { id: Platform; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; characterLimit: number }[] = [
    { id: 'twitter', name: 'Twitter/X', icon: TwitterIcon, characterLimit: 280 },
    { id: 'linkedin', name: 'LinkedIn', icon: LinkedinIcon, characterLimit: 3000 },
    { id: 'facebook', name: 'Facebook', icon: FacebookIcon, characterLimit: 63206 },
    { id: 'instagram', name: 'Instagram', icon: InstagramIcon, characterLimit: 2200 },
    { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, characterLimit: 2200 },
    { id: 'youtube', name: 'YouTube', icon: YouTubeIcon, characterLimit: 5000 },
];

export const STATUS_CONFIG: { [key in PostStatus]: { color: string; label: string } } = {
    draft: { color: 'bg-gray-500', label: 'Draft' },
    needs_approval: { color: 'bg-yellow-500', label: 'Needs Approval' },
    approved: { color: 'bg-cyan-500', label: 'Approved' },
    ready_to_publish: { color: 'bg-purple-500', label: 'Ready to Publish' },
    scheduled: { color: 'bg-blue-500', label: 'Scheduled' },
    published: { color: 'bg-green-500', label: 'Published' },
    failed: { color: 'bg-red-500', label: 'Failed' },
};