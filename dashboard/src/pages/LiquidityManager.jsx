import React from 'react'
import { useLiquidityStatus } from '../hooks/useLiquidityStatus'
import { RefreshCw, Droplet, AlertCircle, CheckCircle, Zap, Activity, Clock } from 'lucide-react'

export default function LiquidityManager() {
    const { status, loading, error, refresh } = useLiquidityStatus()

    const formatTime = (isoString) => {
        if (!isoString) return 'Never'
        const date = new Date(isoString)
        return date.toLocaleTimeString()
    }

    const formatDate = (isoString) => {
        if (!isoString) return 'Never'
        const date = new Date(isoString)
        const now = new Date()
        const diffMs = now - date
        const diffSecs = Math.floor(diffMs / 1000)

        if (diffSecs < 60) return `${diffSecs}s ago`
        if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
        return date.toLocaleTimeString()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Auto Liquidity Manager</h1>
                    <p className="text-slate-400">Backend service monitoring and managing liquidity pools</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="glass-button px-4 py-2 rounded-xl flex items-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Service Status Banner */}
            <div className="glass-panel rounded-xl p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <Zap size={20} className="text-green-400 animate-pulse" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm">Backend Service Active</p>
                            <p className="text-xs text-slate-400">
                                Auto-managing liquidity • Last update: {formatDate(status.lastUpdate)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} />
                        <span>Checks every 30s</span>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/20 flex items-start gap-3">
                    <AlertCircle size={20} className="text-yellow-400" />
                    <div className="flex-1">
                        <p className="font-bold text-sm text-yellow-400">Service Not Running</p>
                        <p className="text-xs text-yellow-400/70 mt-1">
                            Start the backend service: <code className="bg-slate-800 px-2 py-0.5 rounded">node scripts/autoLiquidityService.js</code>
                        </p>
                    </div>
                </div>
            )}

            {/* Last Action */}
            {status.lastAction && (
                <div
                    className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${status.lastAction.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                        }`}
                >
                    <Activity size={20} className={status.lastAction.type === 'success' ? 'text-green-400' : 'text-red-400'} />
                    <div className="flex-1">
                        <p className={`font-bold text-sm ${status.lastAction.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {status.lastAction.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-slate-500">{formatTime(status.lastAction.timestamp)}</p>
                            {status.lastAction.txHash && (
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${status.lastAction.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                    View on Etherscan
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pools Table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left p-4 text-slate-400 font-medium text-sm">Pair</th>
                                <th className="text-left p-4 text-slate-400 font-medium text-sm">Token A Address</th>
                                <th className="text-left p-4 text-slate-400 font-medium text-sm">Token B Address</th>
                                <th className="text-right p-4 text-slate-400 font-medium text-sm">Reserve A</th>
                                <th className="text-right p-4 text-slate-400 font-medium text-sm">Reserve B</th>
                                <th className="text-right p-4 text-slate-400 font-medium text-sm">Min Required</th>
                                <th className="text-center p-4 text-slate-400 font-medium text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !status.pools.length ? (
                                <tr>
                                    <td colSpan="7" className="text-center p-8">
                                        <RefreshCw size={24} className="animate-spin mx-auto text-slate-600" />
                                        <p className="text-slate-500 mt-2 text-sm">Loading pools...</p>
                                    </td>
                                </tr>
                            ) : status.pools.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center p-8">
                                        <Droplet size={32} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-slate-500 text-sm">No liquidity pools found</p>
                                        <p className="text-slate-600 text-xs mt-1">Deploy at least 2 tokens to create pools</p>
                                    </td>
                                </tr>
                            ) : (
                                status.pools.map((pool, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-primary-500/10 rounded-lg">
                                                    <Droplet size={16} className="text-primary-400" />
                                                </div>
                                                <span className="font-bold text-white">
                                                    {pool.tokenA}/{pool.tokenB}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <code className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                                                {pool.tokenAAddress.slice(0, 6)}...{pool.tokenAAddress.slice(-4)}
                                            </code>
                                        </td>
                                        <td className="p-4">
                                            <code className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                                                {pool.tokenBAddress.slice(0, 6)}...{pool.tokenBAddress.slice(-4)}
                                            </code>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-mono ${pool.belowMinimum ? 'text-red-400' : 'text-white'}`}>
                                                {parseFloat(pool.reserve0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`font-mono ${pool.belowMinimum ? 'text-red-400' : 'text-white'}`}>
                                                {parseFloat(pool.reserve1).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-mono text-slate-400">10,000</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                {pool.belowMinimum ? (
                                                    <div className="flex items-center gap-1 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                                        <AlertCircle size={14} className="text-red-400" />
                                                        <span className="text-xs font-medium text-red-400">Low</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                                        <CheckCircle size={14} className="text-green-400" />
                                                        <span className="text-xs font-medium text-green-400">OK</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Droplet size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Total Pools</p>
                            <p className="text-2xl font-bold text-white">{status.totalPools}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertCircle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Below Minimum</p>
                            <p className="text-2xl font-bold text-white">{status.lowPools}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle size={20} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Healthy Pools</p>
                            <p className="text-2xl font-bold text-white">{status.healthyPools}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="glass-panel rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
                <div className="space-y-2 text-sm text-slate-400">
                    <p>✅ Backend service runs independently using admin wallet (no MetaMask)</p>
                    <p>✅ Automatically checks allowances and approves tokens</p>
                    <p>✅ Auto-mints tokens if pool reserves drop below 10,000</p>
                    <p>✅ Adds 15,000 liquidity to low pools every 30 seconds</p>
                    <p>✅ Dashboard updates automatically every 5 seconds</p>
                </div>
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Start the service:</p>
                    <code className="text-xs text-green-400">node scripts/autoLiquidityService.js</code>
                </div>
            </div>
        </div>
    )
}
