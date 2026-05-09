"use client";

import React, { useState, useEffect } from 'react';

interface Session {
  id: number;
  token: string;
  created_at: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface SessionManagerProps {
  onClose?: () => void;
}

export default function SessionManager({ onClose }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [revoking, setRevoking] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSessions(data.data.sessions);
      } else {
        setError(data.error || 'Failed to load sessions');
      }
    } catch (error) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: number) => {
    setRevoking(sessionId);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (data.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        setError(data.error || 'Failed to revoke session');
      }
    } catch (error) {
      setError('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    setRevoking(-1); // Special value for "revoke all"
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ revokeAll: true })
      });

      const data = await response.json();

      if (data.success) {
        // Keep only current session
        const currentToken = token;
        setSessions(sessions.filter(s => s.token === currentToken));
      } else {
        setError(data.error || 'Failed to revoke sessions');
      }
    } catch (error) {
      setError('Failed to revoke sessions');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isCurrentSession = (session: Session) => {
    const currentToken = localStorage.getItem('authToken');
    return session.token === currentToken;
  };

  const getDeviceName = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'Desktop';
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Active Sessions</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          You have {sessions.length} active session{sessions.length !== 1 ? 's' : ''} 
          (maximum 3 allowed)
        </p>
      </div>

      {sessions.length > 1 && (
        <div className="mb-6">
          <button
            onClick={revokeAllOtherSessions}
            disabled={revoking === -1}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {revoking === -1 ? 'Revoking...' : 'Revoke All Other Sessions'}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`border rounded-lg p-4 ${
              isCurrentSession(session) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">
                    {getDeviceName(session.user_agent)}
                  </h3>
                  {isCurrentSession(session) && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Current Session
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Created: {formatDate(session.created_at)}</p>
                  <p>Expires: {formatDate(session.expires_at)}</p>
                  {session.ip_address && (
                    <p>IP: {session.ip_address}</p>
                  )}
                </div>
              </div>

              {!isCurrentSession(session) && (
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {revoking === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No active sessions found
        </div>
      )}
    </div>
  );
}
