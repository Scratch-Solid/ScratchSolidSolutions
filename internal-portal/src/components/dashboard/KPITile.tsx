'use client';

import { LucideIcon } from 'lucide-react';

interface KPITileProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

const colorClasses = {
  blue: 'bg-[#B08A5E]',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

const bgColorClasses = {
  blue: 'bg-[#F7F2EA]',
  green: 'bg-green-50',
  yellow: 'bg-yellow-50',
  red: 'bg-red-50',
  purple: 'bg-purple-50',
};

export default function KPITile({
  title,
  value,
  change,
  changeType = 'increase',
  icon: Icon,
  color = 'blue',
  loading = false,
}: KPITileProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-stone-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-stone-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-stone-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {changeType === 'increase' ? '+' : '-'}{Math.abs(change)}%
              </span>
              <span className="text-sm text-stone-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColorClasses[color]}`}>
          <Icon className={`w-6 h-6 ${colorClasses[color].replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}
