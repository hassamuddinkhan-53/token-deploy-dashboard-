import React from 'react';
import { Info } from 'lucide-react';

export default function TokenMeta({ meta }) {
  if (!meta) return null;
  return (
    <div className="glass-panel rounded-xl p-4 mt-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-3 text-primary-400">
        <Info size={16} />
        <h4 className="text-sm font-bold uppercase tracking-wider">Token Details</h4>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-800/50 p-3 rounded-lg">
          <span className="text-slate-400 text-xs block mb-1">Name</span>
          <span className="text-white font-medium">{meta.name}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg">
          <span className="text-slate-400 text-xs block mb-1">Symbol</span>
          <span className="text-white font-medium">{meta.symbol}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg">
          <span className="text-slate-400 text-xs block mb-1">Decimals</span>
          <span className="text-white font-medium">{meta.decimals}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg">
          <span className="text-slate-400 text-xs block mb-1">Total Supply</span>
          <span className="text-white font-medium">{meta.totalSupply}</span>
        </div>
      </div>
    </div>
  );
}
