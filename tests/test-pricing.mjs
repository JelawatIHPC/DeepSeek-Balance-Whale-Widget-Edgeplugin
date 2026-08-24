import assert from 'node:assert/strict'
import { priceFor, isPeakTime, computeTodayUsage } from '../src/shared/pricing.js'

const bj = (y, mo, d, h) => Math.floor(Date.UTC(y, mo - 1, d, h - 8, 0, 0) / 1000)

assert.equal(isPeakTime(bj(2026, 8, 21, 10)), true, 'weekday 10:00 peak')
assert.equal(isPeakTime(bj(2026, 8, 21, 9)), true, 'peak start inclusive')
assert.equal(isPeakTime(bj(2026, 8, 21, 12)), false, '12:00 end exclusive')
assert.equal(isPeakTime(bj(2026, 8, 21, 11)), true, '11:59 within morning peak')
assert.equal(isPeakTime(bj(2026, 8, 21, 13)), false, 'lunch break valley')
assert.equal(isPeakTime(bj(2026, 8, 21, 14)), true, 'afternoon peak start')
assert.equal(isPeakTime(bj(2026, 8, 21, 18)), false, '18:00 end exclusive')
assert.equal(isPeakTime(bj(2026, 8, 21, 8)), false, 'early morning valley')

assert.equal(isPeakTime(bj(2026, 8, 22, 10)), true, 'sat 08-22 before effective instant: old rule peak')
assert.equal(isPeakTime(bj(2026, 8, 22, 23)), false, 'sat 08-22 late night: outside peak hours anyway')
assert.equal(isPeakTime(bj(2026, 8, 23, 0)), false, 'sun 08-23 00:00 effective instant: valley')
assert.equal(isPeakTime(bj(2026, 8, 23, 15)), false, 'sun 08-23 afternoon: all-day valley')
assert.equal(isPeakTime(bj(2026, 8, 15, 10)), true, 'saturday before effective date: old rule peak')
assert.equal(isPeakTime(bj(2026, 8, 16, 10)), true, 'sunday before effective date: old rule peak')
assert.equal(isPeakTime('NaN'), false)
assert.equal(isPeakTime(undefined), false)

assert.deepEqual(priceFor('deepseek-v4-pro'), { hit: [0.15, 0.3], miss: [4.5, 9.0], out: [13.5, 27.0] })
assert.deepEqual(priceFor('DeepSeek-V4-Pro-128k'), { hit: [0.15, 0.3], miss: [4.5, 9.0], out: [13.5, 27.0] })
assert.deepEqual(priceFor('deepseek-v4-flash'), { hit: [0.05, 0.1], miss: [1.5, 3.0], out: [4.5, 9.0] })
assert.deepEqual(priceFor('deepseek-v4-flash-vision-exp'), { hit: [0.05, 0.1], miss: [1.5, 3.0], out: [4.5, 9.0] })
assert.deepEqual(priceFor('unknown-model'), { hit: [0.05, 0.1], miss: [1.5, 3.0], out: [4.5, 9.0] })
assert.deepEqual(priceFor(''), { hit: [0.05, 0.1], miss: [1.5, 3.0], out: [4.5, 9.0] })

{
  const u = computeTodayUsage({
    data: {
      biz_data: {
        series: [
          {
            model: 'deepseek-v4-flash',
            buckets: [
              { time: bj(2026, 8, 15, 10), usage: { PROMPT_CACHE_HIT_TOKEN: 1000000, PROMPT_CACHE_MISS_TOKEN: 2000000, RESPONSE_TOKEN: 3000000 } },
              { time: bj(2026, 8, 21, 10), usage: { PROMPT_CACHE_HIT_TOKEN: 1000000, PROMPT_CACHE_MISS_TOKEN: 1000000, RESPONSE_TOKEN: 1000000 } },
              { time: bj(2026, 8, 21, 13), usage: { PROMPT_CACHE_HIT_TOKEN: 1000000, PROMPT_CACHE_MISS_TOKEN: 1000000, RESPONSE_TOKEN: 1000000 } },
              { time: bj(2026, 8, 21, 3), usage: { PROMPT_CACHE_HIT_TOKEN: 0, PROMPT_CACHE_MISS_TOKEN: 0, RESPONSE_TOKEN: 0 } },
            ],
          },
          {
            model: 'deepseek-v4-pro',
            buckets: [
              { time: bj(2026, 8, 21, 14), usage: { PROMPT_CACHE_HIT_TOKEN: 1000000, PROMPT_CACHE_MISS_TOKEN: 1000000, RESPONSE_TOKEN: 1000000 } },
            ],
          },
        ],
      },
    },
  })
  const satPreEffectivePeak = 0.1 + 2 * 3.0 + 3 * 9.0
  const friPeak = 0.1 + 3.0 + 9.0
  const friLunchValley = 0.05 + 1.5 + 4.5
  const proPeak = 0.3 + 9.0 + 27.0
  assert.ok(Math.abs(u.amount - (satPreEffectivePeak + friPeak + friLunchValley + proPeak)) < 1e-9, `usage amount ${u.amount}`)
  assert.equal(u.tokens, 15000000)
}

assert.equal(computeTodayUsage({ data: { series: [] } }), null)
assert.equal(
  computeTodayUsage({ data: { biz_data: { series: [{ model: 'x', buckets: [{ time: 0, usage: {} }] }] } } }),
  null,
)

console.log('pricing self-test: all passed')
