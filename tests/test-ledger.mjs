import assert from 'node:assert/strict'
import { todayKey, newLedger, applyLedgerObservation } from '../src/shared/ledger.js'

const T = '2026-08-24'

{
  const l = newLedger()
  const r1 = applyLedgerObservation(l, 100, 'CNY', () => T)
  assert.equal(r1.todayUsage, 0, 'first observation: baseline only')
  const r2 = applyLedgerObservation(r1, 85, 'CNY', () => T)
  assert.equal(r2.todayUsage, 15, 'decrement accumulates')
  const r3 = applyLedgerObservation(r2, 80, 'CNY', () => T)
  assert.equal(r3.todayUsage, 20, 'multiple decrements accumulate')
  const r4 = applyLedgerObservation(r3, 95, 'CNY', () => T)
  assert.equal(r4.todayUsage, 20, 'balance increase does not subtract')
}

{
  let l = applyLedgerObservation(newLedger(), 100, 'CNY', () => '2026-08-23')
  l = applyLedgerObservation(l, 60, 'CNY', () => '2026-08-23')
  assert.equal(l.todayUsage, 40)
  const r = applyLedgerObservation(l, 90, 'CNY', () => '2026-08-24')
  assert.equal(r.todayUsage, 0, 'cross-day resets to zero')
  assert.equal(r.history['2026-08-23'], 40, 'yesterday archived')
  assert.equal(r.lastBalance, 90)
}

{
  let l = applyLedgerObservation(newLedger(), 100, 'CNY', () => T)
  const r = applyLedgerObservation(l, 50, 'USD', () => T)
  assert.equal(r.todayUsage, 0, 'currency switch: no false accounting')
  assert.equal(r.lastCurrency, 'USD')
  assert.equal(r.lastBalance, 50)
}

{
  let l = newLedger()
  for (let i = 1; i <= 40; i++) {
    const day = '2026-07-' + String(i).padStart(2, '0')
    l = applyLedgerObservation(l, 100 - i, 'CNY', () => day)
  }
  assert.equal(Object.keys(l.history).length, 30, 'history pruned to 30 days')
  assert.equal(Object.keys(l.history).sort()[0], '2026-07-11', 'oldest day kept is the 30-day window start')
}

assert.equal(todayKey(new Date(2026, 7, 24, 12, 0, 0)), '2026-08-24', 'local-date key')

console.log('ledger self-test: all passed')
