import { MSG } from '../shared/protocol.js'
import { isPeakTime, computeTodayUsage } from '../shared/pricing.js'
import { PROVIDER_META } from '../shared/providers.js'
import { todayKey, newLedger, applyLedgerObservation } from '../shared/ledger.js'
import { buildPageSet, buildBubblePageSet } from '../shared/pages.js'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const BALANCE_TTL_MS = 25000
const CACHE_TTL_MS = 30000
const CONFIG_KEY = 'config'
const CREDENTIALS_KEY = 'credentials'
const USAGE_KEY = 'usageLedger'
const CACHE_KEY = 'payloadCache'

let balanceCache = null
let balanceInFlight = null

const DEFAULT_CONFIG = {
  scale: 1,
  sound: true,
  vol: 0.9,
  soundSet: 'duck',
  usageMode: 'deepseek',
  ledgerMode: 'ledger',
  skin: 'deepseek',
  peakMode: 'default',
  bubbleOn: true,
  scrollGapOn: false,
  scrollGapPx: 17,
  hiddenSites: ['http://127.0.0.1:3080', 'http://localhost:3080'],
  paused: false,
}

function mapUsageMode(v) {
  return v === 'opencode' ? 'opencode' : 'deepseek'
}

function normalizeConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    scale: typeof r.scale === 'number' && r.scale > 0 ? r.scale : DEFAULT_CONFIG.scale,
    sound: r.sound !== false,
    vol: typeof r.vol === 'number' ? r.vol : 0.9,
    soundSet: r.soundSet === 'fx1' ? 'fx1' : 'duck',
    usageMode: typeof r.usageMode === 'string' && r.usageMode ? mapUsageMode(r.usageMode) : DEFAULT_CONFIG.usageMode,
    ledgerMode: r.ledgerMode === 'dsToken' ? 'dsToken' : 'ledger',
    skin: r.skin === 'ybb' ? 'ybb' : 'deepseek',
    peakMode: r.peakMode === 'liangwen' || r.peakMode === 'qiangqiang' ? r.peakMode : 'default',
    bubbleOn: r.bubbleOn !== false,
    scrollGapOn: r.scrollGapOn === true,
    scrollGapPx: typeof r.scrollGapPx === 'number' && r.scrollGapPx >= 0 ? Math.round(r.scrollGapPx) : DEFAULT_CONFIG.scrollGapPx,
    hiddenSites: Array.isArray(r.hiddenSites) ? r.hiddenSites.filter((s) => typeof s === 'string') : DEFAULT_CONFIG.hiddenSites.slice(),
    paused: r.paused === true,
  }
}

async function getConfig() {
  const bag = await chrome.storage.local.get(CONFIG_KEY)
  return normalizeConfig(bag[CONFIG_KEY])
}

async function setConfigPatch(patch) {
  const current = await getConfig()
  const prev = current.usageMode + ':' + current.ledgerMode
  const merged = normalizeConfig({ ...current, ...(patch && typeof patch === 'object' ? patch : {}) })
  await chrome.storage.local.set({ [CONFIG_KEY]: merged })
  if (merged.usageMode + ':' + merged.ledgerMode !== prev) {
    balanceCache = null
    chrome.storage.local.remove(CACHE_KEY).catch(() => {})
  }
  return merged
}

async function readCredentials() {
  const bag = await chrome.storage.local.get(CREDENTIALS_KEY)
  const c = bag[CREDENTIALS_KEY]
  return c && typeof c === 'object' ? c : {}
}

function pickBalanceInfo(infos) {
  if (!Array.isArray(infos) || infos.length === 0) return null
  const num = (x) => (x && x.total_balance !== undefined ? Number(x.total_balance) : NaN)
  return (
    infos.find((x) => x && x.currency === 'CNY' && num(x) > 0) ||
    infos.find((x) => num(x) > 0) ||
    infos.find((x) => x && x.currency === 'CNY') ||
    infos[0]
  )
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchBalance(apiKey) {
  let lastErr = null
  for (let attempt = 0; attempt < 2; attempt++) {
    let res
    try {
      res = await fetch(BALANCE_URL, {
        headers: { Authorization: 'Bearer ' + apiKey },
        signal: AbortSignal.timeout(20000),
      })
    } catch (err) {
      lastErr = err
      if (attempt === 0) await sleep(500)
      continue
    }
    if (!res.ok) {
      lastErr = new Error('HTTP ' + res.status)
      if (res.status < 500) break
      if (attempt === 0) await sleep(500)
      continue
    }
    let data
    try {
      data = await res.json()
    } catch (err) {
      return { ok: false, code: 'PARSE', error: '余额接口返回不是合法 JSON' }
    }
    const info = pickBalanceInfo(data && data.balance_infos)
    if (!info || info.total_balance === undefined) {
      return { ok: false, code: 'SHAPE', error: '余额接口返回结构异常' }
    }
    return {
      ok: true,
      totalBalance: Number(info.total_balance),
      currency: String(info.currency || 'CNY'),
      updatedAt: new Date().toISOString(),
    }
  }
  const transient = !(lastErr && /^HTTP 4\d\d/.test(lastErr.message))
  return {
    ok: false,
    code: 'HTTP',
    transient: transient,
    error: '余额接口请求失败: ' + String((lastErr && lastErr.message) || lastErr).slice(0, 200),
  }
}

async function getLedger() {
  const bag = await chrome.storage.local.get(USAGE_KEY)
  const l = bag[USAGE_KEY]
  return l && typeof l === 'object' && typeof l.date === 'string' ? l : newLedger()
}

async function writeLedger(led) {
  await chrome.storage.local.set({ [USAGE_KEY]: led })
}

async function recordLedgerUsage(currentBalance, currency) {
  const led = await getLedger()
  const next = applyLedgerObservation(led, currentBalance, currency, todayKey)
  await writeLedger(next)
  return next
}

async function fetchUsage(platformToken) {
  const token = String(platformToken || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  try {
    const now = new Date()
    const tz = -now.getTimezoneOffset() * 60
    const start = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
    const end = start + 86400
    const url = 'https://platform.deepseek.com/api/v0/usage/by_api_key/amount?start=' + start + '&end=' + end + '&tz=' + tz
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const u = computeTodayUsage(data)
    if (u && isFinite(u.amount)) return { amount: u.amount, tokens: u.tokens }
    return null
  } catch (err) {
    return null
  }
}

function cny(amount) {
  return '¥ ' + (isFinite(Number(amount)) ? Number(amount).toFixed(2) : '--')
}

function usd(amount) {
  return '$ ' + (isFinite(Number(amount)) ? Number(amount).toFixed(4) : '--')
}

function fmtTokens(n) {
  const x = Number(n) || 0
  if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B'
  if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M'
  if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K'
  return String(Math.round(x))
}

function prettyModel(name) {
  const s = String(name || 'unknown').replace(/[-_]/g, ' ')
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

let opencodeInFlight = null

function connectOpencode() {
  return new Promise((resolve, reject) => {
    let settled = false
    let port = null
    try {
      port = chrome.runtime.connectNative('com.dsh_whale.opencode')
    } catch (err) {
      reject(err)
      return
    }
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try { port.disconnect() } catch (err) {}
        reject(new Error('opencode host timeout'))
      }
    }, 10000)
    port.onMessage.addListener((msg) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { port.disconnect() } catch (err) {}
      resolve(msg)
    })
    port.onDisconnect.addListener(() => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'opencode host disconnected'))
    })
    try {
      port.postMessage({ cmd: 'usage' })
    } catch (err) {
      clearTimeout(timer)
      if (!settled) {
        settled = true
        reject(err)
      }
    }
  })
}

function queryOpencode() {
  if (opencodeInFlight) return opencodeInFlight
  opencodeInFlight = connectOpencode().finally(() => {
    opencodeInFlight = null
  })
  return opencodeInFlight
}

async function runOpencode() {
  try {
    const res = await queryOpencode()
    if (!res || !res.dbFound) return { ok: false, error: 'Opencode 数据库不可用' }
    const today = res.today || {}
    const month = res.month || {}
    const todayTop = today.top && today.top.name ? today.top : null
    const todayTopCost = today.topCost && today.topCost.name ? today.topCost : null
    const monthTop = month.top && month.top.name ? month.top : null
    return {
      ok: true,
      provider: 'opencode',
      currency: 'USD',
      todayTokens: today.tokens,
      monthTokens: month.tokens,
      pages: [
        { main: fmtTokens(today.tokens), label: '今日已用', sub: todayTop ? prettyModel(todayTop.name) + ': ' + fmtTokens(todayTop.tokens) : '' },
        { main: usd(today.cost), label: '今日金额', sub: todayTopCost ? prettyModel(todayTopCost.name) + ': ' + usd(todayTopCost.cost) : '' },
        { main: fmtTokens(month.tokens), label: '本月已用', sub: monthTop ? prettyModel(monthTop.name) + ': ' + fmtTokens(monthTop.tokens) : '' },
      ],
    }
  } catch (err) {
    return { ok: false, error: 'Opencode 宿主不可用: ' + String((err && err.message) || err) }
  }
}

async function runDeepseek(ledgerMode) {
  if (ledgerMode === 'dsToken') {
    const creds = await readCredentials()
    if (creds.platformToken) {
      const u = await fetchUsage(creds.platformToken)
      if (u) {
        return { ok: true, provider: 'deepseek', amount: u.amount, currency: 'CNY', pages: [{ main: cny(u.amount), label: '今日已用' }] }
      }
    }
  }
  const led = await getLedger()
  const amount = typeof led.todayUsage === 'number' ? led.todayUsage : 0
  return { ok: true, provider: 'deepseek', amount: amount, currency: 'CNY', pages: [{ main: cny(amount), label: '今日已用' }] }
}

async function getUsageSnapshot() {
  const cfg = await getConfig()
  if (cfg.usageMode === 'opencode') return runOpencode()
  return runDeepseek(cfg.ledgerMode)
}

async function getBalancePayload() {
  const cfg = await getConfig()
  const creds = await readCredentials()
  let payload
  if (!creds.apiKey) {
    payload = { ok: false, code: 'NO_KEY', error: '未配置 DeepSeek API Key（在扩展设置页录入）' }
  } else {
    payload = await fetchBalance(String(creds.apiKey))
  }
  const snap = await getUsageSnapshot()
  payload.requestedMode = cfg.usageMode
  payload.usageMode = snap.ok ? snap.provider : cfg.usageMode
  payload.usageFellBack = false
  payload.todayUsage = snap.ok && snap.amount !== undefined ? snap.amount : null
  payload.pages = snap.pages || []
  payload.usageError = snap.ok ? '' : (snap.error || '')
  if (payload.ok) {
    await recordLedgerUsage(Number(payload.totalBalance), payload.currency)
    payload.isPeak = isPeakTime(Math.floor(Date.now() / 1000))
  }
  return payload
}

async function readPayloadCache() {
  try {
    const bag = await chrome.storage.local.get(CACHE_KEY)
    const c = bag[CACHE_KEY]
    if (c && c.at && Date.now() - c.at < CACHE_TTL_MS && c.payload) return c.payload
  } catch (err) {}
  return null
}

async function writePayloadCache(payload) {
  await chrome.storage.local.set({ [CACHE_KEY]: { at: Date.now(), payload } })
}

async function refreshPayloadInBackground() {
  try {
    const p = await getBalancePayload()
    if (p.ok || (p.pages && p.pages.length)) {
      await writePayloadCache(p)
      balanceCache = { at: Date.now(), payload: p }
    }
  } catch (err) {}
  broadcastPages()
}

const bubblePorts = new Set()

function safePostPages(port, ps) {
  try {
    port.postMessage({ type: 'pages', pageSet: ps })
  } catch (err) {}
}

function buildCurrentPageSet(roll) {
  return Promise.all([getBalance(), getConfig()]).then(([payload, cfg]) =>
    roll ? buildBubblePageSet(payload, cfg) : buildPageSet(payload, cfg)
  )
}

function broadcastPages() {
  if (!bubblePorts.size) return
  buildCurrentPageSet(false)
    .then((ps) => {
      for (const port of Array.from(bubblePorts)) safePostPages(port, ps)
    })
    .catch(() => {})
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'dshw-bubble') return
  bubblePorts.add(port)
  port.onDisconnect.addListener(() => {
    bubblePorts.delete(port)
  })
  buildCurrentPageSet(true)
    .then((ps) => safePostPages(port, ps))
    .catch(() => {})
})

async function fetchAndCache() {
  if (balanceInFlight) return balanceInFlight
  balanceInFlight = getBalancePayload()
    .then(async (payload) => {
      if (!payload.ok && payload.transient && balanceCache) {
        return { ...balanceCache.payload, stale: true, error: payload.error }
      }
      if (payload.ok || (payload.pages && payload.pages.length)) {
        balanceCache = { at: Date.now(), payload }
        await writePayloadCache(payload).catch(() => {})
        broadcastPages()
      }
      if (!payload.ok && !payload.transient) console.error('[dsh-whale]', payload.code, payload.error)
      return payload
    })
    .catch((err) => ({
      ok: false,
      code: 'ERROR',
      error: '余额服务异常: ' + String((err && err.message) || err).slice(0, 200),
    }))
    .finally(() => {
      balanceInFlight = null
    })
  return balanceInFlight
}

function getBalance() {
  const now = Date.now()
  if (balanceCache && now - balanceCache.at < BALANCE_TTL_MS) {
    return Promise.resolve(balanceCache.payload)
  }
  return (async () => {
    const stored = await readPayloadCache()
    if (stored) {
      refreshPayloadInBackground()
      return stored
    }
    return fetchAndCache()
  })()
}

async function handleMessage(msg) {
  switch (msg.type) {
    case 'ping':
      return { pong: true }
    case MSG.GET_BALANCE:
      return getBalance()
    case MSG.GET_CONFIG:
      return getConfig()
    case MSG.SET_CONFIG:
      return setConfigPatch(msg.patch)
    case MSG.GET_PROVIDERS:
      return PROVIDER_META
    case MSG.GET_USAGE_SNAPSHOT:
      return getUsageSnapshot()
    case MSG.GET_BUBBLE_PAGES:
      return buildCurrentPageSet(true)
    case MSG.REFRESH_PAGES:
      return fetchAndCache().then(() => ({ ok: true }))
    default:
      return null
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false
  if (msg.type === 'ping') {
    sendResponse({ pong: true })
    return false
  }
  handleMessage(msg).then((r) => sendResponse(r === null ? {} : r))
  return true
})
