"use client";

export default function PasswordBanner() {
  const mustChange = typeof window !== 'undefined' && localStorage.getItem('mustChangePassword') === 'true';
  if (!mustChange) return null;
  return (
    <div className="mb-4 bg-yellow-100 text-yellow-900 px-4 py-3 rounded border border-yellow-300">
      <div className="font-bold">Action required</div>
      <div>Please update your password to continue using the portal.</div>
      <button className="mt-2 primary-button" onClick={() => { window.location.href = '/auth/change-password'; }}>
        Change Password
      </button>
    </div>
  );
}
