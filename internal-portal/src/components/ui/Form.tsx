import React from 'react';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  className?: string;
}

export function Form({ children, className = '', ...props }: FormProps) {
  return <form className={`space-y-4 ${className}`} {...props}>{children}</form>;
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, className = '', ...props }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium">{label}</label>
      <input className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-[#B08A5E] focus:outline-none ${error ? 'border-red-500' : 'border-stone-300'} ${className}`} {...props} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
