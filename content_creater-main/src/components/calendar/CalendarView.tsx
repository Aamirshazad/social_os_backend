'use client'

import React, { useState } from 'react';
import { Post } from '@/types';
import { STATUS_CONFIG } from '@/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
    posts: Post[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ posts }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startDay });

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const getPostsForDay = (day: number) => {
        return posts.filter(post => {
            if (post.status !== 'scheduled' || !post.scheduledAt) return false;
            const postDate = new Date(post.scheduledAt);
            return postDate.getFullYear() === currentDate.getFullYear() &&
                   postDate.getMonth() === currentDate.getMonth() &&
                   postDate.getDate() === day;
        });
    };

    const StatusDot: React.FC<{ status: Post['status'] }> = ({ status }) => (
        <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].color}`} title={STATUS_CONFIG[status].label} />
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate/30">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate/10">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-semibold text-charcoal-dark">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate/10">
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {emptyDays.map((_, index) => <div key={`empty-${index}`} className="border border-slate/30 rounded-md h-28"></div>)}
                {days.map(day => {
                    const postsForDay = getPostsForDay(day);
                    const isToday = new Date().getFullYear() === currentDate.getFullYear() &&
                                    new Date().getMonth() === currentDate.getMonth() &&
                                    new Date().getDate() === day;
                    return (
                        <div key={day} className={`border border-slate/30 rounded-md h-28 p-2 text-left flex flex-col ${isToday ? 'bg-charcoal/10' : ''}`}>
                            <span className={`font-semibold ${isToday ? 'text-charcoal-dark' : 'text-charcoal-dark'}`}>{day}</span>
                             <div className="flex-grow overflow-y-auto mt-1 space-y-1">
                                {postsForDay.map(post => (
                                    <div key={post.id} className="flex items-center gap-1.5 text-xs text-charcoal truncate">
                                        <StatusDot status={post.status} />
                                        <p className="truncate">{post.topic}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
