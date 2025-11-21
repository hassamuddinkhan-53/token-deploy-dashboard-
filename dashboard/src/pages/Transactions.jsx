
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
    <div>
      {/* Sepolia warning with animation */}
      {!onSepolia && (
        <div className="transition-all duration-500 max-h-32 opacity-100 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded p-4 mb-6 text-center" style={{ overflow: 'hidden' }}>
          Please switch your wallet to the <b>Sepolia</b> testnet to view your transactions.
        </div>
      )}
      {onSepolia && <>
        <h2 className="text-2xl font-bold mb-4">Transactions</h2>
        <button
          className="mb-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-all duration-200"
          onClick={clearTransactions}
          disabled={txs.length === 0}
        >
          Clear Transactions
        </button>
        <div className="space-y-3">
          {txs.length === 0 && <div className="text-sm text-slate-500">No transactions yet.</div>}
          {txs.map(tx => (
            <div key={tx.id || tx.txHash} className="bg-white p-3 rounded shadow transition-all duration-200">
              <div className="text-sm">{tx.token} — <strong>{tx.amount}</strong></div>
              <div className="text-xs text-slate-500">From: {tx.from} — To: {tx.to}</div>
              <div className="text-xs text-slate-500">Status: {tx.status} {tx.txHash ? ` — ${tx.txHash}` : ''}</div>
              <div className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
