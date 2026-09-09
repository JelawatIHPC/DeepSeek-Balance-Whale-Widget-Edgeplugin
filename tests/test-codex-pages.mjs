import assert from 'node:assert/strict'
import { buildCodexPages, buildPageSet } from '../src/shared/pages.js'

{
  const res = {
    cliFound: true,
    source: 'rpc',
    plan: { planType: 'plus' },
    limits: {
      primary: { usedPercent: 32.5, resetsAt: 1785100000, windowMinutes: 300 },
      secondary: { usedPercent: 12.1, resetsAt: 1785700000, windowMinutes: 10080 },
    },
    credits: { balance: '10.00' },
    tokens: { input: 100, cached: 50, output: 80, total: 250 },
    activeModel: 'gpt-5.2-codex',
  }
  const pages = buildCodexPages(res)
  assert.equal(pages.length, 3, 'three pages when all data present')
  assert.equal(pages[0].label, 'Codex 5h')
  assert.equal(pages[0].main, '67.5%')
  assert.ok(pages[0].sub.includes('重置'), 'primary reset sub')
  assert.equal(pages[1].label, 'Codex 周')
  assert.equal(pages[1].main, '87.9%')
  assert.equal(pages[2].label, 'Tokens')
  assert.equal(pages[2].main, '250')
  assert.equal(pages[2].sub, 'credits $10.00')
}

{
  const pages = buildCodexPages({ cliFound: true, source: 'files', limits: null, tokens: null, activeModel: 'x' })
  assert.equal(pages.length, 0, 'no pages when no data')
}

{
  const pages = buildCodexPages({
    cliFound: true,
    limits: { primary: { usedPercent: 50, resetsAt: Math.floor((Date.now() + 30 * 60 * 1000) / 1000), windowMinutes: 300 } },
    credits: { balance: '0.00' },
  })
  assert.equal(pages.length, 1, 'zero credits hidden')
  assert.equal(pages[0].main, '50%')
  assert.match(pages[0].sub, /^\d{2}:\d{2} 重置$/, 'near reset -> clock sub')
}

{
  const pages = buildCodexPages({
    cliFound: true,
    limits: {
      primary: { usedPercent: -10, resetsAt: null, windowMinutes: 300 },
      secondary: { usedPercent: 120, resetsAt: null, windowMinutes: 10080 },
    },
  })
  assert.equal(pages[0].main, '100%', 'remaining percent clamps high')
  assert.equal(pages[1].main, '0%', 'remaining percent clamps low')
}

{
  const payload = {
    ok: true,
    requestedMode: 'codex',
    usageMode: 'codex',
    pages: [{ main: '32.5%', label: 'Codex 5h' }],
  }
  const ps = buildPageSet(payload, { peakMode: 'default' })
  assert.equal(ps.pages.length, 1, 'codex mode passes through without balance page')
  assert.equal(ps.pages[0].label, 'Codex 5h')
}

console.log('codex pages self-test: all passed')
