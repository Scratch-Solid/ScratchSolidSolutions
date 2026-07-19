import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export function Card({ children, className = '', glass = false }: CardProps) {
  const base = 'rounded-2xl border border-[#E9E0D3] p-5';
  const glassStyle = glass ? 'bg-white/85 backdrop-blur-md shadow-lg' : 'bg-white shadow-md';
  return <div className={`${base} ${glassStyle} ${className}`}>{children}</div>;
}
