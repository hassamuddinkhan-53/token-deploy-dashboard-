import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WarningBanner({ show, message }) {
  if (!show) return null;
  return (
    <div className="mb-6 animate-fade-in">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 text-yellow-500">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  );
}
