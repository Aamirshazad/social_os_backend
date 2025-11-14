'use client'

import React, { useState, useRef, useEffect, FormEvent, useCallback, useMemo } from 'react';
import { Post, PostContent, Platform } from '@/types';
import { PLATFORMS } from '@/constants';
import { Send, Bot, User, Loader2, CheckCircle, PlusCircle, History, PanelLeftClose, Trash2 } from 'lucide-react';
import { ThreadService, ChatMessage, ContentThread } from '@/services/database/threadService.client';
import { useAuth } from '@/contexts/AuthContext';

interface ContentStrategistViewProps {
    onPostCreated: (post: Post) => void;
}

type Message = {
    role: 'user' | 'model' | 'system';
    content: string;
    postData?: any;
};

const ContentStrategistView: React.FC<ContentStrategistViewProps> = ({ onPostCreated }) => {
    const { workspaceId, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "Hello! I'm Aamir your AI Content Strategist. What brilliant idea or product are we working on today?" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [chatHistory, setChatHistory] = useState<ContentThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | 'new'>('new');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [isSavingThread, setIsSavingThread] = useState(false);
    const hasLoadedHistory = useRef(false);
    
    // Use refs to prevent unnecessary re-runs of effects when auth context updates
    const workspaceIdRef = useRef(workspaceId);
    const userRef = useRef(user);
    const isInitializedRef = useRef(false);
    
    // Update refs when values change
    useEffect(() => {
        const workspaceChanged = workspaceIdRef.current !== workspaceId;
        const userChanged = userRef.current !== user;
        
        if (workspaceChanged || userChanged) {
            console.log('[ContentStrategist] Auth values updated', {
                workspaceChanged,
                userChanged,
                isInitialized: isInitializedRef.current
            });
        }
        
        workspaceIdRef.current = workspaceId;
        userRef.current = user;
        
        // Mark as initialized once we have both values
        if (workspaceId && user && !isInitializedRef.current) {
            isInitializedRef.current = true;
            console.log('[ContentStrategist] Component initialized with workspace:', workspaceId);
        }
    }, [workspaceId, user]);

    // Load chat history lazily when history panel is opened
    useEffect(() => {
        if (!isHistoryVisible || hasLoadedHistory.current) return;
        
        // Use refs to avoid re-triggering when auth updates
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (!currentWorkspaceId || !currentUser) return;
        
        const loadChatHistory = async () => {
            hasLoadedHistory.current = true;
            console.log('[ContentStrategist] Loading chat history');
            try {
                const result = await ThreadService.getAllThreads(currentWorkspaceId, 50, 0);
                setChatHistory(result.items);
            } catch (e) {
                console.error("Could not load chat history from database", e);
            }
        };
        
        loadChatHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHistoryVisible]);

    // Prevent unnecessary reloads when tab visibility changes
    const isVisibleRef = useRef(true);
    
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab is hidden - just mark it
                isVisibleRef.current = false;
                console.log('[ContentStrategist] Tab hidden - preserving state');
            } else {
                // Tab is visible again - restore without reload
                isVisibleRef.current = true;
                console.log('[ContentStrategist] Tab visible - state preserved');
                // Force scroll to bottom to show latest message
                setTimeout(() => {
                    chatContainerRef.current?.scrollTo({ 
                        top: chatContainerRef.current.scrollHeight, 
                        behavior: 'smooth' 
                    });
                }, 100);
            }
        };

        // Prevent page reload on visibility change
        const preventReload = (e: BeforeUnloadEvent) => {
            if (messages.length > 1 && !document.hidden) {
                // Only warn if there are unsaved messages and tab is visible
                e.preventDefault();
                e.returnValue = '';
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', preventReload);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', preventReload);
        };
    }, [messages.length]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // Auto-save messages to database after each exchange with longer debounce
    useEffect(() => {
        // Skip save if no messages or viewing history
        if (!currentThreadId || messages.length === 0 || activeThreadId !== 'new') {
            return;
        }
        
        // Use refs to avoid re-triggering when auth updates
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (!currentWorkspaceId || !currentUser) {
            return;
        }

        const saveMessages = async () => {
            try {
                const dbMessages: ChatMessage[] = messages
                    .filter(m => m.role !== 'system') // Don't save system messages to DB
                    .map(m => ({
                        role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                        content: m.content,
                        timestamp: new Date().toISOString(),
                    }));

                await ThreadService.updateMessages(currentThreadId, currentWorkspaceId, dbMessages);
            } catch (e) {
                console.error("Error saving messages to database", e);
            }
        };

        // Increase debounce to 5 seconds to reduce frequent saves
        const saveTimer = setTimeout(saveMessages, 5000);
        return () => clearTimeout(saveTimer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, currentThreadId, activeThreadId]);

    const saveCurrentChat = useCallback(async () => {
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (messages.length <= 1 || !currentWorkspaceId || !currentUser) return;

        const firstUserMessage = messages.find(m => m.role === 'user');
        const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '')
            : 'Untitled Chat';

        try {
            setIsSavingThread(true);
            const newThread = await ThreadService.createThread(title, currentWorkspaceId, currentUser.id);

            // Save messages to the new thread
            const dbMessages: ChatMessage[] = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date().toISOString(),
                }));

            await ThreadService.updateMessages(newThread.id, currentWorkspaceId, dbMessages);

            // Update local history
            setChatHistory(prevHistory => [newThread, ...prevHistory]);
        } catch (e) {
            console.error("Error saving chat to database", e);
            setError("Failed to save chat history");
        } finally {
            setIsSavingThread(false);
        }
    }, [messages]);

    const startNewChat = useCallback(async (isInitialLoad = false) => {
        if (!isInitialLoad && activeThreadId === 'new') {
            await saveCurrentChat();
        }

        setMessages([
            { role: 'model', content: "Hello! I'm Aamir your AI Content Strategist. What brilliant idea or product are we working on today?" }
        ]);
        setActiveThreadId('new');

        // Create a new thread in database for this chat session
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (currentWorkspaceId && currentUser && !isInitialLoad) {
            try {
                const newThread = await ThreadService.createThread('New Chat', currentWorkspaceId, currentUser.id);
                setCurrentThreadId(newThread.id);
            } catch (e) {
                console.error("Error creating thread", e);
            }
        }

        setError(null);
    }, [activeThreadId, saveCurrentChat]);

    const handleSelectThread = useCallback(async (thread: ContentThread) => {
        if (activeThreadId === 'new') {
            await saveCurrentChat();
        }

        // Convert database messages back to UI format
        const uiMessages = thread.messages.map((msg: ChatMessage) => ({
            role: (msg.role === 'assistant' ? 'model' : msg.role) as 'user' | 'model' | 'system',
            content: msg.content,
        }));

        setMessages(uiMessages);
        setActiveThreadId(thread.id);
        setCurrentThreadId(thread.id);
        setIsLoading(false);
    }, [activeThreadId, saveCurrentChat]);

    const handleDeleteThread = useCallback(async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();

        const currentWorkspaceId = workspaceIdRef.current;
        if (!currentWorkspaceId) return;

        if (!confirm('Are you sure you want to delete this thread?')) return;

        try {
            await ThreadService.deleteThread(threadId, currentWorkspaceId);
            setChatHistory(prevHistory => prevHistory.filter(t => t.id !== threadId));

            // If we deleted the active thread, start a new chat
            if (activeThreadId === threadId) {
                await startNewChat();
            }
        } catch (e) {
            console.error("Error deleting thread", e);
            setError("Failed to delete thread");
        }
    }, [activeThreadId, startNewChat]);

    const handleCreatePost = useCallback((postData: any) => {
        const { topic, postType, imageSuggestion, videoSuggestion, ...platformContent } = postData;

        // Extract valid platforms from the generated content
        const platforms = Object.keys(platformContent).filter(
            key => PLATFORMS.some(p => p.id === key)
        ) as Platform[];

        if (platforms.length === 0) {
            setError("The generated content didn't specify any valid platforms.");
            return;
        }

        // Build content object with proper structure for each platform
        const content: PostContent = {};
        platforms.forEach(platform => {
            if (platformContent[platform]) {
                content[platform] = platformContent[platform];
            }
        });

        // Enhance image suggestion for Gemini API
        // Add technical specifications for better image generation quality
        let enhancedImageSuggestion = imageSuggestion;
        if (imageSuggestion) {
            // Ensure the prompt has style, composition, and quality keywords
            const hasQualityKeywords = /high.?resolution|4k|professional|cinematic|studio|detailed/i.test(imageSuggestion);
            if (!hasQualityKeywords) {
                enhancedImageSuggestion = `${imageSuggestion}. Style: high-resolution, professional, cinematic quality. Perfect for social media.`;
            }
            content.imageSuggestion = enhancedImageSuggestion;
        }

        // Enhance video suggestion for Gemini API (veo-3.1-fast-generate-preview)
        // Add technical specifications for better video generation
        let enhancedVideoSuggestion = videoSuggestion;
        if (videoSuggestion) {
            // Ensure the prompt has pacing, duration, and technical keywords
            const hasTechKeywords = /9:16|vertical|15.?sec|30.?sec|45.?sec|60.?sec|duration|pacing|cinematic/i.test(videoSuggestion);
            if (!hasTechKeywords) {
                enhancedVideoSuggestion = `${videoSuggestion}. Format: 9:16 vertical video, 30-45 seconds duration. Cinematic quality, professional editing, engaging pacing. Suitable for social media (TikTok, Instagram Reels, YouTube Shorts).`;
            }
            content.videoSuggestion = enhancedVideoSuggestion;
        }

        const newPost: Post = {
            id: crypto.randomUUID(),
            topic: topic || "AI Generated Content",
            platforms,
            postType: postType || 'post',
            content,
            status: 'draft',
            createdAt: new Date().toISOString(),
            isGeneratingImage: false,
            isGeneratingVideo: false,
            videoGenerationStatus: '',
        };

        onPostCreated(newPost);
        (async () => {
            await saveCurrentChat();
            await startNewChat();
        })();
    }, [onPostCreated, saveCurrentChat, startNewChat]);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || activeThreadId !== 'new') return;

        const userMessage: Message = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Build conversation history for API
            const history = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                    content: m.content
                }));

            // Call server-side API
            const response = await fetch('/api/ai/content/strategist/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userInput,
                    history
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            const { data } = await response.json();
            const aiResponse = data.response;

            // Check if content was generated (user confirmed)
            if (data.readyToGenerate && data.generatedContent) {
                // Content was generated using generateSocialMediaContent
                const postData = {
                    topic: data.parameters.topic,
                    ...data.generatedContent
                };
                
                setMessages(prev => [...prev, {
                    role: 'system',
                    content: 'Perfect! Here is your generated content. Ready to create this post?',
                    postData: postData,
                }]);
            } else {
                // Regular conversation response
                setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            setMessages(prev => [...prev, { role: 'system', content: 'Sorry, I ran into a problem. Please try again.'}]);
        } finally {
            setIsLoading(false);
        }
    }, [userInput, isLoading, messages, activeThreadId, handleCreatePost]);
    
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        // Fix: Replace `JSX.Element` with `React.ReactElement` to resolve namespace error.
        const elements: React.ReactElement[] = [];
        let listItems: React.ReactElement[] = [];

        const renderLineContent = (line: string) => {
            return line.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };
        
        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>);
                listItems = [];
            }
        };

        lines.forEach((line, i) => {
            if (line.trim().startsWith('* ')) {
                listItems.push(<li key={i} className="pl-2">{renderLineContent(line.trim().substring(2))}</li>);
            } else {
                flushList();
                if (line.trim() !== '') {
                    elements.push(<p key={i}>{renderLineContent(line)}</p>);
                }
            }
        });

        flushList();

        return <div className="space-y-2">{elements}</div>;
    };


    const MessageBubble: React.FC<{ msg: Message }> = React.memo(({ msg }) => {
        const isUser = msg.role === 'user';
        const isModel = msg.role === 'model';
        const isSystem = msg.role === 'system';

        if (isSystem && msg.postData) {
            return (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 my-3 shadow-md">
                    <p className="font-semibold text-gray-900 mb-4 text-base">{msg.content}</p>
                    <div className="bg-white p-6 rounded-lg mb-5 min-h-[500px]">
                        <h4 className="font-bold text-gray-900 mb-4 text-base">Topic: <span className="font-normal">{msg.postData.topic}</span></h4>
                        <textarea
                            readOnly
                            value={JSON.stringify(msg.postData, null, 2)}
                            className="w-full h-[420px] text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0"
                        />
                    </div>
                    <button
                        onClick={() => handleCreatePost(msg.postData)}
                        className="w-full flex items-center justify-center py-4 px-4 shadow-lg shadow-indigo-500/30 text-base font-bold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Accept & Create Post
                    </button>
                </div>
            );
        }

        return (
            <div className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-700' : 'bg-gray-600'}`}>
                    {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
                <div className={`p-4 rounded-lg text-base shadow-sm ${isUser ? 'bg-indigo-700 text-white max-w-4xl' : 'bg-gray-100 text-gray-900 border border-gray-200 w-[70%]'}`}>
                    {isModel ? renderMarkdown(msg.content) : <p className="whitespace-pre-wrap">{msg.content}</p>}
                </div>
            </div>
        );
    });

    return (
        <div className="h-full flex flex-row gap-4">
            {isHistoryVisible && (
                <div className="w-64 bg-white rounded-xl shadow-md flex flex-col h-full border border-gray-200">
                    <div className="p-3 border-b border-gray-200">
                        <button
                            onClick={() => startNewChat()}
                            className="w-full flex items-center justify-center py-2.5 px-4 shadow-md text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            New Chat
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <h3 className="px-2 pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">History</h3>
                        <nav className="space-y-1">
                            {chatHistory.map(thread => (
                                <div
                                    key={thread.id}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all group ${
                                        activeThreadId === thread.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    <button
                                        onClick={() => handleSelectThread(thread)}
                                        className="flex-1 text-left flex flex-col"
                                    >
                                        <p className="text-sm font-medium text-gray-900 truncate">{thread.title}</p>
                                        <p className="text-xs text-gray-600">{new Date(thread.created_at).toLocaleDateString()}</p>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteThread(e, thread.id)}
                                        className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete thread"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            AI Contents Strategist
                        </h2>
                        <p className="text-gray-600 mt-1 text-sm">Brainstorm and create content with AI assistance</p>
                    </div>
                    <button
                        onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={isHistoryVisible ? "Hide History" : "Show History"}
                    >
                        {isHistoryVisible ? <PanelLeftClose className="w-6 h-6 text-gray-600" /> : <History className="w-6 h-6 text-gray-600" />}
                    </button>
                </div>
                <div className="flex-grow bg-white rounded-xl shadow-md flex flex-col p-4 min-h-0 border border-gray-200">
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2">
                        {messages.map((msg, index) => <MessageBubble key={index} msg={msg} />)}
                        {isLoading && (
                            <div className="flex items-start gap-3 my-4">
                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="p-4 rounded-lg bg-gray-100 border border-gray-200 flex items-center shadow-sm">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 border-t border-gray-200 pt-4">
                        {error && <p className="text-red-600 text-sm text-center mb-3 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                        <form onSubmit={handleSubmit} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={activeThreadId !== 'new' ? "Viewing history (read-only)" : "Let's brainstorm some content..."}
                                className="flex-1 bg-white border border-gray-300 rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 p-3 px-5"
                                disabled={isLoading || activeThreadId !== 'new'}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !userInput.trim() || activeThreadId !== 'new'}
                                className="p-3 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Wrap with React.memo to prevent unnecessary re-renders when parent re-renders
export default React.memo(ContentStrategistView);
