# Automated Liquidity Management System

## Overview
Fully automated liquidity monitoring and management system for your ERC-20 token pools. The system continuously monitors all deployed token pairs and automatically mints + adds liquidity when reserves drop below the threshold.

## Features

### ✅ Automated Monitoring
- Monitors all liquidity pools for deployed tokens every 30 seconds
- Checks reserves against minimum threshold (10,000 tokens)
- Real-time status updates and notifications

### ✅ Auto-Management
- **Automatic minting**: If you're the token owner, system auto-mints required tokens
- **Automatic approval**: Handles all token approvals to the router
- **Automatic liquidity addition**: Adds 15,000 tokens to pools below 10,000
- **Zero manual intervention**: No confirmations or permissions required when enabled

### ✅ Dashboard Display
- Token pair symbols (e.g., TKA/TKB)
- Full token addresses with truncated display
- Current reserve amounts for both tokens
- Minimum required liquidity (10,000)
- Visual status indicators (OK/Low)
- Summary cards showing total pools, healthy pools, and pools below minimum

## How to Use

### 1. Access the Liquidity Manager
- Navigate to **"Auto Pool"** in the navbar
- Connect your wallet if not already connected

### 2. Enable Auto-Management
- Click the **"Auto OFF"** button to toggle to **"Auto ON"**
- System will immediately scan all pools
- Pools below minimum will be automatically topped up

### 3. Monitor Activity
- View real-time status in the banner at the top
- Check the pools table for detailed reserve information
- Use the **Refresh** button to manually update pool data

## Technical Details

### Configuration
```javascript
MIN_LIQUIDITY = 10,000      // Minimum reserve threshold
AUTO_ADD_AMOUNT = 15,000    // Amount added when below minimum
POLL_INTERVAL = 30,000ms    // Check interval (30 seconds)
```

### Smart Contract Integration
- **Factory**: `VITE_FACTORY_ADDRESS` - Creates and tracks pairs
- **Router**: `VITE_ROUTER_ADDRESS` - Handles liquidity operations
- **Pairs**: Automatically detected from factory

### Auto-Management Flow
1. **Scan**: Check all token pair combinations
2. **Detect**: Identify pairs with reserves < 10,000
3. **Mint**: Auto-mint tokens if wallet is owner
4. **Approve**: Approve router to spend tokens
5. **Add**: Execute addLiquidity transaction
6. **Repeat**: Continue monitoring every 30 seconds

### Requirements
- Connected wallet must be the **owner** of tokens to auto-mint
- Sufficient ETH for gas fees
- Tokens must have `mint()` and `owner()` functions
- Must be on Sepolia testnet

## Files Created

### Core Files
- `src/hooks/useLiquidityManager.js` - Auto-management logic
- `src/pages/LiquidityManager.jsx` - Dashboard UI
- `src/abis/factoryAbi.json` - Factory contract ABI
- `src/abis/pairAbi.json` - Pair contract ABI

### Integration
- Updated `src/App.jsx` - Added route
- Updated `src/components/Navbar.jsx` - Added nav item

## Safety Features
- Only mints if wallet is token owner
- Validates pair existence before operations
- Handles errors gracefully with user notifications
- Gas limit protection (500,000 gas max)
- Automatic retry on transient failures

## Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| ✅ OK | Green | Reserves ≥ 10,000 |
| ⚠️ Low | Red | Reserves < 10,000 |

## Notifications

### Success
- "Added 15,000 liquidity to TKA/TKB"
- Shows timestamp of action

### Error
- "Failed to add liquidity to TKA/TKB: [reason]"
- Check console for detailed error logs

### Info
- "Auto-management enabled"
- Confirms system activation

## Best Practices

1. **Deploy at least 2 tokens** before using the system
2. **Enable auto-management** to maintain healthy pools
3. **Monitor the dashboard** for system activity
4. **Ensure sufficient ETH** for gas fees
5. **Use owner wallet** for full automation

## Troubleshooting

### Pools not showing?
- Ensure you've deployed at least 2 tokens
- Check that tokens are saved in localStorage
- Refresh the page

### Auto-management not working?
- Verify you're the token owner
- Check wallet connection
- Ensure sufficient ETH balance
- Verify Sepolia network

### Transactions failing?
- Check gas fees
- Verify router/factory addresses in .env
- Ensure tokens have mint() function
- Check console for detailed errors

## Development

### Local Testing
```bash
cd dashboard
npm run dev
```

### Environment Variables
```env
VITE_ROUTER_ADDRESS=0x...
VITE_FACTORY_ADDRESS=0x...
```

## Production Ready
- ✅ Clean, minimal code
- ✅ No unnecessary dependencies
- ✅ Integrated with existing design
- ✅ Error handling and validation
- ✅ Real-time monitoring
- ✅ Zero manual intervention when enabled
