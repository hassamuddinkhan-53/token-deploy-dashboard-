import React, { useEffect, useState } from 'react';
import { Contract, formatEther, formatUnits, parseUnits, BrowserProvider, toUtf8String, isAddress } from 'ethers';
import TokenBalance from '../components/TokenBalance';
import TransferForm from '../components/TransferForm';
import TokenMeta from '../components/TokenMeta';
import WarningBanner from '../components/WarningBanner';
import { useWeb3 } from '../context/Web3Context';
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
      } catch {}
      const all = Array.from(new Set([account, ...stored]));
      setAllAccounts(all);
    }
  }, [account]);
  useEffect(() => {
    if (!isConnected) return;
    async function fetchAllTokenData() {
      if (!provider || !allAccounts.length) return;
      // ...existing code...
      let tks = [];
      try {
        tks = JSON.parse(localStorage.getItem('deployed_tokens_v1') || '[]');
      } catch {}
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
    fetchAllTokenData();
  }, [provider, allAccounts, isConnected]);

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
    <div>
      <div className="max-w-4xl mx-auto p-6">
        <WarningBanner show={!onSepolia} message="Please switch your wallet to the Sepolia testnet to view your dashboard." />
        <WarningBanner show={!isConnected} message="Please connect your wallet to view your dashboard." />
        {isConnected && onSepolia && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-blue-900">Account Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Account Balances */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-800">Balances</h3>
                <TokenBalance
                  account={account}
                  ethBalance={ethBalances[account]}
                  tokens={tokens.map(t => ({ ...t, symbol: tokenMeta[t.address]?.symbol }))}
                  balances={balances[account]}
                  tokenMeta={tokenMeta}
                />
              </div>
              {/* Send Token Form */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-800">Send Token</h3>
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
                {status && <div className="text-red-500 text-sm mt-2">{status}</div>}
              </div>
            </div>
            {/* Other Accounts List */}
            {allAccounts.filter(a => a !== account).length > 0 && (
              <div className="mt-10">
                <h3 className="text-xl font-bold text-blue-800 mb-4">Other Accounts</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white rounded-xl shadow border border-blue-100">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">Address</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-blue-700">ETH</th>
                        {tokens.map((token) => (
                          <th key={token.address} className="px-4 py-2 text-left text-xs font-semibold text-blue-700">{tokenMeta[token.address]?.symbol || token.address}</th>
                        ))}
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAccounts.filter(a => a !== account).map((addr, idx) => {
                        const addrStr = typeof addr === 'string' ? addr : (addr && addr.address ? addr.address : String(addr));
                        if (typeof addrStr !== 'string' || addrStr.length < 8) return null;
                        return (
                          <tr key={addrStr + idx} className="border-t hover:bg-blue-50 transition">
                            <td className="px-4 py-2 font-mono text-xs text-blue-900">{addrStr}</td>
                            <td className="px-4 py-2 font-semibold text-blue-700">{ethBalances[addrStr] || 0}</td>
                            {tokens.map((token) => (
                              <td key={token.address} className="px-4 py-2 text-blue-800 font-semibold">{(balances[addrStr] && balances[addrStr][token.address]) || 0}</td>
                            ))}
                            <td className="px-4 py-2">
                              <button
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-3 py-1 rounded transition font-semibold"
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
            {/* Token Metadata Display */}
            {selected && tokenMeta[selected.address] && (
              <TokenMeta meta={tokenMeta[selected.address]} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
