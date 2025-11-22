import React, { useEffect, useState } from 'react';
import { Contract, formatEther, formatUnits, parseUnits, BrowserProvider, toUtf8String, isAddress } from 'ethers';
import TokenBalance from '../components/TokenBalance';
import TransferForm from '../components/TransferForm';
import TokenMeta from '../components/TokenMeta';
import WarningBanner from '../components/WarningBanner';
import { useWeb3 } from '../context/Web3Context';
import erc20Abi from '../abis/erc20Abi.json';
export default function Account() {
  const { provider, signer, account, isConnected, addTransaction, isSepoliaNetwork } = useWeb3();
  const [onSepolia, setOnSepolia] = useState(true);
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
  const [allAccounts, setAllAccounts] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [tokenMeta, setTokenMeta] = useState({}); // {address: {name, symbol, decimals, totalSupply, owner}}
  const [selected, setSelected] = useState(null);
  const [ethBalances, setEthBalances] = useState({});
  const [balances, setBalances] = useState({});
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  // Fetch all accounts (simulate multi-account for demo)
  useEffect(() => {
    if (account) {
      // For demo, just use account and any stored accounts
      let stored = [];
      try {
        stored = JSON.parse(localStorage.getItem('accounts') || '[]');
      } catch { }
      const all = Array.from(new Set([account, ...stored]));
      setAllAccounts(all);
    }
  }, [account]);

  async function fetchAllTokenData() {
    if (!provider || !allAccounts.length) return;
    // ...existing code...
    let tks = [];
    try {
      tks = JSON.parse(localStorage.getItem('deployed_tokens_v1') || '[]');
    } catch { }
    const liveTokens = tks; // include ETH
    const meta = {};
    for (const t of tks) {
      try {
        const c = new Contract(t.address, erc20Abi, provider);
        const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
          c.name(),
          c.symbol(),
          c.decimals(),
          c.totalSupply(),
          c.owner ? c.owner() : null
        ]);
        const nameStr = typeof name === 'string' ? name : toUtf8String(name);
        const symbolStr = typeof symbol === 'string' ? symbol : toUtf8String(symbol);
        const ownerAddr = (owner || t.owner || t.admin || '').toLowerCase();
        // Only include tokens where the connected account is the owner/admin
        if (account && ownerAddr === account.toLowerCase()) {
          meta[t.address] = {
            name: nameStr,
            symbol: symbolStr,
            decimals: Number(decimals),
            totalSupply: formatUnits(totalSupply, decimals),
            owner: owner || ''
          };
          liveTokens.push({ address: t.address, symbol: symbolStr, name: nameStr });
        }
      } catch (e) {
        continue;
      }
    }
    setTokenMeta(meta);
    setTokens(liveTokens);

    // Fetch balances for all accounts and tokens
    const ethBals = {};
    const tokenBals = {};
    for (const acc of allAccounts) {
      // ETH
      try {
        const bal = await provider.getBalance(acc);
        ethBals[acc] = formatEther(bal);
      } catch {
        ethBals[acc] = '0';
      }
      // Tokens
      tokenBals[acc] = {};
      for (const t of liveTokens) {
        try {
          const contract = new Contract(t.address, erc20Abi, provider);
          const decimals = meta[t.address]?.decimals || 18;
          const bal = await contract.balanceOf(acc);
          tokenBals[acc][t.address] = formatUnits(bal, decimals);
        } catch {
          tokenBals[acc][t.address] = '0';
        }
      }
    }
    setEthBalances(ethBals);
    setBalances(tokenBals);
  }

  useEffect(() => {
    if (!isConnected) return;
    fetchAllTokenData();
  }, [provider, allAccounts, isConnected]);

  const updateBalances = async () => {
    await fetchAllTokenData();
  };

  // Modular async sendToken function
  async function sendToken() {
    setStatus('');
    try {
      if (!selected || !selected.address || !erc20Abi) {
        setStatus('No token selected.');
        return;
      }
      if (!window.ethereum) {
        setStatus('MetaMask not detected.');
        return;
      }
      // Ensure MetaMask is on Sepolia
      if (window.ethereum.networkVersion !== '11155111') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }]
          });
        } catch (err) {
          setStatus('Please switch MetaMask to Sepolia network.');
          return;
        }
      }
      // Provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const sender = await signer.getAddress();
      // Validate recipient address
      let toAddr = typeof to === 'string' ? to : (to && to.address ? to.address : String(to));
      if (!toAddr || !isAddress(toAddr)) {
        setStatus('Enter a valid recipient address.');
        return;
      }
      // Validate amount
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        setStatus('Enter a valid amount.');
        return;
      }
      // Instantiate contract
      const contract = new Contract(selected.address, erc20Abi, signer);
      // Fetch decimals and parse amount
      const decimals = await contract.decimals();
      const parsedAmount = parseUnits(amount, decimals);
      // Check sender balance
      const senderBalance = await contract.balanceOf(sender);
      if (parsedAmount > senderBalance) {
        setStatus('Insufficient token balance.');
        return;
      }
      setStatus('Sending transaction...');
      const tx = await contract.transfer(toAddr, parsedAmount);
      setStatus('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      setStatus('Transaction confirmed! Updating balances...');
      await updateBalances([sender, toAddr]);
      setStatus('Transfer successful!');
      setTo('');
      setAmount('');
      addTransaction({
        id: Date.now(),
        token: selected.symbol || selected.name,
        tokenAddress: selected.address,
        from: sender,
        to: toAddr,
        amount,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        txHash: tx.hash || tx.transactionHash || null,
      });
    } catch (err) {
      let msg = 'Transaction failed. Please check your wallet and network.';
      if (err && err.message) {
        if (err.message.includes('user rejected')) msg = 'Transaction rejected by user.';
        else if (err.message.includes('insufficient funds')) msg = 'Insufficient funds for gas.';
        else if (err.message.includes('invalid address')) msg = 'Invalid recipient address.';
        else msg = err.message;
      }
      setStatus(msg);
    }
  }

  // Main render
  return (
    <div className="max-w-6xl mx-auto">
      {/* Warning Banners */}
      <WarningBanner show={!onSepolia} message="Please switch your wallet to the Sepolia testnet to view your dashboard." />
      <WarningBanner show={!isConnected} message="Please connect your wallet to view your dashboard." />

      {isConnected && onSepolia && (
        <>
          {/* Page Header - Updated for better visibility */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Account Dashboard</h1>
            <p className="text-slate-400">Manage your tokens and view your balances</p>
          </div>

          {/* Main Grid - Balances and Transfer Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Account Balances - Component already redesigned */}
            <TokenBalance
              account={account}
              ethBalance={ethBalances[account]}
              tokens={tokens.map(t => ({ ...t, symbol: tokenMeta[t.address]?.symbol }))}
              balances={balances[account]}
              tokenMeta={tokenMeta}
            />

            {/* Send Token Form - Component already redesigned */}
            <div className="flex flex-col">
              <TransferForm
                tokens={tokens}
                onTransfer={({ recipient, amount, token, setError }) => {
                  setTo(recipient);
                  setAmount(amount);
                  setSelected(tokens.find(t => t.address === token));
                  sendToken().catch(e => setError && setError(e.message || 'Transfer failed.'));
                }}
                loading={status === 'Sending transaction...' || status === 'Transaction submitted. Waiting for confirmation...'}
              />
              {/* Status Message - Updated for better visibility */}
              {status && (
                <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 text-sm">
                  {status}
                </div>
              )}
            </div>
          </div>

          {/* Other Accounts Table - Updated with modern styling and better text visibility */}
          {allAccounts.filter(a => a !== account).length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                Other Accounts
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ETH</th>
                      {tokens.map((token) => (
                        <th key={token.address} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {tokenMeta[token.address]?.symbol || token.address}
                        </th>
                      ))}
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {allAccounts.filter(a => a !== account).map((addr, idx) => {
                      const addrStr = typeof addr === 'string' ? addr : (addr && addr.address ? addr.address : String(addr));
                      if (typeof addrStr !== 'string' || addrStr.length < 8) return null;
                      return (
                        <tr key={addrStr + idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-300">{addrStr}</td>
                          <td className="px-4 py-3 font-semibold text-white">{parseFloat(ethBalances[addrStr] || '0').toFixed(4)}</td>
                          {tokens.map((token) => (
                            <td key={token.address} className="px-4 py-3 text-white font-semibold">
                              {parseFloat((balances[addrStr] && balances[addrStr][token.address]) || '0').toFixed(4)}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <button
                              className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold border border-primary-500/20"
                              onClick={() => setTo(addrStr)}
                              title="Select as recipient"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Token Metadata Display - Component already redesigned */}
          {selected && tokenMeta[selected.address] && (
            <TokenMeta meta={tokenMeta[selected.address]} />
          )}
        </>
      )}
    </div>
  );
}
