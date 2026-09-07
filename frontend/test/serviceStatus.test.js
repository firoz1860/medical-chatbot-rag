import assert from 'node:assert/strict'
import test from 'node:test'

import { getServiceStatus } from '../src/lib/serviceStatus.js'

test('maps health checks to a visible service state', () => {
  assert.equal(getServiceStatus({ isChecking: true, error: null }), 'checking')
  assert.equal(getServiceStatus({ isChecking: false, error: new Error('offline') }), 'offline')
  assert.equal(getServiceStatus({ isChecking: false, error: null }), 'online')
})
