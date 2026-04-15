"use client";
export default function GlassCard({ children, style = {}, ...props }) {
  return (
    <section
      className="glass-card"
      style={{ background: 'var(--surface-strong)', boxShadow: 'var(--shadow-soft)', borderRadius: 14, border: '1.5px solid var(--border)', padding: '18px 22px', marginBottom: 18, ...style }}
      {...props}
    >
      {children}
    </section>
  );
}
