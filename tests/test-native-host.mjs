import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const host = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'native-host', 'run.cmd')
const child = spawn('cmd', ['/d', '/c', host], { stdio: ['pipe', 'pipe', 'pipe'] })
let stderr = ''
child.stderr.on('data', (d) => { stderr += d.toString() })

function frame(json) {
  const b = Buffer.from(JSON.stringify(json))
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}

const timeout = setTimeout(() => {
  console.error('timeout waiting for host reply')
  console.error('host stderr:', stderr.slice(0, 2000))
  child.kill()
  process.exit(1)
}, 30000)

let buf = Buffer.alloc(0)
child.stdout.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk])
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0)
    if (buf.length < 4 + len) break
    const msg = JSON.parse(buf.slice(4, 4 + len).toString('utf8'))
    clearTimeout(timeout)
    child.kill()
    console.log('host reply:', JSON.stringify(msg, null, 2))
    if (typeof msg.cliFound !== 'boolean') {
      console.error('FAIL: missing cliFound boolean')
      process.exit(1)
    }
    if (typeof msg.source !== 'string') {
      console.error('FAIL: missing source string')
      process.exit(1)
    }
    if (!('limits' in msg) || !('tokens' in msg) || !('activeModel' in msg)) {
      console.error('FAIL: missing Codex snapshot fields')
      process.exit(1)
    }
    console.log('native host codex self-test: PASS')
    process.exit(0)
  }
})

child.stdin.write(frame({ cmd: 'codex' }))
