

import React, { useState, useEffect } from 'react';
import { Contract, formatUnits, parseUnits } from 'ethers';
import erc20Abi from '../abis/erc20Abi.json';
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
  const [balances, setBalances] = useState({})
  const [supplies, setSupplies] = useState({})
  const [status, setStatus] = useState('')

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

  // Fetch live data (balances and supplies)
  const fetchTokenData = async () => {
    if (!account || !provider || tokens.length === 0) return;

    const newBalances = {};
    const newSupplies = {};

    for (const t of tokens) {
      try {
        const contract = new Contract(t.address, erc20Abi, provider);
        // Default to 18 decimals if not specified, or try to fetch
        let decimals = 18;
        try {
          decimals = await contract.decimals();
        } catch { }

        const [bal, sup] = await Promise.all([
          contract.balanceOf(account),
          contract.totalSupply()
        ]);

        newBalances[t.address] = formatUnits(bal, decimals);
        newSupplies[t.address] = formatUnits(sup, decimals); // Assuming supply has same decimals
      } catch (e) {
        console.error('Error fetching data for', t.symbol, e);
        // Keep existing values or default to 0 if not found
      }
    }
    setBalances(prev => ({ ...prev, ...newBalances }));
    setSupplies(prev => ({ ...prev, ...newSupplies }));
  };

  useEffect(() => {
    fetchTokenData();
    const interval = setInterval(fetchTokenData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [account, provider, tokens]);

  function persist(arr) {
    localStorage.setItem('deployed_tokens_v1', JSON.stringify(arr))
    setTokens(arr)
  }

  async function handleMint(t) {
    const amt = amounts[t.address]
    if (!amt || Number(amt) <= 0) return setStatus('Enter amount to mint')

    if (!signer || !t.address) {
      setStatus('Wallet not connected')
      return
    }

    setStatus('Processing mint...')
    try {
      const contract = new Contract(t.address, erc20Abi, signer)

      // Check if mint function exists
      if (typeof contract.mint !== 'function') {
        setStatus('❌ This token does not support minting. Deploy a new token to use mint/burn features.')
        return
      }

      // Get decimals to parse amount correctly
      const decimals = await contract.decimals()
      const amountInWei = parseUnits(amt, decimals)

      // Call mint function (only owner can mint)
      const tx = await contract.mint(account, amountInWei)
      setStatus('Minting... waiting for confirmation')
      await tx.wait()

      addTransaction({
        id: Date.now(),
        token: t.symbol,
        tokenAddress: t.address,
        from: 'mint',
        to: account,
        amount: amt,
        status: 'confirmed',
        txHash: tx.hash,
        timestamp: new Date().toISOString()
      })

      setStatus('✅ Mint successful!')
      setAmounts(prev => ({ ...prev, [t.address]: '' }))
      fetchTokenData() // Refresh balances and supplies
    } catch (e) {
      console.error('Mint failed:', e)
      if (e.code === 'CALL_EXCEPTION' || e.message.includes('missing revert data')) {
        setStatus('❌ This token was deployed with an old contract. Deploy a new token to use mint/burn.')
      } else if (e.message.includes('Only owner')) {
        setStatus('❌ Error: Only the token owner can mint')
      } else if (e.code === 'ACTION_REJECTED') {
        setStatus('Transaction rejected by user')
      } else {
        setStatus('❌ Mint failed: ' + (e.reason || e.message || 'Unknown error'))
      }
    }
  }

  async function handleBurn(t) {
    const amt = amounts[t.address]
    if (!amt || Number(amt) <= 0) return setStatus('Enter amount to burn')

    if (!signer || !t.address) {
      setStatus('Wallet not connected')
      return
    }

    setStatus('Processing burn...')
    try {
      const contract = new Contract(t.address, erc20Abi, signer)

      // Check if burn function exists
      if (typeof contract.burn !== 'function') {
        setStatus('❌ This token does not support burning. Deploy a new token to use mint/burn features.')
        return
      }

      // Get decimals and balance
      const decimals = await contract.decimals()
      const amountInWei = parseUnits(amt, decimals)
      const balance = await contract.balanceOf(account)

      if (balance < amountInWei) {
        setStatus('❌ Insufficient balance to burn')
        return
      }

      // Call burn function
      const tx = await contract.burn(amountInWei)
      setStatus('Burning... waiting for confirmation')
      await tx.wait()

      addTransaction({
        id: Date.now(),
        token: t.symbol,
        tokenAddress: t.address,
        from: account,
        to: 'burn',
        amount: amt,
        status: 'confirmed',
        txHash: tx.hash,
        timestamp: new Date().toISOString()
      })

      setStatus('✅ Burn successful!')
      setAmounts(prev => ({ ...prev, [t.address]: '' }))
      fetchTokenData() // Refresh balances and supplies
    } catch (e) {
      console.error('Burn failed:', e)
      if (e.code === 'CALL_EXCEPTION' || e.message.includes('missing revert data')) {
        setStatus('❌ This token was deployed with an old contract. Deploy a new token to use mint/burn.')
      } else if (e.code === 'ACTION_REJECTED') {
        setStatus('Transaction rejected by user')
      } else {
        setStatus('❌ Burn failed: ' + (e.reason || e.message || 'Unknown error'))
      }
    }
  }

  function handleDelete(t) {
    if (!window.confirm('Delete token ' + t.name + ' (' + t.address + ')? This cannot be undone in this UI.')) return
    const arr = tokens.filter(x => x.address !== t.address)
    persist(arr)
    setStatus('Token deleted')
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

        {/* Info Banner for Mint/Burn */}
        <div className="mb-6 animate-fade-in">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-400 mb-1">Mint & Burn Features Available!</h3>
                <p className="text-sm text-slate-300">
                  <strong>New tokens</strong> deployed now support mint and burn functions.
                  <strong className="text-blue-400"> Old tokens</strong> won't have these features - deploy a new token to use them.
                </p>
              </div>
            </div>
          </div>
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
                      <span className="text-sm text-white font-medium">{supplies[t.address] ? parseFloat(supplies[t.address]).toLocaleString() : (t.supply ?? t.initialSupply ?? '—')}</span>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-sm text-white font-medium font-mono truncate block">{(t.admin || t.owner || '—').slice(0, 10)}...</span>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg col-span-2">
                      <span className="text-xs text-slate-400 block">Your Balance</span>
                      <span className="text-sm text-white font-bold">{parseFloat(balances[t.address] || '0').toFixed(4)} {t.symbol}</span>
                    </div>
                  </div>
                </div>

                {/* Actions - Updated with modern buttons */}
                <div className="flex flex-col gap-3 lg:w-64">
                  <input
                    placeholder="Amount (e.g., 100)"
                    value={amounts[t.address] || ''}
                    onChange={e => setAmounts(prev => ({ ...prev, [t.address]: e.target.value }))}
                    className="glass-input px-4 py-2 rounded-xl text-white placeholder-slate-600 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMint(t)}
                      className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-semibold border border-green-500/30 transition-all duration-200"
                      title="Mint new tokens (owner only)"
                    >
                      Mint
                    </button>
                    <button
                      onClick={() => handleBurn(t)}
                      className="flex-1 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-semibold border border-yellow-500/30 transition-all duration-200"
                      title="Burn your tokens"
                    >
                      Burn
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-semibold border border-red-500/30 transition-all duration-200"
                      title="Remove from list (local only)"
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
