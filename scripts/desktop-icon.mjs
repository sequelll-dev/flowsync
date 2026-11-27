import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
// Compile the existing vector brand into the multiresolution Windows icon format.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const images = []
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{width:100vw;height:100vh;display:block}</style>${svg}`,
    )
    images.push(await page.screenshot({ omitBackground: true }))
  }
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach((png, index) => {
    const entry = 6 + index * 16
    header[entry] = sizes[index] % 256
    header[entry + 1] = sizes[index] % 256
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  await writeFile(
    new URL('../desktop/icon.ico', import.meta.url),
    Buffer.concat([header, ...images]),
  )
} finally {
  await browser.close()
}
