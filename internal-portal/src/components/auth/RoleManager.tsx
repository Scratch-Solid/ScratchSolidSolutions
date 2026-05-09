"use client";

import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'cleaner' | 'digital' | 'transport';
  created_at: string;
  updated_at: string;
}

interface RoleManagerProps {
  onClose?: () => void;
}

export default function RoleManager({ onClose }: RoleManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: number, newRole: string) => {
    setUpdating(userId);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole as User['role'] } : user
        ));
      } else {
        setError(data.error || 'Failed to update role');
      }
    } catch (error) {
      setError('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'cleaner': return 'bg-blue-100 text-blue-800';
      case 'digital': return 'bg-green-100 text-green-800';
      case 'transport': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full system access';
      case 'cleaner': return 'Cleaning services management';
      case 'digital': return 'Digital marketing management';
      case 'transport': return 'Transport logistics management';
      default: return 'Limited access';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Role Management</h2>
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

      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Admin:</span> Full system access, user management
            </div>
            <div>
              <span className="font-medium">Cleaner:</span> Cleaning services, scheduling
            </div>
            <div>
              <span className="font-medium">Digital:</span> Marketing, content management
            </div>
            <div>
              <span className="font-medium">Transport:</span> Logistics, fleet management
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                    <div className="text-xs text-gray-500">
                      {getRoleDescription(user.role)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    disabled={updating === user.id}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="admin">Admin</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="digital">Digital</option>
                    <option value="transport">Transport</option>
                  </select>
                  {updating === user.id && (
                    <span className="ml-2 text-sm text-blue-600">Updating...</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
}
