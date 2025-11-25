// useLiquidityManager.js - Automated liquidity monitoring and management
import { useState, useEffect, useCallback } from 'react'
import { Contract, parseUnits, formatUnits } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import erc20Abi from '../abis/erc20Abi.json'
import routerAbi from '../abis/routerAbi.json'
import factoryAbi from '../abis/factoryAbi.json'
import pairAbi from '../abis/pairAbi.json'

const MIN_LIQUIDITY = '10000' // Minimum liquidity threshold
const AUTO_ADD_AMOUNT = '15000' // Amount to add when below threshold
const POLL_INTERVAL = 30000 // Check every 30 seconds

export function useLiquidityManager() {
    const { provider, signer, account } = useWeb3()
    const [pools, setPools] = useState([])
    const [loading, setLoading] = useState(true)
    const [autoManaging, setAutoManaging] = useState(false)
    const [lastAction, setLastAction] = useState(null)

    const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''
    const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS || ''

    // Get deployed tokens from localStorage
    const getDeployedTokens = useCallback(() => {
        const saved = localStorage.getItem('deployed_tokens_v1')
        if (!saved) return []
        try {
            const arr = JSON.parse(saved)
            return Array.isArray(arr) ? arr : []
        } catch {
            return []
        }
    }, [])

    // Check liquidity for a token pair
    const checkLiquidity = useCallback(async (tokenA, tokenB) => {
        if (!provider || !factoryAddress) return null

        try {
            const factoryContract = new Contract(factoryAddress, factoryAbi, provider)
            const pairAddress = await factoryContract.getPair(tokenA.address, tokenB.address)

            if (pairAddress === '0x0000000000000000000000000000000000000000') {
                return {
                    tokenA: tokenA.symbol,
                    tokenB: tokenB.symbol,
                    tokenAAddress: tokenA.address,
                    tokenBAddress: tokenB.address,
                    pairAddress: null,
                    reserve0: '0',
                    reserve1: '0',
                    belowMinimum: true,
                    needsLiquidity: true
                }
            }

            const pairContract = new Contract(pairAddress, pairAbi, provider)
            const [reserve0, reserve1] = await pairContract.getReserves()
            const token0 = await pairContract.token0()

            const tokenAContract = new Contract(tokenA.address, erc20Abi, provider)
            const decimalsA = await tokenAContract.decimals()

            const isToken0 = token0.toLowerCase() === tokenA.address.toLowerCase()
            const reserveA = isToken0 ? reserve0 : reserve1
            const reserveB = isToken0 ? reserve1 : reserve0

            const reserveAFormatted = formatUnits(reserveA, decimalsA)
            const belowMin = parseFloat(reserveAFormatted) < parseFloat(MIN_LIQUIDITY)

            return {
                tokenA: tokenA.symbol,
                tokenB: tokenB.symbol,
                tokenAAddress: tokenA.address,
                tokenBAddress: tokenB.address,
                pairAddress,
                reserve0: reserveAFormatted,
                reserve1: formatUnits(reserveB, decimalsA),
                belowMinimum: belowMin,
                needsLiquidity: belowMin || reserveA === 0n
            }
        } catch (err) {
            console.error('Error checking liquidity:', err)
            return null
        }
    }, [provider, factoryAddress])

    // Auto-add liquidity to a pool
    const autoAddLiquidity = useCallback(async (pool) => {
        if (!signer || !account || !routerAddress) {
            console.log('No signer or router address')
            return false
        }

        try {
            console.log(`Auto-adding liquidity to ${pool.tokenA}/${pool.tokenB}...`)

            const tokenAContract = new Contract(pool.tokenAAddress, erc20Abi, provider).connect(signer)
            const tokenBContract = new Contract(pool.tokenBAddress, erc20Abi, provider).connect(signer)
            const routerContract = new Contract(routerAddress, routerAbi, provider).connect(signer)

            const decimalsA = await tokenAContract.decimals()
            const decimalsB = await tokenBContract.decimals()

            const amountA = parseUnits(AUTO_ADD_AMOUNT, decimalsA)
            const amountB = parseUnits(AUTO_ADD_AMOUNT, decimalsB)

            // Check if token is ownable and mint if needed
            try {
                const owner = await tokenAContract.owner()
                if (owner.toLowerCase() === account.toLowerCase()) {
                    const balance = await tokenAContract.balanceOf(account)
                    if (balance < amountA) {
                        console.log(`Minting ${AUTO_ADD_AMOUNT} ${pool.tokenA}...`)
                        const mintTx = await tokenAContract.mint(account, amountA)
                        await mintTx.wait()
                    }
                }
            } catch (e) {
                console.log('Token A not ownable or mint failed:', e.message)
            }

            try {
                const owner = await tokenBContract.owner()
                if (owner.toLowerCase() === account.toLowerCase()) {
                    const balance = await tokenBContract.balanceOf(account)
                    if (balance < amountB) {
                        console.log(`Minting ${AUTO_ADD_AMOUNT} ${pool.tokenB}...`)
                        const mintTx = await tokenBContract.mint(account, amountB)
                        await mintTx.wait()
                    }
                }
            } catch (e) {
                console.log('Token B not ownable or mint failed:', e.message)
            }

            // Approve tokens
            console.log('Approving tokens...')
            const approveTxA = await tokenAContract.approve(routerAddress, amountA)
            await approveTxA.wait()
            const approveTxB = await tokenBContract.approve(routerAddress, amountB)
            await approveTxB.wait()

            // Add liquidity
            console.log('Adding liquidity...')
            const deadline = Math.floor(Date.now() / 1000) + 1200
            const tx = await routerContract.addLiquidity(
                pool.tokenAAddress,
                pool.tokenBAddress,
                amountA,
                amountB,
                0,
                0,
                account,
                deadline,
                { gasLimit: 500000 }
            )
            await tx.wait()

            setLastAction({
                type: 'success',
                message: `Added ${AUTO_ADD_AMOUNT} liquidity to ${pool.tokenA}/${pool.tokenB}`,
                timestamp: new Date().toLocaleTimeString()
            })

            return true
        } catch (err) {
            console.error('Auto-add liquidity failed:', err)
            setLastAction({
                type: 'error',
                message: `Failed to add liquidity to ${pool.tokenA}/${pool.tokenB}: ${err.message}`,
                timestamp: new Date().toLocaleTimeString()
            })
            return false
        }
    }, [signer, account, provider, routerAddress])

    // Monitor and auto-manage liquidity
    const monitorLiquidity = useCallback(async () => {
        if (!provider || !autoManaging) return

        const tokens = getDeployedTokens()
        if (tokens.length < 2) return

        const poolData = []

        // Check all token pairs
        for (let i = 0; i < tokens.length; i++) {
            for (let j = i + 1; j < tokens.length; j++) {
                const liquidityInfo = await checkLiquidity(tokens[i], tokens[j])
                if (liquidityInfo) {
                    poolData.push(liquidityInfo)

                    // Auto-add liquidity if needed
                    if (autoManaging && liquidityInfo.needsLiquidity) {
                        await autoAddLiquidity(liquidityInfo)
                    }
                }
            }
        }

        setPools(poolData)
        setLoading(false)
    }, [provider, autoManaging, getDeployedTokens, checkLiquidity, autoAddLiquidity])

    // Initial load
    useEffect(() => {
        monitorLiquidity()
    }, [monitorLiquidity])

    // Auto-polling when auto-management is enabled
    useEffect(() => {
        if (!autoManaging) return

        const interval = setInterval(() => {
            monitorLiquidity()
        }, POLL_INTERVAL)

        return () => clearInterval(interval)
    }, [autoManaging, monitorLiquidity])

    const toggleAutoManage = () => {
        setAutoManaging(prev => !prev)
        if (!autoManaging) {
            setLastAction({
                type: 'info',
                message: 'Auto-management enabled',
                timestamp: new Date().toLocaleTimeString()
            })
        }
    }

    const refreshPools = () => {
        setLoading(true)
        monitorLiquidity()
    }

    return {
        pools,
        loading,
        autoManaging,
        lastAction,
        toggleAutoManage,
        refreshPools,
        minLiquidity: MIN_LIQUIDITY
    }
}
