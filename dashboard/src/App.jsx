import React from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import DeployToken from './pages/DeployToken'
import ManageTokens from './pages/ManageTokens'
import Swap from './pages/Swap'
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
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar onNavigate={setRoute} />
      <main className="p-6">{renderRoute()}</main>
    </div>
  )
}
