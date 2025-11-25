import React, { useState, useEffect } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { LayoutDashboard, Send, Wallet, ArrowRightLeft, History, Rocket, AlertTriangle, LogOut, Activity } from 'lucide-react'

export default function Navbar({ onNavigate, currentRoute }) {
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
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setShowSepoliaWarning(chainId !== '0xaa36a7');
        } catch (e) {
          console.error(e);
        }
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'swap', label: 'Swap', icon: ArrowRightLeft },
    { id: 'liquidity', label: 'Liquidity', icon: Send },
    { id: 'liquidity-manager', label: 'Auto Pool', icon: Activity },
    { id: 'manage', label: 'Manage', icon: Wallet },
    { id: 'deploy', label: 'Deploy', icon: Rocket },
    { id: 'account', label: 'Account', icon: Wallet },
    { id: 'transactions', label: 'History', icon: History },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                D
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                DeFi Dash
              </span>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentRoute === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon size={18} className={isActive ? 'text-primary-400' : ''} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center gap-4">
              {/* RPC Selector */}
              <select
                className="hidden lg:block bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary-500"
                value={rpcUrl}
                onChange={(e) => switchRpc(e.target.value)}
              >
                {presetRpcs.map(r => (
                  <option key={r.url} value={r.url}>{r.name}</option>
                ))}
              </select>

              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  className="glass-button px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Wallet size={18} />
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-white">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Sepolia
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center">
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}
      </nav>

      {/* Sepolia Warning Banner */}
      <div
        className={`transition-all duration-500 overflow-hidden ${showSepoliaWarning ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2 text-yellow-500 text-sm font-medium">
          <AlertTriangle size={16} />
          <span>Please switch your wallet to the <b>Sepolia</b> testnet to use all features.</span>
        </div>
      </div>
    </>
  )
}
