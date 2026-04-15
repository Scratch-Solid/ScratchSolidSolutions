"use client";
export default function SecondaryButton({ children, ...props }) {
  return (
    <button
      className="secondary-button"
      style={{ minWidth: 120, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: '1.1rem', background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent-border)', transition: 'border 0.2s, color 0.2s' }}
      {...props}
    >
      {children}
    </button>
  );
}
