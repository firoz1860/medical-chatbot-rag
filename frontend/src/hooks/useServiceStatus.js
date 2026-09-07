import { useCallback, useEffect, useRef, useState } from 'react'
import { healthAPI } from '../services/api'
import { getServiceStatus } from '../lib/serviceStatus'

const HEALTH_INTERVAL_MS = 30_000

export function useServiceStatus() {
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState(null)
  const checkingRef = useRef(false)
  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    setIsChecking(true)
    try { await healthAPI.check(); setError(null) } catch (requestError) { setError(requestError) } finally { checkingRef.current = false; setIsChecking(false) }
  }, [])

  useEffect(() => {
    checkHealth()
    const intervalId = window.setInterval(checkHealth, HEALTH_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [checkHealth])

  return { status: getServiceStatus({ isChecking, error }), checkHealth }
}
