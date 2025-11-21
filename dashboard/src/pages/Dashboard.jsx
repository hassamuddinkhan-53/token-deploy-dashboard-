import React, { useEffect, useState } from 'react'
import { useWeb3 } from '../context/Web3Context'

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
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p className="mb-6">Welcome to your blockchain developer dashboard. Use the Deploy and Manage tabs to create and inspect tokens.</p>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">Total Tokens: <strong>{tokensCount}</strong></div>
        <div className="bg-white p-4 rounded shadow">Total Transactions: <strong>{txCount}</strong></div>
        <div className="bg-white p-4 rounded shadow">Connected Wallet: <strong>{account ? account.slice(0,6) + '...' + account.slice(-4) : 'Not connected'}</strong>
          <div className="text-sm text-slate-500">ETH: {balance ?? '—'}</div>
        </div>
      </section>
    </div>
  )
}
