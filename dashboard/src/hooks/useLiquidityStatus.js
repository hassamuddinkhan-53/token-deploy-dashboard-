// useLiquidityStatus.js – thin wrapper around useLiquidityManager to match the UI expectations
import { useLiquidityManager } from './useLiquidityManager'
import { useEffect, useState } from 'react'

export function useLiquidityStatus() {
    const {
        pools,
        loading,
        autoManaging,
        lastAction,
        toggleAutoManage,
        refreshPools,
        minLiquidity,
    } = useLiquidityManager()

    // Track the timestamp of the last successful refresh (used for UI display)
    const [lastUpdate, setLastUpdate] = useState(null)

    const refresh = async () => {
        await refreshPools()
        setLastUpdate(new Date().toISOString())
    }

    // Initial load – set lastUpdate once the hook finishes loading the first time
    useEffect(() => {
        if (!loading) {
            setLastUpdate(new Date().toISOString())
        }
    }, [loading])

    const status = {
        pools,
        lastUpdate,
        lastAction,
        totalPools: pools.length,
        lowPools: pools.filter(p => p.belowMinimum).length,
        healthyPools: pools.filter(p => !p.belowMinimum).length,
        autoManaging,
        toggleAutoManage,
        minLiquidity,
    }

    // No explicit error handling in the manager yet – expose a placeholder
    const error = null

    return { status, loading, error, refresh }
}
