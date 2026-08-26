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
  const name = mode === 'opencode' ? 'Opencode' : '数据源'
  return { label: name, main: '不可用', sub: String(error || '请检查配置').slice(0, 40), kind: 'error' }
}

export function buildPageSet(payload, cfg) {
  const pages = []
  const mode = payload.requestedMode
  if (mode === 'opencode') {
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
