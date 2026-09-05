const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Create CRC32 table
const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1)
    else c = c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createBloodDropPNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr)

  const rawData = Buffer.alloc(height * (1 + width * 4))
  let offset = 0

  const cx = width / 2
  const cy = height * 0.53
  const r = width * 0.32

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0 // No filter
    for (let x = 0; x < width; x++) {
      // Rounded background mask
      const cornerR = width * 0.22
      let inBg = false
      const nx = Math.max(cornerR, Math.min(width - cornerR, x))
      const ny = Math.max(cornerR, Math.min(height - cornerR, y))
      const distFromCorner = Math.hypot(x - nx, y - ny)
      if (distFromCorner <= cornerR) {
        inBg = true
      }

      if (!inBg) {
        rawData[offset++] = 0
        rawData[offset++] = 0
        rawData[offset++] = 0
        rawData[offset++] = 0
        continue
      }

      // Default dark theme background
      const bgGrad = y / height
      let red = Math.round(15 + bgGrad * 10)
      let green = Math.round(23 + bgGrad * 12)
      let blue = Math.round(42 + bgGrad * 18)
      let alpha = 255

      // Blood Drop Math
      const dx = x - cx
      const dy = y - cy
      const distCircle = Math.hypot(dx, dy)
      
      let inDrop = false
      if (distCircle <= r && y >= cy - r * 0.1) {
        inDrop = true
      } else if (y < cy && y >= cy - r * 1.35) {
        // Triangle top cone
        const progress = (y - (cy - r * 1.35)) / (r * 1.35)
        const halfWidthAtY = progress * (r * 0.95)
        if (Math.abs(dx) <= halfWidthAtY) {
          inDrop = true
        }
      }

      if (inDrop) {
        // Vibrant red blood gradient
        const dropRatio = (y - (cy - r * 1.35)) / (r * 2.35)
        red = Math.round(239 - dropRatio * 75)   // 239 -> 164
        green = Math.round(68 - dropRatio * 45)  // 68 -> 23
        blue = Math.round(68 - dropRatio * 40)   // 68 -> 28

        // Glossy specular highlight
        const hlX = cx - r * 0.28
        const hlY = cy - r * 0.18
        const hlDist = Math.hypot(x - hlX, y - hlY)
        if (hlDist < r * 0.35) {
          const hlFactor = (1 - hlDist / (r * 0.35)) * 0.45
          red = Math.min(255, Math.round(red + 255 * hlFactor))
          green = Math.min(255, Math.round(green + 200 * hlFactor))
          blue = Math.min(255, Math.round(blue + 200 * hlFactor))
        }

        // White Medical Cross in center
        const crossSize = r * 0.38
        const crossThick = r * 0.13
        const inHBar = Math.abs(dy - r * 0.1) <= crossThick && Math.abs(dx) <= crossSize
        const inVBar = Math.abs(dx) <= crossThick && Math.abs(dy - r * 0.1) <= crossSize

        if (inHBar || inVBar) {
          red = 255
          green = 255
          blue = 255
        }
      }

      rawData[offset++] = red
      rawData[offset++] = green
      rawData[offset++] = blue
      rawData[offset++] = alpha
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 })
  const idatChunk = makeChunk('IDAT', compressedData)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Generate 192x192 and 512x512 PNGs
const png192 = createBloodDropPNG(192, 192)
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192)
console.log('✅ Generated public/icon-192.png (' + png192.length + ' bytes)')

const png512 = createBloodDropPNG(512, 512)
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512)
console.log('✅ Generated public/icon-512.png (' + png512.length + ' bytes)')

// Also create maskable 512
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), png512)
console.log('✅ Generated public/icon-maskable-512.png')

// Create vector blood-drop.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <path d="M256 64 C256 64, 128 224, 128 320 C128 390.69 185.31 448 256 448 C326.69 448 384 390.69 384 320 C384 224 256 64 256 64 Z" fill="url(#dropGrad)" filter="url(#glow)"/>
  <!-- Specular highlight -->
  <ellipse cx="210" cy="270" rx="36" ry="70" transform="rotate(-25 210 270)" fill="white" opacity="0.35"/>
  <!-- Cross in center -->
  <rect x="238" y="280" width="36" height="88" rx="8" fill="#ffffff"/>
  <rect x="212" y="306" width="88" height="36" rx="8" fill="#ffffff"/>
</svg>`

fs.writeFileSync(path.join(publicDir, 'blood-drop.svg'), svgContent)
console.log('✅ Generated public/blood-drop.svg')
