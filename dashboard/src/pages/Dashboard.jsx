import React, { useEffect, useState } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { Wallet, Coins, History, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const { account, getEthBalance, getTransactions } = useWeb3()
  const [tokensCount, setTokensCount] = useState(0)
  const [txCount, setTxCount] = useState(0)
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('deployed_tokens_v1')
    const arr = raw ? JSON.parse(raw) : []
    setTokensCount(arr.length)
    const txs = getTransactions ? getTransactions() : (localStorage.getItem('web3_transactions_v1') ? JSON.parse(localStorage.getItem('web3_transactions_v1')) : [])
    setTxCount(txs.length)
  }, [])

  useEffect(() => {
    async function f() {
      if (getEthBalance) {
        const b = await getEthBalance()
        setBalance(b)
      }
    }
    f()
  }, [account])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header - Updated for better visibility with white text */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome to your blockchain developer dashboard. Use the Deploy and Manage tabs to create and inspect tokens.</p>
      </div>

      {/* Stats Grid - Updated with glass panels and white text for visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-primary-500/20 text-primary-400">
              <Coins size={28} />
            </div>
            <div>
              <div className="text-slate-400 text-sm font-medium mb-1">Total Tokens</div>
              <div className="text-3xl font-bold text-white">{tokensCount}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-secondary-500/20 text-secondary-400">
              <History size={28} />
            </div>
            <div>
              <div className="text-slate-400 text-sm font-medium mb-1">Total Transactions</div>
              <div className="text-3xl font-bold text-white">{txCount}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-green-500/20 text-green-400">
              <Wallet size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-400 text-sm font-medium mb-1">Connected Wallet</div>
              <div className="text-lg font-bold text-white font-mono truncate">
                {account ? account.slice(0, 6) + '...' + account.slice(-4) : 'Not connected'}
              </div>
              <div className="text-xs text-slate-500 mt-1">ETH: {balance ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
