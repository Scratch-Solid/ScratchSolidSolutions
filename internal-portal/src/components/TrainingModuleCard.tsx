import React from 'react';

interface TrainingModuleCardProps {
  moduleId: number;
  moduleTitle: string;
  estimatedDuration: number;
  status: 'locked' | 'active' | 'completed';
  nextUnlockTime?: string;
  onStart?: () => void;
}

export default function TrainingModuleCard({
  moduleId,
  moduleTitle,
  estimatedDuration,
  status,
  nextUnlockTime,
  onStart
}: TrainingModuleCardProps) {
  const getTimeRemaining = () => {
    if (!nextUnlockTime || status !== 'locked') return null;
    const unlockTime = new Date(nextUnlockTime);
    const now = new Date();
    const diff = unlockTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl border border-stone-100 my-4">
      <div className="p-6">
        {/* Header Block */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            status === 'completed' 
              ? 'bg-green-50 text-green-600' 
              : status === 'active' 
              ? 'bg-amber-50 text-amber-600' 
              : 'bg-stone-100 text-stone-600'
          }`}>
            Day {moduleId} Protocol
          </span>
          <span className="text-sm font-medium text-stone-500 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            {estimatedDuration} Min read
          </span>
        </div>

        {/* Title and Core Value Hook */}
        <h3 className="block text-lg leading-tight font-bold text-stone-900 mb-2">
          {moduleTitle}
        </h3>
        <p className="text-stone-600 text-sm mb-6 leading-relaxed">
          {status === 'completed' 
            ? 'Module completed successfully. You have demonstrated mastery of this topic.'
            : status === 'active'
            ? 'Begin your training module to demonstrate your understanding.'
            : 'This module is locked. Complete the previous module to unlock this one.'}
        </p>

        {/* Time Lock Alert Wrapper (Conditionally Rendered via Client State) */}
        {status === 'locked' && timeRemaining && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Module Locked</h4>
              <p className="text-xs text-stone-500 mt-0.5">
                To prevent training fatigue, this module unlocks in <span className="font-mono font-bold text-stone-800">{timeRemaining}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Active Interface CTA Button (Conditionally Rendered) */}
        {status === 'active' && (
          <button
            onClick={onStart}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm py-3 px-4 rounded-lg transition duration-150 ease-in-out flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
          >
            <span>Launch Training Module</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        )}

        {/* Completed State */}
        {status === 'completed' && (
          <button
            disabled
            className="w-full bg-green-50 text-green-700 font-medium text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Completed</span>
          </button>
        )}

        {/* Locked State (without time remaining) */}
        {status === 'locked' && !timeRemaining && (
          <button
            disabled
            className="w-full bg-stone-100 text-stone-500 font-medium text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            <span>Locked</span>
          </button>
        )}
      </div>
    </div>
  );
}
