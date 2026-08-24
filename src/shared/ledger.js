export function todayKey(now) {
  const d = now ? new Date(now) : new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export function newLedger() {
  return { date: todayKey(), lastBalance: null, lastCurrency: '', todayUsage: 0, history: {} }
}

export function applyLedgerObservation(led, currentBalance, currency, keyFn) {
  const t = keyFn()
  const cur = String(currency || '')
  const currencyChanged =
    typeof led.lastCurrency === 'string' && led.lastCurrency !== '' &&
    cur !== '' && led.lastCurrency !== cur
  if (led.date !== t) {
    const history = { ...(led.history || {}) }
    if (led.date && typeof led.todayUsage === 'number') history[led.date] = led.todayUsage
    const keys = Object.keys(history).sort()
    while (keys.length > 30) delete history[keys.shift()]
    return { date: t, lastBalance: currentBalance, lastCurrency: cur, todayUsage: 0, history }
  }
  if (currencyChanged) {
    return { ...led, lastBalance: currentBalance, lastCurrency: cur }
  }
  const prev = typeof led.lastBalance === 'number' ? led.lastBalance : currentBalance
  let todayUsage = typeof led.todayUsage === 'number' ? led.todayUsage : 0
  if (typeof prev === 'number' && typeof currentBalance === 'number' && currentBalance < prev) {
    todayUsage += prev - currentBalance
  }
  return { ...led, lastBalance: currentBalance, lastCurrency: cur, todayUsage }
}
