import { useCallback, useEffect, useMemo, useState } from 'react'
import { Contract, parseUnits, formatUnits } from 'ethers'
import routerAbi from '../abis/routerAbi.json'
import erc20Abi from '../abis/erc20Abi.json'
import { useWeb3 } from '../context/Web3Context'

export function useSwap() {
  const { provider, signer, account } = useWeb3()
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [priceLoading, setPriceLoading] = useState(false)
  const [txHash, setTxHash] = useState(null)
  const [status, setStatus] = useState(null)

  const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''

  const routerContract = useMemo(() => {
    if (!provider || !routerAddress) return null
    return new Contract(routerAddress, routerAbi, provider)
  }, [provider, routerAddress])

  async function fetchAmountsOut(aAmount) {
    if (!routerContract || !tokenA || !tokenB) return null
    try {
      setPriceLoading(true)
      const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals()
      const amountIn = parseUnits(aAmount || '0', decimalsA)
      const amounts = await routerContract.getAmountsOut(amountIn, [tokenA, tokenB])
      const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals()
      const out = formatUnits(amounts[1], decimalsB)
      setAmountB(out)
      setPriceLoading(false)
      return out
    } catch (err) {
      setPriceLoading(false)
      console.error('fetchAmountsOut err', err)
      return null
    }
  }

  useEffect(() => {
    if (amountA && tokenA && tokenB) {
      const t = setTimeout(() => fetchAmountsOut(amountA), 300)
      return () => clearTimeout(t)
    }
  }, [amountA, tokenA, tokenB])

  const getTokenBalance = useCallback(async (token) => {
    if (!provider || !account || !token) return null
    try {
      const c = new Contract(token, erc20Abi, provider)
      const decimals = await c.decimals()
      const raw = await c.balanceOf(account)
      return formatUnits(raw, decimals)
    } catch (err) {
      console.error('getTokenBalance err', err)
      return null
    }
  }, [provider, account])

  async function executeSwap() {
    setStatus('pending')
    setTxHash(null)
    if (!signer || !routerAddress) {
      setStatus('no-signer')
      return
    }
    try {
      const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals()
      const amountIn = parseUnits(amountA || '0', decimalsA)
      const tokenAContract = new Contract(tokenA, erc20Abi, signer)
      const allowance = await tokenAContract.allowance(account, routerAddress)
      if (allowance.lt(amountIn)) {
        const tx = await tokenAContract.approve(routerAddress, amountIn)
        await tx.wait()
      }
      const routerWithSigner = new Contract(routerAddress, routerAbi, signer)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20
      const tx = await routerWithSigner.swapExactTokensForTokens(amountIn, 0, [tokenA, tokenB], account, deadline)
      setTxHash(tx.hash)
      const receipt = await tx.wait()
      if (receipt && receipt.status === 1) {
        setStatus('success')
        // refresh balances
      } else {
        setStatus('failed')
      }
    } catch (err) {
      console.error('executeSwap err', err)
      setStatus('error')
    }
  }

  return {
    tokenA, tokenB, amountA, amountB, priceLoading, txHash, status,
    setTokenA, setTokenB, setAmountA, setAmountB, fetchAmountsOut, getTokenBalance, executeSwap
  }
}
