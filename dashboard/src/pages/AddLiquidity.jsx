import React, { useState, useEffect } from 'react'
import { Contract, parseUnits } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import TokenSelect from '../components/TokenSelect'
import routerAbi from '../abis/routerAbi.json'
import erc20Abi from '../abis/erc20Abi.json'
import { Plus, RefreshCw } from 'lucide-react'

const DEFAULT_TOKENS = [
    { address: import.meta.env.VITE_TOKEN_A || '', symbol: 'TKA', name: 'Token A' },
    { address: import.meta.env.VITE_TOKEN_B || '', symbol: 'TKB', name: 'Token B' }
]

export default function AddLiquidity() {
    const { provider, signer, account, isConnected, connectWallet } = useWeb3()
    const [tokens, setTokens] = useState([])
    const [tokenA, setTokenA] = useState('')
    const [tokenB, setTokenB] = useState('')
    const [amountA, setAmountA] = useState('')
    const [amountB, setAmountB] = useState('')
    const [status, setStatus] = useState(null)
    const [txHash, setTxHash] = useState(null)

    const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''

    useEffect(() => {
        const saved = localStorage.getItem('deployed_tokens_v1')
        let arr = []
        if (saved) {
            try {
                arr = JSON.parse(saved)
                if (!Array.isArray(arr)) arr = []
            } catch (e) {
                arr = []
            }
        }
        if (arr.length === 0) {
            arr = DEFAULT_TOKENS
        }
        setTokens(arr)
        if (!tokenA && arr[0]) setTokenA(arr[0].address)
        if (!tokenB && arr[1]) setTokenB(arr[1].address)
    }, [])

    const addLiquidity = async () => {
        if (!signer || !tokenA || !tokenB || !amountA || !amountB) {
            alert('Please fill all fields')
            return
        }

        setStatus('pending')
        setTxHash(null)

        try {
            const tokenAContract = new Contract(tokenA, erc20Abi, provider).connect(signer)
            const tokenBContract = new Contract(tokenB, erc20Abi, provider).connect(signer)
            const routerContract = new Contract(routerAddress, routerAbi, provider).connect(signer)

            const decimalsA = await tokenAContract.decimals()
            const decimalsB = await tokenBContract.decimals()

            const amountAWei = parseUnits(amountA, decimalsA)
            const amountBWei = parseUnits(amountB, decimalsB)

            // Approve tokens
            setStatus('approving')
            const approveTxA = await tokenAContract.approve(routerAddress, amountAWei)
            await approveTxA.wait()
            const approveTxB = await tokenBContract.approve(routerAddress, amountBWei)
            await approveTxB.wait()

            // Add liquidity
            setStatus('adding')
            const deadline = Math.floor(Date.now() / 1000) + 1200
            const tx = await routerContract.addLiquidity(
                tokenA,
                tokenB,
                amountAWei,
                amountBWei,
                0,
                0,
                account,
                deadline,
                { gasLimit: 500000 }
            )
            setTxHash(tx.hash)
            await tx.wait()
            setStatus('success')
            setAmountA('')
            setAmountB('')
        } catch (err) {
            console.error('Add liquidity failed', err)
            setStatus('error')
        }
    }

    return (
        <div className="flex justify-center pt-10">
            <div className="w-full max-w-md">
                <div className="glass-panel rounded-2xl p-4">
                    <h2 className="text-xl font-bold text-white mb-6 px-2">Add Liquidity</h2>

                    {!isConnected ? (
                        <div className="text-center py-12 px-4">
                            <button onClick={connectWallet} className="glass-button w-full py-3 rounded-xl font-bold">
                                Connect Wallet
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-4">
                                <label className="text-slate-400 text-xs font-medium mb-2 block">Token A</label>
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="number"
                                        value={amountA}
                                        onChange={(e) => setAmountA(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-transparent text-2xl font-bold text-white outline-none"
                                    />
                                    <TokenSelect tokens={tokens} value={tokenA} onChange={setTokenA} />
                                </div>
                            </div>

                            <div className="flex justify-center my-2">
                                <Plus size={24} className="text-slate-600" />
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-4">
                                <label className="text-slate-400 text-xs font-medium mb-2 block">Token B</label>
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="number"
                                        value={amountB}
                                        onChange={(e) => setAmountB(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full bg-transparent text-2xl font-bold text-white outline-none"
                                    />
                                    <TokenSelect tokens={tokens} value={tokenB} onChange={setTokenB} />
                                </div>
                            </div>

                            <button
                                onClick={addLiquidity}
                                disabled={!tokenA || !tokenB || !amountA || !amountB || status === 'pending' || status === 'approving' || status === 'adding'}
                                className={`w-full py-4 rounded-xl font-bold text-lg ${!tokenA || !tokenB || !amountA || !amountB || status === 'pending' || status === 'approving' || status === 'adding'
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'glass-button'
                                    }`}
                            >
                                {status === 'approving' ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <RefreshCw size={20} className="animate-spin" /> Approving...
                                    </span>
                                ) : status === 'adding' ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <RefreshCw size={20} className="animate-spin" /> Adding Liquidity...
                                    </span>
                                ) : (
                                    'Add Liquidity'
                                )}
                            </button>

                            {status === 'success' && (
                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="font-bold text-green-400 text-sm">Liquidity Added!</p>
                                    {txHash && (
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-green-500/70 hover:text-green-400 underline mt-1 block"
                                        >
                                            View on Etherscan
                                        </a>
                                    )}
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="font-bold text-red-400 text-sm">Error occurred</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
