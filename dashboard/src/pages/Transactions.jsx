
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

export default function Transactions() {
  const { getTransactions, isSepoliaNetwork } = useWeb3();
  const filterTxs = txs => txs.filter(tx => tx.status !== 'simulated' && !String(tx.from).includes('local') && !String(tx.to).includes('local') && !String(tx.from).includes('mint-sim') && !String(tx.to).includes('mint-sim') && !String(tx.to).includes('burn-sim'));
  const [txs, setTxs] = useState(filterTxs(getTransactions()));
  const [onSepolia, setOnSepolia] = useState(true);
  useEffect(() => {
    async function check() {
      if (isSepoliaNetwork) {
        setOnSepolia(await isSepoliaNetwork());
      } else {
        setOnSepolia(true);
      }
    }
    check();
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('chainChanged', check);
      return () => window.ethereum.removeListener('chainChanged', check);
    }
  }, [isSepoliaNetwork]);

  useEffect(() => {
    function updateFromEvent(e) {
      setTxs(filterTxs(getTransactions()));
    }
    window.addEventListener('tx-updated', updateFromEvent);
    window.addEventListener('storage', updateFromEvent);
    const iv = setInterval(() => setTxs(filterTxs(getTransactions())), 2000);
    return () => {
      window.removeEventListener('tx-updated', updateFromEvent);
      window.removeEventListener('storage', updateFromEvent);
      clearInterval(iv);
    };
  }, [getTransactions]);

  // Remove all transactions
  function clearTransactions() {
    localStorage.removeItem('web3_transactions_v1');
    setTxs([]);
    window.dispatchEvent(new Event('tx-updated'));
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Sepolia warning - Updated styling */}
      {!onSepolia && (
        <div className="mb-6 animate-fade-in">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 text-yellow-500">
            <span className="text-xl">⚠️</span>
            <span className="font-medium text-sm">Please switch your wallet to the <b>Sepolia</b> testnet to view your transactions.</span>
          </div>
        </div>
      )}

      {onSepolia && <>
        {/* Page Header - Updated with white text for visibility */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
            <p className="text-slate-400">View your transaction history</p>
          </div>
          <button
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold border border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={clearTransactions}
            disabled={txs.length === 0}
          >
            Clear All
          </button>
        </div>

        {/* Transactions List - Updated with glass panels and better contrast */}
        <div className="space-y-3">
          {txs.length === 0 && (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <p className="text-slate-400">No transactions yet.</p>
            </div>
          )}

          {txs.map(tx => (
            <div key={tx.id || tx.txHash} className="glass-panel rounded-xl p-4 hover:border-primary-500/30 transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold text-xs">
                      {tx.token?.slice(0, 2) || 'TX'}
                    </div>
                    <div>
                      <span className="text-white font-semibold">{tx.token}</span>
                      <span className="text-slate-400 mx-2">•</span>
                      <span className="text-primary-400 font-bold">{tx.amount}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div>
                      <span className="text-slate-500">From: </span>
                      <span className="text-slate-300 font-mono">{tx.from.slice(0, 10)}...</span>
                    </div>
                    <div>
                      <span className="text-slate-500">To: </span>
                      <span className="text-slate-300 font-mono">{tx.to.slice(0, 10)}...</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${tx.status === 'confirmed' || tx.status === 'submitted'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}>
                    {tx.status}
                  </span>
                  <div className="text-xs text-slate-500 mt-2">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                  {tx.txHash && (
                    <div className="text-xs text-primary-400 font-mono mt-1 truncate max-w-[120px]">
                      {tx.txHash.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
