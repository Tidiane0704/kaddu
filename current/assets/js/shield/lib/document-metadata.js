export function estimateDocumentOrigin({ mimeType = '', fileName = '', size = 0 } = {}) {
  const lower = String(fileName).toLowerCase();
  if (mimeType.includes('pdf')) return 'pdf_native_or_scan';
  if (lower.includes('screenshot') || lower.includes('capture')) return 'screenshot';
  if (mimeType.startsWith('image/')) return 'photo_or_screenshot';
  return 'unknown';
}

export function proofStrengthFromOrigin(origin, confidence = 0) {
  if (origin === 'pdf_native_or_scan' && confidence >= 0.75) return 'strong';
  if (origin === 'photo_or_screenshot') return 'medium';
  if (origin === 'screenshot') return 'weak';
  return 'medium';
}
