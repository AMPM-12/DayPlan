import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('./icon.svg', import.meta.url))

const targets = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
]

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(file)
  console.log('wrote', file)
}

// Maskable icon needs ~20% safe-area padding around the artwork.
const padded = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#4338ca' },
})
  .composite([{ input: await sharp(svg).resize(320, 320).png().toBuffer(), top: 96, left: 96 }])
  .png()
  .toFile('public/icons/maskable-512.png')
console.log('wrote public/icons/maskable-512.png')
