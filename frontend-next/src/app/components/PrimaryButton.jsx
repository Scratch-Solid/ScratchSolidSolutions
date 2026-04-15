"use client";
export default function PrimaryButton({ children, ...props }) {
  return (
    <button
      className="primary-button"
      style={{ minWidth: 120, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: '1.1rem', background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(125, 91, 255, 0.08)', transition: 'background 0.2s' }}
      {...props}
    >
      {children}
    </button>
  );
}
