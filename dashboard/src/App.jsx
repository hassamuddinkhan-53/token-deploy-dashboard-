import React from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import DeployToken from './pages/DeployToken'
import ManageTokens from './pages/ManageTokens'
import Swap from './pages/Swap'
import AddLiquidity from './pages/AddLiquidity'
import LiquidityManager from './pages/LiquidityManager'
import Account from './pages/Account'
import Transactions from './pages/Transactions'

export default function App() {
  const [route, setRoute] = React.useState('dashboard')

  function renderRoute() {
    switch (route) {
      case 'deploy':
        return <DeployToken />
      case 'manage':
        return <ManageTokens />
      case 'account':
        return <Account />
      case 'transactions':
        return <Transactions />
      case 'swap':
        return <Swap />
      case 'liquidity':
        return <AddLiquidity />
      case 'liquidity-manager':
        return <LiquidityManager />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen text-slate-50 font-sans selection:bg-primary-500/30">
      <Navbar onNavigate={setRoute} currentRoute={route} />
      <main className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
        {renderRoute()}
      </main>
    </div>
  )
}
