export function peakText(isPeak, mode) {
  if (mode === 'liangwen') return isPeak ? '梁文峰' : '梁文谷'
  if (mode === 'qiangqiang') return isPeak ? '!?峰峰?!' : '!?谷谷?!'
  return isPeak ? '高峰时段' : '空闲时段'
}

export function fmtMoney(amount, currency) {
  const num = Number(amount)
  const fixed = isFinite(num) ? num.toFixed(2) : '--'
  return currency === 'CNY' ? '¥ ' + fixed : fixed + ' ' + currency
}

export function buildUnavailablePage(mode, error) {
  const meta = { opencode: 'Opencode', codex: 'Codex' }
  const name = meta[mode] || '数据源'
  return { label: name, main: '不可用', sub: String(error || '请检查配置').slice(0, 40), kind: 'error' }
}

export function buildPageSet(payload, cfg) {
  const pages = []
  const mode = payload.requestedMode
  if (mode === 'opencode' || mode === 'codex') {
    if (payload.pages && payload.pages.length) {
      for (const p of payload.pages) pages.push(p)
    } else if (payload.usageError) {
      pages.push(buildUnavailablePage(mode, payload.usageError))
    }
  } else {
    if (payload.ok) {
      pages.push({
        label: 'DeepSeek 余额',
        main: fmtMoney(payload.totalBalance, payload.currency),
        sub: peakText(!!payload.isPeak, cfg && cfg.peakMode),
        kind: 'balance',
      })
    }
    if (payload.pages && payload.pages.length) {
      for (const p of payload.pages) pages.push(p)
    } else if (payload.usageError) {
      pages.push(buildUnavailablePage(mode, payload.usageError))
    }
  }
  return {
    requestedMode: mode,
    usageMode: payload.usageMode,
    fellBack: !!payload.usageFellBack,
    sourceError: payload.usageError || '',
    stale: !!payload.stale,
    loading: false,
    pages,
  }
}

import { rollDialogue } from './dialogue.js'

export function buildBubblePageSet(payload, cfg, random) {
  const ps = buildPageSet(payload, cfg)
  const hasError = ps.pages.some((p) => p && p.kind === 'error')
  if (!hasError) {
    const dialogue = rollDialogue(random)
    if (dialogue) ps.pages.push(dialogue)
  }
  return ps
}

function fmtPct(n) {
  const v = Number(n)
  if (!isFinite(v)) return '--'
  return (Math.round(v * 10) / 10).toString() + '%'
}

function fmtReset(resetsAt, windowMinutes) {
  if (resetsAt == null) return ''
  const d = new Date(Number(resetsAt) * 1000)
  const now = new Date()
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return hh + ':' + mm + ' 重置'
  }
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 重置'
}

function fmtTokensCodex(n) {
  const x = Number(n) || 0
  if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B'
  if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M'
  if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K'
  return String(Math.round(x))
}

export function buildCodexPages(res) {
  const pages = []
  const limits = (res && res.limits) || {}
  const primary = limits.primary
  const secondary = limits.secondary
  if (primary && primary.usedPercent != null) {
    pages.push({
      label: 'Codex 5h',
      main: fmtPct(primary.usedPercent),
      sub: fmtReset(primary.resetsAt, primary.windowMinutes),
      kind: 'usage',
    })
  }
  if (secondary && secondary.usedPercent != null) {
    pages.push({
      label: 'Codex 周',
      main: fmtPct(secondary.usedPercent),
      sub: fmtReset(secondary.resetsAt, secondary.windowMinutes),
      kind: 'usage',
    })
  }
  const credits = res && res.credits && res.credits.balance
  const tokens = res && res.tokens && res.tokens.total
  if (credits || tokens) {
    pages.push({
      label: 'Credits',
      main: tokens ? fmtTokensCodex(tokens) : '$' + credits,
      sub: credits && tokens ? 'credits $' + credits : undefined,
      kind: 'usage',
    })
  }
  return pages
}
