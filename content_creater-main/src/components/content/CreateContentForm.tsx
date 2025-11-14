'use client'

import React, { useState } from 'react';
import { Post, Platform, Tone, ContentType, TONES, CONTENT_TYPES } from '@/types';
import { PLATFORMS } from '@/constants';
import { Loader2 } from 'lucide-react';

interface CreateContentFormProps {
    onPostCreated: (post: Post) => void;
}

const CreateContentForm: React.FC<CreateContentFormProps> = ({ onPostCreated }) => {
    const [topic, setTopic] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
    const [contentType, setContentType] = useState<ContentType>('engaging');
    const [tone, setTone] = useState<Tone>('casual');
    const [schedule, setSchedule] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePlatformChange = (platform: Platform) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim() || selectedPlatforms.length === 0) {
            setError('Please provide a topic and select at least one platform.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            // Call the new API route instead of direct service
            const response = await fetch('/api/ai/content/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic,
                    platforms: selectedPlatforms,
                    contentType,
                    tone,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate content');
            }

            const { data: content } = await response.json();

            const newPost: Post = {
                id: crypto.randomUUID(),
                topic,
                platforms: selectedPlatforms,
                content,
                status: schedule ? 'scheduled' : 'draft',
                createdAt: new Date().toISOString(),
                scheduledAt: schedule ? new Date(schedule).toISOString() : undefined,
                isGeneratingImage: false,
                isGeneratingVideo: false,
                videoGenerationStatus: ''
            };
            onPostCreated(newPost);
            setTopic('');
            setSelectedPlatforms([]);
            setSchedule('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Content</h2>
                <p className="text-gray-600 mt-1 text-sm">Generate AI-powered content for your social media platforms</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">1. Select Platforms</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PLATFORMS.map(({ id, name, icon: Icon }) => (
                                <label key={id} className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer transition-all border-2 transform hover:scale-105 active:scale-95 ${selectedPlatforms.includes(id) ? 'bg-indigo-50 border-indigo-500 shadow-md hover:shadow-lg' : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                                    <input type="checkbox" checked={selectedPlatforms.includes(id)} onChange={() => handlePlatformChange(id)} className="hidden" />
                                    <Icon className={`w-6 h-6 ${selectedPlatforms.includes(id) ? 'text-indigo-600' : 'text-gray-600'}`} />
                                    <span className={`font-medium ${selectedPlatforms.includes(id) ? 'text-indigo-900' : 'text-gray-700'}`}>{name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-900 mb-2">2. Enter Topic/Subject</label>
                        <textarea
                            id="topic"
                            rows={4}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-4"
                            placeholder="e.g., Launch of our new productivity app..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="contentType" className="block text-sm font-medium text-gray-900 mb-2">3. Choose Content Type</label>
                            <select id="contentType" value={contentType} onChange={(e) => setContentType(e.target.value as ContentType)} className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-3 capitalize">
                                {CONTENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tone" className="block text-sm font-medium text-gray-900 mb-2">4. Adjust Tone</label>
                            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-3 capitalize">
                                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="schedule" className="block text-sm font-medium text-gray-900 mb-2">5. Schedule for Later (Optional)</label>
                        <input
                            type="datetime-local"
                            id="schedule"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            className="mt-1 block w-full bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-3"
                        />
                    </div>

                    {error && <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

                    <div className="text-center pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex justify-center items-center py-2 px-3 shadow-md text-base font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 hover:shadow-lg min-w-[180px]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4 mr-1.5 text-white" />
                                    <span className="whitespace-nowrap">Generating...</span>
                                </>
                            ) : <span className="whitespace-nowrap">Generate AI Content</span>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateContentForm;