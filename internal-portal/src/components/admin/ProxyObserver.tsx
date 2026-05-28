"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function ProxyObserver() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserRole, setTargetUserRole] = useState<'client' | 'cleaner' | 'business'>('client');
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSessionHistory();
  }, []);

  const fetchSessionHistory = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'view' })
      });
      if (response.ok) {
        const data = await response.json();
        setSessionHistory(data.history || []);
      }
    } catch (error) {
      setMessage('Failed to fetch session history');
    }
  };

  const handleStartSession = async () => {
    if (!targetUserId) {
      setMessage('Please select a target user');
      return;
    }
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'start',
          targetUserId: parseInt(targetUserId)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setMessage('Proxy session started');
        fetchSessionHistory();
      } else {
        setMessage('Failed to start proxy session');
      }
    } catch (error) {
      setMessage('Failed to start proxy session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch('/api/admin/proxy-observer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'end',
          sessionId: activeSession.sessionId
        })
      });
      if (response.ok) {
        setActiveSession(null);
        setMessage('Proxy session ended');
        fetchSessionHistory();
      } else {
        setMessage('Failed to end proxy session');
      }
    } catch (error) {
      setMessage('Failed to end proxy session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Proxy Observer State Engine</h2>
          <p className="text-slate-500 text-sm mt-1">View dashboards as different user roles for testing</p>
        </div>
        {message && (
          <Badge variant={message.includes('success') || message.includes('started') || message.includes('ended') ? 'default' : 'destructive'}>
            {message}
          </Badge>
        )}
      </div>

      {/* Session Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Projection Matrix</CardTitle>
          <CardDescription>Start a read-only session to view the dashboard as another user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target User Role</label>
              <Select value={targetUserRole} onValueChange={(value) => setTargetUserRole(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target User ID</label>
              <Input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user ID"
              />
            </div>
            <div className="flex items-end">
              {!activeSession ? (
                <Button
                  onClick={handleStartSession}
                  disabled={loading || !targetUserId}
                  className="w-full"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {loading ? 'Starting...' : 'Start View As'}
                </Button>
              ) : (
                <Button
                  onClick={handleEndSession}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  {loading ? 'Ending...' : 'End Session'}
                </Button>
              )}
            </div>
          </div>

          {/* Active Session Display */}
          {activeSession && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-700 font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Active Session
                </span>
                <span className="text-green-600 text-sm">
                  Started: {new Date(activeSession.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-slate-700 text-sm">
                Viewing as: {activeSession.targetUserId} ({targetUserRole})
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-green-100">
                <div className="text-slate-500 text-xs mb-2 font-medium">READ-ONLY VIEW</div>
                <div className="text-slate-600 text-sm">
                  This is a simulated view of the target user's dashboard. Actual dashboard rendering would require iframe integration.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle>Session History (Audit Log)</CardTitle>
          <CardDescription>View all proxy observer sessions for compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionHistory.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No proxy sessions recorded.</p>
          ) : (
            <div className="space-y-3">
              {sessionHistory.map((session: any) => (
                <div key={session.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-900">Session ID: {session.sessionId}</div>
                      <div className="text-slate-600 text-sm">Target: {session.targetUserId} ({session.targetRole})</div>
                      <div className="text-slate-500 text-xs">Started: {new Date(session.startedAt).toLocaleString()}</div>
                      {session.endedAt && (
                        <div className="text-slate-500 text-xs">Ended: {new Date(session.endedAt).toLocaleString()}</div>
                      )}
                    </div>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* POPIA Compliance Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>POPIA Compliance Notice</AlertTitle>
        <AlertDescription>
          All proxy observer sessions are logged for audit purposes. Access to user data through this feature is monitored and requires proper authorization.
        </AlertDescription>
      </Alert>
    </div>
  );
}
