
import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import mockErc20Artifact from '../../../artifacts/contracts/MockERC20.sol/MockERC20.json'

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
    <div>
      <h2 className="text-2xl font-bold mb-4">Deploy Token</h2>
      <form onSubmit={handleDeploy} className="max-w-xl bg-white p-6 rounded shadow">
        <label className="block mb-2">
          <div className="text-sm text-slate-600">Name</div>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
        </label>
        <label className="block mb-2">
          <div className="text-sm text-slate-600">Symbol</div>
          <input value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
        </label>
        <label className="block mb-4">
          <div className="text-sm text-slate-600">Initial Supply</div>
          <input value={supply} onChange={e => setSupply(e.target.value)} className="w-full border rounded px-3 py-2 mt-1" />
        </label>

        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Deploy</button>
          <div className="text-sm text-slate-500">{message}</div>
        </div>
      </form>
      {contractAddress && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <div className="text-green-700 font-semibold">
            Contract Address: <a
              href={`https://${networkName === 'sepolia' ? 'sepolia.' : networkName === 'goerli' ? 'goerli.' : ''}etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {contractAddress}
            </a>
          </div>
          <div className="text-green-700 font-semibold">
            Tx Hash: <a
              href={`https://${networkName === 'sepolia' ? 'sepolia.' : networkName === 'goerli' ? 'goerli.' : ''}etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {txHash}
            </a>
          </div>
          <div className="mt-2 text-sm text-blue-900">
            <div>Token Name: <span className="font-mono">{tokenName}</span></div>
            <div>Symbol: <span className="font-mono">{tokenSymbol}</span></div>
            <div>Decimals: <span className="font-mono">{tokenDecimals}</span></div>
            <div>Total Supply: <span className="font-mono">{tokenTotalSupply}</span></div>
            <div>Owner: <span className="font-mono">{tokenOwner}</span></div>
            <div>Your ETH Balance: <span className="font-mono">{ethBalance}</span></div>
            <div>Your Token Balance: <span className="font-mono">{tokenBalance}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
