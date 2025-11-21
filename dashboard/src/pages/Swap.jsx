import React, { useEffect, useState } from 'react'
import TokenSelect from '../components/TokenSelect'
import { useSwap } from '../hooks/useSwap'
import { useWeb3 } from '../context/Web3Context'
import WarningBanner from '../components/WarningBanner'

const DEFAULT_TOKENS = [
  { address: import.meta.env.VITE_TOKEN_A || '', symbol: 'TKA', name: 'Token A' },
  { address: import.meta.env.VITE_TOKEN_B || '', symbol: 'TKB', name: 'Token B' }
]

export default function Swap() {
  const { provider, connectWallet, isConnected, account, isSepoliaNetwork } = useWeb3()
  const {
    tokenA, tokenB, amountA, amountB, priceLoading, txHash, status, allowance, isApproving,
    setTokenA, setTokenB, handleAmountAChange, handleAmountBChange, switchTokens, getTokenBalance, executeSwap, approveToken
  } = useSwap()

  const [tokens, setTokens] = useState([])
  const [balanceA, setBalanceA] = useState('0')
  const [balanceB, setBalanceB] = useState('0')
  const [onSepolia, setOnSepolia] = useState(true)

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

  // Live balance updates
  useEffect(() => {
    const updateBalances = async () => {
      if (tokenA) getTokenBalance(tokenA).then(b => setBalanceA(b || '0'))
      else setBalanceA('0')

      if (tokenB) getTokenBalance(tokenB).then(b => setBalanceB(b || '0'))
      else setBalanceB('0')
    }

    updateBalances()
    const interval = setInterval(updateBalances, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [tokenA, tokenB, getTokenBalance, status])

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-white">Swap Tokens</h2>

      <WarningBanner show={!onSepolia} message="Please switch your wallet to the Sepolia testnet to swap tokens." />

      {!isConnected ? (
        <div className="text-center py-10">
          <button
            onClick={connectWallet}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Connect Wallet to Swap
          </button>
        </div>
      ) : (
        <>
          {/* From Token */}
          <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex justify-between mb-2">
              <label className="text-gray-400 text-sm">From</label>
              <span className="text-gray-400 text-sm">Balance: {parseFloat(balanceA).toFixed(4)}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl text-white outline-none"
              />
              <TokenSelect tokens={tokens} value={tokenA} onChange={setTokenA} />
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              onClick={switchTokens}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full border-4 border-gray-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700 mt-2">
            <div className="flex justify-between mb-2">
              <label className="text-gray-400 text-sm">To</label>
              <span className="text-gray-400 text-sm">Balance: {parseFloat(balanceB).toFixed(4)}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl text-white outline-none"
              />
              <TokenSelect tokens={tokens} value={tokenB} onChange={setTokenB} />
            </div>
            {priceLoading && <div className="text-xs text-blue-400 mt-1">Fetching price...</div>}
          </div>

          {/* Action Button */}
          {allowance === '0' || (allowance && parseFloat(allowance) < parseFloat(amountA || '0')) ? (
            <button
              onClick={approveToken}
              disabled={isApproving || !tokenA || !amountA || !onSepolia}
              className={`w-full py-4 rounded-xl font-bold text-lg mb-4 transition-all ${isApproving || !tokenA || !amountA || !onSepolia
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
                }`}
            >
              {isApproving ? 'Approving...' : 'Approve Token'}
            </button>
          ) : (
            <button
              onClick={executeSwap}
              disabled={!tokenA || !tokenB || !amountA || status === 'pending' || !onSepolia}
              className={`w-full py-4 rounded-xl font-bold text-lg mb-4 transition-all ${!tokenA || !tokenB || !amountA || status === 'pending' || !onSepolia
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-purple-500/20'
                }`}
            >
              {status === 'pending' ? 'Swapping...' : 'Swap'}
            </button>
          )}

          {/* Status Messages */}
          {status === 'success' && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-center">
              <p className="font-medium">Swap Successful!</p>
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline mt-1 block hover:text-green-300"
                >
                  View on Etherscan
                </a>
              )}
            </div>
          )}

          {status === 'failed' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
              <p className="font-medium">Transaction Failed</p>
              <p className="text-xs mt-1">Please try again</p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
              <p className="font-medium">Error Occurred</p>
              <p className="text-xs mt-1">Check console for details</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
