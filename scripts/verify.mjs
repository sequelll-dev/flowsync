import { spawn } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
function run(file, args = []) {
  return new Promise((done, reject) => {
    const processHandle = spawn(process.execPath, [file, ...args], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
      windowsHide: true,
      timeout: 180_000,
    })
    processHandle.on('error', reject)
    processHandle.on('exit', (code, signal) =>
      code === 0 ? done() : reject(new Error(`${file} failed (${code ?? signal})`)),
    )
  })
}
let server
try {
  await run(resolve(root, 'node_modules/prettier/bin/prettier.cjs'), [
    '--check',
    'src',
    'scripts',
    'desktop',
    '*.{json,html,ts}',
    'README.md',
  ])
  await run(resolve(root, 'node_modules/typescript/bin/tsc'), ['-b'])
  await run(resolve(root, 'node_modules/vite/bin/vite.js'), ['build'])
  if (!process.env.FLOWSYNC_TEST_URL) {
    const url = 'http://127.0.0.1:4174'
    server = spawn(
      process.execPath,
      [
        resolve(root, 'node_modules/vite/bin/vite.js'),
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '4174',
        '--strictPort',
      ],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    )
    let announced = false
    server.stdout.on('data', (chunk) => {
      process.stdout.write(chunk)
      if (chunk.toString().includes(url)) announced = true
    })
    server.stderr.on('data', (chunk) => process.stderr.write(chunk))
    let launchError
    server.on('error', (error) => {
      launchError = error
    })
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError
      if (server.exitCode !== null) throw new Error('Preview server exited before verification')
      try {
        if (!announced) {
          await pause(200)
          continue
        }
        const response = await fetch(url)
        if (response.ok) {
          ready = true
          break
        }
      } catch {}
      await pause(200)
    }
    if (!ready) throw new Error('Preview server did not become ready')
    process.env.FLOWSYNC_TEST_URL = url
  }
  for (const name of [
    'milestone2.smoke',
    'milestone3.smoke',
    'milestone4.smoke',
    'milestone5.smoke',
    'milestone6.smoke',
    'milestone7.smoke',
    'milestone8.smoke',
    'workspace.audit',
    'workspace.audit2',
    'persistence.refinement',
    'milestone9.smoke',
  ])
    await run(resolve(root, `scripts/${name}.mjs`))
  console.log('All build, formatting, browser, accessibility, and persistence checks passed.')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  server?.kill()
}
