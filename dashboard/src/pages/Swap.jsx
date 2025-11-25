import React, { useEffect, useState } from 'react'
import TokenSelect from '../components/TokenSelect'
import { useSwap } from '../hooks/useSwap'
import { useWeb3 } from '../context/Web3Context'
import WarningBanner from '../components/WarningBanner'
import { ArrowDown, Wallet, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'

const DEFAULT_TOKENS = [
  { address: import.meta.env.VITE_TOKEN_A || '', symbol: 'TKA', name: 'Token A' },
  { address: import.meta.env.VITE_TOKEN_B || '', symbol: 'TKB', name: 'Token B' }
]

export default function Swap() {
  const { provider, connectWallet, isConnected, account, isSepoliaNetwork } = useWeb3()
  const {
    tokenA, tokenB, amountA, amountB, priceLoading, txHash, status, allowance, isApproving,
    setTokenA, setTokenB, handleAmountAChange, handleAmountBChange, switchTokens, getTokenBalance, executeSwap,
    balanceA, balanceB
  } = useSwap()

  const [tokens, setTokens] = useState([])
  const [onSepolia, setOnSepolia] = useState(true)
  const [liquidityError, setLiquidityError] = useState(false)

  // Check Sepolia network
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

  // Load tokens from local storage or use defaults
  useEffect(() => {
    const saved = localStorage.getItem('deployed_tokens_v1');
    let arr = [];
    if (saved) {
      try {
        arr = JSON.parse(saved);
        if (!Array.isArray(arr)) arr = [];
      } catch (e) {
        arr = [];
      }
    }
    if (arr.length === 0) {
      arr = DEFAULT_TOKENS;
    }
    setTokens(arr);

    // Set default selection if not set
    if (!tokenA && arr[0]) setTokenA(arr[0].address)
    if (!tokenB && arr[1]) setTokenB(arr[1].address)
  }, [])

  // Detect liquidity error
  useEffect(() => {
    if (tokenA && tokenB && amountA && !amountB && !priceLoading) {
      setLiquidityError(true)
    } else {
      setLiquidityError(false)
    }
  }, [tokenA, tokenB, amountA, amountB, priceLoading])

  return (
    <div className="flex justify-center pt-10">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xl font-bold text-white">Swap</h2>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <RefreshCw size={18} className={priceLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <WarningBanner show={!onSepolia} message="Please switch your wallet to the Sepolia testnet to swap tokens." />

          {liquidityError && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-yellow-400 text-sm">No Liquidity Available</p>
                <p className="text-xs text-yellow-400/70 mt-1">This trading pair has no liquidity. Please add liquidity first.</p>
              </div>
            </div>
          )}

          {!isConnected ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Wallet size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect Wallet</h3>
              <p className="text-slate-400 mb-6 text-sm">Connect your wallet to start swapping tokens on the Sepolia testnet.</p>
              <button
                onClick={connectWallet}
                className="glass-button w-full py-3 rounded-xl font-bold text-lg"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {/* From Token */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex justify-between mb-2">
                  <label className="text-slate-400 text-xs font-medium">You pay</label>
                  <span className="text-slate-400 text-xs">Balance: {parseFloat(balanceA).toFixed(4)}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => handleAmountAChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-slate-600"
                  />
                  <TokenSelect tokens={tokens} value={tokenA} onChange={setTokenA} />
                </div>
              </div>

              {/* Switch Button */}
              <div className="relative h-2">
                <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-10">
                  <button
                    onClick={switchTokens}
                    className="p-2 bg-slate-800 border-4 border-slate-900 rounded-xl text-slate-400 hover:text-primary-400 hover:scale-110 transition-all duration-200 shadow-lg"
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>
              </div>

              {/* To Token */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors mt-2">
                <div className="flex justify-between mb-2">
                  <label className="text-slate-400 text-xs font-medium">You receive</label>
                  <span className="text-slate-400 text-xs">Balance: {parseFloat(balanceB).toFixed(4)}</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => handleAmountBChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-slate-600"
                  />
                  <TokenSelect tokens={tokens} value={tokenB} onChange={setTokenB} />
                </div>
                {priceLoading && <div className="text-xs text-primary-400 mt-2 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Fetching best price...</div>}
              </div>

              {/* Action Button */}
              <div className="mt-4">
                <button
                  onClick={executeSwap}
                  disabled={!tokenA || !tokenB || !amountA || status === 'pending' || status === 'approving' || !onSepolia}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${!tokenA || !tokenB || !amountA || status === 'pending' || status === 'approving' || !onSepolia
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'glass-button'
                    }`}
                >
                  {status === 'approving' || isApproving ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin" /> Approving...
                    </span>
                  ) : status === 'pending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin" /> Swapping...
                    </span>
                  ) : (
                    allowance === '0' || (allowance && parseFloat(allowance) < parseFloat(amountA || '0')) ? 'Approve & Swap' : 'Swap'
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {status === 'success' && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3 animate-fade-in">
                  <div className="p-1 bg-green-500/20 rounded-full text-green-400 mt-0.5">
                    <ExternalLink size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-green-400 text-sm">Swap Successful!</p>
                    {txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-500/70 hover:text-green-400 underline mt-1 block"
                      >
                        View on Etherscan
                      </a>
                    )}
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
                  <AlertCircle size={20} className="text-red-400" />
                  <div>
                    <p className="font-bold text-red-400 text-sm">Transaction Failed</p>
                    <p className="text-xs text-red-400/70">Please try again</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
                  <AlertCircle size={20} className="text-red-400" />
                  <div>
                    <p className="font-bold text-red-400 text-sm">Error Occurred</p>
                    <p className="text-xs text-red-400/70">Check console for details</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
