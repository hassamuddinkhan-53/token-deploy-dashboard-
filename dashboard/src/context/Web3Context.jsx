  // Switch MetaMask to Sepolia testnet
  async function switchToSepolia() {
    if (!window.ethereum) throw new Error('No injected wallet found');
    const sepoliaChainId = '0xaa36a7';
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: sepoliaChainId }],
      });
    } catch (switchError) {
      // If not added, add Sepolia
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: sepoliaChainId,
            chainName: 'Sepolia',
            rpcUrls: [process.env.VITE_INFURA_SEPOLIA_URL || process.env.VITE_RPC_URL || 'https://sepolia.infura.io/v3/'],
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }
import React, { createContext, useContext, useEffect, useState } from 'react'
import { BrowserProvider, JsonRpcProvider, formatEther } from 'ethers'
  // Helper: check if current chain is Sepolia
  async function isSepoliaNetwork() {
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === '0xaa36a7';
    }
    return false;
  }

const Web3Context = createContext(null)

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [rpcUrl, setRpcUrl] = useState(import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545')
  const [networkName, setNetworkName] = useState('rpc')

  useEffect(() => {
    // Initialize a default read-only RPC provider
    const p = new JsonRpcProvider(rpcUrl)
    setProvider(p)
    setSigner(null)
    setIsConnected(false)
    setAccount(null)
    setNetworkName('rpc')
  }, [rpcUrl])

  async function connectWallet() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No injected wallet found')
    }
    // Enforce Sepolia only
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0xaa36a7') {
      throw new Error('Please switch your wallet to Sepolia testnet.');
    }
    try {
      // Request accounts via the provider
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const addr = Array.isArray(accounts) ? accounts[0] : accounts
      const bp = new BrowserProvider(window.ethereum)
      // getSigner() is async and must be awaited
      let s
      try {
        s = await bp.getSigner()
      } catch (e) {
        // fallback for MetaMask quirks
        s = bp.getSigner()
      }
      setProvider(bp)
      setSigner(s)
      setAccount(addr)
      setIsConnected(true)
      setNetworkName('injected')

      // Listen for account and chain changes
      if (window.ethereum && window.ethereum.on) {
        const handleAccounts = (accounts) => {
          if (!accounts || accounts.length === 0) {
            disconnect()
          } else {
            setAccount(accounts[0])
          }
        }
        const handleChain = () => {
          // reload to refresh provider network
          window.location.reload()
        }
        try {
          window.ethereum.removeListener && window.ethereum.removeListener('accountsChanged', handleAccounts)
        } catch (e) {}
        try {
          window.ethereum.removeListener && window.ethereum.removeListener('chainChanged', handleChain)
        } catch (e) {}
        window.ethereum.on('accountsChanged', handleAccounts)
        window.ethereum.on('chainChanged', handleChain)
      }
      // Always update account after connect (MetaMask bug workaround)
      if (window.ethereum && window.ethereum.selectedAddress) {
        setAccount(window.ethereum.selectedAddress)
      }
      return addr
    } catch (err) {
      console.error('connectWallet error', err)
      throw err
    }
  }

  function disconnect() {
    const p = new JsonRpcProvider(rpcUrl)
    setProvider(p)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
    setNetworkName('rpc')
  }

  async function switchRpc(url) {
    if (url === 'injected') {
      // If injected is available, connect to it (but do not request accounts automatically)
      if (window.ethereum) {
        try {
          const bp = new BrowserProvider(window.ethereum)
          setProvider(bp)
          setSigner(null)
          setNetworkName('injected')
          return
        } catch (err) {
          console.warn('Could not switch to injected', err)
        }
      }
    }
    const p = new JsonRpcProvider(url)
    setProvider(p)
    setSigner(null)
    setAccount(null)
    setIsConnected(false)
    setNetworkName('rpc')
    setRpcUrl(url)
  }

  async function getEthBalance() {
    try {
      if (!provider || !account) return null;
      // Only allow Sepolia
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') return null;
      }
      const bal = await provider.getBalance(account)
      return formatEther(bal)
    } catch (err) {
      return null
    }
  }

  function saveDeployedToken(entry) {
    try {
      const key = 'deployed_tokens_v1'
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(entry)
      localStorage.setItem(key, JSON.stringify(arr))
      return true
    } catch (err) {
      console.error('saveDeployedToken error', err)
      return false
    }
  }

  function addTransaction(tx) {
    try {
      const key = 'web3_transactions_v1'
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(tx)
      localStorage.setItem(key, JSON.stringify(arr))
      // dispatch an in-page event so same-tab listeners update immediately
      try {
        window.dispatchEvent(new CustomEvent('tx-updated', { detail: tx }))
      } catch (e) {}
      return true
    } catch (err) {
      console.error('addTransaction error', err)
      return false
    }
  }

  function getTransactions() {
    try {
      const raw = localStorage.getItem('web3_transactions_v1')
      return raw ? JSON.parse(raw) : []
    } catch (err) {
      return []
    }
  }

  const value = {
    provider,
    signer,
    account,
    isConnected,
    rpcUrl,
    networkName,
    connectWallet,
    disconnect,
    switchRpc,
    getEthBalance,
    saveDeployedToken,
    addTransaction,
    getTransactions,
    switchToSepolia,
    isSepoliaNetwork,
  }

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>
}

export function useWeb3() {
  return useContext(Web3Context)
}
