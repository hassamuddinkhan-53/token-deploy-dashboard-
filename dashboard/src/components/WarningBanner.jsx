import React from 'react';

export default function WarningBanner({ show, message }) {
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center animate-pulse pointer-events-none">
      <div className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-b-lg shadow-lg border-b-4 border-yellow-600 transition-all duration-300 pointer-events-auto">
        <span className="mr-2">⚠️</span>{message}
      </div>
    </div>
  );
}
