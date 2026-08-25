import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

let timerId = 0
const timers = new Map() // id -> { fn, ms }
const elementHandlers = new Map() // element -> { evt: [...] }

function elementStub() {
  const el = {
    className: '',
    textContent: '',
    innerHTML: '',
    src: '',
    value: '',
    checked: false,
    disabled: false,
    title: '',
    alt: '',
    type: '',
    style: {},
    children: [],
    parent: null,
    _handlers: {},
    appendChild(c) { this.children.push(c); c.parent = this; return c },
    addEventListener(evt, cb) { this._handlers[evt] = this._handlers[evt] || []; this._handlers[evt].push(cb) },
    removeEventListener() {},
    setAttribute() {},
    getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 } },
    closest() { return null },
    getContext() { return { drawImage() {}, getImageData() { return { data: [0, 0, 0, 255] } } } },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
    querySelector() { return null },
  }
  elementHandlers.set(el, el._handlers)
  return el
}

const fireTimer = () => {
  if (!timers.size) throw new Error('no pending timers')
  const id = timers.keys().next().value
  const { fn, ms } = timers.get(id)
  timers.delete(id)
  fn()
  return ms
}

const sandbox = {
  console,
  setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id },
  clearTimeout(id) { timers.delete(id) },
  requestAnimationFrame(cb) { return 0 },
  cancelAnimationFrame() {},
  Math, Date, JSON, Number, String, Array, Object, RegExp, Promise,
  location: { origin: 'https://example.com' },
}
sandbox.window = sandbox
sandbox.self = sandbox
sandbox.globalThis = sandbox
sandbox.addEventListener = function () {}
sandbox.removeEventListener = function () {}
sandbox.document = {
  createElement() { return elementStub() },
  createTextNode() { return {} },
  head: elementStub(),
  body: elementStub(),
  addEventListener() {},
  elementFromPoint() { return null },
}

function makePort() {
  return { name: 'dshw-bubble', postMessage() {}, onMessage: { addListener() {} }, onDisconnect: { addListener() {} }, disconnect() {} }
}
sandbox.chrome = {
  runtime: {
    getManifest() { return { version: '0.1.0' } },
    getURL: (p) => 'chrome-extension://x/' + p,
    sendMessage() {},
    connect() { return makePort() },
    lastError: null,
  },
  storage: { local: { get() { return Promise.resolve({}) }, set() { return Promise.resolve() }, remove() { return Promise.resolve() } }, onChanged: { addListener() {} } },
}

const files = ['core.js', 'data.js', 'bubble.js', 'interact.js', 'whale.js']
vm.createContext(sandbox)
for (const f of files) {
  const src = fs.readFileSync(path.join(root, 'src', 'content', f), 'utf8')
  try {
    vm.runInContext(src, sandbox, { filename: f })
  } catch (err) {
    console.error(`LOAD ERROR in ${f}:`, err.message)
    process.exit(1)
  }
}
if (!sandbox.__DSHW.bubble || !sandbox.__DSHW.interact || !sandbox.__DSHW.data) {
  console.error('FAIL: namespace incomplete')
  process.exit(1)
}

const bubble = sandbox.__DSHW.bubble
// root.dshwv-root > .dshwv-body(children[0]) > [img, bubbleBox]
const box = sandbox.document.body.children[0].children[0].children[1]
assert.ok(box, 'bubble box element exists')
const PAGE_SET = { requestedMode: 'opencode', pages: [{ main: 'A' }, { main: 'B' }, { main: 'C' }] }

async function flushInit() {
  await new Promise((r) => setTimeout(r, 0)) // let init() promise chain settle
  timers.clear()
}

await flushInit()

bubble.open() // empty placeholder
assert.ok(bubble.isActive(), 'open activates bubble')

bubble.setPages(PAGE_SET)
assert.equal(bubble.pageCount(), 3)
fireTimer() // first rotate tick (pageIdx 0 -> 1)
fireTimer() // 1 -> 2
assert.equal(bubble.pageCount(), 3)
fireTimer() // 2 -> close (-1)
assert.equal(bubble.isActive(), false, 'rotation closes at end of pages')

// click on last page closes
bubble.open()
bubble.setPages(PAGE_SET)
const click = box._handlers.click[0]
click({ stopPropagation() {} }) // advance 0 -> 1
click({ stopPropagation() {} }) // 1 -> 2
assert.equal(bubble.isActive(), true, 'advance within pages keeps open')
click({ stopPropagation() {} }) // 2 -> close
assert.equal(bubble.isActive(), false, 'click on last page closes')
timers.clear()

// dialogue page must survive setPages (regression: was filtered out)
bubble.open()
bubble.setPages({ requestedMode: 'opencode', pages: [{ main: 'A' }, { main: 'B' }, { main: 'joke', kind: 'dialogue' }] })
assert.equal(bubble.pageCount(), 3, 'dialogue page preserved through setPages')
fireTimer() // 0 -> 1
fireTimer() // 1 -> 2 (dialogue)
fireTimer() // 2 -> close
assert.equal(bubble.isActive(), false, 'closes after dialogue page')
timers.clear()

// G1 regression: explicit request (replace=true) WITHOUT dialogue must CLEAR previous dialogue
bubble.open()
bubble.setPages({ requestedMode: 'opencode', pages: [{ main: 'A' }, { main: 'B' }, { main: 'joke', kind: 'dialogue' }] }, true)
assert.equal(bubble.pageCount(), 3, 'dialogue present on first explicit push')
bubble.setPages({ requestedMode: 'opencode', pages: [{ main: 'A' }, { main: 'B' }] }, true) // G1: no dialogue
assert.equal(bubble.pageCount(), 2, 'G1 explicit push clears dialogue page')
timers.clear()

// background push (replace=false) preserves dialogue
bubble.open()
bubble.setPages({ requestedMode: 'opencode', pages: [{ main: 'A' }, { main: 'B' }, { main: 'joke', kind: 'dialogue' }] }, true)
assert.equal(bubble.pageCount(), 3)
bubble.setPages({ requestedMode: 'opencode', pages: [{ main: 'A2' }, { main: 'B2' }] }, false) // background, no dialogue
assert.equal(bubble.pageCount(), 3, 'background push preserves dialogue')
timers.clear()

console.log('content load-order + runtime smoke: all passed')