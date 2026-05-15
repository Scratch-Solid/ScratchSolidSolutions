"use client";

import { useState, useEffect } from "react";

interface Cleaner {
  user_id: number;
  first_name: string;
  last_name: string;
  status: 'idle' | 'on_way' | 'arrived' | 'completed';
  gps_lat?: number;
  gps_long?: number;
  updated_at?: string;
  blocked: number;
}

export default function CleanerVisibility() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchCleaners();
    
    if (autoRefresh) {
      const interval = setInterval(fetchCleaners, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchCleaners = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/cleaners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCleaners(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cleaners:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'on_way': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'on_way': return 'On the Way';
      case 'arrived': return 'Arrived';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const activeCleaners = cleaners.filter(c => c.status !== 'idle' && !c.blocked);
  const idleCleaners = cleaners.filter(c => c.status === 'idle' && !c.blocked);
  const blockedCleaners = cleaners.filter(c => c.blocked);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Cleaner Visibility</h2>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-lg ${autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}
        >
          {autoRefresh ? 'Auto-refresh: ON' : 'Auto-refresh: OFF'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
          <h3 className="font-bold text-white">Total Cleaners</h3>
          <p className="text-2xl font-bold text-white">{cleaners.length}</p>
        </div>
        <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg border border-blue-500/30 p-4">
          <h3 className="font-bold text-white">Active</h3>
          <p className="text-2xl font-bold text-white">{activeCleaners.length}</p>
        </div>
        <div className="bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-500/30 p-4">
          <h3 className="font-bold text-white">Idle</h3>
          <p className="text-2xl font-bold text-white">{idleCleaners.length}</p>
        </div>
        <div className="bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-500/30 p-4">
          <h3 className="font-bold text-white">Blocked</h3>
          <p className="text-2xl font-bold text-white">{blockedCleaners.length}</p>
        </div>
      </div>

      {/* Active Cleaners */}
      {activeCleaners.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="font-bold text-lg text-white mb-4">Active Cleaners</h3>
          <div className="space-y-3">
            {activeCleaners.map(cleaner => (
              <div
                key={cleaner.user_id}
                className="flex items-center justify-between bg-white/5 rounded-lg p-4 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => setSelectedCleaner(cleaner)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {cleaner.first_name} {cleaner.last_name}
                    </p>
                    <p className="text-sm text-gray-400">ID: {cleaner.user_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(cleaner.status)}`}>
                    {getStatusText(cleaner.status)}
                  </span>
                  {cleaner.gps_lat && cleaner.gps_long && (
                    <span className="text-green-400 text-sm">📍 GPS Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Idle Cleaners */}
      {idleCleaners.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h3 className="font-bold text-lg text-white mb-4">Idle Cleaners (Available)</h3>
          <div className="space-y-3">
            {idleCleaners.map(cleaner => (
              <div
                key={cleaner.user_id}
                className="flex items-center justify-between bg-white/5 rounded-lg p-4 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => setSelectedCleaner(cleaner)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {cleaner.first_name} {cleaner.last_name}
                    </p>
                    <p className="text-sm text-gray-400">ID: {cleaner.user_id}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(cleaner.status)}`}>
                  {getStatusText(cleaner.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked Cleaners */}
      {blockedCleaners.length > 0 && (
        <div className="bg-red-500/10 backdrop-blur-sm rounded-lg border border-red-500/30 p-6">
          <h3 className="font-bold text-lg text-white mb-4">Blocked Cleaners</h3>
          <div className="space-y-3">
            {blockedCleaners.map(cleaner => (
              <div
                key={cleaner.user_id}
                className="flex items-center justify-between bg-red-500/5 rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {cleaner.first_name} {cleaner.last_name}
                    </p>
                    <p className="text-sm text-gray-400">ID: {cleaner.user_id}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  Blocked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Cleaner Detail Modal */}
      {selectedCleaner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCleaner(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Cleaner Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{selectedCleaner.first_name} {selectedCleaner.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`font-semibold ${getStatusColor(selectedCleaner.status)}`}>{getStatusText(selectedCleaner.status)}</p>
              </div>
              {selectedCleaner.gps_lat && selectedCleaner.gps_long && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">GPS Latitude</p>
                    <p className="font-semibold">{selectedCleaner.gps_lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">GPS Longitude</p>
                    <p className="font-semibold">{selectedCleaner.gps_long.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-semibold">{selectedCleaner.updated_at || 'Unknown'}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedCleaner.gps_lat},${selectedCleaner.gps_long}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    View on Google Maps
                  </a>
                </>
              )}
            </div>
            <button
              onClick={() => setSelectedCleaner(null)}
              className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-white py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading cleaner data...</p>
        </div>
      )}
    </div>
  );
}
