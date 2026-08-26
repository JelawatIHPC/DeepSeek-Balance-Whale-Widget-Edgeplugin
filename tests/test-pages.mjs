import assert from 'node:assert/strict'
import { buildPageSet, peakText, fmtMoney } from '../src/shared/pages.js'
import { buildBubblePageSet } from '../src/shared/pages.js'

const CFG = { peakMode: 'default' }

{
  const payload = {
    ok: true,
    requestedMode: 'deepseek',
    usageMode: 'deepseek',
    totalBalance: 88.5,
    currency: 'CNY',
    isPeak: true,
    pages: [{ main: '¥ 1.20', label: '今日已用' }],
  }
  const ps = buildPageSet(payload, CFG)
  assert.equal(ps.pages.length, 2)
  assert.equal(ps.pages[0].label, 'DeepSeek 余额')
  assert.equal(ps.pages[0].main, '¥ 88.50')
  assert.equal(ps.pages[0].sub, '高峰时段')
  assert.equal(ps.pages[1].label, '今日已用')
}

{
  const payload = { ok: false, code: 'NO_KEY', requestedMode: 'deepseek', usageMode: 'deepseek', isPeak: false, pages: [{ main: '¥ 0.00', label: '今日已用' }] }
  const ps = buildPageSet(payload, CFG)
  assert.equal(ps.pages.length, 1, 'balance page omitted when unavailable')
  assert.equal(ps.pages[0].main, '¥ 0.00')
}

{
  const opencodePages = [
    { main: '49.1M tok', label: '今日已用', sub: 'DeepSeek V4 Flash: 34.1M' },
    { main: '$ 0.0743', label: '今日金额' },
    { main: '506.3M tok', label: '本月已用', sub: '$ 1.9084' },
  ]
  const ps = buildPageSet({ ok: true, requestedMode: 'opencode', usageMode: 'opencode', pages: opencodePages }, CFG)
  assert.equal(ps.pages.length, 3, 'opencode passthrough, no balance page')
  assert.equal(ps.pages[0].sub, 'DeepSeek V4 Flash: 34.1M')
}

{
  const ps = buildPageSet(
    { ok: true, requestedMode: 'deepseek', usageMode: 'deepseek', totalBalance: 1, currency: 'CNY', isPeak: false, pages: [] },
    { peakMode: 'liangwen' },
  )
  assert.equal(ps.pages[0].sub, '梁文谷')
  assert.equal(peakText(true, 'qiangqiang'), '!?峰峰?!')
  assert.equal(fmtMoney(1, 'USD'), '1.00 USD')
}

{
  const base = {
    ok: true,
    requestedMode: 'opencode',
    usageMode: 'opencode',
    pages: [{ main: '49.1M tok', label: '今日已用' }],
  }
  const rolled = buildBubblePageSet(base, CFG, () => 0.9999999)
  assert.equal(rolled.pages.length, 2, 'dialogue appended at end when drawn')
  assert.equal(rolled.pages[1].kind, 'dialogue')

  const none = buildBubblePageSet(base, CFG, () => 0)
  assert.equal(none.pages.length, 1, 'G1 draw appends nothing')
}

{
  const failed = {
    ok: false,
    code: 'NO_KEY',
    requestedMode: 'opencode',
    usageMode: 'opencode',
    pages: [],
    usageError: 'Opencode 宿主不可用: host not found',
  }
  const ps = buildPageSet(failed, CFG)
  assert.equal(ps.pages.length, 1, 'unavailable page produced when provider fails')
  assert.equal(ps.pages[0].kind, 'error')
  assert.equal(ps.pages[0].main, '不可用')
  assert.ok(ps.pages[0].sub.includes('host not found'), 'error detail in sub')

  const bubble = buildBubblePageSet(failed, CFG, () => 0.9999999)
  assert.equal(bubble.pages.length, 1, 'no dialogue appended when source unavailable')
}

{
  const failedDeepseek = {
    ok: false,
    code: 'NO_KEY',
    requestedMode: 'deepseek',
    usageMode: 'deepseek',
    pages: [],
    usageError: '记账账本不可读',
  }
  const ps = buildPageSet(failedDeepseek, CFG)
  assert.equal(ps.pages.length, 1)
  assert.equal(ps.pages[0].label, '数据源')
  assert.equal(ps.pages[0].main, '不可用')
}

{
  const failedCodex = {
    ok: false,
    code: 'NO_KEY',
    requestedMode: 'codex',
    usageMode: 'codex',
    pages: [],
    usageError: '未找到 Codex CLI',
  }
  const ps = buildPageSet(failedCodex, CFG)
  assert.equal(ps.pages.length, 1, 'codex unavailable page produced when provider fails')
  assert.equal(ps.pages[0].label, 'Codex')
  assert.equal(ps.pages[0].kind, 'error')

  const bubble = buildBubblePageSet(failedCodex, CFG, () => 0.9999999)
  assert.equal(bubble.pages.length, 1, 'no dialogue appended when codex unavailable')
}

console.log('pages self-test: all passed')
