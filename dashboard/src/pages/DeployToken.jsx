
import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import mockErc20Artifact from '../artifacts/MockERC20.json'

export default function DeployToken() {
  const [name, setName] = useState('MyToken')
  const [symbol, setSymbol] = useState('MTK')
  const [supply, setSupply] = useState('1000000')
  const [message, setMessage] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [tokenDecimals, setTokenDecimals] = useState('')
  const [tokenTotalSupply, setTokenTotalSupply] = useState('')
  const [tokenOwner, setTokenOwner] = useState('')
  const [ethBalance, setEthBalance] = useState('')
  const [tokenBalance, setTokenBalance] = useState('')
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState('')
  const [networkName, setNetworkName] = useState('')
  const [contract, setContract] = useState(null)
  const contractRef = useRef(null)

  // Initialize provider, signer, account, and network
  useEffect(() => {
    async function initWeb3() {
      if (!window.ethereum) {
        setMessage('MetaMask not detected')
        return
      }
      try {
        const prov = new ethers.BrowserProvider(window.ethereum)
        setProvider(prov)
        const signerObj = await prov.getSigner()
        setSigner(signerObj)
        const addr = await signerObj.getAddress()
        setAccount(addr)
        const net = await prov.getNetwork()
        setNetworkName(net && net.name ? net.name : '')
      } catch (err) {
        setMessage('Web3 init error: ' + (err.message || err))
      }
    }
    initWeb3()
  }, [])

  // Only create contract instance after contractAddress, ABI, and signer are ready
  useEffect(() => {
    if (contractAddress && signer && mockErc20Artifact.abi) {
      const c = new ethers.Contract(contractAddress, mockErc20Artifact.abi, signer)
      setContract(c)
      contractRef.current = c
    }
  }, [contractAddress, signer])

  // Modular fetch function, only runs if all required objects are defined
  const fetchLiveValues = async () => {
    if (!contract || !account || !provider) return
    try {
      const [n, s, d, ts, owner, ethBal, tokBal] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.owner ? contract.owner() : account,
        provider.getBalance(account),
        contract.balanceOf(account)
      ])
      setTokenName(n)
      setTokenSymbol(s)
      setTokenDecimals(d.toString())
      setTokenTotalSupply(ts.toString())
      setTokenOwner(owner)
      setEthBalance(Number(ethBal) / 1e18 + '')
      setTokenBalance(ts && tokBal ? (Number(tokBal) / Math.pow(10, Number(d))).toString() : '0')
    } catch (err) {
      setMessage('Error fetching live values: ' + (err.message || err))
    }
  }

  // Deploy handler, ensures all steps are sequential and safe
  const handleDeploy = async (e) => {
    e.preventDefault()
    setMessage('Switching to Sepolia...')
    setContractAddress('')
    setTxHash('')
    setTokenName(''); setTokenSymbol(''); setTokenDecimals(''); setTokenTotalSupply(''); setTokenOwner(''); setEthBalance(''); setTokenBalance('');
    try {
      if (!provider || !signer || !account) {
        setMessage('Provider, signer, or account not ready')
        return
      }
      // Switch to Sepolia if needed
      if (window.ethereum.networkVersion !== '11155111') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        })
      }
      setMessage('Deploying contract...')
      const factory = new ethers.ContractFactory(
        mockErc20Artifact.abi,
        mockErc20Artifact.bytecode,
        signer
      )
      const decimals = 18
      const initialSupply = ethers.parseUnits(supply, decimals)
      const contractInstance = await factory.deploy(name, symbol, initialSupply)
      setMessage('Waiting for deployment...')
      await contractInstance.waitForDeployment()
      const tx = contractInstance.deploymentTransaction && contractInstance.deploymentTransaction()
      setContractAddress(contractInstance.target)
      setTxHash(txHash)
      // Wait for transaction confirmation
      if (txHash) {
        await provider.waitForTransaction(txHash)
      }
      setMessage('Deployed successfully! Fetching live values...')
      // Save deployed token info to localStorage for ManageTokens and others
      try {
        const key = 'deployed_tokens_v1';
        let arr = [];
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            arr = JSON.parse(raw);
            if (!Array.isArray(arr)) arr = [];
          } catch (e) {
            arr = [];
          }
        }
        arr.unshift({
          address: contractInstance.target,
          name,
          symbol,
          initialSupply: supply,
          admin: account,
          network: networkName,
          deployedAt: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) {
        /* ignore localStorage errors */
      }
      // Contract instance will be created by useEffect when contractAddress is set
    } catch (err) {
      setMessage('Deploy failed: ' + (err.message || err))
    }
  }

  // Subscribe to Transfer events for live updates
  useEffect(() => {
    if (!contract) return
    const handler = () => fetchLiveValues()
    contract.on('Transfer', handler)
    return () => {
      contract.removeAllListeners('Transfer')
    }
  }, [contract, account])

  // Fetch live values after contract is set
  useEffect(() => {
    if (contract && account && provider) {
      fetchLiveValues()
    }
  }, [contract, account, provider])

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      if (contractRef.current && contractRef.current.removeAllListeners) {
        contractRef.current.removeAllListeners()
      }
    }
  }, [])


  // --- CLEAN, MODULAR, RELIABLE LOGIC ---
  // fetchLiveValues and handleDeploy are already defined above in the previous patch and are correct.

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      if (contractRef.current && contractRef.current.removeAllListeners) {
        contractRef.current.removeAllListeners()
      }
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header - Updated with white text for visibility */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Deploy Token</h1>
        <p className="text-slate-400">Create a new ERC-20 token on the Sepolia testnet</p>
      </div>

      {/* Deploy Form - Updated with glass panel and better contrast */}
      <form onSubmit={handleDeploy} className="glass-panel rounded-2xl p-8 mb-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Token Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-600"
              placeholder="e.g., My Token"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Token Symbol</label>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-600"
              placeholder="e.g., MTK"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Initial Supply</label>
            <input
              value={supply}
              onChange={e => setSupply(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-600"
              placeholder="e.g., 1000000"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button className="glass-button px-6 py-3 rounded-xl font-bold flex-shrink-0">
              Deploy Token
            </button>
            {message && (
              <div className="text-sm text-slate-300 bg-slate-800/50 px-4 py-2 rounded-lg">{message}</div>
            )}
          </div>
        </div>
      </form>

      {/* Deployment Success Card - Updated with better visibility */}
      {contractAddress && (
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-green-500 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="text-lg font-bold text-white">Deployment Successful!</h3>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Contract Address</span>
              <a
                href={`https://${networkName === 'sepolia' ? 'sepolia.' : networkName === 'goerli' ? 'goerli.' : ''}etherscan.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary-400 hover:text-primary-300 font-mono text-sm mt-1 break-all underline"
              >
                {contractAddress}
              </a>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Transaction Hash</span>
              <a
                href={`https://${networkName === 'sepolia' ? 'sepolia.' : networkName === 'goerli' ? 'goerli.' : ''}etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary-400 hover:text-primary-300 font-mono text-sm mt-1 break-all underline"
              >
                {txHash}
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Token Name</span>
                <span className="text-white font-medium">{tokenName}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Symbol</span>
                <span className="text-white font-medium">{tokenSymbol}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Decimals</span>
                <span className="text-white font-medium">{tokenDecimals}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Total Supply</span>
                <span className="text-white font-medium">{tokenTotalSupply}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">Owner</span>
                <span className="text-white font-medium font-mono text-xs break-all">{tokenOwner}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">ETH Balance</span>
                <span className="text-white font-medium">{ethBalance}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg col-span-2">
                <span className="text-xs text-slate-400 block mb-1">Your Token Balance</span>
                <span className="text-white font-medium">{tokenBalance}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
