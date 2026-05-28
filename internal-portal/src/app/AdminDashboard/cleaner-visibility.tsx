"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, MapPin, RefreshCw, X } from "lucide-react";

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch('/api/admin/cleaners', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json() as Cleaner[];
        setCleaners(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cleaners:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'idle': return 'secondary';
      case 'on_way': return 'default';
      case 'arrived': return 'outline';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-slate-100 text-slate-800';
      case 'on_way': return 'bg-blue-100 text-blue-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cleaner Visibility</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time cleaner status and GPS tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'text-green-600 animate-spin' : 'text-slate-400'}`} />
          <Switch
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <span className="text-sm text-slate-600">Auto-refresh</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Cleaners</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{cleaners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{activeCleaners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{idleCleaners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{blockedCleaners.length}</p>
          </CardContent>
        </Card>
      </div>

      {activeCleaners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Cleaners
            </CardTitle>
            <CardDescription>Cleaners currently on jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeCleaners.map(cleaner => (
                <div
                  key={cleaner.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedCleaner(cleaner)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {cleaner.first_name} {cleaner.last_name}
                      </p>
                      <p className="text-sm text-slate-500">ID: {cleaner.user_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={getStatusVariant(cleaner.status)} className={getStatusColor(cleaner.status)}>
                      {getStatusText(cleaner.status)}
                    </Badge>
                    {cleaner.gps_lat && cleaner.gps_long && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        GPS Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {idleCleaners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Idle Cleaners (Available)</CardTitle>
            <CardDescription>Cleaners available for new assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {idleCleaners.map(cleaner => (
                <div
                  key={cleaner.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedCleaner(cleaner)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {cleaner.first_name} {cleaner.last_name}
                      </p>
                      <p className="text-sm text-slate-500">ID: {cleaner.user_id}</p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(cleaner.status)} className={getStatusColor(cleaner.status)}>
                    {getStatusText(cleaner.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {blockedCleaners.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Blocked Cleaners</CardTitle>
            <CardDescription>Cleaners with restricted access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedCleaners.map(cleaner => (
                <div
                  key={cleaner.user_id}
                  className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                      {cleaner.first_name?.[0]}{cleaner.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {cleaner.first_name} {cleaner.last_name}
                      </p>
                      <p className="text-sm text-slate-500">ID: {cleaner.user_id}</p>
                    </div>
                  </div>
                  <Badge variant="destructive">Blocked</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedCleaner} onOpenChange={() => setSelectedCleaner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cleaner Details</DialogTitle>
          </DialogHeader>
          {selectedCleaner && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-semibold text-slate-900">{selectedCleaner.first_name} {selectedCleaner.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge variant={getStatusVariant(selectedCleaner.status)} className={getStatusColor(selectedCleaner.status)}>
                  {getStatusText(selectedCleaner.status)}
                </Badge>
              </div>
              {selectedCleaner.gps_lat && selectedCleaner.gps_long && (
                <>
                  <div>
                    <p className="text-sm text-slate-500">GPS Latitude</p>
                    <p className="font-semibold text-slate-900">{selectedCleaner.gps_lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">GPS Longitude</p>
                    <p className="font-semibold text-slate-900">{selectedCleaner.gps_long.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Last Updated</p>
                    <p className="font-semibold text-slate-900">{selectedCleaner.updated_at || 'Unknown'}</p>
                  </div>
                  <Button
                    asChild
                    className="w-full"
                    onClick={() => window.open(`https://www.google.com/maps?q=${selectedCleaner.gps_lat},${selectedCleaner.gps_long}`, '_blank')}
                  >
                    <a target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4 mr-2" />
                      View on Google Maps
                    </a>
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading cleaner data...</span>
        </div>
      )}
    </div>
  );
}
