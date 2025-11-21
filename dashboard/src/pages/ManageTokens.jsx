
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
      addTransaction({ id: Date.now() + Math.floor(Math.random()*1000), token: t.symbol, tokenAddress: t.address, from: t.owner || 'deploy', to: address, amount: amt, status: 'simulated', txHash: null, timestamp: new Date().toISOString() })
    }
    setStatus('Assigned owner to all tokens and recorded simulated transfers')
  }

  return (
    <div>
      {/* Sepolia warning with animation */}
      {!onSepolia && (
        <div className="transition-all duration-500 max-h-32 opacity-100 py-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded p-4 mb-6 text-center" style={{ overflow: 'hidden' }}>
          Please switch your wallet to the <b>Sepolia</b> testnet to manage your tokens.
        </div>
      )}
      {onSepolia && <>
        <h2 className="text-2xl font-bold mb-4">Manage Tokens</h2>
        <div className="space-y-3">
          {tokens.length === 0 && <div className="p-4 bg-white rounded shadow">No tokens found. Use Deploy to create tokens (simulated).</div>}
          {tokens.map(t => (
            <div key={t.address} className="bg-white p-4 rounded shadow transition-all duration-200">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{t.name} ({t.symbol})</div>
                  <div className="text-sm text-slate-500">{t.address}</div>
                  <div className="text-xs text-slate-500">Owner/Admin: {t.admin || t.owner || '—'}</div>
                  <div className="text-xs text-slate-500">Supply: {t.supply ?? t.initialSupply ?? '—'}</div>
                </div>
                <div className="flex items-start space-x-2">
                  <input placeholder="amount" value={amounts[t.address] || ''} onChange={e => setAmounts(prev => ({ ...prev, [t.address]: e.target.value }))} className="border rounded px-2 py-1 text-sm w-28" />
                  <button onClick={() => handleMint(t)} className="px-3 py-1 bg-green-500 text-white rounded text-sm transition-all duration-200">Mint</button>
                  <button onClick={() => handleBurn(t)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm transition-all duration-200">Burn</button>
                  <button onClick={() => handleDelete(t)} className="px-3 py-1 bg-red-500 text-white rounded text-sm transition-all duration-200">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {status && <div className="text-sm text-slate-600">{status}</div>}
        </div>
      </>}
    </div>
  );
}

export default ManageTokens;
