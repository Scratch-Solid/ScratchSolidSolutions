'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CleanerLogin() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Cleaner Login</h1>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
