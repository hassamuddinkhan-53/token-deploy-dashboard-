import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../context/Web3Context'

export default function Navbar({ onNavigate }) {
  const { connectWallet, disconnect, account, isConnected, rpcUrl, switchRpc, getEthBalance, networkName } = useWeb3()
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('');

  async function handleConnect() {
    setError('');
    try {
      await connectWallet();
      const b = await getEthBalance();
      setBalance(b);
    } catch (err) {
      console.error('connect error', err);
      setError('Unable to connect wallet: ' + (err && err.message ? err.message : err));
    }
  }

  async function handleDisconnect() {
    setError('');
    disconnect();
    setBalance(null);
  }

  // Only allow Sepolia
  const presetRpcs = [
    { name: 'Sepolia (Alchemy)', url: import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.alchemyapi.io/v2/YOUR_KEY' },
  ];

  const [showSepoliaWarning, setShowSepoliaWarning] = useState(false);
  useEffect(() => {
    // Only allow Sepolia chainId 11155111
    async function checkNetwork() {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setShowSepoliaWarning(chainId !== '0xaa36a7');
      } else {
        setShowSepoliaWarning(false);
      }
    }
    checkNetwork();
    if (window.ethereum && window.ethereum.on) {
      window.ethereum.on('chainChanged', checkNetwork);
      return () => window.ethereum.removeListener('chainChanged', checkNetwork);
    }
  }, []);

  return (
    <header className="bg-white shadow">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {error && (
          <div className="w-full text-center mb-2 transition-all duration-300 text-red-600 bg-red-50 border border-red-200 rounded p-2 animate-pulse">
            {error}
          </div>
        )}
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">Dev Dashboard</h1>
          <nav className="flex items-center space-x-2">
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('dashboard')}>Dashboard</button>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('deploy')}>Deploy</button>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('manage')}>Manage</button>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('swap')}>Swap</button>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('account')}>Account</button>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={() => onNavigate('transactions')}>Transactions</button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <select className="border rounded px-2 py-1 text-sm" value={rpcUrl} onChange={(e) => switchRpc(e.target.value)}>
            {presetRpcs.map(r => (
              <option key={r.url} value={r.url}>{r.name}</option>
            ))}
          </select>

          {!isConnected && (
            <button onClick={handleConnect} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm transition-all duration-200">Connect Wallet</button>
          )}

          {isConnected && (
            <div className="flex items-center space-x-2">
              <div className="text-sm text-slate-700">{account?.slice(0,6)}...{account?.slice(-4)}</div>
              <div className="text-sm text-slate-500">Sepolia</div>
              <button onClick={handleDisconnect} className="px-2 py-1 bg-slate-100 rounded text-sm transition-all duration-200">Disconnect</button>
            </div>
          )}
        </div>
      </div>
      {/* Sepolia warning with animation */}
      <div
        className={`transition-all duration-500 ${showSepoliaWarning ? 'max-h-32 opacity-100 py-2' : 'max-h-0 opacity-0 py-0'} bg-yellow-100 border-t border-yellow-300 text-yellow-800 text-center`}
        style={{ overflow: 'hidden' }}
      >
        {showSepoliaWarning && (
          <span>
            Please switch your wallet to the <b>Sepolia</b> testnet to use all features.
          </span>
        )}
      </div>
    </header>
  );
}
