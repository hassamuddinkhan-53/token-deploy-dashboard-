
import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';

function ManageTokens() {
  const { provider, signer, account, addTransaction, isSepoliaNetwork } = useWeb3();
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
  const [tokens, setTokens] = useState([])
  const [amounts, setAmounts] = useState({})
  const [status, setStatus] = useState('')
  const [globalOwner, setGlobalOwner] = useState('0x11fb81329fa17d9ddb22c520865c144a648b2827')

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

  function persist(arr) {
    localStorage.setItem('deployed_tokens_v1', JSON.stringify(arr))
    setTokens(arr)
  }

  async function handleMint(t) {
    const amt = amounts[t.address]
    if (!amt || Number(amt) <= 0) return setStatus('Enter amount to mint')
    setStatus('Processing mint...')
    // Try on-chain mint if signer and mint exists
    if (signer && t.address) {
      try {
        const contract = new Contract(t.address, erc20Abi, signer)
        if (typeof contract.mint === 'function') {
          const parsed = await (async () => { try { return parseFloat(amt) } catch { return amt } })()
          const tx = await contract.mint(account || await signer.getAddress(), String(parsed))
          await tx.wait()
          addTransaction({ id: Date.now(), token: t.symbol, tokenAddress: t.address, from: 'mint', to: account || await signer.getAddress(), amount: amt, status: 'submitted', txHash: tx.hash, timestamp: new Date().toISOString() })
          setStatus('Mint transaction submitted')
          return
        }
      } catch (e) {
        console.warn('on-chain mint failed, falling back to simulated', e)
      }
    }

    // Simulate mint: update stored supply (human-readable)
    const arr = tokens.map(x => {
      if (x.address === t.address) {
        const prev = Number(x.supply || x.initialSupply || 0)
        const next = prev + Number(amt)
        return { ...x, supply: String(next) }
      }
      return x
    })
    persist(arr)
    addTransaction({ id: Date.now(), token: t.symbol, tokenAddress: t.address, from: 'mint-sim', to: account || 'local-admin', amount: amt, status: 'simulated', txHash: null, timestamp: new Date().toISOString() })
    setStatus('Mint simulated and saved')
    setAmounts(prev => ({ ...prev, [t.address]: '' }))
  }

  async function handleBurn(t) {
    const amt = amounts[t.address]
    if (!amt || Number(amt) <= 0) return setStatus('Enter amount to burn')
    setStatus('Processing burn...')
    if (signer && t.address) {
      try {
        const contract = new Contract(t.address, erc20Abi, signer)
        if (typeof contract.burn === 'function') {
          const parsed = String(Number(amt))
          const tx = await contract.burn(parsed)
          await tx.wait()
          addTransaction({ id: Date.now(), token: t.symbol, tokenAddress: t.address, from: account || await signer.getAddress(), to: 'burn', amount: amt, status: 'submitted', txHash: tx.hash, timestamp: new Date().toISOString() })
          setStatus('Burn transaction submitted')
          return
        }
      } catch (e) {
        console.warn('on-chain burn failed, falling back to simulated', e)
      }
    }

    // Simulate burn
    const arr = tokens.map(x => {
      if (x.address === t.address) {
        const prev = Number(x.supply || x.initialSupply || 0)
        const next = Math.max(0, prev - Number(amt))
        return { ...x, supply: String(next) }
      }
      return x
    })
    persist(arr)
    addTransaction({ id: Date.now(), token: t.symbol, tokenAddress: t.address, from: account || 'local-admin', to: 'burn-sim', amount: amt, status: 'simulated', txHash: null, timestamp: new Date().toISOString() })
    setStatus('Burn simulated and saved')
    setAmounts(prev => ({ ...prev, [t.address]: '' }))
  }

  function handleDelete(t) {
    if (!window.confirm('Delete token ' + t.name + ' (' + t.address + ')? This cannot be undone in this UI.')) return
    const arr = tokens.filter(x => x.address !== t.address)
    persist(arr)
    setStatus('Token deleted')
  }

  function assignOwnerToAll(address) {
    if (!address) return setStatus('Provide an address')
    const prev = tokens
    const updated = prev.map(t => ({ ...t, owner: address, admin: address }))
    persist(updated)
    // create simulated transfer txs moving entire supply/initialSupply to address
    for (const t of prev) {
      const amt = t.supply ?? t.initialSupply ?? '0'
      addTransaction({ id: Date.now() + Math.floor(Math.random() * 1000), token: t.symbol, tokenAddress: t.address, from: t.owner || 'deploy', to: address, amount: amt, status: 'simulated', txHash: null, timestamp: new Date().toISOString() })
    }
    setStatus('Assigned owner to all tokens and recorded simulated transfers')
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Sepolia warning - Updated styling */}
      {!onSepolia && (
        <div className="mb-6 animate-fade-in">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 text-yellow-500">
            <span className="text-xl">⚠️</span>
            <span className="font-medium text-sm">Please switch your wallet to the <b>Sepolia</b> testnet to manage your tokens.</span>
          </div>
        </div>
      )}

      {onSepolia && <>
        {/* Page Header - Updated with white text for visibility */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Manage Tokens</h1>
          <p className="text-slate-400">Mint, burn, and manage your deployed tokens</p>
        </div>

        {/* Tokens List - Updated with glass panels and better contrast */}
        <div className="space-y-4">
          {tokens.length === 0 && (
            <div className="glass-panel rounded-2xl p-8 text-center">
              <p className="text-slate-400">No tokens found. Use Deploy to create tokens.</p>
            </div>
          )}

          {tokens.map(t => (
            <div key={t.address} className="glass-panel rounded-2xl p-6 hover:border-primary-500/30 transition-all duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Token Info - Updated with white text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {t.symbol?.slice(0, 2) || 'TK'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{t.name} ({t.symbol})</h3>
                      <p className="text-xs font-mono text-slate-400">{t.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-xs text-slate-400 block">Supply</span>
                      <span className="text-sm text-white font-medium">{t.supply ?? t.initialSupply ?? '—'}</span>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-xs text-slate-400 block">Owner</span>
                      <span className="text-sm text-white font-medium font-mono truncate block">{(t.admin || t.owner || '—').slice(0, 10)}...</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Updated with modern buttons */}
                <div className="flex flex-col gap-3 lg:w-64">
                  <input
                    placeholder="Amount"
                    value={amounts[t.address] || ''}
                    onChange={e => setAmounts(prev => ({ ...prev, [t.address]: e.target.value }))}
                    className="glass-input px-4 py-2 rounded-xl text-white placeholder-slate-600 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMint(t)}
                      className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-semibold border border-green-500/30 transition-all duration-200"
                    >
                      Mint
                    </button>
                    <button
                      onClick={() => handleBurn(t)}
                      className="flex-1 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-semibold border border-yellow-500/30 transition-all duration-200"
                    >
                      Burn
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-semibold border border-red-500/30 transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Status Message - Updated with better visibility */}
          {status && (
            <div className="glass-panel rounded-xl p-4 border-l-4 border-primary-500 animate-fade-in">
              <p className="text-sm text-slate-300">{status}</p>
            </div>
          )}
        </div>
      </>}
    </div>
  );
}

export default ManageTokens;
