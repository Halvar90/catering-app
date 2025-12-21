export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_INSTANT_APP_ID',
    'BLOB_READ_WRITE_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      'Please check your .env.local file.'
    );
  }

  if (!process.env.OCR_API_KEY && !process.env.VERYFI_CLIENT_ID) {
    console.warn(
      '⚠️  No OCR API key found. App will use Tesseract.js only.\n' +
      '   For better OCR, add OCR_API_KEY or VERYFI credentials.'
    );
  }
}
