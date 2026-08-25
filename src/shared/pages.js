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

export function buildPageSet(payload, cfg) {
  const pages = []
  const mode = payload.requestedMode
  if (mode === 'opencode') {
    for (const p of payload.pages || []) pages.push(p)
  } else {
    if (payload.ok) {
      pages.push({
        label: 'DeepSeek 余额',
        main: fmtMoney(payload.totalBalance, payload.currency),
        sub: peakText(!!payload.isPeak, cfg && cfg.peakMode),
        kind: 'balance',
      })
    }
    for (const p of payload.pages || []) pages.push(p)
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
  const dialogue = rollDialogue(random)
  if (dialogue) ps.pages.push(dialogue)
  return ps
}
