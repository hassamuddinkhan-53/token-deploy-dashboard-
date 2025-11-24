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
  const [balanceA, setBalanceA] = useState('0')
  const [balanceB, setBalanceB] = useState('0')

  const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || ''

  const routerContract = useMemo(() => {
    if (!provider || !routerAddress) return null
    return new Contract(routerAddress, routerAbi, provider)
  }, [provider, routerAddress])

  // Fetch Balances
  const updateBalances = useCallback(async () => {
    if (!account || !provider) return

    if (tokenA) {
      try {
        const c = new Contract(tokenA, erc20Abi, provider)
        const dec = await c.decimals()
        const bal = await c.balanceOf(account)
        setBalanceA(formatUnits(bal, dec))
      } catch (e) {
        console.error('Error fetching balance A:', e)
        setBalanceA('0')
      }
    } else {
      setBalanceA('0')
    }

    if (tokenB) {
      try {
        const c = new Contract(tokenB, erc20Abi, provider)
        const dec = await c.decimals()
        const bal = await c.balanceOf(account)
        setBalanceB(formatUnits(bal, dec))
      } catch (e) {
        console.error('Error fetching balance B:', e)
        setBalanceB('0')
      }
    } else {
      setBalanceB('0')
    }
  }, [account, provider, tokenA, tokenB])

  // Update balances on mount and when tokens/account change
  useEffect(() => {
    updateBalances()
    const interval = setInterval(updateBalances, 10000)
    return () => clearInterval(interval)
  }, [updateBalances, txHash, status])

  // Check allowance
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

  // Calculate Price / Amounts
  async function calculatePrice() {
    if (!routerContract || !tokenA || !tokenB) return

    try {
      setPriceLoading(true)
      if (lastField === 'A') {
        if (!amountA || parseFloat(amountA) === 0) {
          setAmountB('')
          setPriceLoading(false)
          return
        }
        const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals()
        const amountIn = parseUnits(amountA, decimalsA)

        // Use provider for view call
        const amounts = await routerContract.getAmountsOut(amountIn, [tokenA, tokenB])

        const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals()
        setAmountB(formatUnits(amounts[1], decimalsB))
      } else {
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

  useEffect(() => {
    const t = setTimeout(() => calculatePrice(), 500)
    return () => clearTimeout(t)
  }, [amountA, amountB, tokenA, tokenB, lastField])

  const handleAmountAChange = (val) => {
    // Validation: allow only numbers and max 18 decimals
    if (val === '' || /^\d*\.?\d{0,18}$/.test(val)) {
      // Check if exceeds balance
      if (parseFloat(val) > parseFloat(balanceA)) {
        setAmountA(balanceA) // Cap at max balance
      } else {
        setAmountA(val)
      }
      setLastField('A')
    }
  }

  const handleAmountBChange = (val) => {
    // Validation: allow only numbers and max 18 decimals
    if (val === '' || /^\d*\.?\d{0,18}$/.test(val)) {
      setAmountB(val)
      setLastField('B')
    }
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

  async function executeSwap() {
    setStatus('pending')
    setTxHash(null)
    if (!signer || !routerAddress) {
      setStatus('no-signer')
      return
    }

    try {
      // 1. Setup Contracts
      const tokenAContract = new Contract(tokenA, erc20Abi, signer)
      const routerWithSigner = new Contract(routerAddress, routerAbi, signer)
      const routerForView = new Contract(routerAddress, routerAbi, provider)

      // 2. Parse Input Amount
      const decimalsA = await tokenAContract.decimals()
      const amountIn = parseUnits(amountA || '0', decimalsA)

      if (amountIn === 0n) {
        alert('Please enter a valid amount')
        setStatus(null)
        return
      }

      // 3. Auto-Approve
      const currentAllowance = await tokenAContract.allowance(account, routerAddress)
      if (currentAllowance < amountIn) {
        try {
          setStatus('approving')
          setIsApproving(true)
          const approveTx = await tokenAContract.approve(routerAddress, amountIn)
          await approveTx.wait()
          setIsApproving(false)
          setStatus('pending')
        } catch (err) {
          console.error('Approval failed:', err)
          setIsApproving(false)
          setStatus('failed')
          return
        }
      }

      // 4. Calculate Minimum Output (Slippage Protection)
      let amountOutMin = 0n
      try {
        const amounts = await routerForView.getAmountsOut(amountIn, [tokenA, tokenB])
        const amountOutExpected = amounts[1]
        // 2% Slippage: amount * 98 / 100
        amountOutMin = (amountOutExpected * 98n) / 100n
      } catch (err) {
        console.warn('Could not calculate min output (pool might be empty), setting to 0', err)
        amountOutMin = 0n
      }

      console.log('Swap Params:', {
        amountIn: amountIn.toString(),
        amountOutMin: amountOutMin.toString(),
        path: [tokenA, tokenB]
      })

      // 5. Execute Swap
      const deadline = Math.floor(Date.now() / 1000) + 1200 // 20 mins

      console.log('Executing swap with manual gas limit (Standard Function)...')

      // Use standard swapExactTokensForTokens with manual gas limit
      // This bypasses estimation and is supported by all standard routers
      const tx = await routerWithSigner.swapExactTokensForTokens(
        amountIn,
        0, // amountOutMin = 0 for debugging
        [tokenA, tokenB],
        account,
        deadline,
        { gasLimit: 350000 } // Manual gas limit
      )

      setTxHash(tx.hash)
      const receipt = await tx.wait()

      if (receipt && receipt.status === 1) {
        setStatus('success')
        // Refresh allowance
        const newAllowance = await tokenAContract.allowance(account, routerAddress)
        setAllowance(formatUnits(newAllowance, decimalsA))
        // Refresh balances
        updateBalances()
      } else {
        setStatus('failed')
      }
    } catch (err) {
      console.error('Swap failed:', err)
      if (err.code === 'ACTION_REJECTED') {
        setStatus('rejected')
      } else {
        setStatus('error')
      }
    }
  }

  return {
    tokenA, tokenB, amountA, amountB, priceLoading, txHash, status, allowance, isApproving,
    setTokenA, setTokenB, handleAmountAChange, handleAmountBChange, switchTokens, getTokenBalance, executeSwap,
    balanceA, balanceB // Export balances
  }
}
