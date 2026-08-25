import assert from 'node:assert/strict'
import { DIALOGUE_GROUPS, rollDialogue, totalWeight } from '../src/shared/dialogue.js'

const TOTAL = totalWeight(DIALOGUE_GROUPS)
assert.equal(TOTAL, 63, 'total weight = 63 (G1 45 + G2/G3 7+7 + G5 3 + G6 1)')

{
  const page = rollDialogue(() => 0)
  assert.equal(page, null, 'rand=0 lands G1 status group -> no dialogue page appended')
}

{
  const page = rollDialogue(() => 0.9999999)
  assert.ok(page && page.kind === 'dialogue', 'near-1 lands last group')
  assert.equal(page.main, '哦鲸鲸... ')
  assert.equal(page.mainStyle, 'B')
}

{
  const page = rollDialogue(() => 53 / 63 + 0.001)
  assert.equal(page.kind, 'dialogue')
  assert.equal(page.mainStyle, 'A')
  assert.equal(page.wrap, true)
  const pool = DIALOGUE_GROUPS.find((g) => g.id === 'G3').pool
  assert.ok(pool.includes(page.main), 'text from G3 pool')
}

for (const g of DIALOGUE_GROUPS) {
  if (g.kind === 'lines') {
    for (const t of g.pool) assert.ok(typeof t === 'string' && t.length > 0, 'pool text nonempty')
  }
}

let nullCount = 0
const N = 20000
for (let i = 0; i < N; i++) if (rollDialogue() === null) nullCount++
const ratio = nullCount / N
assert.ok(Math.abs(ratio - 45 / 63) < 0.03, `G1 ratio ~45/63, got ${ratio.toFixed(3)}`)

console.log('dialogue self-test: all passed')
