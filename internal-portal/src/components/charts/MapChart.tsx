'use client';

import { useState } from 'react';

interface MapChartProps {
  data: any[];
  title?: string;
  loading?: boolean;
}

export default function MapChart({ data, title, loading = false }: MapChartProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-stone-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-stone-200 rounded" />
        </div>
      </div>
    );
  }

  // Simple heatmap visualization using colored squares
  const maxValue = Math.max(...data.map((d) => d.value || 0));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">
      {title && <h3 className="text-lg font-semibold text-stone-900 mb-4">{title}</h3>}
      <div className="grid grid-cols-4 gap-2">
        {data.map((item, index) => {
          const intensity = item.value ? (item.value / maxValue) * 100 : 0;
          return (
            <div
              key={index}
              onClick={() => setSelectedRegion(item.region)}
              className={`
                p-4 rounded-lg cursor-pointer transition-all hover:scale-105
                ${selectedRegion === item.region ? 'ring-2 ring-[#B08A5E]' : ''}
              `}
              style={{
                backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
              }}
              title={`${item.region}: ${item.value}`}
            >
              <div className="text-sm font-medium text-stone-900">{item.region}</div>
              <div className="text-xs text-stone-600">{item.value || 0}</div>
            </div>
          );
        })}
      </div>
      {selectedRegion && (
        <div className="mt-4 p-3 bg-[#F7F2EA] rounded-lg">
          <p className="text-sm text-[#150E09]">
            <strong>{selectedRegion}</strong>: {data.find((d) => d.region === selectedRegion)?.value || 0}
          </p>
        </div>
      )}
    </div>
  );
}
