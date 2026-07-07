"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ContentUpload() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [type, setType] = useState("privacy");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

    if (!token || role !== 'admin') {
      router.push('/login');
      return;
    }

    setUserRole(role);
    loadExistingContent();
  }, [router]);

  const loadExistingContent = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch(`/api/marketing/content?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || "");
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    loadExistingContent();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await fetch(`/api/marketing/content?type=${type}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, title: title || type.charAt(0).toUpperCase() + type.slice(1) })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Content updated successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update content' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating content' });
    } finally {
      setLoading(false);
    }
  };

  if (!userRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A8A]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Content Upload</h1>
        <p className="text-sm text-slate-500 mt-1">Manage marketing site content pages.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">

          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="privacy">Privacy Policy</option>
                  <option value="terms">Terms of Service</option>
                  <option value="contact">Contact Info</option>
                  <option value="services">Services</option>
                  <option value="about">About Us</option>
                  <option value="indemnity">Indemnity Form</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type.charAt(0).toUpperCase() + type.slice(1)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your content here..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Content'}
                </button>
              </div>
            </form>
          </div>
  );
}
