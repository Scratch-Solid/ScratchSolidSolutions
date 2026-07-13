'use client';

import { useState, useEffect } from 'react';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface StageDuration {
  stage: string;
  avg_duration_hours: number;
}

interface DropOff {
  stage: string;
  count: number;
}

interface DepartmentComparison {
  [department: string]: {
    [stage: string]: number;
  };
}

interface TimeOfDayAnalysis {
  hour: number;
  count: number;
}

export default function OnboardingAnalytics() {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [stageDurations, setStageDurations] = useState<StageDuration[]>([]);
  const [dropOffs, setDropOffs] = useState<DropOff[]>([]);
  const [departmentComparison, setDepartmentComparison] = useState<DepartmentComparison>({});
  const [timeOfDayAnalysis, setTimeOfDayAnalysis] = useState<TimeOfDayAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/onboarding/analytics');
      const data = await response.json() as { funnel?: FunnelData[]; stageDurations?: StageDuration[]; dropOffs?: DropOff[]; departmentComparison?: DepartmentComparison; timeOfDayAnalysis?: TimeOfDayAnalysis[] };
      setFunnelData(data.funnel || []);
      setStageDurations(data.stageDurations || []);
      setDropOffs(data.dropOffs || []);
      setDepartmentComparison(data.departmentComparison || {});
      setTimeOfDayAnalysis(data.timeOfDayAnalysis || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/admin/onboarding/export?format=${format}`);
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'onboarding_export.csv';
        a.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">Loading analytics...</div>
      </div>
    );
  }

  const totalApplicants = funnelData.length > 0 ? funnelData[0].count : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Onboarding Analytics</h1>
        <button
          onClick={() => handleExport('csv')}
          className="bg-[#B08A5E] text-white px-4 py-2 rounded-lg hover:bg-[#2E1F16]"
        >
          Export CSV
        </button>
      </div>

      {/* Funnel Visualization */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
        <div className="space-y-3">
          {funnelData.map((item, index) => (
            <div key={item.stage} className="flex items-center">
              <div className="w-40 text-sm text-stone-600">{item.stage.replace(/_/g, ' ')}</div>
              <div className="flex-1 mx-4">
                <div className="bg-stone-200 rounded-full h-8 relative">
                  <div
                    className="bg-[#B08A5E] h-8 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-white text-xs font-medium">{item.count}</span>
                  </div>
                </div>
              </div>
              <div className="w-20 text-sm text-stone-600">{item.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Duration Analysis */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Average Stage Duration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stageDurations.map((item) => (
            <div key={item.stage} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="text-sm text-stone-500 mb-1">{item.stage.replace(/_/g, ' ')}</div>
              <div className="text-xl font-bold">
                {item.avg_duration_hours < 24
                  ? `${item.avg_duration_hours.toFixed(1)}h`
                  : `${(item.avg_duration_hours / 24).toFixed(1)}d`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#F7F2EA] border border-[#E9E0D3] rounded-lg p-4">
          <div className="text-sm text-[#2E1F16]">Total Applicants</div>
          <div className="text-2xl font-bold text-[#150E09]">{totalApplicants}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600">Completed Onboarding</div>
          <div className="text-2xl font-bold text-green-900">
            {funnelData.find(f => f.stage === 'active')?.count || 0}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600">Conversion Rate</div>
          <div className="text-2xl font-bold text-red-900">
            {totalApplicants > 0
              ? ((funnelData.find(f => f.stage === 'active')?.count || 0) / totalApplicants * 100).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {/* Drop-off Points */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Drop-off Points (stuck &gt; 7 days)</h2>
        <div className="grid grid-cols-4 gap-4">
          {dropOffs.map((item) => (
            <div key={item.stage} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-sm text-orange-600">{item.stage.replace(/_/g, ' ')}</div>
              <div className="text-xl font-bold text-orange-900">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Comparison */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Department Comparison</h2>
        <div className="bg-white border rounded-lg p-4">
          {Object.entries(departmentComparison).map(([dept, stages]) => (
            <div key={dept} className="mb-4 last:mb-0">
              <div className="font-medium mb-2">{dept}</div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {Object.entries(stages as Record<string, number>).map(([stage, count]) => (
                  <div key={stage} className="text-center">
                    <div className="text-stone-500">{stage.replace(/_/g, ' ')}</div>
                    <div className="font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time-of-Day Analysis */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Sign-up Time Distribution (last 30 days)</h2>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 24 }, (_, i) => {
              const hourData = timeOfDayAnalysis.find(t => t.hour === i);
              const count = hourData?.count || 0;
              const maxCount = Math.max(...timeOfDayAnalysis.map(t => t.count), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-[#B08A5E] rounded-t" style={{ height: `${height}%` }}></div>
                  <div className="text-xs text-stone-500 mt-1">{i}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
