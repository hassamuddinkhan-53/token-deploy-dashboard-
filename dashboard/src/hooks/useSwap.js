// useSwap.js – core swap logic for the dashboard
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract, parseUnits, formatUnits } from 'ethers';
import routerAbi from '../abis/routerAbi.json';
import erc20Abi from '../abis/erc20Abi.json';
import { useWeb3 } from '../context/Web3Context';

export function useSwap() {
  const { provider, signer, account } = useWeb3();

  // ----- State -----
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [status, setStatus] = useState(null); // pending, success, failed, error, no-signer, approving
  const [allowance, setAllowance] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [lastField, setLastField] = useState('A'); // which input the user edited last
  const [balanceA, setBalanceA] = useState('0');
  const [balanceB, setBalanceB] = useState('0');

  const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || '';

  // ----- Contracts -----
  const routerContract = useMemo(() => {
    if (!provider || !routerAddress) return null;
    return new Contract(routerAddress, routerAbi, provider);
  }, [provider, routerAddress]);

  // ----- Helper: fetch token balance -----
  const fetchBalance = useCallback(async (token, setBalance) => {
    if (!token || !account || !provider) return;
    try {
      const contract = new Contract(token, erc20Abi, provider);
      const decimals = await contract.decimals();
      const raw = await contract.balanceOf(account);
      setBalance(formatUnits(raw, decimals));
    } catch (e) {
      console.error('Error fetching balance', e);
      setBalance('0');
    }
  }, [account, provider]);

  // ----- Update balances when token or account changes -----
  useEffect(() => {
    fetchBalance(tokenA, setBalanceA);
    fetchBalance(tokenB, setBalanceB);
  }, [tokenA, tokenB, account, provider, fetchBalance]);

  // ----- Check allowance for tokenA -----
  useEffect(() => {
    const check = async () => {
      if (!tokenA || !account || !routerAddress || !provider) {
        setAllowance(null);
        return;
      }
      try {
        const contract = new Contract(tokenA, erc20Abi, provider);
        const val = await contract.allowance(account, routerAddress);
        const decimals = await contract.decimals();
        setAllowance(formatUnits(val, decimals));
      } catch (e) {
        console.error('Check allowance error', e);
        setAllowance('0');
      }
    };
    check();
  }, [tokenA, account, routerAddress, provider]);

  // ----- Reset amounts & allowance when token selection changes -----
  useEffect(() => {
    setAmountA('');
    setAmountB('');
    setAllowance(null);
    setPriceLoading(false);
  }, [tokenA, tokenB]);

  // ----- Price calculation (on input change) -----
  const calculatePrice = useCallback(async () => {
    if (!routerContract || !tokenA || !tokenB) return;
    try {
      setPriceLoading(true);
      if (lastField === 'A') {
        if (!amountA || parseFloat(amountA) === 0) {
          setAmountB('');
          setPriceLoading(false);
          return;
        }
        const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals();
        const amountIn = parseUnits(amountA, decimalsA);
        const amounts = await routerContract.getAmountsOut(amountIn, [tokenA, tokenB]);
        const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals();
        setAmountB(formatUnits(amounts[1], decimalsB));
      } else {
        if (!amountB || parseFloat(amountB) === 0) {
          setAmountA('');
          setPriceLoading(false);
          return;
        }
        const decimalsB = await (new Contract(tokenB, erc20Abi, provider)).decimals();
        const amountOut = parseUnits(amountB, decimalsB);
        const amounts = await routerContract.getAmountsIn(amountOut, [tokenA, tokenB]);
        const decimalsA = await (new Contract(tokenA, erc20Abi, provider)).decimals();
        setAmountA(formatUnits(amounts[0], decimalsA));
      }
      setPriceLoading(false);
    } catch (err) {
      setPriceLoading(false);
      console.error('calculatePrice error', err);
      // Check if it's a liquidity error
      if (err.message && err.message.includes('INSUFFICIENT_LIQUIDITY')) {
        setAmountB('');
        setAmountA('');
      }
    }
  }, [routerContract, tokenA, tokenB, amountA, amountB, lastField, provider]);

  // Debounce price calculation
  useEffect(() => {
    const t = setTimeout(calculatePrice, 500);
    return () => clearTimeout(t);
  }, [calculatePrice]);

  // ----- Input handlers -----
  const handleAmountAChange = (val) => {
    if (val === '' || /^\d*\.?\d{0,18}$/.test(val)) {
      if (parseFloat(val) > parseFloat(balanceA)) {
        setAmountA(balanceA);
      } else {
        setAmountA(val);
      }
      setLastField('A');
    }
  };

  const handleAmountBChange = (val) => {
    if (val === '' || /^\d*\.?\d{0,18}$/.test(val)) {
      setAmountB(val);
      setLastField('B');
    }
  };

  // ----- Switch tokens -----
  const switchTokens = () => {
    const tmpToken = tokenA;
    setTokenA(tokenB);
    setTokenB(tmpToken);
    const tmpAmount = amountA;
    setAmountA(amountB);
    setAmountB(tmpAmount);
    setLastField('A'); // treat the new amountA as primary input
  };

  // ----- Helper: get token balance (used by other components) -----
  const getTokenBalance = useCallback(async (token) => {
    if (!provider || !account || !token) return null;
    try {
      const contract = new Contract(token, erc20Abi, provider);
      const decimals = await contract.decimals();
      const raw = await contract.balanceOf(account);
      return formatUnits(raw, decimals);
    } catch (e) {
      console.error('getTokenBalance error', e);
      return null;
    }
  }, [provider, account]);

  // ----- Execute swap -----
  const executeSwap = async () => {
    setStatus('pending');
    setTxHash(null);
    if (!signer || !routerAddress) {
      setStatus('no-signer');
      return;
    }
    try {
      // Contracts with signer for state‑changing calls
      const tokenAContract = new Contract(tokenA, erc20Abi, provider).connect(signer);
      const routerWithSigner = new Contract(routerAddress, routerAbi, provider).connect(signer);
      const routerForView = new Contract(routerAddress, routerAbi, provider);

      // Parse input amount
      const decimalsA = await tokenAContract.decimals();
      const amountIn = parseUnits(amountA || '0', decimalsA);
      if (amountIn === 0n) {
        alert('Please enter a valid amount');
        setStatus(null);
        return;
      }

      // Auto‑approve if needed
      const currentAllowance = await tokenAContract.allowance(account, routerAddress);
      if (currentAllowance < amountIn) {
        setStatus('approving');
        setIsApproving(true);
        const approveTx = await tokenAContract.approve(routerAddress, amountIn);
        await approveTx.wait();
        setIsApproving(false);
        setStatus('pending');
      }

      // Slippage protection – 2% by default
      let amountOutMin = 0n;
      try {
        const amounts = await routerForView.getAmountsOut(amountIn, [tokenA, tokenB]);
        const expected = amounts[1];
        amountOutMin = (expected * 98n) / 100n; // 2% slippage
      } catch (e) {
        console.warn('Could not fetch amountOut for slippage, using 0', e);
        amountOutMin = 0n;
      }

      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 min

      const tx = await routerWithSigner.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenA, tokenB],
        account,
        deadline,
        { gasLimit: 350000 }
      );
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        setStatus('success');
        // Refresh allowance & balances
        const newAllowance = await tokenAContract.allowance(account, routerAddress);
        setAllowance(formatUnits(newAllowance, decimalsA));
        // Update balances to reflect the swap
        fetchBalance(tokenA, setBalanceA);
        fetchBalance(tokenB, setBalanceB);
        // Reset inputs
        setAmountA('');
        setAmountB('');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('Swap failed', err);
      if (err.code === 'ACTION_REJECTED') {
        setStatus('rejected');
      } else {
        setStatus('error');
      }
    }
  };

  // ----- Return hook API -----
  return {
    tokenA,
    tokenB,
    amountA,
    amountB,
    priceLoading,
    txHash,
    status,
    allowance,
    isApproving,
    balanceA,
    balanceB,
    setTokenA,
    setTokenB,
    handleAmountAChange,
    handleAmountBChange,
    switchTokens,
    getTokenBalance,
    executeSwap,
  };
}
