import React from 'react';

export default function TokenBalance({ account, ethBalance, tokens, balances, tokenMeta }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 border border-blue-100 transition-all duration-300">
      <div className="mb-2 font-mono text-xs text-gray-500">{account}</div>
      <div className="mb-2"><span className="font-bold">ETH:</span> {ethBalance || 0}</div>
      {tokens.map((token) => (
        <div key={token.address} className="mb-1">
          <span className="font-bold">{tokenMeta[token.address]?.symbol || ''}:</span> {(balances && balances[token.address]) || 0}
        </div>
      ))}
    </div>
  );
}
