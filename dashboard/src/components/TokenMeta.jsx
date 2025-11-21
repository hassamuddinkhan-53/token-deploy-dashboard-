import React from 'react';

export default function TokenMeta({ meta }) {
  if (!meta) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-700 border border-gray-200 mt-2">
      <div><span className="font-semibold">Name:</span> {meta.name}</div>
      <div><span className="font-semibold">Symbol:</span> {meta.symbol}</div>
      <div><span className="font-semibold">Decimals:</span> {meta.decimals}</div>
      <div><span className="font-semibold">Address:</span> <span className="font-mono">{meta.address}</span></div>
    </div>
  );
}
