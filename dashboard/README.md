# Blockchain Developer Dashboard (React)

This is a React (Vite) starter scaffold for a local blockchain developer dashboard. It includes starter pages for Dashboard, Deploy (simulated), and Manage (simulated) tokens. The project is configured with Tailwind CSS and includes Ethers.js and Thirdweb SDK as dependencies (not wired into flows yet).

Quick start (from `e:\mycryptoproject\dashboard`):

```powershell
npm install
npm run dev
```

Environment:
- Add RPC keys to `.env` (see `.env.example`) for Alchemy/Infura or local nodes.

Next steps I can do if you want me to continue:
- Wire wallet connection (MetaMask, WalletConnect) and provider switching
- Implement on-chain deploy via Thirdweb or Hardhat + signer
- Add transaction history backend or local persistence
- Add marketplace and analytics pages

Swap Interface (Uniswap-style)
- Page: `src/pages/Swap.jsx` — simple Uniswap-like swap UI
- Components: `src/components/TokenSelect.jsx`
- Hook: `src/hooks/useSwap.js` handles price fetch and swap execution via your deployed router
- ABIs: `src/abis/routerAbi.json`, `src/abis/erc20Abi.json`

Setup:
- Add your router and token addresses to `.env` using `.env.example` keys: `VITE_ROUTER_ADDRESS`, `VITE_TOKEN_A`, `VITE_TOKEN_B`.
- Ensure your Hardhat node is running on `http://127.0.0.1:8545` or set `VITE_RPC_URL`.

Running:
```powershell
cd e:\mycryptoproject\dashboard
npm install
npm run dev
```

Testing notes:
- Connect MetaMask to `http://127.0.0.1:8545` (import local Hardhat account private key).
- On Swap page: select Token A and Token B (addresses from `.env`), enter amount, connect wallet, and click Swap.
- The UI will approve token if necessary, call `swapExactTokensForTokens` on your router, and show the tx hash and status.

If you want, I can now wire example token addresses and adjust the UI to auto-detect token decimals and display human-friendly amounts.
