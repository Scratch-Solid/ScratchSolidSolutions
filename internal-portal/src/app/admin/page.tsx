"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (!token) {
      router.push('/login');
      return;
    }

    if (role !== 'admin') {
      router.push('/');
      return;
    }

    setUserRole(role);
  }, [router]);

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-700">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/admin/content-upload" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                Content Upload
              </a>
              <a href="/admin/content" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                Manage Content
              </a>
              <a href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md font-medium">
                Back to Site
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Welcome to Admin Dashboard</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Upload</h3>
              <p className="text-gray-600 mb-4">Upload and manage site content</p>
              <a href="/admin/content-upload" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Upload Content
              </a>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Content</h3>
              <p className="text-gray-600 mb-4">View and edit existing content</p>
              <a href="/admin/content" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                Manage Content
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
