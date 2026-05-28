"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, ArrowRightLeft, Info } from "lucide-react";

export default function PoolManagement() {
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return;
    fetch('/api/admin/cleaners', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((data: any) => { setCleaners(Array.isArray(data) ? data : []); })
      .catch(() => setMessage('Failed to load cleaners'))
      .finally(() => setLoading(false));
  }, []);

  const togglePool = async (cleanerId: number, currentPool: string) => {
    const newPool = currentPool === 'INDIVIDUAL' ? 'BUSINESS' : 'INDIVIDUAL';
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    try {
      const res = await fetch('/api/v2/staff/pool-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ staff_id: cleanerId, new_pool: newPool, reason: 'Admin manual reassignment' }),
      });
      if (res.ok) {
        setCleaners(prev => prev.map(c => c.id === cleanerId ? { ...c, pool_type: newPool } : c));
        setMessage(`Cleaner moved to ${newPool} pool`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update pool');
      }
    } catch {
      setMessage('Network error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pool Management</h2>
          <p className="text-slate-500 text-sm mt-1">Toggle cleaners between INDIVIDUAL and BUSINESS pools</p>
        </div>
        {message && (
          <Badge variant={message.includes('moved') ? 'default' : 'destructive'}>
            {message}
          </Badge>
        )}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Pool Types</AlertTitle>
        <AlertDescription>
          <strong>INDIVIDUAL:</strong> Auto-assigned residential bookings. <strong>BUSINESS:</strong> Manually allocated commercial bookings.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading cleaners…</div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cleaners ({cleaners.length})
            </CardTitle>
            <CardDescription>Manage pool assignments for all cleaners</CardDescription>
          </CardHeader>
          <CardContent>
            {cleaners.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No cleaners found.</div>
            ) : (
              <div className="space-y-3">
                {cleaners.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-900">{c.first_name} {c.last_name}</div>
                      <div className="text-sm text-slate-500">{c.email || c.username}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={(c.pool_type || 'INDIVIDUAL') === 'INDIVIDUAL' ? 'default' : 'secondary'}
                        className={(c.pool_type || 'INDIVIDUAL') === 'INDIVIDUAL' 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }
                      >
                        {c.pool_type || 'INDIVIDUAL'}
                      </Badge>
                      <Button
                        onClick={() => togglePool(c.id, c.pool_type || 'INDIVIDUAL')}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Switch to {(c.pool_type || 'INDIVIDUAL') === 'INDIVIDUAL' ? 'BUSINESS' : 'INDIVIDUAL'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
