import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = await mkdtemp(path.join(tmpdir(), 'dsh-codex-'))
const codexHome = path.join(root, 'codex')
const sessions = path.join(codexHome, 'sessions', '2026', '09', '09')
const emptyAppData = path.join(root, 'appdata')
await mkdir(sessions, { recursive: true })
await mkdir(emptyAppData, { recursive: true })

const fixture = [
  JSON.stringify({ type: 'turn_context', timestamp: '2026-09-09T10:00:00Z', payload: { model: 'gpt-fixture' } }),
  JSON.stringify({
    type: 'token_count',
    timestamp: '2026-09-09T10:01:00Z',
    payload: {
      info: {
        total_token_usage: {
          total_tokens: 1234,
          input_tokens: 900,
          cached_input_tokens: 100,
          output_tokens: 234,
        },
      },
    },
  }),
  JSON.stringify({
    type: 'rate_limits',
    timestamp: '2026-09-09T10:02:00Z',
    payload: {
      rate_limits: {
        primary: { used_percent: 25, resets_at: 1788948000, window_minutes: 300 },
        secondary: { used_percent: 10, resets_at: 1789552800, window_minutes: 10080 },
      },
    },
  }),
].join('\n') + '\n'
await writeFile(path.join(sessions, 'rollout-fixture.jsonl'), fixture, 'utf8')

const host = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'native-host', 'run.cmd')
const systemRoot = process.env.SystemRoot || 'C:\\Windows'
const env = {
  ...process.env,
  CODEX_HOME: codexHome,
  CODEX_CLI: path.join(root, 'missing-codex.exe'),
  LOCALAPPDATA: emptyAppData,
  APPDATA: emptyAppData,
  PATH: [
    path.join(systemRoot, 'System32'),
    path.join(systemRoot, 'System32', 'Wbem'),
    path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
  ].join(';'),
}
const child = spawn('cmd', ['/d', '/c', host], { env, stdio: ['pipe', 'pipe', 'pipe'] })
let stderr = ''
child.stderr.on('data', (d) => { stderr += d.toString() })

function frame(json) {
  const b = Buffer.from(JSON.stringify(json))
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}

try {
  const msg = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout waiting for host reply: ' + stderr.slice(0, 2000))), 30000)
    let buf = Buffer.alloc(0)
    child.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      while (buf.length >= 4) {
        const len = buf.readUInt32LE(0)
        if (buf.length < 4 + len) return
        clearTimeout(timeout)
        resolve(JSON.parse(buf.slice(4, 4 + len).toString('utf8')))
        return
      }
    })
    child.on('error', reject)
    child.stdin.write(frame({ cmd: 'codex' }))
  })

  assert.equal(msg.cliFound, false)
  assert.equal(msg.source, 'files')
  assert.equal(msg.activeModel, 'gpt-fixture')
  assert.equal(msg.tokens.total, 1234)
  assert.equal(msg.limits.primary.usedPercent, 25)
  assert.equal(msg.limits.secondary.windowMinutes, 10080)
  console.log('native host codex fixture self-test: PASS')
} finally {
  child.kill()
  await rm(root, { recursive: true, force: true })
}
