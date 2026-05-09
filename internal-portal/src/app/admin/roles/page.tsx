"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

interface Role {
  id: number;
  name: string;
  description: string;
  level: number;
  created_at: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

function RolesManagementContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 50
  });
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const res = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('token');
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch roles and permissions');
      }

      const data = await res.json() as { roles: Role[]; permissions: Permission[] };
      setRoles(data.roles);
      setPermissions(data.permissions);
    } catch (err) {
      setError('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/roles/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Failed to create role');
        return;
      }

      const newRole = await res.json() as { role: Role };
      setRoles(prev => [...prev, newRole.role]);
      setFormData({ name: "", description: "", level: 50 });
      setShowCreateForm(false);
      setMessage('Role created successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 100) return 'bg-purple-100 text-purple-800';
    if (level >= 80) return 'bg-red-100 text-red-800';
    if (level >= 60) return 'bg-orange-100 text-orange-800';
    if (level >= 40) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
            <p className="mt-2 text-gray-600">Manage system roles and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {showCreateForm ? 'Cancel' : 'Create Role'}
          </button>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Role Form */}
        {showCreateForm && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Role</h3>
            </div>
            <form onSubmit={handleCreateRole} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., content_manager"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the role's responsibilities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>Basic Access (10)</option>
                    <option value={20}>Client Access (20)</option>
                    <option value={40}>Viewer Access (40)</option>
                    <option value={60}>Moderator Access (60)</option>
                    <option value={80}>Admin Access (80)</option>
                    <option value={100}>Super Admin Access (100)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={creating || !formData.name || !formData.description}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Roles Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Existing Roles</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {role.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelColor(role.level)}`}>
                        Level {role.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Overview */}
        <div className="mt-8 bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Permissions</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {permission.name}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {permission.resource}.{permission.action}
                  </div>
                  <div className="text-sm text-gray-600">
                    {permission.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RolesManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RolesManagementContent />
    </Suspense>
  );
}
