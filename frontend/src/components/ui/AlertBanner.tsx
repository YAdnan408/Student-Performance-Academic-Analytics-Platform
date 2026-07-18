'use client';

import { ReactNode } from 'react';

interface AlertBannerProps {
  type: 'success' | 'error';
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const styles = {
  success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  error: 'bg-red-500/15 border-red-500/40 text-red-200',
};

const AlertBanner = ({ type, children, onDismiss, className = '' }: AlertBannerProps) => (
  <div
    role="alert"
    className={`px-4 py-3 rounded-xl border text-sm flex items-start justify-between gap-3 ${styles[type]} ${className}`}
  >
    <span className="flex-1">{children}</span>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    )}
  </div>
);

export default AlertBanner;
