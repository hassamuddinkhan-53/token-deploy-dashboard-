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
  const [status, setStatus] = useState(null) // pending, success, failed, error, no-signer, approving, approved
  const [allowance, setAllowance] = useState(null)
  const [isApproving, setIsApproving] = useState(false)
  const [lastField, setLastField] = useState('A') // 'A' or 'B'

  const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''

  const routerContract = useMemo(() => {
    if (!provider || !routerAddress) return null
    return new Contract(routerAddress, routerAbi, provider)
  }, [provider, routerAddress])

  // Check allowance when tokenA or amountA changes
  useEffect(() => {
    async function check() {
      if (!account || !tokenA || !routerAddress || !provider) {
        setAllowance(null)
        return
      }
      try {
        const c = new Contract(tokenA, erc20Abi, provider)
        const val = await c.allowance(account, routerAddress)
        const decimals = await c.decimals()
        setAllowance(formatUnits(val, decimals))
      } catch (e) {
        console.error('Check allowance error:', e)
        setAllowance('0')
      }
    }
    check()
  }, [account, tokenA, routerAddress, provider, txHash, status])

  async function calculatePrice() {
    if (!routerContract || !tokenA || !tokenB) return

    try {
      setPriceLoading(true)
      if (lastField === 'A') {
        // Calculate B from A
        if (!amountA || parseFloat(amountA) === 0) {
          setAmountB('')
          setPriceLoading(false)
          return
        }
        const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals()
        const amountIn = parseUnits(amountA, decimalsA)
        const amounts = await routerContract.getAmountsOut(amountIn, [tokenA, tokenB])
        const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals()
        setAmountB(formatUnits(amounts[1], decimalsB))
      } else {
        // Calculate A from B
        if (!amountB || parseFloat(amountB) === 0) {
          setAmountA('')
          setPriceLoading(false)
          return
        }
        const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals()
        const amountOut = parseUnits(amountB, decimalsB)
        const amounts = await routerContract.getAmountsIn(amountOut, [tokenA, tokenB])
        const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals()
        setAmountA(formatUnits(amounts[0], decimalsA))
      }
      setPriceLoading(false)
    } catch (err) {
      setPriceLoading(false)
      console.error('calculatePrice err', err)
    }
  }

  // Debounce calculation
  useEffect(() => {
    const t = setTimeout(() => calculatePrice(), 500)
    return () => clearTimeout(t)
  }, [amountA, amountB, tokenA, tokenB, lastField])

  const handleAmountAChange = (val) => {
    setAmountA(val)
    setLastField('A')
  }

  const handleAmountBChange = (val) => {
    setAmountB(val)
    setLastField('B')
  }

  const switchTokens = () => {
    const tempToken = tokenA
    setTokenA(tokenB)
    setTokenB(tempToken)
    const tempAmount = amountA
    setAmountA(amountB)
    setAmountB(tempAmount)
  }

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

  async function approveToken() {
    if (!signer || !tokenA || !routerAddress) return
    try {
      setIsApproving(true)
      setStatus('approving')
      const c = new Contract(tokenA, erc20Abi, signer)
      const decimals = await c.decimals()
      const tx = await c.approve(routerAddress, parseUnits('9999999999', decimals))
      await tx.wait()
      setIsApproving(false)
      setStatus('approved')
      const val = await c.allowance(account, routerAddress)
      setAllowance(formatUnits(val, decimals))
    } catch (e) {
      console.error('Approve error', e)
      setIsApproving(false)
      setStatus('failed')
    }
  }

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
      const currentAllowance = await tokenAContract.allowance(account, routerAddress)

      if (currentAllowance < amountIn) {
        setStatus('error')
        alert('Insufficient allowance. Please approve first.')
        return
      }

      const routerWithSigner = new Contract(routerAddress, routerAbi, signer)
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      const tx = await routerWithSigner.swapExactTokensForTokens(
        amountIn,
        0,
        [tokenA, tokenB],
        account,
        deadline
      )
      setTxHash(tx.hash)
      const receipt = await tx.wait()
      if (receipt && receipt.status === 1) {
        setStatus('success')
      } else {
        setStatus('failed')
      }
    } catch (err) {
      console.error('executeSwap err', err)
      setStatus('error')
    }
  }

  return {
    tokenA, tokenB, amountA, amountB, priceLoading, txHash, status, allowance, isApproving,
    setTokenA, setTokenB, handleAmountAChange, handleAmountBChange, switchTokens, getTokenBalance, executeSwap, approveToken
  }
}
