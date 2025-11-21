import React, { useEffect, useState } from 'react'
import TokenSelect from '../components/TokenSelect'
import { useSwap } from '../hooks/useSwap'
import { useWeb3 } from '../context/Web3Context'

const DEFAULT_TOKENS = [
  // Replace these with actual local token addresses deployed on your Hardhat node
  { address: import.meta.env.VITE_TOKEN_A || '', symbol: 'TKA', name: 'Token A' },
  { address: import.meta.env.VITE_TOKEN_B || '', symbol: 'TKB', name: 'Token B' }
]

export default function Swap() {
  const { provider, connectWallet, isConnected, account } = useWeb3()
  const { tokenA, tokenB, amountA, amountB, priceLoading, txHash, status, setTokenA, setTokenB, setAmountA, executeSwap, getTokenBalance } = useSwap()
  const [tokens, setTokens] = useState([])
  const [balanceA, setBalanceA] = useState(null)
  const [balanceB, setBalanceB] = useState(null)

  useEffect(() => {
    if (tokenA && account) getTokenBalance(tokenA).then(b => setBalanceA(b))
  }, [tokenA, account])

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
    setTokens(arr);
  }, [])

  useEffect(() => {
    if (tokenB && account) getTokenBalance(tokenB).then(b => setBalanceB(b))
  }, [tokenB, account])

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Swap</h2>

      <div className="bg-white p-6 rounded shadow">
        <div className="mb-4">
          {!isConnected ? (
            <button onClick={connectWallet} className="px-4 py-2 bg-indigo-600 text-white rounded">Connect Wallet</button>
          ) : (
            <div className="text-sm text-slate-600">Connected: {account?.slice(0,6)}...{account?.slice(-4)}</div>
          )}
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-xs text-slate-500">From</label>
            <div className="flex gap-2 mt-2">
              <div className="w-2/5"><TokenSelect tokens={tokens} value={tokenA} onChange={setTokenA} /></div>
              <div className="flex-1">
                <input value={amountA || ''} onChange={(e) => setAmountA(e.target.value)} placeholder="Amount" className="w-full border rounded px-3 py-2" />
                <div className="text-xs text-slate-500 mt-1">Balance: {balanceA ?? '—'}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500">To</label>
            <div className="flex gap-2 mt-2">
              <div className="w-2/5"><TokenSelect tokens={tokens} value={tokenB} onChange={setTokenB} /></div>
              <div className="flex-1">
                <input value={priceLoading ? 'Loading...' : amountB || ''} readOnly className="w-full border rounded px-3 py-2  bg-slate-50" />
                <div className="text-xs text-slate-500 mt-1">Balance: {balanceB ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={executeSwap} className="px-4 py-2 bg-indigo-600 text-white rounded">Swap</button>
            <div className="text-sm">
              {status === 'pending' && <span className="text-amber-600">Transaction pending...</span>}
              {status === 'success' && <span className="text-green-600">Swap succeeded</span>}
              {status === 'failed' && <span className="text-red-600">Swap failed</span>}
              {status === 'error' && <span className="text-red-600">Error during swap</span>}
              {status === 'no-signer' && <span className="text-red-600">Connect a signer wallet to swap</span>}
            </div>
          </div>

          {txHash && (
            <div className="mt-3 text-sm text-slate-700">Tx: <a target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${txHash}`}>{txHash}</a></div>
          )}
        </div>
      </div>
    </div>
  )
}
