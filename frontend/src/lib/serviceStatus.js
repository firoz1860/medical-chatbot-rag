export function getServiceStatus({ isChecking, error }) {
  if (isChecking) return 'checking'
  if (error) return 'offline'
  return 'online'
}

export const SERVICE_STATUS_COPY = {
  checking: 'Checking API',
  online: 'API online',
  offline: 'API unavailable',
}
