import React from 'react';
import { Wallet, Coins } from 'lucide-react';

export default function TokenBalance({ account, ethBalance, tokens, balances, tokenMeta }) {
  return (
    <div className="glass-panel rounded-2xl p-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
          <Wallet size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Wallet Balance</h3>
          <div className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded mt-1 break-all">
            {account}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-300">ETH</span>
            </div>
            <span className="font-medium text-slate-200">Ethereum</span>
          </div>
          <span className="font-bold text-white">{parseFloat(ethBalance || '0').toFixed(4)}</span>
        </div>
        {console.log(tokens)}
        {tokens.map((token) => (
          <div key={token.address} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Token Logo or Placeholder */}
              {token.logoURI ? (
                <img
                  src={token.logoURI}
                  alt={tokenMeta[token.address]?.symbol || 'Token'}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0"
                style={{ display: token.logoURI ? 'none' : 'flex' }}
              >
                <span className="text-[10px] font-bold text-white">
                  {(tokenMeta[token.address]?.symbol || 'Token').slice(0, 2)}
                </span>
              </div>

              {/* Token Symbol */}
              <span className="font-bold text-white flex-shrink-0">
                {token.name}
              </span>

              {/* Token Name */}
              <span className="font-medium text-slate-400 truncate">
                {tokenMeta[token.address]?.name || ''}
              </span>
            </div>

            {/* Balance */}
            <span className="font-bold text-white flex-shrink-0 ml-3">
              {parseFloat((balances && balances[token.address]) || '0').toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
