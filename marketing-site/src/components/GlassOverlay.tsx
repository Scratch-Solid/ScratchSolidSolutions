import React from 'react';

interface GlassOverlayProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function GlassOverlay({ children, onClose, className = '' }: GlassOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Glassified content */}
      <div className={`relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 ${className}`}>
        {children}
      </div>
    </div>
  );
}
