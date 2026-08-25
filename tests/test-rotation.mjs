import assert from 'node:assert/strict'
import { nextIndex } from '../src/shared/rotation.js'

assert.equal(nextIndex(0, 3), 1, 'advance within pages')
assert.equal(nextIndex(1, 3), 2)
assert.equal(nextIndex(2, 3), -1, 'last page -> close signal (-1)')
assert.equal(nextIndex(5, 3), -1, 'out-of-range clamps to close')
assert.equal(nextIndex(0, 1), -1, 'single page -> no rotation')
assert.equal(nextIndex(0, 0), -1, 'empty -> no rotation')

console.log('rotation self-test: all passed')
