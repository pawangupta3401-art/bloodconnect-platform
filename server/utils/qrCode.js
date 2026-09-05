const QRCode = require('qrcode')

/**
 * Generate a Base64 Data URL QR Code
 * @param {string|object} data - Data to encode (string or object)
 * @param {object} options - Optional styling options
 * @returns {Promise<string>} Base64 Data URL (data:image/png;base64,...)
 */
async function generateQRCode(data, options = {}) {
  try {
    const payload = typeof data === 'object' ? JSON.stringify(data) : String(data)
    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: options.margin || 2,
      color: {
        dark: options.darkColor || '#dc2626',   // Blood Red accent
        light: options.lightColor || '#ffffff', // Clean white background
      },
      width: options.width || 300,
    })
    return qrDataUrl
  } catch (err) {
    console.error('[QRCode Utility] Failed to generate QR:', err.message)
    throw new Error('Failed to generate QR code')
  }
}

module.exports = { generateQRCode }
